import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

export const triggerIotDevice = async (ipAddress: string, sound?: string) => {
  const res = await api.post<ApiResponse<void>>('/iot/trigger', { ipAddress, sound });
  return res.data;
};

export const speakToIotDevice = async (ipAddress: string, text: string) => {
  const res = await api.post<ApiResponse<void>>('/iot/speak', { ipAddress, text });
  return res.data;
};
