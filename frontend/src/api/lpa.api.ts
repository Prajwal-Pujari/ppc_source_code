import api from '@/lib/axios';

export const LpaAuditType = {
  LAYERED_PROCESS: 'LAYERED_PROCESS',
  PRODUCT_AUDIT: 'PRODUCT_AUDIT',
  PROCESS_AUDIT: 'PROCESS_AUDIT',
  POKA_YOKE: 'POKA_YOKE',
  SYSTEM_AUDIT: 'SYSTEM_AUDIT',
  SUPPLIER_AUDIT: 'SUPPLIER_AUDIT',
} as const;

export type LpaAuditType = keyof typeof LpaAuditType;

export interface LpaQuestionItem {
  id?: string;
  sequenceOrder?: number;
  questionText: string;
  questionType: 'PASS_FAIL' | 'YES_NO' | 'NUMERIC' | 'TEXT' | 'MULTIPLE_CHOICE';
  expectedAnswer?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
  isCritical?: boolean;
  checkingMethod?: string;
  reactionPlan?: string;
}

export interface LpaQuestionSet {
  id: string;
  auditType: LpaAuditType;
  name: string;
  description?: string;
  defaultFrequency?: string;
  operationMaster?: { id: string; operationName: string; operationCode?: string; [key: string]: any };
  gaugeMaster?: { id: string; gaugeTypeName: string; name?: string; [key: string]: any };
  machineMaster?: { id: string; machineName: string; machineCode?: string; [key: string]: any };
  questions: LpaQuestionItem[];
}

export interface LpaSchedule {
  id: string;
  auditType: LpaAuditType;
  questionSet?: LpaQuestionSet;
  operationMaster?: { id: string; operationName: string; operationCode?: string; [key: string]: any };
  gaugeMaster?: { id: string; gaugeTypeName: string; name?: string; [key: string]: any };
  machineMaster?: { id: string; machineName: string; machineCode?: string; [key: string]: any };
  assignedTo?: { id: string; fullName: string; [key: string]: any };
  assignedRole?: string;
  frequency: string;
  nextDueDate: string;
  status: string;
  lastCompletedAt?: string;
  lastScorePercentage?: number;
}

export interface LpaDashboardSummary {
  complianceRate: number;
  perfectStreak: number;
  totalAuditsCompleted: number;
  dueTodayCount: number;
  overdueCount: number;
  openActionItemsCount: number;
  categoryMetrics: {
    auditType: LpaAuditType;
    totalCompleted: number;
    complianceRate: number;
  }[];
  recentAudits: {
    id: string;
    auditType: LpaAuditType;
    questionSetName: string;
    auditedByName: string;
    shiftName?: string;
    auditDate: string;
    scorePercentage: number;
    overallStatus: string;
    targetName: string;
  }[];
  dueSchedules: {
    id: string;
    auditType: LpaAuditType;
    questionSetName: string;
    assignedToName: string;
    assignedRole?: string;
    frequency: string;
    nextDueDate: string;
    status: string;
    targetName: string;
  }[];
}

export interface LpaNcResponse {
  answerId: string;
  auditLogId: string;
  auditDate: string;
  auditedByName: string;
  shiftName?: string;
  targetName: string;
  questionText: string;
  actualValue?: string;
  remarks?: string;
  assignedActionOwner?: string;
  correctiveAction?: string;
  actionStatus: string;
  evidenceFileUrl?: string;
  targetClosureDate?: string;
  approvedBy?: string;
  escalatedTo?: string;
}

export const lpaApi = {
  getQuestionSets: async (auditType?: string) => {
    const res = await api.get<any>('/lpa/question-sets', { params: auditType ? { auditType } : {} });
    return res.data;
  },
  createQuestionSet: async (data: any) => {
    const res = await api.post<any>('/lpa/question-sets', data);
    return res.data;
  },
  updateQuestionSet: async (id: string, data: any) => {
    const res = await api.put<any>(`/lpa/question-sets/${id}`, data);
    return res.data;
  },
  importQuestionSetsFromExcel: async (file: File, auditType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auditType', auditType);
    const res = await api.post<any>('/lpa/question-sets/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  previewQuestionSetsFromExcel: async (file: File, auditType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auditType', auditType);
    const res = await api.post<any>('/lpa/question-sets/preview-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getSchedules: async (auditType?: string) => {
    const res = await api.get<any>('/lpa/schedules', { params: auditType ? { auditType } : {} });
    return res.data;
  },
  createSchedule: async (data: any) => {
    const res = await api.post<any>('/lpa/schedules', data);
    return res.data;
  },
  submitAudit: async (data: any) => {
    const res = await api.post<any>('/lpa/audits', data);
    return res.data;
  },
  getAuditLogs: async (auditType?: string) => {
    const res = await api.get<any>('/lpa/audits', { params: auditType ? { auditType } : {} });
    return res.data;
  },
  getDashboardSummary: async () => {
    const res = await api.get<any>('/lpa/dashboard/summary');
    return res.data;
  },
  getNonConformances: async () => {
    const res = await api.get<any>('/lpa/ncs');
    return res.data;
  },
  updateNcAction: async (answerId: string, data: any) => {
    const res = await api.put<any>(`/lpa/ncs/${answerId}/action`, data);
    return res.data;
  },
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<any>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }
};
