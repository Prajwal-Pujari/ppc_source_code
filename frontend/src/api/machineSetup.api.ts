import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { OperationMaster, MachineMaster, GaugeMaster } from '@/types/domain.types';

export interface MachineSetupQuestion {
  id?: string;
  sequenceOrder: number;
  questionText: string;
  questionType: 'PASS_FAIL' | 'NUMERIC' | 'TEXT' | 'CHOICE';
  expectedAnswer?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
  isCritical: boolean;
  checkingMethod?: string;
  showInPdir?: boolean;
}

export interface MachineSetupQuestionSet {
  id: string;
  name: string;
  machineMaster?: MachineMaster;
  operationMaster?: OperationMaster;
  gaugeMaster?: GaugeMaster;
  questions: MachineSetupQuestion[];
  isActive: boolean;
}

export interface CreateMachineSetupConfig {
  machineMasterId: string;
  operationMasterId: string;
  gaugeMasterId?: string;
  name: string;
  questions: MachineSetupQuestion[];
}

export const machineSetupApi = {
  getConfig: (machineId: string, operationId: string, gaugeMasterId?: string) => 
    api.get<ApiResponse<MachineSetupQuestionSet>>(`/machine-setup/config/${machineId}/${operationId}`, { params: { gaugeMasterId } }),
    
  getAllConfigs: () =>
    api.get<ApiResponse<MachineSetupQuestionSet[]>>('/machine-setup/config'),

  createConfig: (data: CreateMachineSetupConfig) =>
    api.post<ApiResponse<MachineSetupQuestionSet>>('/machine-setup/config', data),
    
  updateConfig: (id: string, data: CreateMachineSetupConfig) =>
    api.put<ApiResponse<MachineSetupQuestionSet>>(`/machine-setup/config/${id}`, data),
    
  deleteConfig: (id: string) =>
    api.delete<ApiResponse<void>>(`/machine-setup/config/${id}`),

  uploadExcel: (machineId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<any>>(`/machine-setup/bulk-upload/${machineId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
