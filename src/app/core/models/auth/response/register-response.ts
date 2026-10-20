/**
 * DTO phản hồi từ `POST /api/auth/register`.
 * Khớp với `RegisterResponse.java` ở backend.
 */
export interface RegisterResponse {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

  /** Vai trò được gán khi đăng ký (TENANT hoặc LANDLORD) */
  roleCode: 'TENANT' | 'LANDLORD';

  /** Authorities đầy đủ: ROLE_TENANT + các permission tương ứng */
  authorities: string[];

  accessToken: string;
  refreshToken: string;
}
