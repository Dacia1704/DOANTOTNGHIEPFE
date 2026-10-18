export interface LoginResponse {
  id: number;
  email: string;
  username: string;
  avatar?: string;
  authorities: string[];
  accessToken: string;
  refreshToken: string;
}