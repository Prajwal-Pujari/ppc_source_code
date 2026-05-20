import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { CalibrationObservation } from '@/types/domain.types';

export const getCalibrationObservations = async (gaugeOperationId: string) => {
  const res = await api.get<ApiResponse<CalibrationObservation[]>>(`/calibration/${gaugeOperationId}/observations`);
  return res.data;
};

export const initCalibrationObservations = async (gaugeOperationId: string) => {
  const res = await api.post<ApiResponse<CalibrationObservation[]>>(`/calibration/${gaugeOperationId}/observations/init`);
  return res.data;
};

export const saveCalibrationObservations = async (gaugeOperationId: string, payload: any[]) => {
  const res = await api.post<ApiResponse<CalibrationObservation[]>>(`/calibration/${gaugeOperationId}/observations`, payload);
  return res.data;
};

export const getCalibrationObservationsByGauge = async (gaugeId: string) => {
  const res = await api.get<ApiResponse<CalibrationObservation[]>>(`/calibration/gauge/${gaugeId}/observations`);
  return res.data;
};
