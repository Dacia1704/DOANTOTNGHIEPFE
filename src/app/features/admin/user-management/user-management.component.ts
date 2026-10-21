import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { UserService } from '@services/user.service';
import { UserList, ROLE_LABELS, STATUS_LABELS } from '@model/user/user.model';
import { UserStatus } from '@model/auth/auth.model';
import { MatDialog } from '@angular/material/dialog';
import { UserProfile } from '@model/user/user.model';
import { UserActionDialogComponent } from './user-action-dialog/user-action-dialog.component';

@Component({
  selector: 'app-user-management',
  imports: [ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagementComponent {
  private readonly users = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly success = signal('');

  openAction(user: UserProfile, action: 'edit' | 'delete'): void {
    this.success.set('');
    this.dialog.open(UserActionDialogComponent, {
      data: { user, action },
      width: '560px',
      maxWidth: 'calc(100vw - 32px)',
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(changed => {
      if (!changed) return;
      this.success.set(action === 'delete' ? 'Đã xóa người dùng.' : 'Đã cập nhật người dùng.');
      const result = this.result();
      const page = result?.page ?? 0;
      this.load(action === 'delete' && result?.items.length === 1 ? Math.max(0, page - 1) : page);
    });
  }
  readonly filters = inject(FormBuilder).nonNullable.group({
    q: [''],
    status: ['' as UserStatus | ''],
  });
  readonly result = signal<UserList | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly roles = ROLE_LABELS;
  readonly statuses = STATUS_LABELS;
  // Applied filters stay consistent when paging through search results.
  private applied = { q: '', status: '' as UserStatus | '' };

  constructor() { this.load(); }

  search(): void {
    if (this.loading()) return;
    this.applied = this.filters.getRawValue();
    this.load(0);
  }

  load(page = this.result()?.page ?? 0): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.users.list(this.applied.q, this.applied.status, page).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: result => this.result.set(result),
      error: (err: { status?: number; error?: { message?: string } }) => {
        this.error.set(err.status === 403
          ? 'Bạn không có quyền xem danh sách người dùng.'
          : err.error?.message || 'Không tải được danh sách người dùng. Vui lòng thử lại.');
      },
    });
  }
}
