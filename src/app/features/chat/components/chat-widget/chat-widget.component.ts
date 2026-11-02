import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { ChatWidgetService } from '@services/chat-widget.service';
import { RoleCode } from '@model/auth/auth.model';
import { ChatPageComponent } from '../../pages/chat-page/chat-page.component';

@Component({
  selector: 'app-chat-widget',
  imports: [RouterLink, ChatPageComponent],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent {
  readonly widget = inject(ChatWidgetService);
  readonly auth = inject(AuthService);
  readonly canUseSupport = computed(() =>
    this.auth.hasAnyRole([RoleCode.TENANT, RoleCode.LANDLORD]),
  );
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;
  private returnFocus?: HTMLElement;
  private previousUserId = this.auth.session()?.id;
  readonly queryParams = computed(() => ({
    listing: this.widget.target().listingId,
    conversation: this.widget.target().conversationId,
    support: this.widget.target().support ? '1' : undefined,
  }));
  readonly loginRedirect = computed(() =>
    this.router.serializeUrl(
      this.router.createUrlTree(['/tin-nhan'], { queryParams: this.queryParams() }),
    ),
  );

  constructor() {
    effect(() => {
      const opened = this.widget.opened();
      if (opened) {
        this.returnFocus =
          document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
        setTimeout(() => {
          if (this.widget.opened()) this.closeButton?.nativeElement.focus();
        });
      }
    });
    effect(() => {
      const userId = this.auth.session()?.id;
      if (this.previousUserId !== userId) this.widget.close();
      this.previousUserId = userId;
    });
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe(() => {
        if (this.router.url.startsWith('/tin-nhan') || this.router.url.startsWith('/login'))
          this.widget.close();
      });
  }

  close(): void {
    this.widget.close();
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
  }
}
