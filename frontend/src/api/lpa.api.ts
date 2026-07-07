import api from '@/lib/axios';

export const LpaAuditType = {
  LAYERED_PROCESS: 'LAYERED_PROCESS',
  PRODUCT_AUDIT: 'PRODUCT_AUDIT',
  PROCESS_AUDIT: 'PROCESS_AUDIT',
  POKA_YOKE: 'POKA_YOKE',
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

export const lpaApi = {
  getQuestionSets: async (auditType?: string) => {
    const res = await api.get<any>('/lpa/question-sets', { params: auditType ? { auditType } : {} });
    return res.data;
  },
  createQuestionSet: async (data: any) => {
    const res = await api.post<any>('/lpa/question-sets', data);
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
};
