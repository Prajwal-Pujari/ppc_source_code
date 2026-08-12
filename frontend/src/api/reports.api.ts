import api from '@/lib/axios';
import type { QualityReportDto } from '@/types/domain.types';

export const reportsApi = {
  getReportByGauge: async (gaugeId: string, reportType: string = 'IN_PROCESS', shiftId?: string, operationId?: string, filterDate?: string): Promise<{ data: QualityReportDto }> => {
    let url = `/pqc/reports/gauge/${gaugeId}?reportType=${reportType}`;
    if (shiftId) url += `&shiftId=${shiftId}`;
    if (operationId) url += `&operationId=${operationId}`;
    if (filterDate) url += `&filterDate=${filterDate}`;
    const response = await api.get(url);
    return response.data;
  },
  approveShift: async (gaugeId: string, shiftId: string, inspectionDate: string): Promise<any> => {
    const response = await api.post('/pqc/approvals/shift', { gaugeId, shiftId, inspectionDate });
    return response.data;
  },
  getSetupReport: async (gaugeId: string): Promise<{ data: any }> => {
    const response = await api.get(`/machine-setup/report/gauge/${gaugeId}`);
    return response.data;
  },
  getDossierSummary: async (poId: string): Promise<{ data: any }> => {
    const response = await api.get(`/pqc/reports/po/${poId}/ai-summary`);
    return response.data;
  }
};
