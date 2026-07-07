export type PoStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PriorityLevel = 'NORMAL' | 'HIGH' | 'URGENT';
export type GaugeStatus = 'PENDING' | 'IN_PRODUCTION' | 'ON_HOLD' | 'COMPLETED' | 'REJECTED';
export type OperationStatus = 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'REWORK';
export type RejectionCategory = 'DIMENSIONAL_ERROR' | 'SURFACE_DEFECT' | 'MATERIAL_DEFECT' | 'OPERATOR_ERROR' | 'MACHINE_ISSUE' | 'TOOLING_WEAR' | 'OTHER';
export type ActionTaken = 'REWORK' | 'SCRAP' | 'ACCEPT_WITH_DEVIATION';
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'WORKER' | 'QUALITY_INSPECTOR' | 'VIEWER';

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  canManageUsers: boolean;
  department?: string;
  phone?: string;
  signature?: string;
}
export interface PurchaseOrder {
  customerName: string;
  id: string;
  poNumber: string;
  customer: { id: string; name: string };
  orderDate: string;
  expectedDeliveryDate: string;
  priority: PriorityLevel;
  status: PoStatus;
  specialInstructions?: string;
  totalGauges: number;
  completedGauges: number;
  rejectedGauges: number;
  createdAt: string;
  updatedAt: string;
}

export interface PoLineItem {
  id: string;
  gaugeMaster: { id: string; gaugeTypeName: string };
  nominalSize: number;
  sizeUnit: string;
  quantity: number;
  materialGradeOverride?: string;
  lineNotes?: string;
  operations: PoLineItemOperation[];
}

export interface PoLineItemOperation {
  id: string;
  operationMasterId: string;
  sequenceOrder: number;
  isMandatory: boolean;
}

export interface Gauge {
  id: string;
  serialNumber: string;
  gaugeTypeName: string;
  nominalSize: number;
  sizeUnit: string;
  materialGrade?: string;
  batchQuantity: number;
  status: GaugeStatus;
  rejectionCount: number;
  qrCodePath?: string;
  historyCardPath?: string;
  purchaseOrder?: Partial<PurchaseOrder>;
  createdAt: string;
  gaugeId?: string;
  partName?: string;
  currentLocation?: string;
  gaugeMaster?: any;
}

export interface GaugeOperation {
  id: string;
  operationName: string;
  sequenceOrder: number;
  status: OperationStatus;
  assignedTo?: { id: string; fullName: string; employeeCode: string };
  completedBy?: { id: string; fullName: string; employeeCode: string };
  assignedAt?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  remarks?: string;
  qualityParams?: Record<string, any>;
  gauge?: { 
    id: string; 
    serialNumber: string; 
    gaugeTypeName: string; 
    nominalSize: number;
    batchQuantity?: number;
    materialGrade?: string;
    poLineItem?: { lineNotes?: string };
    purchaseOrder?: any;
  };
}

export interface NcRecord {
  id: string;
  rejectionCategory: RejectionCategory;
  rejectionReason: string;
  actionTaken: ActionTaken;
  deviationNote?: string;
  initiatedBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  gstNumber?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
}

export interface GaugeMaster {
  id: string;
  gaugeTypeName: string;
  categoryCode?: string;
  defaultMaterialGrade?: string;
  unitOfMeasurement?: string;
  notes?: string;
  isActive: boolean;
}

export interface OperationMaster {
  id: string;
  operationName: string;
  operationCode: string;
  department?: string;
  standardTimeHours?: number;
  skillLevel?: string;
  instructions?: string;
  isOutsourced: boolean;
  isActive: boolean;
}

export interface DashboardSummary {
  completedGaugesToday: number;
  operationsCompletedToday: number;
  activeWorkers: number;
  operationsInProgress: number;
  operationsOverdue: number;
  posDueWithin7Days: number;
}

export type QuestionType = 'PASS_FAIL' | 'NUMERIC' | 'TEXT' | 'CHOICE';

export interface PqcQuestion {
  id?: string;
  sequenceOrder: number;
  questionText: string;
  questionType: QuestionType;
  expectedAnswer?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  choices?: string[];
  isCritical: boolean;
  checkingMethod?: string;
  showInPdir?: boolean;
  isActive?: boolean;
}

export interface PqcQuestionSet {
  id: string;
  operationMaster: OperationMaster;
  gaugeMaster?: GaugeMaster;
  name: string;
  inspectionFrequency: string;
  isActive: boolean;
  questions: PqcQuestion[];
  createdAt?: string;
}

export interface CompletionProgress {
  operationId: string;
  operationName: string;
  plannedQty: number;
  totalPassedQty: number;
  totalActualQty: number;
  readyForCompletion: boolean;
}

export interface PqcMeasurement {
  questionId: string;
  parameterName: string;
  expectedAnswer?: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  actualValue?: any;
  checkingMethod?: string;
  showInPdir?: boolean;
}

export interface PqcBatchLog {
  logId: string;
  logTime: string;
  inspectorName: string;
  inspectedQty: number;
  passedQty: number;
  rejectedQty: number;
  reworkQty: number;
  scrapQty: number;
  remarks?: string;
  shiftName?: string;
  machineName?: string;
  measurements: PqcMeasurement[];
}

export interface QualityReportOperation {
  operationId: string;
  operationName: string;
  sequenceOrder: number;
  batches: PqcBatchLog[];
  configuredParameters?: PqcMeasurement[];
}

export interface ApprovalDto {
  shiftId: string;
  inspectionDate: string;
  inspectorName: string;
  signature: string;
  approvedAt: string;
}

export interface QualityReportDto {
  poId: string;
  poNumber: string;
  customerName: string;
  gaugeId: string;
  serialNumber: string;
  partName: string;
  targetQuantity: number;
  reportType: string;
  generatedAt: string;
  customerLogo?: string;
  docNo?: string;
  revNo?: string;
  issueDate?: string;
  approvals: ApprovalDto[];
  operations: QualityReportOperation[];
}
