import api from '@/lib/axios';

export interface ReportConfiguration {
  id?: string;
  customerLogo: string | null;
  customerName: string | null;
  docNo: string | null;
  revNo: string | null;
  issueDate: string | null;
  
  // In-Process
  inProcessDocNo: string | null;
  inProcessRevNo: string | null;
  inProcessIssueDate: string | null;

  // PDIR
  pdirDocNo: string | null;
  pdirRevNo: string | null;
  pdirIssueDate: string | null;

  // Setup
  setupDocNo: string | null;
  setupRevNo: string | null;
  setupIssueDate: string | null;

  // FAI
  faiDocNo: string | null;
  faiRevNo: string | null;
  faiIssueDate: string | null;

  // Layout
  layoutDocNo: string | null;
  layoutRevNo: string | null;
  layoutIssueDate: string | null;
}

export const reportConfigApi = {
  get: () => api.get<ReportConfiguration>('/report-configuration'),
  save: (data: ReportConfiguration) => api.post<ReportConfiguration>('/report-configuration', data),
};
