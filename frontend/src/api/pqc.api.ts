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
  incidentType?: string;
  incidentDurationMins?: number;
  incidentRemarks?: string;
  slotIndex?: number;
  isBackfill?: boolean;
  logTime?: string;
  isEscalated?: boolean;
  escalationReason?: string;
}

export const pqcApi = {
  // Inspections
  logInspection: async (data: PqcInspectionLogRequest) => {
    const response = await api.post('/pqc/inspections', data);
    return response.data;
  },
  
  getCompletionProgress: async (operationId: string, shiftId?: string, shiftDate?: string): Promise<{ data: CompletionProgress }> => {
    const params: Record<string, string> = {};
    if (shiftId) params.shiftId = shiftId;
    if (shiftDate) params.shiftDate = shiftDate;
    const response = await api.get(`/pqc/inspections/progress/${operationId}`, {
      params: Object.keys(params).length > 0 ? params : undefined
    });
    return response.data;
  },

  getScrapReport: async (): Promise<{ data: any[] }> => {
    const response = await api.get('/pqc/scrap-report');
    return response.data;
  },

  updateScrapRemarks: async (logId: string, remarks: string): Promise<{ data: any }> => {
    const response = await api.put(`/pqc/scrap-report/${logId}/remarks`, { remarks });
    return response.data;
  },

  // Incident & Breakdown Reports
  getIncidentReport: async (): Promise<{ data: any[] }> => {
    const response = await api.get('/pqc/incident-report');
    return response.data;
  },

  updateIncidentRemarks: async (logId: string, remarks: string): Promise<{ data: any }> => {
    const response = await api.put(`/pqc/incident-report/${logId}/remarks`, { remarks });
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

  importQuestionSetsFromExcel: async (file: File): Promise<{ data: { questionSetsCreated: number; questionsCreated: number; operationsCreated: number; gaugesCreated: number } }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/pqc/question-sets/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  analyzeExcelControlPlan: async (file: File): Promise<{ data: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/pqc/question-sets/analyze-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  commitExcelControlPlan: async (previewData: any): Promise<{ data: { questionSetsCreated: number; questionsCreated: number; operationsCreated: number; gaugesCreated: number; skippedSets: number } }> => {
    const response = await api.post('/pqc/question-sets/commit-import', previewData);
    return response.data;
  },

  deleteQuestionSet: async (id: string): Promise<void> => {
    await api.delete(`/pqc/question-sets/${id}`);
  }
};
