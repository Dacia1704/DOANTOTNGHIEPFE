import { UserStatus } from '../../auth/auth.model';

export interface UpdateUserRequest {
  email: string;
  fullName: string;
  phone: string;
  citizenId: string;
  status: UserStatus;
}