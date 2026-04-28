import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Gauge, GaugeOperation, NcRecord } from '@/types/domain.types';

export const getGauges = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/gauges', { params });
  return res.data;
};

export const getJobCards = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/gauges/job-cards', { params });
  return res.data;
};

export const getGauge = async (id: string) => {
  const res = await api.get<ApiResponse<Gauge>>(`/gauges/${id}`);
  return res.data;
};

export const getGaugeOperations = async (id: string) => {
  const res = await api.get<ApiResponse<GaugeOperation[]>>(`/gauges/${id}/operations`);
  return res.data;
};

export const getGaugeNcRecords = async (id: string) => {
  const res = await api.get<ApiResponse<NcRecord[]>>(`/gauges/${id}/nc-records`);
  return res.data;
};
