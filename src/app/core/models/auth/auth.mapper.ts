import { LoginResponse } from './response/login-response';
import { RegisterResponse } from './response/register-response';
import { AuthSession, RoleCode, UserStatus } from './auth.model';

/**
 * Mapper giữa DTO (raw backend JSON) và Model (component-facing).
 * Service sẽ dùng class này để convert trước khi trả về cho component.
 */
export class AuthMapper {

  static fromLoginResponse(dto: LoginResponse): AuthSession {
    return {
      id: dto.id,
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      avatarUrl: dto.avatarUrl,
      status: AuthMapper.mapStatus(dto.status),
      roles: (dto.roles ?? []).map(r => AuthMapper.mapRole(r)),
      authorities: dto.authorities ?? [],
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      accessTokenExpiresAt: dto.accessTokenExpiresAt,
    };
  }

  static fromRegisterResponse(dto: RegisterResponse): AuthSession {
    return {
      id: dto.id,
      email: dto.email,
      phone: dto.phone,
      fullName: dto.fullName,
      // Register chưa trả avatarUrl trong BE, để undefined để UI tự fallback.
      avatarUrl: undefined,
      status: AuthMapper.mapStatus(dto.status),
      // Register chỉ gán đúng 1 vai trò.
      roles: [AuthMapper.mapRole(dto.roleCode)],
      authorities: dto.authorities ?? [],
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
    };
  }

  private static mapStatus(status: string): UserStatus {
    switch (status) {
      case 'ACTIVE': return UserStatus.ACTIVE;
      case 'INACTIVE': return UserStatus.INACTIVE;
      case 'BLOCKED': return UserStatus.BLOCKED;
      default: return UserStatus.INACTIVE;
    }
  }

  private static mapRole(code: string): RoleCode {
    switch (code) {
      case 'TENANT': return RoleCode.TENANT;
      case 'LANDLORD': return RoleCode.LANDLORD;
      case 'ADMIN': return RoleCode.ADMIN;
      default: return RoleCode.TENANT;
    }
  }
}
