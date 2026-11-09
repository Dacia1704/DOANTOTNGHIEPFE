import { DatePipe } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppNotification } from '@model/notification/notification.model';
import { RoleCode } from '@model/auth/auth.model';
import { AuthService } from '@services/auth/auth.service';
import { NotificationService } from '@services/notification/notification.service';

@Component({
  selector: 'app-notification-center',
  imports: [DatePipe, OverlayModule, A11yModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationCenterComponent {
  readonly notifications = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private action?: Subscription;
  private readonly userId = computed(() => this.auth.session()?.id ?? null);
  readonly opened = signal(false);
  readonly unreadOnly = signal(false);
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  private page = 0;

  constructor() {
    effect((onCleanup) => {
      this.userId();
      this.opened.set(false);
      this.items.set([]);
      this.loading.set(false);
      this.saving.set(false);
      this.error.set('');
      this.hasMore.set(false);
      this.page = 0;
      onCleanup(() => { this.request?.unsubscribe(); this.action?.unsubscribe(); });
    });
    this.notifications.changes$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.opened()) this.load();
    });
    this.destroyRef.onDestroy(() => { this.request?.unsubscribe(); this.action?.unsubscribe(); });
  }

  toggle() {
    this.opened.update((value) => !value);
    if (this.opened()) this.load();
  }

  filter(unread: boolean) {
    this.unreadOnly.set(unread);
    this.items.set([]);
    this.load();
  }

  load(append = false) {
    this.request?.unsubscribe();
    const page = append ? this.page + 1 : 0;
    this.loading.set(true);
    this.error.set('');
    this.request = this.notifications.list(page, this.unreadOnly())
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ data }) => {
          this.page = page;
          const all = append ? [...this.items(), ...data.data] : data.data;
          this.items.set([...new Map(all.map((item) => [item.id, item])).values()]);
          this.hasMore.set(page + 1 < data.totalPages);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Chưa tải được thông báo. Vui lòng thử lại.');
        },
      });
  }

  readAll() {
    this.saving.set(true);
    this.action = this.notifications.markAllRead().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.saving.set(false); this.load(); },
      error: () => { this.saving.set(false); this.error.set('Chưa đánh dấu được thông báo. Vui lòng thử lại.'); },
    });
  }

  select(item: AppNotification) {
    if (this.saving()) return;
    if (item.read) { this.navigate(item); return; }
    this.saving.set(true);
    this.action = this.notifications.markRead(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.items.update((items) => items.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
        this.navigate(item);
        if (this.unreadOnly() && this.opened()) this.load();
      },
      error: () => { this.saving.set(false); this.error.set('Chưa đánh dấu được thông báo. Vui lòng thử lại.'); },
    });
  }

  private navigate(item: AppNotification) {
    let route: string[] | null = null;
    if (item.referenceType === 'RENTAL_AGREEMENT' && item.referenceId)
      route = ['/hop-dong', item.referenceId];
    if (item.referenceType === 'RENTAL_REQUEST')
      route = [this.auth.primaryRole() === RoleCode.LANDLORD ? '/quan-ly-dat-phong' : '/yeu-cau-thue'];
    if (item.referenceType === 'LISTING') route = ['/tin-cua-toi'];
    if (route) {
      this.opened.set(false);
      void this.router.navigate(route);
    }
  }

  icon(item: AppNotification): string {
    return ({ RENTAL_REQUEST: 'door_front', RENTAL_AGREEMENT: 'contract',
      REPORT: 'flag', CHAT: 'chat_bubble', SYSTEM: 'info' })[item.type] ?? 'notifications';
  }

  date(value: string): Date {
    return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+07:00`);
  }
}
