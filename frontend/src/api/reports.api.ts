import api from '@/lib/axios';
import type { QualityReportDto } from '@/types/domain.types';

export const reportsApi = {
  getReportByGauge: async (gaugeId: string, reportType: string = 'IN_PROCESS'): Promise<{ data: QualityReportDto }> => {
    const response = await api.get(`/pqc/reports/gauge/${gaugeId}?reportType=${reportType}`);
    return response.data;
  }
};
