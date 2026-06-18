import api from '@/lib/axios';

export interface ReportConfiguration {
  id?: string;
  customerLogo: string | null;
  docNo: string | null;
  revNo: string | null;
  issueDate: string | null;
}

export const reportConfigApi = {
  get: () => api.get<ReportConfiguration>('/report-configuration'),
  save: (data: ReportConfiguration) => api.post<ReportConfiguration>('/report-configuration', data),
};
