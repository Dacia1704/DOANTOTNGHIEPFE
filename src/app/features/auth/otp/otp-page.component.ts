import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, interval } from 'rxjs';
import { AuthService } from '@services/auth.service';
import { UserService } from '@services/user.service';

/** Shared OTP presentation; API calls remain separate for each purpose. */
@Component({
  selector: 'app-otp-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './otp-page.component.html',
  styleUrl: './otp-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpPageComponent {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly users = inject(UserService);
  readonly passwordMode = this.route.snapshot.data['purpose'] === 'password';
  readonly title = this.passwordMode ? 'Quên mật khẩu' : 'Xác thực email';
  readonly step = signal<'email' | 'otp' | 'success'>('email');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly showPassword = signal(false);
  readonly remaining = signal(0);
  readonly expiry = signal(0);
  private readonly deadlines = new Map<string, number>();
  private expiresAt = 0;
  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });
  readonly codeForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
    newPassword: [''],
    confirmPassword: [''],
  }, { validators: (control: AbstractControl) => this.passwordMode &&
    control.get('newPassword')?.value !== control.get('confirmPassword')?.value ? { mismatch: true } : null });

  constructor() {
    const initialEmail = typeof history !== 'undefined' ? history.state?.email : '';
    this.emailForm.controls.email.setValue(typeof initialEmail === 'string' && initialEmail
      ? initialEmail : this.auth.session()?.email ?? '');
    if (this.passwordMode) {
      this.codeForm.controls.newPassword.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(100)]);
      this.codeForm.controls.confirmPassword.setValidators([Validators.required, Validators.maxLength(100)]);
      this.codeForm.controls.newPassword.updateValueAndValidity();
      this.codeForm.controls.confirmPassword.updateValueAndValidity();
      this.codeForm.updateValueAndValidity();
    }
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.tick());
  }

  get email(): string { return this.emailForm.controls.email.value.trim().toLowerCase(); }
  get profileUrl(): string { return this.auth.primaryRole() === 'ADMIN' ? '/admin/profile' : '/trang-ca-nhan'; }

  send(): void {
    this.emailForm.controls.email.setValue(this.email);
    this.tick();
    if (this.busy() || this.remaining() > 0) return;
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.begin();
    const request = this.passwordMode ? this.auth.forgotPassword({ email: this.email }) : this.auth.sendVerifyEmail({ email: this.email });
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.deadlines.set(this.email, Date.now() + 60_000);
        this.expiresAt = Date.now() + 300_000;
        this.codeForm.controls.otp.reset();
        this.tick();
        this.step.set('otp');
        this.notice.set(this.passwordMode ? 'Nếu email tồn tại trong hệ thống, mã OTP đã được gửi.' : 'Mã xác thực đã được gửi. Vui lòng kiểm tra cả thư rác.');
      },
      error: err => this.fail(err),
    });
  }

  submit(): void {
    if (this.busy()) return;
    if (this.codeForm.invalid) { this.codeForm.markAllAsTouched(); return; }
    this.begin();
    const { otp, newPassword, confirmPassword } = this.codeForm.getRawValue();
    const request = this.passwordMode
      ? this.auth.resetPassword({ email: this.email, otp, newPassword, confirmPassword })
      : this.auth.verifyEmail({ email: this.email, otp });
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        if (this.passwordMode) this.auth.clearSession(false);
        this.codeForm.reset();
        this.step.set('success');
        // Refresh the authenticated user's profile only when verifying their own email.
        if (!this.passwordMode && this.auth.session()?.email.toLowerCase() === this.email) {
          this.users.getMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            error: () => this.notice.set('Email đã được xác thực. Hãy mở lại hồ sơ để tải trạng thái mới.'),
          });
        }
      },
      error: err => {
        this.fail(err);
        if (this.passwordMode) this.notice.set('Hãy kiểm tra mật khẩu và yêu cầu mã mới để thử lại.');
      },
    });
  }

  changeEmail(): void {
    if (this.busy()) return;
    this.step.set('email');
    this.codeForm.reset();
    this.error.set('');
    this.notice.set('');
  }

  private tick(): void {
    this.remaining.set(Math.max(0, Math.ceil(((this.deadlines.get(this.email) ?? 0) - Date.now()) / 1000)));
    this.expiry.set(Math.max(0, Math.ceil((this.expiresAt - Date.now()) / 1000)));
  }
  private begin(): void { this.busy.set(true); this.error.set(''); this.notice.set(''); }
  private fail(err: unknown): void {
    const response = err as { status?: number; error?: { message?: string }; headers?: { get(name: string): string | null } };
    if (response.status === 429) {
      const retry = Number(response.headers?.get('Retry-After'));
      this.deadlines.set(this.email, Date.now() + (Number.isFinite(retry) && retry > 0 ? retry : 60) * 1000);
      this.tick();
    }
    this.error.set(response.error?.message || (response.status === 0 ? 'Không kết nối được máy chủ. Vui lòng thử lại.'
      : response.status === 429 ? 'Bạn gửi mã quá nhanh. Vui lòng chờ trước khi gửi lại.'
      : response.status === 404 ? 'Không tìm thấy email. Vui lòng kiểm tra lại.'
      : 'Không thể thực hiện yêu cầu. Mã có thể không đúng, hết hạn hoặc đã được sử dụng.'));
  }
}
