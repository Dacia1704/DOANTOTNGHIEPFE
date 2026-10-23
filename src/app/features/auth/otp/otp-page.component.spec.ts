import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '@services/auth.service';
import { UserService } from '@services/user.service';
import { OtpPageComponent } from './otp-page.component';

describe('OTP flows', () => {
  function setup(purpose: 'email' | 'password') {
    const auth = {
      session: () => null, isLoggedIn: () => false, primaryRole: () => null,
      forgotPassword: vi.fn(() => of({ code: 200, message: 'Sent' })),
      sendVerifyEmail: vi.fn(() => of({ code: 200, message: 'Sent' })),
      resetPassword: vi.fn(() => of({ code: 200, message: 'Reset' })),
      verifyEmail: vi.fn(() => of({ code: 200, message: 'Verified' })),
      clearSession: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [OtpPageComponent],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { purpose } } } },
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: { getMe: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(OtpPageComponent);
    return { fixture, page: fixture.componentInstance, auth };
  }

  it('normalizes email, prevents duplicate sends and retains neutral messaging', () => {
    const { page, auth } = setup('password');
    page.emailForm.controls.email.setValue(' Tenant@Example.com ');
    page.send();
    page.send();
    expect(auth.forgotPassword).toHaveBeenCalledExactlyOnceWith({ email: 'tenant@example.com' });
    expect(page.notice()).toContain('Nếu email tồn tại');
    expect(page.remaining()).toBe(60);
    expect(page.step()).toBe('otp');
  });

  it('requires valid matching passwords and sends leading-zero OTP directly to reset', () => {
    const { page, auth } = setup('password');
    page.emailForm.controls.email.setValue('tenant@example.com');
    page.send();
    page.codeForm.setValue({ otp: '012345', newPassword: 'short', confirmPassword: 'short' });
    page.submit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    page.codeForm.setValue({ otp: '012345', newPassword: 'NewPassword123', confirmPassword: 'OtherPassword123' });
    page.submit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    page.codeForm.controls.confirmPassword.setValue('NewPassword123');
    page.submit();
    expect(auth.resetPassword).toHaveBeenCalledExactlyOnceWith({
      email: 'tenant@example.com', otp: '012345', newPassword: 'NewPassword123', confirmPassword: 'NewPassword123',
    });
    expect(auth.verifyEmail).not.toHaveBeenCalled();
    expect(auth.clearSession).toHaveBeenCalledWith(false);
    expect(page.step()).toBe('success');
  });

  it('verifies email without password validation or changing the session', () => {
    const { page, auth, fixture } = setup('email');
    page.emailForm.controls.email.setValue('tenant@example.com');
    page.send();
    page.codeForm.controls.otp.setValue('012345');
    page.submit();
    expect(auth.sendVerifyEmail).toHaveBeenCalledOnce();
    expect(auth.verifyEmail).toHaveBeenCalledWith({ email: 'tenant@example.com', otp: '012345' });
    expect(auth.resetPassword).not.toHaveBeenCalled();
    expect(auth.clearSession).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email đã được xác thực');
  });

  it('retains the OTP form after reset failure and explains requesting another code', () => {
    const { page, auth } = setup('password');
    auth.resetPassword.mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Mật khẩu trùng mật khẩu hiện tại' } })));
    page.emailForm.controls.email.setValue('tenant@example.com');
    page.send();
    page.codeForm.setValue({ otp: '012345', newPassword: 'NewPassword123', confirmPassword: 'NewPassword123' });
    page.submit();
    expect(page.step()).toBe('otp');
    expect(page.busy()).toBe(false);
    expect(page.error()).toContain('Mật khẩu trùng');
    expect(page.notice()).toContain('yêu cầu mã mới');
    expect(auth.clearSession).not.toHaveBeenCalled();
  });
});
