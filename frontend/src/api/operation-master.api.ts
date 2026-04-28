import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { OperationMaster } from '@/types/domain.types';

export const getOperationMasters = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/operation-masters', { params });
  return res.data;
};

export const getOperationMaster = async (id: string) => {
  const res = await api.get<ApiResponse<OperationMaster>>(`/operation-masters/${id}`);
  return res.data;
};

export const createOperationMaster = async (data: Partial<OperationMaster>) => {
  const res = await api.post<ApiResponse<OperationMaster>>('/operation-masters', data);
  return res.data;
};

export const updateOperationMaster = async (id: string, data: Partial<OperationMaster>) => {
  const res = await api.put<ApiResponse<OperationMaster>>(`/operation-masters/${id}`, data);
  return res.data;
};

export const deleteOperationMaster = async (id: string) => {
  const res = await api.delete<ApiResponse<void>>(`/operation-masters/${id}`);
  return res.data;
};
