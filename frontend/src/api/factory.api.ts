import api from '@/lib/axios';

export interface Factory {
  id: string;
  name?: string;
  factoryName?: string;
  timezone?: string;
  address?: string;
  isActive?: boolean;
  mesEnabled?: boolean;
  pqcEnabled?: boolean;
  lpaEnabled?: boolean;
}

export const factoryApi = {
  getCurrent: () => api.get<Factory>('/factories/current'),
  updateModules: (id: string, data: { mesEnabled?: boolean; pqcEnabled?: boolean; lpaEnabled?: boolean }) =>
    api.put<Factory>(`/factories/${id}/modules`, data),
};
