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
  isCalibrationWorker?: boolean;
  department?: string;
  phone?: string;
  signatureUrl?: string;
}

export interface PurchaseOrder {
  customerName: string;
  id: string;
  poNumber: string;
  customerPoNumber?: string;
  customerSrNumber?: string;
  manufactureNumber?: string;
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
  customerSrNumber?: string;
  manufactureNumber?: string;
  materialGrade?: string;
  batchQuantity: number;
  status: GaugeStatus;
  rejectionCount: number;
  qrCodePath?: string;
  historyCardPath?: string;
  isCalibrationApproved?: boolean;
  approvedByAdminName?: string;
  approvedByAdminSign?: string;
  calibratorName?: string;
  calibratorSign?: string;
  purchaseOrder?: Partial<PurchaseOrder>;
  createdAt: string;
}

export interface GaugeOperation {
  id: string;
  operationName: string;
  sequenceOrder: number;
  status: OperationStatus;
  operationMaster?: { id: string; operationName: string; isCalibration?: boolean };
  assignedTo?: { id: string; fullName: string; employeeCode: string };
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

export interface CalibrationObservation {
  id: string;
  gaugeOperationId: string;
  gaugeId: string;
  unitNumber: number;
  nominalGo: number;
  nominalNogo: number;
  specifiedGoPlus: number;
  specifiedGoMinus: number;
  specifiedNogoPlus: number;
  specifiedNogoMinus: number;
  wearLimit?: number;
  observedGo: number | string | null;
  observedNogo: number | string | null;
  result: 'PENDING' | 'PASS' | 'FAIL';
  remarks?: string;
  recordedBy?: any;
  recordedAt?: string;
  createdAt?: string;
  higherSize: number | null;
  lowerSize: number | null;
}

