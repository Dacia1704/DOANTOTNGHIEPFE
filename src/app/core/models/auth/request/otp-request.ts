export interface EmailOtpRequest { email: string }
export interface VerifyEmailRequest extends EmailOtpRequest { otp: string }
export interface ResetPasswordRequest extends VerifyEmailRequest {
  newPassword: string;
  confirmPassword: string;
}
