import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { NcRecord } from '@/types/domain.types';

export const createNcRecord = async (data: any) => {
  const res = await api.post<ApiResponse<NcRecord>>('/nc-records', data);
  return res.data;
};

export const getGaugeNcRecords = async (gaugeId: string) => {
  const res = await api.get<ApiResponse<NcRecord[]>>(`/nc-records/gauge/${gaugeId}`);
  return res.data;
};

export const getAllNcRecords = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/nc-records', { params });
  return res.data;
};
