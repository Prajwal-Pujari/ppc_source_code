import api from '@/lib/axios';

export interface MachineMaster {
  id?: string;
  machineName: string;
  machineCode: string;
  department: string;
  isActive?: boolean;
  currentStatus?: string;
}

export const machinesApi = {
  getAll: () => api.get<MachineMaster[]>('/machines'),
  getEvents: () => api.get<any[]>('/machines/events'),
  create: (data: Partial<MachineMaster>) => api.post<MachineMaster>('/machines', data),
  update: (id: string, data: MachineMaster) => api.put<MachineMaster>(`/machines/${id}`, data),
  delete: (id: string) => api.delete(`/machines/${id}`),
};
