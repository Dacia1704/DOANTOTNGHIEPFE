import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@services/auth.service';

type Role = 'TENANT' | 'LANDLORD';

interface RegisterFormControls {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  citizenId: string;
  roleCode: Role;
  acceptTerms: boolean;
}

/**
 * Trang đăng ký (TENANT hoặc LANDLORD).
 *  - FullName, email, phone (VN format), password + confirm + strength, citizenId optional.
 *  - Role select (TENANT/LANDLORD) — backend chỉ chấp nhận 2 giá trị này.
 *  - Submit → AuthService.register() → landing page khi thành công.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    // UI chỉ validate 10 số vì UI tự chèn tiền tố +84.
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{9,10}$/)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
    confirmPassword: ['', [Validators.required]],
    citizenId: ['', [Validators.maxLength(20)]],
    roleCode: ['TENANT' as Role, [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]],
  }, { validators: passwordsMatch });

  selectRole(role: Role): void {
    this.form.controls.roleCode.setValue(role);
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') this.showPassword.set(!this.showPassword());
    else this.showConfirm.set(!this.showConfirm());
  }

  /** Trả 0..3 để hiển thị thanh độ mạnh. */
  passwordScore(): number {
    const v = this.form.controls.password.value ?? '';
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[0-9]/.test(v) && /[a-zA-Z]/.test(v)) score++;
    if (/[^a-zA-Z0-9]/.test(v) && v.length >= 10) score++;
    return score;
  }

  passwordStrengthLabel(): string {
    switch (this.passwordScore()) {
      case 0: return 'Chưa nhập';
      case 1: return 'Yếu';
      case 2: return 'Trung bình';
      default: return 'Rất mạnh';
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const v = this.form.getRawValue();
    this.auth.register({
      email: v.email,
      phone: '+84' + v.phone,
      password: v.password,
      fullName: v.fullName,
      citizenId: v.citizenId || undefined,
      roleCode: v.roleCode,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/verify-email'], { state: { email: v.email.trim().toLowerCase() } });
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(this.extractMessage(err));
      },
    });
  }

  private extractMessage(err: unknown): string {
    const e = err as { error?: { message?: string }; status?: number };
    if (e?.error?.message) return e.error.message;
    if (e?.status === 0) return 'Không kết nối được máy chủ. Vui lòng thử lại.';
    return 'Đăng ký thất bại. Vui lòng thử lại.';
  }
}

/** Cross-field validator: confirmPassword === password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirmPassword')?.value as string | undefined;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

// Silence unused-type warning tsc ở strict mode.
type _Unused = RegisterFormControls;
