import api from '@/lib/axios';
import type { PqcQuestionSet, CompletionProgress } from '@/types/domain.types';

export interface PqcInspectionLogRequest {
  gaugeOperationId: string;
  shiftId?: string;
  machineId?: string;
  actualQty: number;
  passedQty: number;
  rejectedQty: number;
  reworkQty: number;
  scrapQty: number;
  rejectionReasons?: Record<string, any>[];
  measurementData?: Record<string, any>;
  questionAnswers?: Record<string, any>[];
  remarks?: string;
}

export const pqcApi = {
  // Inspections
  logInspection: async (data: PqcInspectionLogRequest) => {
    const response = await api.post('/pqc/inspections', data);
    return response.data;
  },
  
  getCompletionProgress: async (operationId: string): Promise<{ data: CompletionProgress }> => {
    const response = await api.get(`/pqc/inspections/progress/${operationId}`);
    return response.data;
  },

  // Question Sets
  getAllQuestionSets: async (): Promise<{ data: PqcQuestionSet[] }> => {
    const response = await api.get('/pqc/question-sets');
    return response.data;
  },

  getQuestionSet: async (id: string): Promise<{ data: PqcQuestionSet }> => {
    const response = await api.get(`/pqc/question-sets/${id}`);
    return response.data;
  },

  getQuestionSetByOperation: async (operationMasterId: string, gaugeMasterId?: string): Promise<{ data: PqcQuestionSet | null }> => {
    const response = await api.get(`/pqc/question-sets/by-operation/${operationMasterId}${gaugeMasterId ? `?gaugeMasterId=${gaugeMasterId}` : ''}`);
    return response.data;
  },

  createQuestionSet: async (data: any): Promise<{ data: PqcQuestionSet }> => {
    const response = await api.post('/pqc/question-sets', data);
    return response.data;
  },

  updateQuestionSet: async (id: string, data: any): Promise<{ data: PqcQuestionSet }> => {
    const response = await api.put(`/pqc/question-sets/${id}`, data);
    return response.data;
  },

  deleteQuestionSet: async (id: string): Promise<void> => {
    await api.delete(`/pqc/question-sets/${id}`);
  }
};
