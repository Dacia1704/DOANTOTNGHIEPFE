import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, finalize } from 'rxjs';
import { UserService } from '@services/user.service';
import { ROLE_LABELS, STATUS_LABELS, UserProfile } from '@model/user/user.model';
import { ImageUtils } from '@shared/utils/image-utils';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  private readonly users = inject(UserService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly section = signal<'profile' | 'security'>('profile');
  readonly showPasswords = signal(false);
  readonly roleLabels = ROLE_LABELS;
  readonly statusLabels = STATUS_LABELS;
  readonly imageUtils = ImageUtils;
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    phone: ['', Validators.pattern(/^(|(\+84|84|0)[0-9]{9})$/)],
    citizenId: ['', Validators.maxLength(20)],
  });
  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.maxLength(100)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    confirmPassword: ['', [Validators.required, Validators.maxLength(72)]],
  }, { validators: (control: AbstractControl) =>
    control.get('newPassword')?.value === control.get('confirmPassword')?.value ? null : { mismatch: true },
  });

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.users.getMe().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: user => this.applyUser(user),
      error: err => this.fail(err),
    });
  }

  reset(): void {
    const user = this.user();
    if (user) this.form.reset({ fullName: user.fullName, phone: user.phone, citizenId: user.citizenId });
  }

  save(): void {
    if (this.form.invalid || this.busy()) { this.form.markAllAsTouched(); return; }
    const values = this.form.getRawValue();
    this.mutate(this.users.updateMe({ ...values, fullName: values.fullName.trim() }), 'Đã lưu thông tin cá nhân.');
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy()) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.success.set('');
      this.error.set('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    this.mutate(this.users.uploadAvatar(file), 'Đã cập nhật ảnh đại diện.', true);
  }

  removeAvatar(): void {
    if (!this.busy()) this.mutate(this.users.deleteAvatar(), 'Đã xóa ảnh đại diện.', true);
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.busy()) { this.passwordForm.markAllAsTouched(); return; }
    this.begin();
    this.users.changePassword(this.passwordForm.getRawValue()).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.busy.set(false)),
    ).subscribe({
      next: () => { this.passwordForm.reset(); this.success.set('Đã đổi mật khẩu thành công.'); },
      error: err => this.fail(err),
    });
  }

  private mutate(request: Observable<UserProfile>, message: string, preserveEdits = false): void {
    this.begin();
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: user => { if (preserveEdits) this.user.set(user); else this.applyUser(user); this.success.set(message); },
      error: err => this.fail(err),
    });
  }

  private applyUser(user: UserProfile): void { this.user.set(user); this.reset(); }
  private begin(): void { this.busy.set(true); this.error.set(''); this.success.set(''); }
  private fail(err: unknown): void {
    const response = err as { status?: number; error?: { message?: string } };
    this.error.set(response.error?.message || (response.status === 0
      ? 'Không kết nối được máy chủ. Vui lòng thử lại.'
      : 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'));
  }
}
