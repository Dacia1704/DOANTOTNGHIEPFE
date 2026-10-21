import { RoleCode, UserStatus } from '../../auth/auth.model';

export interface UserResponse {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  citizenId: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  roles: RoleCode[];
}