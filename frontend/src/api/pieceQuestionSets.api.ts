import api from '@/lib/axios';
import type { OperationMaster, GaugeMaster } from '@/types/domain.types';

export type PieceType = 'FIRST_PIECE' | 'LAST_PIECE' | 'BOTH';

export interface PieceQuestion {
  id?: string;
  sequenceOrder: number;
  questionText: string;
  questionType: 'PASS_FAIL' | 'NUMERIC' | 'TEXT' | 'CHOICE';
  expectedAnswer?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
  isCritical?: boolean;
  checkingMethod?: string;
  isActive?: boolean;
}

export interface PieceQuestionSet {
  id?: string;
  pieceType: PieceType;
  operationMaster: OperationMaster;
  gaugeMaster?: GaugeMaster | null;
  name: string;
  isActive?: boolean;
  questions?: PieceQuestion[];
  createdAt?: string;
}

export interface CreatePieceQuestionSetPayload {
  pieceType: PieceType;
  operationMasterId: string;
  gaugeMasterId?: string | null;
  name: string;
  questions?: PieceQuestion[];
}

export const pieceQuestionSetsApi = {
  getAll: async (params?: { pieceType?: PieceType }) => {
    const response = await api.get<{ data: PieceQuestionSet[] }>('/piece-question-sets', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<{ data: PieceQuestionSet }>(`/piece-question-sets/${id}`);
    return response.data;
  },

  getByOperation: async (operationMasterId: string, pieceType: PieceType, gaugeMasterId?: string) => {
    const params: Record<string, string> = { pieceType };
    if (gaugeMasterId) params.gaugeMasterId = gaugeMasterId;
    const response = await api.get<{ data: PieceQuestionSet | null }>(
      `/piece-question-sets/by-operation/${operationMasterId}`,
      { params }
    );
    return response.data;
  },

  create: async (data: CreatePieceQuestionSetPayload) => {
    const response = await api.post<{ data: PieceQuestionSet }>('/piece-question-sets', data);
    return response.data;
  },

  update: async (id: string, data: CreatePieceQuestionSetPayload) => {
    const response = await api.put<{ data: PieceQuestionSet }>(`/piece-question-sets/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/piece-question-sets/${id}`);
    return response.data;
  },
};

