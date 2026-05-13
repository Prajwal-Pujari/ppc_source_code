import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';

export interface FactoryShift {
  id: string;
  shiftName: string;
  startTime: string; // HH:mm:ss format
  endTime: string;   // HH:mm:ss format
  isActive: boolean;
}

export interface CreateShiftRequest {
  shiftName: string;
  startTime: string;
  endTime: string;
}

export const shiftsApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<FactoryShift[]>>('/master/shifts');
    return res.data;
  },

  create: async (data: CreateShiftRequest) => {
    const res = await api.post<ApiResponse<FactoryShift>>('/master/shifts', data);
    return res.data;
  },

  update: async (id: string, data: CreateShiftRequest) => {
    const res = await api.put<ApiResponse<FactoryShift>>(`/master/shifts/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete<ApiResponse<void>>(`/master/shifts/${id}`);
    return res.data;
  }
};
