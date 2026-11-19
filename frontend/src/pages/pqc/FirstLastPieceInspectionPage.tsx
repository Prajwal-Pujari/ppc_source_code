import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pqcApi } from '@/api/pqc.api';
import api from '@/lib/axios';
import { shiftsApi, type FactoryShift } from '@/api/shifts.api';
import { machinesApi, type MachineMaster } from '@/api/machines.api';
import { getMyTasks } from '@/api/analytics.api';
import { pieceQuestionSetsApi, type PieceQuestionSet, type PieceQuestion } from '@/api/pieceQuestionSets.api';
import type { GaugeOperation, PqcQuestionSet, PqcQuestion, CompletionProgress } from '@/types/domain.types';
import { completeOperation } from '@/api/gauge-operations.api';
import { useNotificationStore } from '@/store/notificationStore';
import { useUiStore } from '@/store/uiStore';
import {
  ShieldCheck,
  Flag,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Building2,
  Package,
  Wrench,
  PlayCircle,
  Briefcase,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ACCENTS = ['#8B6914', '#4A6FA5', '#6B5A8B', '#3A6B4A', '#8B3A3A', '#C68B2F', '#2D6A7E', '#7A5C3E'];

function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px',
      borderRadius: 8,
      background: color + '0D',
      border: `1px solid ${color}25`,
    }}>
      <Icon size={13} color={color} />
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', lineHeight: 1 }}>{label}</span>
        <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

export default function FirstLastPieceInspectionPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => {
    setPageTitle('1st & Last Piece Inspection');
  }, [setPageTitle]);

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Mode: FIRST_PIECE vs LAST_PIECE
  const [inspectionMode, setInspectionMode] = useState<'FIRST_PIECE' | 'LAST_PIECE'>('FIRST_PIECE');

  // Directory & Hierarchy state (like in Job Card)
  const [clientSearch, setClientSearch] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);
  const [activePartKey, setActivePartKey] = useState<string | null>(null);
  const [activeOpId, setActiveOpId] = useState<string | null>(null);

  // Shift & Machine
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string | undefined>(undefined);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>(undefined);

  // Form State
  const [overallResult, setOverallResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [rejectionReason, setRejectionReason] = useState<string>('Dimensional OOT');
  const [rejectionAction, setRejectionAction] = useState<'REWORK' | 'SCRAP'>('REWORK');
  const [remarks, setRemarks] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, { status: 'PASS' | 'FAIL'; actualValue?: string; remarks?: string }>>({});

  // Fetch active shifts and auto-select
  useEffect(() => {
    shiftsApi.getAll().then((res) => {
      const activeShifts = (res.data || []).filter((s) => s.isActive !== false);
      setShifts(activeShifts);

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;

      for (const shift of activeShifts) {
        let start = shift.startTime;
        let end = shift.endTime;
        if (Array.isArray(start)) start = `${String(start[0]).padStart(2, '0')}:${String(start[1]).padStart(2, '0')}:00`;
        if (Array.isArray(end)) end = `${String(end[0]).padStart(2, '0')}:${String(end[1]).padStart(2, '0')}:00`;

        const endsAtMidnight = end === '00:00:00' || end === '24:00:00';
        if (endsAtMidnight && currentTimeStr >= start) {
          setSelectedShiftId(shift.id);
          break;
        } else if (start <= end && currentTimeStr >= start && currentTimeStr <= end) {
          setSelectedShiftId(shift.id);
          break;
        } else if (start > end && (currentTimeStr >= start || currentTimeStr <= end)) {
          setSelectedShiftId(shift.id);
          break;
        }
      }
      if (!selectedShiftId && activeShifts.length > 0) {
        setSelectedShiftId(activeShifts[0].id);
      }
    }).catch(console.error);

    machinesApi.getAll().then((res) => {
      setMachines(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedMachineId(res.data[0].id);
      }
    }).catch(console.error);
  }, []);

  // Fetch operations (fetches all factory operations with fallback to getMyTasks)
  // Fetch active operations (strictly excludes COMPLETED operations & COMPLETED gauges from /pqc/inspect)
  const { data: operations, isLoading: isOpsLoading } = useQuery({
    queryKey: ['piece-active-operations'],
    queryFn: async () => {
      let list: GaugeOperation[] = [];
      try {
        const res = await api.get('/gauge-operations', {
          params: { statuses: 'PENDING,QUEUED,IN_PROGRESS,REWORK' }
        });
        list = res.data?.data || res.data || [];
      } catch (e) {
        console.warn('Fallback to getMyTasks for operations', e);
        const myRes = await getMyTasks();
        list = (myRes.data || []) as GaugeOperation[];
      }

      // Filter out any completed operations or jobs where all operations were completed in /pqc/inspect
      return (list || []).filter((op: any) => {
        const opCompleted = op.status === 'COMPLETED' || op.status === 'SKIPPED';
        const gaugeCompleted = op.gauge?.status === 'COMPLETED';
        return !opCompleted && !gaugeCompleted;
      });
    },
    refetchInterval: 10000,
  });

  // Build hierarchical client directory tree (exact Job Card design)
  const clientTree = useMemo(() => {
    if (!operations || operations.length === 0) return [];

    const map: Record<string, {
      name: string;
      partsMap: Record<string, {
        key: string;
        partName: string;
        serialNumber: string;
        poNumber: string;
        operations: GaugeOperation[];
      }>;
      posSet: Set<string>;
      totalOps: number;
      completedOps: number;
      inProgressOps: number;
    }> = {};

    for (const op of operations) {
      const cust = (op.gauge as any)?.purchaseOrder?.customer?.name ||
                   (op.gauge as any)?.purchaseOrder?.customerName ||
                   'Standard / Internal';
      const partName = (op.gauge as any)?.gaugeMaster?.partName ||
                       (op.gauge as any)?.partName ||
                       op.gauge?.gaugeTypeName ||
                       'Part';
      const serial = op.gauge?.serialNumber || 'N/A';
      const po = (op.gauge as any)?.purchaseOrder?.poNumber ||
                 (op.gauge as any)?.purchaseOrder?.orderNumber ||
                 'No PO';
      const partKey = `${partName}__${serial}__${po}`;

      if (!map[cust]) {
        map[cust] = {
          name: cust,
          partsMap: {},
          posSet: new Set<string>(),
          totalOps: 0,
          completedOps: 0,
          inProgressOps: 0,
        };
      }

      if (!map[cust].partsMap[partKey]) {
        map[cust].partsMap[partKey] = {
          key: partKey,
          partName,
          serialNumber: serial,
          poNumber: po,
          operations: [],
        };
      }

      map[cust].partsMap[partKey].operations.push(op);
      map[cust].totalOps++;
      map[cust].posSet.add(po);

      if (op.status === 'COMPLETED') map[cust].completedOps++;
      if (op.status === 'IN_PROGRESS') map[cust].inProgressOps++;
    }

    return Object.values(map)
      .map((c) => ({
        name: c.name,
        pos: Array.from(c.posSet),
        parts: Object.values(c.partsMap),
        totalOps: c.totalOps,
        completedOps: c.completedOps,
        inProgressOps: c.inProgressOps,
      }))
      .sort((a, b) => b.inProgressOps - a.inProgressOps || b.totalOps - a.totalOps);
  }, [operations]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clientTree;
    const term = clientSearch.toLowerCase();
    return clientTree.filter((c) => {
      const matchClient = c.name.toLowerCase().includes(term);
      const matchPart = c.parts.some((p) =>
        p.partName.toLowerCase().includes(term) ||
        p.serialNumber.toLowerCase().includes(term) ||
        p.poNumber.toLowerCase().includes(term) ||
        p.operations.some((op) => op.operationName.toLowerCase().includes(term))
      );
      return matchClient || matchPart;
    });
  }, [clientTree, clientSearch]);

  // Auto-select first customer if none selected or invalid
  useEffect(() => {
    if (clientTree.length > 0) {
      if (!activeCustomer || !clientTree.some((c) => c.name === activeCustomer)) {
        const firstClient = clientTree[0];
        setActiveCustomer(firstClient.name);
        if (firstClient.parts.length > 0) {
          const firstPart = firstClient.parts[0];
          setActivePartKey(firstPart.key);
          if (firstPart.operations.length > 0) {
            setActiveOpId(firstPart.operations[0].id);
          }
        }
      }
    }
  }, [clientTree, activeCustomer]);

  // Current selected customer
  const currentCustomer = useMemo(() => {
    return clientTree.find((c) => c.name === activeCustomer) || clientTree[0] || null;
  }, [clientTree, activeCustomer]);

  // Available parts for the active customer
  const availableParts = useMemo(() => {
    return currentCustomer?.parts || [];
  }, [currentCustomer]);

  // Auto-select first part when customer changes or activePartKey invalid
  useEffect(() => {
    if (availableParts.length > 0) {
      if (!activePartKey || !availableParts.some((p) => p.key === activePartKey)) {
        const firstPart = availableParts[0];
        setActivePartKey(firstPart.key);
        if (firstPart.operations.length > 0) {
          setActiveOpId(firstPart.operations[0].id);
        }
      }
    } else {
      setActivePartKey(null);
      setActiveOpId(null);
    }
  }, [availableParts, activePartKey]);

  // Current selected part
  const currentPart = useMemo(() => {
    return availableParts.find((p) => p.key === activePartKey) || availableParts[0] || null;
  }, [availableParts, activePartKey]);

  // Available operations for the active part
  const availableOperations = useMemo(() => {
    return currentPart?.operations || [];
  }, [currentPart]);

  // Auto-select first operation when part changes or activeOpId invalid
  useEffect(() => {
    if (availableOperations.length > 0) {
      if (!activeOpId || !availableOperations.some((op) => op.id === activeOpId)) {
        setActiveOpId(availableOperations[0].id);
      }
    } else {
      setActiveOpId(null);
    }
  }, [availableOperations, activeOpId]);

  // Currently selected operation object
  const selectedOp = useMemo(() => {
    return availableOperations.find((op) => op.id === activeOpId) ||
           operations?.find((op) => op.id === activeOpId) || null;
  }, [availableOperations, operations, activeOpId]);

  // Auto-set planned machine when operation changes
  useEffect(() => {
    if (selectedOp?.machineMaster?.id) {
      setSelectedMachineId(selectedOp.machineMaster.id);
    }
  }, [selectedOp]);

  // Fetch cumulative progress for selected op
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['op-progress', activeOpId, selectedShiftId],
    queryFn: async () => {
      if (!activeOpId) return null;
      const res = await pqcApi.getCompletionProgress(activeOpId, selectedShiftId);
      return res.data as CompletionProgress;
    },
    enabled: !!activeOpId,
  });

  // Fetch Dedicated Piece Question Set for selected operation & active mode (FIRST_PIECE vs LAST_PIECE)
  const { data: pieceQuestionSet, isLoading: isPieceQSetLoading } = useQuery({
    queryKey: ['piece-question-set', selectedOp?.operationMaster?.id, inspectionMode, (selectedOp?.gauge as any)?.gaugeMaster?.id],
    queryFn: async () => {
      if (!selectedOp?.operationMaster?.id) return null;
      const res = await pieceQuestionSetsApi.getByOperation(
        selectedOp.operationMaster.id,
        inspectionMode,
        (selectedOp?.gauge as any)?.gaugeMaster?.id
      );
      return res.data as PieceQuestionSet | null;
    },
    enabled: !!selectedOp?.operationMaster?.id,
  });

  // Fallback to regular question set if no dedicated piece checklist configured yet
  const { data: fallbackInProcessSet, isLoading: isFallbackLoading } = useQuery({
    queryKey: ['fallback-pqc-set', selectedOp?.operationMaster?.id, (selectedOp?.gauge as any)?.gaugeMaster?.id],
    queryFn: async () => {
      if (!selectedOp?.operationMaster?.id) return null;
      const res = await pqcApi.getQuestionSetByOperation(
        selectedOp.operationMaster.id,
        (selectedOp?.gauge as any)?.gaugeMaster?.id
      );
      return res.data;
    },
    enabled: !!selectedOp?.operationMaster?.id && !pieceQuestionSet,
  });

  const activeQuestions = useMemo(() => {
    if (pieceQuestionSet?.questions && pieceQuestionSet.questions.length > 0) {
      return pieceQuestionSet.questions;
    }
    // Fallback if not configured yet
    if (fallbackInProcessSet?.questions && fallbackInProcessSet.questions.length > 0) {
      return fallbackInProcessSet.questions;
    }
    return [];
  }, [pieceQuestionSet, fallbackInProcessSet]);

  const isQSetLoading = isPieceQSetLoading || (isFallbackLoading && !pieceQuestionSet);

  // Initialize question answers defaults whenever questions change
  useEffect(() => {
    if (activeQuestions.length > 0) {
      const initial: Record<string, { status: 'PASS' | 'FAIL'; actualValue?: string; remarks?: string }> = {};
      activeQuestions.forEach((q) => {
        initial[q.id!] = {
          status: 'PASS',
          actualValue: q.expectedAnswer || (q.minValue != null ? String(q.minValue) : ''),
          remarks: ''
        };
      });
      setQuestionAnswers(initial);
      setOverallResult('PASS');
    }
  }, [activeQuestions]);

  // Reset form
  const handleResetForm = () => {
    setOverallResult('PASS');
    setRemarks('');
    if (activeQuestions.length > 0) {
      const initial: Record<string, { status: 'PASS' | 'FAIL'; actualValue?: string; remarks?: string }> = {};
      activeQuestions.forEach((q) => {
        initial[q.id!] = {
          status: 'PASS',
          actualValue: q.expectedAnswer || (q.minValue != null ? String(q.minValue) : ''),
          remarks: ''
        };
      });
      setQuestionAnswers(initial);
    }
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOp) throw new Error('No operation selected');

      const isFailed = overallResult === 'FAIL';
      const actualQty = 1;
      const passedQty = isFailed ? 0 : 1;
      const rejectedQty = isFailed ? 1 : 0;
      const reworkQty = isFailed && rejectionAction === 'REWORK' ? 1 : 0;
      const scrapQty = isFailed && rejectionAction === 'SCRAP' ? 1 : 0;

      const answersArray = Object.entries(questionAnswers).map(([qId, ans]) => {
        const qDef = activeQuestions.find((q) => q.id === qId);
        return {
          questionId: qId,
          questionText: qDef?.questionText || '',
          questionType: qDef?.questionType || 'PASS_FAIL',
          expectedAnswer: qDef?.expectedAnswer,
          minValue: qDef?.minValue,
          maxValue: qDef?.maxValue,
          unit: qDef?.unit,
          checkingMethod: (qDef as any)?.checkingMethod || 'Visual',
          status: ans.status,
          actualValue: ans.actualValue,
          remarks: ans.remarks,
        };
      });

      const escReason = isFailed
        ? `${inspectionMode === 'FIRST_PIECE' ? 'First' : 'Last'} piece failed inspection: ${rejectionReason}`
        : undefined;

      const payload = {
        gaugeOperationId: selectedOp.id,
        shiftId: selectedShiftId,
        machineId: selectedMachineId,
        actualQty,
        passedQty,
        rejectedQty,
        reworkQty,
        scrapQty,
        rejectionReasons: isFailed ? [{ reason: rejectionReason, count: 1 }] : [],
        questionAnswers: answersArray,
        remarks,
        slotIndex: 0,
        inspectionType: inspectionMode,
        isEscalated: isFailed,
        escalationReason: escReason,
      };

      const res = await pqcApi.logInspection(payload);
      const progressRes = await pqcApi.getCompletionProgress(selectedOp.id, selectedShiftId);
      return { inspection: res, progress: progressRes.data, isFailed, escReason };
    },
    onSuccess: (data) => {
      const label = inspectionMode === 'FIRST_PIECE' ? 'First Piece' : 'Last Piece';
      const progress = data?.progress;
      const wasAutoCompleted = progress && progress.plannedQty > 0 && progress.totalPassedQty >= progress.plannedQty;

      if (wasAutoCompleted) {
        toast.success(`Operation Completed: Production target of ${progress.plannedQty} reached! Operation closed.`);
        addNotification(
          'Operation Completed',
          `${selectedOp?.operationName || 'Operation'} auto-completed - ${progress.totalPassedQty}/${progress.plannedQty} passed. Operation closed.`,
          'success'
        );
        setActiveOpId(null);
        handleResetForm();
      } else {
        if (overallResult === 'PASS') {
          toast.success(`${label} Inspection verified as PASSED!`);
          addNotification(
            `${label} Inspection Passed`,
            `${label} inspection for ${selectedOp?.operationName} was approved.`,
            'success'
          );
        } else {
          toast.error(`${label} Inspection recorded as FAILED. NC record created.`);
          addNotification(
            `${label} Inspection Failed`,
            `${label} failed: ${rejectionReason}. Escalation raised.`,
            'error'
          );
        }
        handleResetForm();
      }

      refetchProgress();
      queryClient.invalidateQueries({ queryKey: ['piece-active-operations'] });
      queryClient.invalidateQueries({ queryKey: ['active-operations'] });
      queryClient.invalidateQueries({ queryKey: ['piece-inspection-logs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit inspection');
    }
  });

  // Manual Close Operation Mutation (When Production is Reached)
  const completeOpMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOp) throw new Error('No operation selected');
      return completeOperation(selectedOp.id, {
        remarks: `Closed from PQC Piece Inspection - Production reached (${progress?.totalPassedQty || 0}/${progress?.plannedQty || selectedOp.gauge?.batchQuantity || 0} passed)`
      });
    },
    onSuccess: () => {
      toast.success(`Operation "${selectedOp?.operationName}" completed & closed!`);
      addNotification(
        'Operation Completed',
        `Operation "${selectedOp?.operationName}" closed - ${progress?.totalPassedQty || 0}/${progress?.plannedQty || 0} passed.`,
        'success'
      );
      setActiveOpId(null);
      handleResetForm();
      queryClient.invalidateQueries({ queryKey: ['piece-active-operations'] });
      queryClient.invalidateQueries({ queryKey: ['active-operations'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to close operation');
    }
  });

  return (
    <div style={{
      display: 'flex',
      gap: 0,
      height: 'calc(100vh - var(--header-height, 60px) - 36px)',
      overflow: 'hidden',
      backgroundColor: 'var(--bone-white, #FAF8F5)',
      borderRadius: 12,
      border: '1px solid var(--silk, #E8E2D9)'
    }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  LEFT SIDEBAR: Customer Directory (Job Card Sidebar Style)
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{
        width: 330,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--silk, #E8E2D9)',
        background: '#FFFFFF',
        borderRadius: '12px 0 0 12px',
        overflow: 'hidden',
      }}>
        {/* Search */}
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone, #C8C2B8)' }} />
            <input
              type="text"
              className="input"
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: 12,
                height: 38,
                fontSize: 12,
                borderRadius: 8,
                background: 'var(--bone-white, #FAF8F5)',
                border: '1px solid var(--silk, #E8E2D9)',
                color: 'var(--charcoal, #1C1A18)',
                outline: 'none'
              }}
              placeholder="Search clients, parts..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Directory Title */}
        <div style={{ padding: '4px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ash, #8C857D)' }}>
            Clients ({filteredClients.length})
          </span>
          <span style={{ fontSize: 10, color: 'var(--stone, #C8C2B8)' }}>
            {operations?.length || 0} operations
          </span>
        </div>

        {/* Customer List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {isOpsLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ash, #8C857D)', fontSize: 12 }}>
              Loading clients...
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--ash, #8C857D)', fontSize: 12 }}>
              <CheckCircle2 size={32} style={{ color: '#059669', marginBottom: 8 }} />
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>All Operations Completed</p>
              <p style={{ margin: '4px 0 0', fontSize: 11 }}>No pending piece inspections remaining in queue.</p>
            </div>
          ) : (
            filteredClients.map((customer, idx) => {
              const isActive = activeCustomer === customer.name;
              const accent = ACCENTS[idx % ACCENTS.length];
              const pct = customer.totalOps > 0 ? Math.round((customer.completedOps / customer.totalOps) * 100) : 0;

              return (
                <div key={customer.name} style={{ marginBottom: 6 }}>
                  {/* Customer Card Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCustomer(customer.name);
                      if (customer.parts.length > 0) {
                        setActivePartKey(customer.parts[0].key);
                        if (customer.parts[0].operations.length > 0) {
                          setActiveOpId(customer.parts[0].operations[0].id);
                        } else {
                          setActiveOpId(null);
                        }
                      } else {
                        setActivePartKey(null);
                        setActiveOpId(null);
                      }
                      handleResetForm();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isActive ? 'var(--bone-white, #FAF8F5)' : 'transparent',
                      boxShadow: isActive ? '0 2px 8px rgba(139,105,20,0.06)' : 'none',
                      transition: 'all 0.15s ease',
                      borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                        border: `1.5px solid ${accent}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        color: accent,
                      }}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <p style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: isActive ? 'var(--charcoal, #1C1A18)' : 'var(--slate, #4A4540)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {customer.name}
                          </p>
                          {isActive ? (
                            <ChevronDown size={14} style={{ color: accent, flexShrink: 0 }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: 'var(--stone, #C8C2B8)', flexShrink: 0 }} />
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 3, fontSize: 10, color: 'var(--ash, #8C857D)' }}>
                          <span>{customer.parts.length} Part{customer.parts.length !== 1 ? 's' : ''}</span>
                          <span>&bull;</span>
                          <span>{customer.totalOps} Active Op{customer.totalOps !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Parts & Operations Hierarchy right in the sidebar after selecting customer */}
                  {isActive && (
                    <div style={{
                      marginTop: 4,
                      marginLeft: 14,
                      paddingLeft: 10,
                      borderLeft: `2px dashed ${accent}40`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      paddingTop: 4,
                      paddingBottom: 4
                    }}>
                      {customer.parts.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)', fontStyle: 'italic', padding: '6px 8px' }}>
                          No active operations for this client.
                        </div>
                      ) : (
                        customer.parts.map((part) => {
                          const isPartActive = activePartKey === part.key;
                          return (
                            <div key={part.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {/* Part Header in Sidebar */}
                              <div
                                onClick={() => {
                                  setActivePartKey(part.key);
                                  if (part.operations.length > 0) {
                                    setActiveOpId(part.operations[0].id);
                                  }
                                  handleResetForm();
                                }}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  backgroundColor: isPartActive ? 'rgba(139,105,20,0.08)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 6,
                                  border: isPartActive ? '1px solid rgba(139,105,20,0.2)' : '1px solid transparent'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                  <Package size={12} style={{ color: isPartActive ? 'var(--copper-bronze, #8B6914)' : 'var(--ash, #8C857D)', flexShrink: 0 }} />
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: isPartActive ? 'var(--copper-bronze, #8B6914)' : 'var(--charcoal, #1C1A18)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'block'
                                    }}>
                                      {part.partName}
                                    </span>
                                    <span style={{ fontSize: 9, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace", display: 'block' }}>
                                      SN: {part.serialNumber} {part.poNumber !== 'No PO' ? `• PO: ${part.poNumber}` : ''}
                                    </span>
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  backgroundColor: isPartActive ? '#FEF3C7' : 'var(--linen, #EEE9E1)',
                                  color: isPartActive ? '#92400E' : 'var(--ash, #8C857D)',
                                  flexShrink: 0
                                }}>
                                  {part.operations.length}
                                </span>
                              </div>

                              {/* Operations List under this Part in Sidebar */}
                              <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {part.operations.map((op) => {
                                  const isOpActive = activeOpId === op.id;
                                  const isInProg = op.status === 'IN_PROGRESS';
                                  return (
                                    <button
                                      key={op.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePartKey(part.key);
                                        setActiveOpId(op.id);
                                        handleResetForm();
                                      }}
                                      style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '5px 8px',
                                        borderRadius: 6,
                                        border: isOpActive ? '1.5px solid #2563EB' : '1px solid transparent',
                                        backgroundColor: isOpActive ? '#EFF6FF' : 'transparent',
                                        boxShadow: isOpActive ? '0 1px 3px rgba(37,99,235,0.15)' : 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 6,
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                        <Wrench size={11} style={{ color: isOpActive ? '#2563EB' : 'var(--ash, #8C857D)', flexShrink: 0 }} />
                                        <span style={{
                                          fontSize: 11,
                                          fontWeight: isOpActive ? 700 : 500,
                                          color: isOpActive ? '#1E40AF' : 'var(--charcoal, #1C1A18)',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          #{op.sequenceOrder} {op.operationName}
                                        </span>
                                      </div>
                                      <span style={{
                                        fontSize: 8,
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        backgroundColor: isInProg ? '#FEF3C7' : '#F3F4F6',
                                        color: isInProg ? '#92400E' : '#6B7280',
                                        flexShrink: 0
                                      }}>
                                        {op.status}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  RIGHT PANEL: Customer Header + Part/Op Dropdowns + Inspection Entry Form
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bone-white, #FAF8F5)' }}>
        {!currentCustomer ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash, #8C857D)' }}>
            <div style={{ textAlign: 'center' }}>
              <Briefcase size={44} style={{ color: 'var(--stone, #C8C2B8)', marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>Select a client to view and inspect operations</p>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Customer Top Header */}
            <div style={{
              padding: '16px 24px',
              background: '#FFFFFF',
              borderBottom: '1px solid var(--silk, #E8E2D9)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', margin: 0 }}>
                    {currentCustomer.name}
                  </h2>
                </div>
                <p style={{ fontSize: 12, color: 'var(--ash, #8C857D)', margin: '4px 0 0' }}>
                  {currentCustomer.pos.length} purchase order{currentCustomer.pos.length !== 1 ? 's' : ''} &bull; {currentCustomer.parts.length} part{currentCustomer.parts.length !== 1 ? 's' : ''} &bull; {currentCustomer.totalOps} operations
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* Stats Chips (Job Card Style) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatChip icon={PlayCircle} label="Active" value={currentCustomer.inProgressOps} color="#C68B2F" />
                  <StatChip icon={CheckCircle2} label="Done" value={currentCustomer.completedOps} color="#3A6B4A" />
                  <StatChip icon={Layers} label="Total Ops" value={currentCustomer.totalOps} color="#4A6FA5" />
                </div>

                {/* Inspection Mode Switcher */}
                <div style={{
                  display: 'flex',
                  backgroundColor: 'var(--linen, #EEE9E1)',
                  padding: 3,
                  borderRadius: 8,
                  border: '1px solid var(--silk, #E8E2D9)',
                  gap: 3,
                }}>
                <button
                  type="button"
                  onClick={() => {
                    setInspectionMode('FIRST_PIECE');
                    handleResetForm();
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: inspectionMode === 'FIRST_PIECE' ? '#1D4ED8' : 'transparent',
                    color: inspectionMode === 'FIRST_PIECE' ? '#FFFFFF' : 'var(--charcoal, #1C1A18)',
                    boxShadow: inspectionMode === 'FIRST_PIECE' ? '0 2px 4px rgba(29, 78, 216, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Sparkles size={14} />
                  <span>1st Piece Inspection</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectionMode('LAST_PIECE');
                    handleResetForm();
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: inspectionMode === 'LAST_PIECE' ? '#B45309' : 'transparent',
                    color: inspectionMode === 'LAST_PIECE' ? '#FFFFFF' : 'var(--charcoal, #1C1A18)',
                    boxShadow: inspectionMode === 'LAST_PIECE' ? '0 2px 4px rgba(180, 83, 9, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Flag size={14} />
                  <span>Last Piece Inspection</span>
                </button>
              </div>
            </div>
            </div>

            {/* 2. Part Name & Operation Dropdowns Row (Exactly what inspector needs to pick easily) */}
            <div style={{
              padding: '12px 24px',
              backgroundColor: 'var(--warm-white, #F5F2ED)',
              borderBottom: '1px solid var(--silk, #E8E2D9)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              alignItems: 'center'
            }}>
              {/* Part Name Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={13} style={{ color: '#B45309' }} />
                  <span>Part Name / Job</span>
                </label>
                <select
                  value={activePartKey || ''}
                  onChange={(e) => {
                    const newPartKey = e.target.value;
                    setActivePartKey(newPartKey);
                    const partObj = availableParts.find((p) => p.key === newPartKey);
                    if (partObj && partObj.operations.length > 0) {
                      setActiveOpId(partObj.operations[0].id);
                    } else {
                      setActiveOpId(null);
                    }
                    handleResetForm();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--silk, #E8E2D9)',
                    backgroundColor: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--charcoal, #1C1A18)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableParts.length === 0 ? (
                    <option value="">No parts found for this client</option>
                  ) : (
                    availableParts.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.partName} — SN: {p.serialNumber} (PO: {p.poNumber}) [{p.operations.length} ops]
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Operation Dropdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Wrench size={13} style={{ color: '#059669' }} />
                  <span>Operation</span>
                </label>
                <select
                  value={activeOpId || ''}
                  onChange={(e) => {
                    setActiveOpId(e.target.value);
                    handleResetForm();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--silk, #E8E2D9)',
                    backgroundColor: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--charcoal, #1C1A18)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {availableOperations.length === 0 ? (
                    <option value="">No operations under this part</option>
                  ) : (
                    availableOperations.map((op) => (
                      <option key={op.id} value={op.id}>
                        Op #{op.sequenceOrder}: {op.operationName} [{op.status}]
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* 3. Main Inspection Work Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {selectedOp ? (
                <>
                  {/* Operation Banner */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid var(--silk, #E8E2D9)',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontFamily: "'JetBrains Mono', monospace",
                          backgroundColor: inspectionMode === 'FIRST_PIECE' ? '#DBEAFE' : '#FEF3C7',
                          color: inspectionMode === 'FIRST_PIECE' ? '#1E40AF' : '#92400E',
                          border: inspectionMode === 'FIRST_PIECE' ? '1px solid #93C5FD' : '1px solid #FCD34D'
                        }}>
                          {inspectionMode === 'FIRST_PIECE' ? (
                            <>
                              <ShieldCheck size={12} />
                              <span>1ST PIECE LIVE ENTRY</span>
                            </>
                          ) : (
                            <>
                              <Flag size={12} />
                              <span>LAST PIECE LIVE ENTRY</span>
                            </>
                          )}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                          PO: {(selectedOp.gauge as any)?.purchaseOrder?.poNumber || (selectedOp.gauge as any)?.purchaseOrder?.orderNumber || 'N/A'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 0', color: 'var(--charcoal, #1C1A18)' }}>
                        {selectedOp.operationName}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--slate, #4A4540)', marginTop: 2 }}>
                        Part: <strong>{(selectedOp.gauge as any)?.partName || selectedOp.gauge?.gaugeTypeName || 'N/A'}</strong> &bull; Serial: <strong>{selectedOp.gauge?.serialNumber || 'N/A'}</strong>
                      </div>
                    </div>

                    {/* Shift & Machine Selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ash, #8C857D)' }}>
                          <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                          Shift
                        </label>
                        <select
                          value={selectedShiftId || ''}
                          onChange={(e) => setSelectedShiftId(e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: 'var(--warm-white, #F5F2ED)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--charcoal, #1C1A18)',
                            outline: 'none'
                          }}
                        >
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>{s.shiftName}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--ash, #8C857D)' }}>
                          <Cpu size={11} style={{ display: 'inline', marginRight: 3 }} />
                          Machine
                        </label>
                        <select
                          value={selectedMachineId || ''}
                          onChange={(e) => setSelectedMachineId(e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: 'var(--warm-white, #F5F2ED)',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--charcoal, #1C1A18)',
                            outline: 'none'
                          }}
                        >
                          {machines.map((m) => (
                            <option key={m.id} value={m.id}>{m.machineName} ({m.machineCode})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Previous Progress Banner */}
                  {progress && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      borderRadius: 8,
                      backgroundColor: 'var(--linen, #EEE9E1)',
                      border: '1px solid var(--silk, #E8E2D9)',
                      fontSize: 11,
                      color: 'var(--charcoal, #1C1A18)',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div>
                          <span style={{ color: 'var(--ash, #8C857D)' }}>1st Piece: </span>
                          <strong style={{
                            color: progress.firstPiece?.status === 'PASSED' ? '#2E7D32' :
                                   progress.firstPiece?.status === 'FAILED' ? '#C62828' : '#1D4ED8'
                          }}>
                            {progress.firstPiece?.status || 'PENDING'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--ash, #8C857D)' }}>Last Piece: </span>
                          <strong style={{
                            color: progress.lastPiece?.status === 'PASSED' ? '#2E7D32' :
                                   progress.lastPiece?.status === 'FAILED' ? '#C62828' : '#B45309'
                          }}>
                            {progress.lastPiece?.status || 'PENDING'}
                          </strong>
                        </div>
                      </div>
                      <div style={{ color: 'var(--slate, #4A4540)' }}>
                        Batch Output: {progress.totalPassedQty}/{progress.plannedQty} units passed
                      </div>
                    </div>
                  )}

                  {/* Production Target Reached Banner with Close Operation Action */}
                  {progress && progress.plannedQty > 0 && progress.totalPassedQty >= progress.plannedQty && (
                    <div style={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderLeft: '4px solid #16A34A',
                      borderRadius: 8,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle2 size={20} style={{ color: '#16A34A', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                            Production Target Reached ({progress.totalPassedQty}/{progress.plannedQty} Units Passed)
                          </div>
                          <div style={{ fontSize: 12, color: '#15803D' }}>
                            Target quantity is achieved. Close this operation to complete the process and advance the job card.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={completeOpMutation.isPending}
                        onClick={() => completeOpMutation.mutate()}
                        style={{
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '8px 16px',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: completeOpMutation.isPending ? 'not-allowed' : 'pointer',
                          border: 'none',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          flexShrink: 0
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>{completeOpMutation.isPending ? 'Closing Operation...' : 'Close Operation'}</span>
                      </button>
                    </div>
                  )}

                  {/* Sample Verdict Decision Card */}
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    border: '1px solid var(--silk, #E8E2D9)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                          Sample Quantity:
                        </span>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: 6,
                          backgroundColor: 'var(--linen, #EEE9E1)',
                          border: '1px solid var(--silk, #E8E2D9)',
                          fontSize: 12,
                          fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: 'var(--copper-dark, #6F5100)'
                        }}>
                          1 Physical Piece
                        </span>
                      </div>

                      {/* Pass / Fail Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                          Inspection Verdict:
                        </span>
                        <button
                          type="button"
                          onClick={() => setOverallResult('PASS')}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 6,
                            border: overallResult === 'PASS' ? '2px solid #2E7D32' : '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: overallResult === 'PASS' ? '#EBF4EE' : '#FFFFFF',
                            color: overallResult === 'PASS' ? '#2E7D32' : 'var(--ash, #8C857D)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <CheckCircle2 size={15} />
                          PASSED (1 Pc)
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverallResult('FAIL')}
                          style={{
                            padding: '6px 16px',
                            borderRadius: 6,
                            border: overallResult === 'FAIL' ? '2px solid #C62828' : '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: overallResult === 'FAIL' ? '#F8EEEE' : '#FFFFFF',
                            color: overallResult === 'FAIL' ? '#C62828' : 'var(--ash, #8C857D)',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                        >
                          <XCircle size={15} />
                          FAILED (1 Pc)
                        </button>
                      </div>
                    </div>

                    {/* If Failed: Rejection Reason & Action */}
                    {overallResult === 'FAIL' && (
                      <div style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: '#F8EEEE',
                        border: '1px solid #FFCDD2',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#C62828', fontSize: 12, fontWeight: 700 }}>
                          <AlertTriangle size={15} />
                          <span>Failure Escalation & Non-Conformance</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate, #4A4540)', display: 'block', marginBottom: 4 }}>
                              Rejection Reason
                            </label>
                            <select
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: '1px solid #FFCDD2',
                                backgroundColor: '#FFFFFF',
                                fontSize: 12,
                                color: 'var(--charcoal, #1C1A18)'
                              }}
                            >
                              <option value="Dimensional OOT">Dimensional OOT (Out of Tolerance)</option>
                              <option value="Surface Finish Defect">Surface Finish Defect</option>
                              <option value="Tool Marks / Chatter">Tool Marks / Chatter</option>
                              <option value="Material Defect / Porosity">Material Defect / Porosity</option>
                              <option value="Visual Appearance">Visual Appearance</option>
                              <option value="Setup Calibration Error">Setup Calibration Error</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate, #4A4540)', display: 'block', marginBottom: 4 }}>
                              Disposition Action
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => setRejectionAction('REWORK')}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: rejectionAction === 'REWORK' ? '2px solid #E65100' : '1px solid #FFE0B2',
                                  backgroundColor: rejectionAction === 'REWORK' ? '#FFE0B2' : '#FFFFFF',
                                  color: '#E65100'
                                }}
                              >
                                Rework Unit
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectionAction('SCRAP')}
                                style={{
                                  flex: 1,
                                  padding: '6px 12px',
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: rejectionAction === 'SCRAP' ? '2px solid #C62828' : '1px solid #FFCDD2',
                                  backgroundColor: rejectionAction === 'SCRAP' ? '#FFCDD2' : '#FFFFFF',
                                  color: '#C62828'
                                }}
                              >
                                Scrap Unit
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist & Questions Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Layers size={16} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
                        <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--charcoal, #1C1A18)' }}>
                          Inspection Checklist ({activeQuestions.length} parameter{activeQuestions.length === 1 ? '' : 's'})
                        </h4>
                        {pieceQuestionSet ? (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, backgroundColor: '#DBEAFE', color: '#1E40AF', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                            Dedicated Checklist: {pieceQuestionSet.name}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, backgroundColor: 'var(--linen, #EEE9E1)', color: 'var(--ash, #8C857D)', fontWeight: 600 }}>
                            Standard Checklist
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                        {inspectionMode === 'FIRST_PIECE' ? '1st Piece Parameters' : 'Last Piece Parameters'}
                      </span>
                    </div>

                    {isQSetLoading ? (
                      <div style={{ padding: 20, textAlign: 'center', color: 'var(--ash, #8C857D)', fontSize: 12 }}>
                        Loading checklist parameters...
                      </div>
                    ) : activeQuestions.length === 0 ? (
                      <div style={{
                        padding: 24,
                        borderRadius: 8,
                        border: '1px dashed var(--silk, #E8E2D9)',
                        backgroundColor: '#FFFFFF',
                        textAlign: 'center',
                        color: 'var(--ash, #8C857D)',
                        fontSize: 12
                      }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          No specific {inspectionMode === 'FIRST_PIECE' ? '1st Piece' : 'Last Piece'} checklist configured for this operation.
                        </p>
                        <div style={{ marginTop: 8 }}>
                          <a
                            href="/master/piece-question-sets"
                            style={{
                              color: 'var(--copper-bronze, #8B6914)',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              fontSize: 12
                            }}
                          >
                            + Configure in 1st & Last Piece Checklists Master
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {activeQuestions.map((q, idx) => {
                          const ans = questionAnswers[q.id!] || { status: 'PASS', actualValue: '' };
                          const hasTolerance = q.minValue != null || q.maxValue != null;

                          return (
                            <div
                              key={q.id || idx}
                              style={{
                                padding: 14,
                                borderRadius: 8,
                                backgroundColor: ans.status === 'FAIL' ? '#FDF6F6' : '#FFFFFF',
                                border: ans.status === 'FAIL' ? '1px solid #FFCDD2' : '1px solid var(--silk, #E8E2D9)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                                  <span style={{
                                    width: 22,
                                    height: 22,
                                    borderRadius: 11,
                                    backgroundColor: 'var(--linen, #EEE9E1)',
                                    color: 'var(--charcoal, #1C1A18)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                  }}>
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                                      {q.questionText}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                      {hasTolerance && (
                                        <span style={{
                                          fontSize: 11,
                                          fontFamily: "'JetBrains Mono', monospace",
                                          backgroundColor: 'var(--bone-white, #FAF8F5)',
                                          padding: '2px 6px',
                                          borderRadius: 4,
                                          border: '1px solid var(--silk, #E8E2D9)',
                                          color: 'var(--copper-dark, #6F5100)'
                                        }}>
                                          Spec: {q.minValue != null ? q.minValue : '-'} to {q.maxValue != null ? q.maxValue : '-'} {q.unit || 'mm'}
                                        </span>
                                      )}
                                      {q.checkingMethod && (
                                        <span style={{ fontSize: 11, color: 'var(--slate, #4A4540)', fontStyle: 'italic' }}>
                                          Method: {q.checkingMethod}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Question Verdict Buttons */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuestionAnswers((prev) => ({
                                        ...prev,
                                        [q.id!]: { ...ans, status: 'PASS' }
                                      }));
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: ans.status === 'PASS' ? '1.5px solid #2E7D32' : '1px solid var(--silk, #E8E2D9)',
                                      backgroundColor: ans.status === 'PASS' ? '#EBF4EE' : '#FFFFFF',
                                      color: ans.status === 'PASS' ? '#2E7D32' : 'var(--ash, #8C857D)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <Check size={13} />
                                    Pass
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuestionAnswers((prev) => ({
                                        ...prev,
                                        [q.id!]: { ...ans, status: 'FAIL' }
                                      }));
                                      setOverallResult('FAIL');
                                    }}
                                    style={{
                                      padding: '4px 10px',
                                      borderRadius: 6,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      border: ans.status === 'FAIL' ? '1.5px solid #C62828' : '1px solid var(--silk, #E8E2D9)',
                                      backgroundColor: ans.status === 'FAIL' ? '#F8EEEE' : '#FFFFFF',
                                      color: ans.status === 'FAIL' ? '#C62828' : 'var(--ash, #8C857D)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 4
                                    }}
                                  >
                                    <X size={13} />
                                    Fail
                                  </button>
                                </div>
                              </div>

                              {/* Numeric Measurement Input */}
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate, #4A4540)' }}>
                                    Measured Value:
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={q.expectedAnswer || (q.minValue != null ? String(q.minValue) : 'Value...')}
                                    value={ans.actualValue || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuestionAnswers((prev) => ({
                                        ...prev,
                                        [q.id!]: { ...ans, actualValue: val }
                                      }));
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      border: '1px solid var(--silk, #E8E2D9)',
                                      backgroundColor: '#FFFFFF',
                                      fontSize: 12,
                                      width: 110,
                                      fontFamily: "'JetBrains Mono', monospace",
                                      color: 'var(--charcoal, #1C1A18)'
                                    }}
                                  />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Observation / remark (optional)..."
                                  value={ans.remarks || ''}
                                  onChange={(e) => {
                                    const rmk = e.target.value;
                                    setQuestionAnswers((prev) => ({
                                      ...prev,
                                      [q.id!]: { ...ans, remarks: rmk }
                                    }));
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid var(--silk, #E8E2D9)',
                                    backgroundColor: '#FFFFFF',
                                    fontSize: 11,
                                    color: 'var(--charcoal, #1C1A18)'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Inspector Remarks */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'block', marginBottom: 6 }}>
                      Inspector Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter setup observations, tool wear, clamp pressure, or calibration status..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--silk, #E8E2D9)',
                        backgroundColor: '#FFFFFF',
                        fontSize: 12,
                        color: 'var(--charcoal, #1C1A18)',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 10, borderTop: '1px solid var(--silk, #E8E2D9)' }}>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      style={{
                        padding: '10px 18px',
                        borderRadius: 8,
                        border: '1px solid var(--silk, #E8E2D9)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--charcoal, #1C1A18)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <RotateCcw size={15} />
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: inspectionMode === 'FIRST_PIECE' ? '#1D4ED8' : '#B45309',
                        color: '#FFFFFF',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: submitMutation.isPending ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                      }}
                    >
                      <ShieldCheck size={16} />
                      {submitMutation.isPending
                        ? 'Submitting...'
                        : `Submit ${inspectionMode === 'FIRST_PIECE' ? '1st Piece' : 'Last Piece'} Inspection`}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash, #8C857D)' }}>
                  <Layers size={36} style={{ color: 'var(--stone, #C8C2B8)', marginBottom: 8 }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>Please select an operation to begin piece inspection</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
