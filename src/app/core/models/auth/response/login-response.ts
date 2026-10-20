/**
 * DTO phản hồi từ `POST /api/auth/login`.
 * Khớp với `LoginResponse.java` ở backend.
 */
export interface LoginResponse {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

  /** Danh sách mã vai trò nghiệp vụ: TENANT / LANDLORD / ADMIN */
  roles: ('TENANT' | 'LANDLORD' | 'ADMIN')[];

  /** Authorities đầy đủ trong token: ROLE_TENANT, LISTING_READ, ... */
  authorities: string[];

  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
}
