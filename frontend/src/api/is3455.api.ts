import api from '@/lib/axios';

export interface Is3455ToleranceValue {
  id: number;
  symValue: string;
  grd5: number | null;
  grd6: number | null;
  grd7: number | null;
  grd8: number | null;
  grd9: number | null;
  grd10: number | null;
  grd11: number | null;
  grd12: number | null;
  grd13: number | null;
  grd14: number | null;
  grd15: number | null;
  grd16: number | null;
}

export interface Is3455Range {
  id: number;
  rangeLabel: string;
  nominalSizeMax: number;
  toleranceType: string;
  values: Is3455ToleranceValue[];
}

export const getIs3455All = async (): Promise<Is3455Range[]> => {
  const res = await api.get<Is3455Range[]>('/is3455');
  return res.data;
};

export const getIs3455Plug = async (): Promise<Is3455Range[]> => {
  const res = await api.get<Is3455Range[]>('/is3455/plug');
  return res.data;
};

export const getIs3455Snap = async (): Promise<Is3455Range[]> => {
  const res = await api.get<Is3455Range[]>('/is3455/snap');
  return res.data;
};

export interface Is3455CalculateRequest {
  toleranceType: string;
  nominalSize: string;
  higherSize: number;
  lowerSize: number;
}

export interface Is3455CalculateResponse {
  workpieceToleranceT: number;
  gaugeToleranceH: number;
  wearAllowanceY: number;
  gaugeAllowanceZ: number;
  wearLimit: number;
  goSize: number;
  nogoSize: number;
  goTolPlus: number;
  goTolMinus: number;
  nogoTolPlus: number;
  nogoTolMinus: number;
  nogoWearAllowanceA: number;
  matchedRange?: string;
  matchedGrade?: number;
}

export const calculateIs3455 = async (data: Is3455CalculateRequest): Promise<Is3455CalculateResponse> => {
  const res = await api.post<Is3455CalculateResponse>('/is3455/calculate', data);
  return res.data;
};
