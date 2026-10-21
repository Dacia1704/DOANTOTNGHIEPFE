import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { UserService } from '@services/user.service';
import { UserProfile } from '@model/user/user.model';

export interface UserActionData {
  user: UserProfile;
  action: 'edit' | 'delete';
}

@Component({
  selector: 'app-user-action-dialog',
  imports: [ReactiveFormsModule, MatDialogModule],
  templateUrl: './user-action-dialog.component.html',
  styleUrl: './user-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserActionDialogComponent {
  readonly data = inject<UserActionData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<UserActionDialogComponent, boolean>);
  private readonly users = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: [this.data.user.fullName, [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    email: [this.data.user.email, [Validators.required, Validators.email, Validators.maxLength(255)]],
    phone: [this.data.user.phone, Validators.pattern(/^(|(\+84|84|0)[0-9]{9})$/)],
    citizenId: [this.data.user.citizenId, Validators.maxLength(20)],
    status: [this.data.user.status, Validators.required],
  });

  submit(): void {
    if (this.busy()) return;
    if (this.data.action === 'edit' && this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.ref.disableClose = true;
    const values = this.form.getRawValue();
    const request: Observable<unknown> = this.data.action === 'delete'
      ? this.users.deleteUser(this.data.user.id)
      : this.users.updateUser(this.data.user.id, { ...values, fullName: values.fullName.trim(), email: values.email.trim() });
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => { this.busy.set(false); this.ref.disableClose = false; }),
    ).subscribe({
      next: () => this.ref.close(true),
      error: (err: { status?: number; error?: { message?: string } }) => this.error.set(
        err.error?.message || (err.status === 403
          ? 'Bạn không có quyền thực hiện thao tác này.'
          : 'Không thực hiện được yêu cầu. Vui lòng thử lại.')),
    });
  }
}
