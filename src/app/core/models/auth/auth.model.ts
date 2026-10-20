/**
 * Domain model + enums cho authentication.
 *
 * Phân biệt:
 *  - DTO (`response/login-response.ts`, `response/register-response.ts`)
 *    là cấu trúc JSON backend Java trả về.
 *  - Model trong file này là cấu trúc component sẽ làm việc trực tiếp
 *    (đã qua AuthMapper, có enum/computed property).
 */

export enum RoleCode {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

/**
 * Phiên đăng nhập hiện tại của user.
 * Được AuthService lưu vào signal + localStorage, các component (header, account)
 * đọc trực tiếp từ đây thay vì gọi lại API.
 */
export interface AuthSession {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl?: string;
  status: UserStatus;

  /** Vai trò nghiệp vụ: TENANT / LANDLORD / ADMIN */
  roles: RoleCode[];

  /** Authorities đầy đủ trong JWT: ROLE_TENANT, LISTING_READ, ... */
  authorities: string[];

  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
}
