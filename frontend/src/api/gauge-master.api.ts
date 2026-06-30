import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { GaugeMaster, OperationMaster } from '@/types/domain.types';

export const getGaugeMasters = async (params?: Record<string, any>) => {
  const merged = { size: 1000, ...params };
  const res = await api.get<ApiResponse<any>>('/gauge-masters', { params: merged });
  return res.data;
};

export const getGaugeMaster = async (id: string) => {
  const res = await api.get<ApiResponse<GaugeMaster>>(`/gauge-masters/${id}`);
  return res.data;
};

export const createGaugeMaster = async (data: Partial<GaugeMaster>) => {
  const res = await api.post<ApiResponse<GaugeMaster>>('/gauge-masters', data);
  return res.data;
};

export const updateGaugeMaster = async (id: string, data: Partial<GaugeMaster>) => {
  const res = await api.put<ApiResponse<GaugeMaster>>(`/gauge-masters/${id}`, data);
  return res.data;
};

export const deleteGaugeMaster = async (id: string) => {
  const res = await api.delete<ApiResponse<void>>(`/gauge-masters/${id}`);
  return res.data;
};

export const getGaugeMasterOperations = async (id: string) => {
  const res = await api.get<ApiResponse<any[]>>(`/gauge-masters/${id}/operations`);
  return res.data;
};

export const addGaugeMasterOperation = async (gmId: string, operationMasterId: string, sequenceOrder: number) => {
  const res = await api.post<ApiResponse<any>>(`/gauge-masters/${gmId}/operations`, { operationMasterId, sequenceOrder });
  return res.data;
};

export const removeGaugeMasterOperation = async (gmId: string, opId: string) => {
  const res = await api.delete<ApiResponse<void>>(`/gauge-masters/${gmId}/operations/${opId}`);
  return res.data;
};

export const reorderGaugeMasterOperations = async (
  gmId: string,
  orderedOperationMasterIds: string[],
) => {
  const res = await api.put<ApiResponse<void>>(
    `/gauge-masters/${gmId}/operations/reorder`,
    orderedOperationMasterIds,   // backend expects List<UUID> directly as body
  );
  return res.data;
};
