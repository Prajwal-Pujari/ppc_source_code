import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { AuthResponse } from '@/types/auth.types';

export const loginApi = async (username: string, password: string) => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password });
  return res.data;
};

export const refreshTokenApi = async (refreshToken: string) => {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
  return res.data;
};

export const logoutApi = async (refreshToken?: string) => {
  await api.post('/auth/logout', { refreshToken });
};
