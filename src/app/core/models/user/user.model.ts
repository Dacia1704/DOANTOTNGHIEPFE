import { RoleCode, UserStatus } from '../auth/auth.model';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string;
  citizenId: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  roles: RoleCode[];
}

export interface UserList {
  items: UserProfile[];
  page: number;
  totalPages: number;
  total: number;
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  TENANT: 'Người thuê',
  LANDLORD: 'Chủ trọ',
  ADMIN: 'Quản trị viên',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Chưa hoạt động',
  BLOCKED: 'Đã bị khóa',
};
