import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { User } from '@/types/domain.types';

export const getWorkers = async () => {
  const res = await api.get<ApiResponse<User[]>>('/users/workers');
  return res.data;
};

export const getUsersApi = async () => {
  const res = await api.get<ApiResponse<User[]>>('/users');
  return res.data;
};

export const createUserApi = async (data: any) => {
  const res = await api.post<ApiResponse<User>>('/users', data);
  return res.data;
};

export const toggleUserPermissionApi = async (userId: string, canManage: boolean) => {
  const res = await api.patch<ApiResponse<User>>(`/users/${userId}/permissions?canManage=${canManage}`);
  return res.data;
};

export const updateUserSignatureApi = async (userId: string, signature: string) => {
  const res = await api.patch<ApiResponse<User>>(`/users/${userId}/signature`, { signature });
  return res.data;
};

export const resetUserPasswordApi = async (userId: string, newPassword: string) => {
  const res = await api.post<ApiResponse<User>>(`/users/${userId}/reset-password`, { newPassword });
  return res.data;
};

export const togglePqcAuthorityApi = async (userId: string, hasAuthority: boolean) => {
  const res = await api.patch<ApiResponse<User>>(`/users/${userId}/pqc-authority?hasAuthority=${hasAuthority}`);
  return res.data;
};
