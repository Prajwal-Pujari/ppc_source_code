import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { GaugeOperation } from '@/types/domain.types';

export const assignOperation = async (id: string, workerId: string, machineId?: string) => {
  const res = await api.put<ApiResponse<GaugeOperation>>(`/gauge-operations/${id}/assign`, { workerId, machineId });
  return res.data;
};

export const startOperation = async (id: string) => {
  const res = await api.put<ApiResponse<GaugeOperation>>(`/gauge-operations/${id}/start`);
  return res.data;
};

export const completeOperation = async (id: string, data: { remarks?: string; qualityParams?: Record<string, any> }) => {
  const res = await api.put<ApiResponse<GaugeOperation>>(`/gauge-operations/${id}/complete`, data);
  return res.data;
};

export const flagIssue = async (id: string, issueDescription: string) => {
  const res = await api.put<ApiResponse<void>>(`/gauge-operations/${id}/flag-issue`, { issueDescription });
  return res.data;
};
