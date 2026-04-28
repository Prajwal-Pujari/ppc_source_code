import axios from 'axios';
import type { ApiResponse } from '@/types/api.types';
import type { Gauge, GaugeOperation, NcRecord } from '@/types/domain.types';

const API_URL = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/public` : `${window.location.origin}/api/v1/public`;

// Public instance without interceptors/auth
const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getPublicGauge = async (id: string) => {
  const res = await publicApi.get<ApiResponse<Gauge>>(`/gauges/${id}`);
  return res.data;
};

export const getPublicGaugeOperations = async (id: string) => {
  const res = await publicApi.get<ApiResponse<GaugeOperation[]>>(`/gauges/${id}/operations`);
  return res.data;
};

export const getPublicGaugeNcRecords = async (id: string) => {
  const res = await publicApi.get<ApiResponse<NcRecord[]>>(`/gauges/${id}/nc-records`);
  return res.data;
};
