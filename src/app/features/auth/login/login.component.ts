import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';

/**
 * Trang đăng nhập (email + password).
 *  - Form: email (required, email), password (required, min 6).
 *  - Submit → AuthService.login() → map lỗi từ BE ra banner trên cùng.
 *  - Thành công → router về '/' (landing page).
 *  - ReactiveFormsModule + OnPush.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email, password }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(this.extractMessage(err));
      },
    });
  }

  private extractMessage(err: unknown): string {
    // BE trả ApiResponse với `message`; fallback về message mặc định theo status.
    const e = err as { error?: { message?: string }; status?: number };
    if (e?.error?.message) return e.error.message;
    if (e?.status === 401) return 'Email hoặc mật khẩu không chính xác.';
    if (e?.status === 0) return 'Không kết nối được máy chủ. Vui lòng thử lại.';
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }
}
