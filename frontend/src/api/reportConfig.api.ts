import api from '@/lib/axios';

export interface ReportConfig {
  companyName?: string;
  companyAddress?: string;
  customerLogo: string;
  docNo: string;
  revNo: string;
  issueDate: string;
}

const STORAGE_KEY = 'pqc_report_config';

export const getEffectiveReportConfig = (config: ReportConfig): ReportConfig => ({
  ...config,
  companyName: config.companyName || 'Aarush Quality Services',
  companyAddress: config.companyAddress || 'B-302, Chanakya Nagari, Kandge Park, Sinhagad Rd, Pune - 411051, Maharashtra'
});

const sanitizeConfig = (cfg: ReportConfig): ReportConfig => {
  if (cfg && cfg.companyName && cfg.companyName.includes('Precision Gauge')) {
    cfg.companyName = '';
    cfg.companyAddress = '';
  }
  return cfg;
};

export const reportConfigApi = {
  get: async (): Promise<{ data: ReportConfig }> => {
    try {
      const res = await api.get<ReportConfig>('/report-config');
      if (res.data) {
        const clean = sanitizeConfig(res.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        return { data: clean };
      }
    } catch (err) {
      console.warn('Backend report config fetch failed, using local storage fallback', err);
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {
      companyName: '',
      companyAddress: '',
      customerLogo: '',
      docNo: 'QMS/F/01',
      revNo: '00 / 01.01.2024',
      issueDate: '01.01.2024'
    };
    const cleanData = sanitizeConfig(parsed);
    if (stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
    }
    return { data: cleanData };
  },
  save: async (config: ReportConfig): Promise<{ data: ReportConfig }> => {
    const clean = sanitizeConfig(config);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    try {
      const res = await api.post<ReportConfig>('/report-config', clean);
      return { data: res.data };
    } catch (err) {
      console.warn('Backend report config save failed, saved to local storage', err);
      return { data: clean };
    }
  }
};
