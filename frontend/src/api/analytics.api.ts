import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { GaugeOperation, DashboardSummary } from '@/types/domain.types';

export const getMyTasks = async () => {
  const res = await api.get<ApiResponse<GaugeOperation[]>>('/worker/tasks');
  return res.data;
};

export const getMyTaskSummary = async () => {
  const res = await api.get<ApiResponse<Record<string, number>>>('/worker/tasks/summary');
  return res.data;
};

export const getCalibrationTasks = async () => {
  const res = await api.get<ApiResponse<GaugeOperation[]>>('/worker/tasks/calibration');
  return res.data;
};

export const getCalibrationTaskSummary = async () => {
  const res = await api.get<ApiResponse<Record<string, number>>>('/worker/tasks/calibration/summary');
  return res.data;
};

export const getDashboardSummary = async () => {
  const res = await api.get<ApiResponse<DashboardSummary>>('/analytics/dashboard-summary');
  return res.data;
};

export const getDailyProduction = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any[]>>('/analytics/daily-production', { params });
  return res.data;
};

export const getWorkerPerformance = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any[]>>('/analytics/worker-performance', { params });
  return res.data;
};

export const getPoCompletionTracker = async () => {
  const res = await api.get<ApiResponse<any[]>>('/analytics/po-completion-tracker');
  return res.data;
};

export const getRejectionAnalysis = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any[]>>('/analytics/rejection-analysis', { params });
  return res.data;
};

export const getOperationPerformance = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any[]>>('/analytics/operation-performance', { params });
  return res.data;
};
