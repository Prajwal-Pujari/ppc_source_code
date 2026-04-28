export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  employeeCode: string;
  factoryId: string;
}

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'WORKER' | 'QUALITY_INSPECTOR' | 'VIEWER';
