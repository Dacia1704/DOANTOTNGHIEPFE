import { UserResponse } from './response/user-response';
import { UserProfile } from './user.model';

export class UserMapper {
  static fromResponse(dto: UserResponse): UserProfile {
    return {
      ...dto,
      phone: dto.phone ?? '',
      citizenId: dto.citizenId ?? '',
      avatarUrl: dto.avatarUrl ?? '',
      roles: dto.roles ?? [],
      emailVerifiedAt: dto.emailVerifiedAt ? new Date(dto.emailVerifiedAt) : null,
      phoneVerifiedAt: dto.phoneVerifiedAt ? new Date(dto.phoneVerifiedAt) : null,
      createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
    };
  }
}