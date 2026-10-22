import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pqcApi } from '../../api/pqc.api';
import api from '@/lib/axios';
import { useNotificationStore } from '../../store/notificationStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { getMyTasks } from '../../api/analytics.api';
import { shiftsApi, type FactoryShift } from '../../api/shifts.api';
import { machinesApi, type MachineMaster } from '../../api/machines.api';
import type { GaugeOperation, PqcQuestionSet, PqcQuestion, CompletionProgress, HourlyInspectionSlot } from '../../types/domain.types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUnlockModalStore } from '@/store/unlockModalStore';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, AlertTriangle, Clock, Lock, Unlock, ShieldAlert, History, ArrowUpRight } from 'lucide-react';
import InspectorIncidentModal from './InspectorIncidentModal';
import MissedInspectionModal from './MissedInspectionModal';
import HourlyInspectionStack from './HourlyInspectionStack';
import './inspector-live.css';

const REJECTION_REASONS = [
  'Dimensional OOT', 'Surface Finish', 'Tool Marks', 'Material Defect'
];

type WizardStep = 'QTY' | 'QUESTION' | 'SUMMARY';

export function InspectorLiveEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const opIdFromUrl = searchParams.get('opId');
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('PQC Inspections'); }, [setPageTitle]);

  const [selectedShiftId, setSelectedShiftId] = useState<string | undefined>(undefined);
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>(undefined);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'QUEUE' | 'WIZARD'>('QUEUE');

  // Fetch Shifts and Auto-select
  useEffect(() => {
    shiftsApi.getAll().then(res => {
      const allShifts = (res.data || []).filter(s => s.isActive !== false);
      setShifts(allShifts);

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;

      let matchedShiftId = undefined;

      for (const shift of allShifts) {
        let start = shift.startTime;
        let end = shift.endTime;

        // Handle Spring Boot LocalTime array format: [hour, minute]
        if (Array.isArray(start)) start = `${String(start[0]).padStart(2, '0')}:${String(start[1]).padStart(2, '0')}:00`;
        if (Array.isArray(end)) end = `${String(end[0]).padStart(2, '0')}:${String(end[1]).padStart(2, '0')}:00`;

        const endsAtMidnight = end === '00:00:00' || end === '24:00:00';
        if (endsAtMidnight) {
          if (currentTimeStr >= start) {
            matchedShiftId = shift.id;
            break;
          }
        } else if (start <= end) {
          if (currentTimeStr >= start && currentTimeStr <= end) {
            matchedShiftId = shift.id;
            break;
          }
        } else {
          if (currentTimeStr >= start || currentTimeStr <= end) {
            matchedShiftId = shift.id;
            break;
          }
        }
      }

      if (matchedShiftId) {
        setSelectedShiftId(matchedShiftId);
      } else if (allShifts.length > 0) {
        setSelectedShiftId(allShifts[0].id);
      }
    }).catch(console.error);

    machinesApi.getAll().then(res => {
      const allMachines = res.data;
      setMachines(allMachines);
      if (allMachines.length > 0) {
        setSelectedMachineId(allMachines[0].id);
      }
    }).catch(console.error);
  }, []);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('QTY');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  // Data state
  const [actualQty, setActualQty] = useState<number>(0);
  const [passedQty, setPassedQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [scrapQty, setScrapQty] = useState<number>(0);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});

  // Incident reporting state
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentType, setIncidentType] = useState<string>('');
  const [incidentDurationMins, setIncidentDurationMins] = useState<number | undefined>(undefined);
  const [incidentRemarks, setIncidentRemarks] = useState<string>('');

  // Hourly interval lock, slot stacking, and failure escalation states
  const formatForDateInput = (date: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const [selectedShiftDate, setSelectedShiftDate] = useState<string>(() => formatForDateInput(new Date()));
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(1);
  const [isBackfill, setIsBackfill] = useState<boolean>(false);
  const [customLogTime, setCustomLogTime] = useState<string>('');
  const [isSupervisorOverride, setIsSupervisorOverride] = useState<boolean>(false);
  const [showMissedModal, setShowMissedModal] = useState<boolean>(false);
  const [missedSlotData, setMissedSlotData] = useState<HourlyInspectionSlot | null>(null);
  const [hasPromptedMissedForOp, setHasPromptedMissedForOp] = useState<Record<string, boolean>>({});
  const [escalationAlert, setEscalationAlert] = useState<{ show: boolean; message: string; rejectedQty: number } | null>(null);

  // Auto-complete state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionProgress, setCompletionProgress] = useState<CompletionProgress | null>(null);

  const addNotification = useNotificationStore(state => state.addNotification);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  // Restrict interval override privileges strictly to Super Admin and Admin
  const isAdmin = user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role?.toUpperCase().includes('ADMIN');
  const hasStackAuthority = isAdmin || Boolean(user?.canBackfillPqc);

  const { data: operations, isLoading: isOpsLoading } = useQuery({
    queryKey: ['active-operations'],
    queryFn: async () => {
      if (user?.role === 'WORKER') {
        const res = await getMyTasks();
        const ops = res.data as GaugeOperation[] || [];
        return ops.filter(op => op.status === 'IN_PROGRESS');
      } else {
        const res = await api.get('/gauge-operations?statuses=IN_PROGRESS');
        return res.data.data as GaugeOperation[];
      }
    }
  });

  const selectedOp = operations?.find(op => op.id === selectedOpId);

  // Auto-select operation from URL parameter (e.g. from notification alert link)
  useEffect(() => {
    if (opIdFromUrl && operations && operations.length > 0) {
      const match = operations.find(o => o.id === opIdFromUrl);
      if (match) {
        setSelectedOpId(match.id);
        setMobileView('WIZARD');
      }
    }
  }, [opIdFromUrl, operations]);

  // Fetch Question Set for the selected operation and part (GaugeMaster)
  const { data: questionSet, isLoading: isQsLoading } = useQuery({
    queryKey: ['question-set', (selectedOp as any)?.operationMaster?.id, (selectedOp as any)?.gauge?.gaugeMaster?.id],
    queryFn: async () => {
      try {
        if (!(selectedOp as any)?.operationMaster?.id) return null;
        const opMasterId = (selectedOp as any).operationMaster.id;
        const gaugeMasterId = (selectedOp as any).gauge?.gaugeMaster?.id;
        console.log("Fetching Question Set for operation:", opMasterId, "gauge:", gaugeMasterId);
        const res = await pqcApi.getQuestionSetByOperation(
          opMasterId,
          gaugeMasterId
        );
        console.log("Question Set API response:", res);
        return res.data;
      } catch (e) {
        console.error("Failed to fetch Question Set:", e);
        return null;
      }
    },
    enabled: !!selectedOp
  });

  // Fetch cumulative progress for the selected operation and active shift session
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['op-progress', selectedOpId, selectedShiftId, selectedShiftDate],
    queryFn: async () => {
      const res = await pqcApi.getCompletionProgress(selectedOpId!, selectedShiftId, selectedShiftDate);
      return res.data as CompletionProgress;
    },
    enabled: !!selectedOpId,
  });

  const totalTarget = progress?.plannedQty || selectedOp?.gauge?.batchQuantity || 0;
  const totalPassed = progress?.totalPassedQty || 0;
  const totalInspected = progress?.totalActualQty || 0;
  const remaining = Math.max(0, totalTarget - totalPassed);
  const progressPct = totalTarget > 0 ? Math.min(100, Math.round((totalPassed / totalTarget) * 100)) : 0;

  // Real-time ticking countdown for interval unlock (never stuck at 60m)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(progress?.secondsUntilUnlock || 0);
  const notifiedSlotsRef = React.useRef<Record<string, boolean>>({});

  useEffect(() => {
    const sec = progress?.secondsUntilUnlock || 0;
    setCountdownSeconds(sec);
  }, [progress?.secondsUntilUnlock]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          // Countdown reached zero in real time while user was on the page
          refetchProgress();

          const nextSlot = (progress?.totalLoggedSlots || 0) + 1;
          const key = `${selectedOp?.id}_${nextSlot}`;
          if (selectedOp && !notifiedSlotsRef.current[key]) {
            notifiedSlotsRef.current[key] = true;

            // 1. Alert in Notification list
            addNotification(
              'Hourly Inspection Ready',
              `Next hourly inspection is unlocked for ${selectedOp.operationName} (${selectedOp.gauge?.serialNumber || ''}). Click to begin inspection.`,
              'info',
              `/inspection?opId=${selectedOp.id}`
            );

            // 2. Interactive Popup Modal
            useUnlockModalStore.getState().openModal({
              opId: selectedOp.id,
              opName: selectedOp.operationName,
              serialNumber: selectedOp.gauge?.serialNumber || '',
              slotNumber: nextSlot,
            });

            // 3. Desktop Notification (if permitted)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('MES Inspection Ready', {
                body: `Hour ${nextSlot} is ready for inspection on ${selectedOp.operationName} (${selectedOp.gauge?.serialNumber || ''})`,
              });
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdownSeconds, refetchProgress, selectedOp, progress?.totalLoggedSlots, addNotification]);

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return '0s left';
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins === 0) return `${remSecs}s left`;
    return `${mins}m ${remSecs.toString().padStart(2, '0')}s left`;
  };

  // Sync active lock to localStorage for global notification monitor across all pages
  useEffect(() => {
    if (!selectedOp) return;
    try {
      const stored = JSON.parse(localStorage.getItem('mes_inspection_locks') || '{}');
      if (progress?.isLocked && progress.secondsUntilUnlock && progress.secondsUntilUnlock > 0) {
        const nextSlot = (progress.totalLoggedSlots || 0) + 1;
        const targetUnlockTime = progress.unlockTime
          ? new Date(progress.unlockTime).getTime()
          : Date.now() + (progress.secondsUntilUnlock * 1000);

        stored[selectedOp.id] = {
          opId: selectedOp.id,
          opName: selectedOp.operationName,
          serialNumber: selectedOp.gauge?.serialNumber || '',
          firstInspectorId: progress.firstInspectorId || user?.id,
          unlockTimestamp: targetUnlockTime,
          slotNumber: nextSlot,
          notified: false,
        };
        localStorage.setItem('mes_inspection_locks', JSON.stringify(stored));
      } else if (stored[selectedOp.id]) {
        // Operation is unlocked or not locked; clear active lock monitor entry
        delete stored[selectedOp.id];
        localStorage.setItem('mes_inspection_locks', JSON.stringify(stored));
      }
    } catch (e) {
      console.error('Failed to sync inspection lock', e);
    }
  }, [progress?.isLocked, progress?.unlockTime, progress?.secondsUntilUnlock, selectedOp, progress?.firstInspectorId, progress?.totalLoggedSlots, user?.id]);

  // Sync default slot and custom log time when progress or op changes
  useEffect(() => {
    if (progress?.totalLoggedSlots != null) {
      const nextAllowed = (progress.totalLoggedSlots || 0) + 1;
      const targetSlot = Math.min(progress.maxSlots || 8, nextAllowed);
      if (!isBackfill) {
        setSelectedSlotIndex(targetSlot);
      }
    }
  }, [progress?.totalLoggedSlots, progress?.maxSlots, isBackfill]);

  const formatForDateTimeLocal = (date: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    if (isBackfill) {
      const slotObj = progress?.slots?.find(s => s.slotNumber === selectedSlotIndex);
      if (slotObj?.scheduledTime) {
        setCustomLogTime(formatForDateTimeLocal(new Date(slotObj.scheduledTime)));
      } else if (!customLogTime) {
        setCustomLogTime(formatForDateTimeLocal(new Date()));
      }
    } else {
      setCustomLogTime(formatForDateTimeLocal(new Date()));
    }
  }, [isBackfill, selectedSlotIndex, progress?.slots]);



  // Sync latest authority from /users/me
  useEffect(() => {
    api.get('/users/me').then(res => {
      if (res.data?.data) {
        useAuthStore.getState().updateUser({
          canBackfillPqc: Boolean(res.data.data.canBackfillPqc)
        });
      }
    }).catch(() => {});
  }, []);

  // Prompt missed inspection modal when an overdue interval is detected (authority required)
  useEffect(() => {
    if (hasStackAuthority && selectedOpId && progress?.isOverdue && !hasPromptedMissedForOp[selectedOpId]) {
      const missed = progress.slots?.find(s => s.status === 'MISSED');
      if (missed) {
        setMissedSlotData(missed);
        setShowMissedModal(true);
        setHasPromptedMissedForOp(prev => ({ ...prev, [selectedOpId]: true }));
      }
    }
  }, [hasStackAuthority, selectedOpId, progress?.isOverdue, progress?.slots]);

  const resetWizardForm = () => {
    setWizardStep('QTY');
    setCurrentQuestionIdx(0);
    setActualQty(0); setPassedQty(0); setReworkQty(0); setScrapQty(0);
    setSelectedReasons([]); setRemarks(''); setQuestionAnswers({});
    setIncidentType(''); setIncidentDurationMins(undefined); setIncidentRemarks('');
    setIsBackfill(false);
  };

  const handleLogMissedIncident = async (data: { incidentType: string; incidentDurationMins: number; incidentRemarks: string; slotIndex: number }) => {
    if (!selectedOp) return;
    try {
      await pqcApi.logInspection({
        gaugeOperationId: selectedOp.id,
        shiftId: selectedShiftId,
        machineId: selectedMachineId,
        actualQty: 0,
        passedQty: 0,
        rejectedQty: 0,
        reworkQty: 0,
        scrapQty: 0,
        remarks: `Stoppage during Hour ${data.slotIndex}: ${data.incidentType}`,
        incidentType: data.incidentType,
        incidentDurationMins: data.incidentDurationMins,
        incidentRemarks: data.incidentRemarks,
        slotIndex: data.slotIndex,
        isBackfill: true,
      });
      addNotification('Incident Recorded', `Stoppage recorded for Hour ${data.slotIndex}.`, 'success');
      refetchProgress();
    } catch (err: any) {
      addNotification('Error', err.response?.data?.message || err.message, 'error');
    }
  };

  const handleStartBackfill = (slot: HourlyInspectionSlot) => {
    setSelectedSlotIndex(slot.slotNumber);
    setIsBackfill(true);
    addNotification('Backfill Mode', `Ready to log entry for Hour ${slot.slotNumber}. Adjust timing if needed.`, 'info');
  };

  useEffect(() => {
    if (selectedOp) {
      resetWizardForm();
      
      // Auto-select the planned machine
      if (selectedOp.machineMaster?.id) {
        setSelectedMachineId(selectedOp.machineMaster.id);
      }
    }
  }, [selectedOpId, selectedOp]);

  const rejectedQty = reworkQty + scrapQty;
  const calculatedVariance = actualQty - (passedQty + rejectedQty);

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOp) return;

      const answersArray = Object.entries(questionAnswers).map(([qId, answer]) => ({
        questionId: qId,
        answer: answer
      }));

      // Calculate if this batch failed
      const isFailed = (reworkQty + scrapQty) > 0 || Object.values(questionAnswers).some(a => a === 'FAIL');
      const escReason = isFailed
        ? `Quality failure: ${reworkQty + scrapQty} rejected units (${scrapQty} scrap, ${reworkQty} rework).`
        : undefined;

      const nextAllowed = (progress?.totalLoggedSlots || 0) + 1;
      const slotIndexToSubmit = selectedSlotIndex || nextAllowed;

      // Scheduled / Custom timestamp resolution
      let customTimestamp: string | undefined = undefined;
      if (isBackfill) {
        if (customLogTime) {
          try {
            customTimestamp = new Date(customLogTime).toISOString();
          } catch (e) {
            console.error('Invalid custom timestamp', e);
          }
        }
        if (!customTimestamp) {
          const slotObj = progress?.slots?.find(s => s.slotNumber === slotIndexToSubmit);
          if (slotObj?.scheduledTime) {
            customTimestamp = slotObj.scheduledTime;
          }
        }
      }

      const res = await pqcApi.logInspection({
        gaugeOperationId: selectedOp.id,
        shiftId: selectedShiftId,
        machineId: selectedMachineId,
        actualQty, passedQty, rejectedQty, reworkQty, scrapQty,
        rejectionReasons: selectedReasons.map(r => ({ reason: r, count: 1 })),
        questionAnswers: answersArray,
        remarks,
        incidentType: incidentType || undefined,
        incidentDurationMins: incidentDurationMins || undefined,
        incidentRemarks: incidentRemarks || undefined,
        slotIndex: slotIndexToSubmit,
        isBackfill,
        logTime: customTimestamp,
        isEscalated: isFailed,
        escalationReason: escReason,
      });

      const progressRes = await pqcApi.getCompletionProgress(selectedOp.id, selectedShiftId, selectedShiftDate);
      return { inspection: res, progress: progressRes.data, isFailed, escReason };
    },
    onSuccess: (data) => {
      refetchProgress();
      queryClient.invalidateQueries({ queryKey: ['active-operations'] });

      if (data?.isFailed) {
        setEscalationAlert({
          show: true,
          message: `Inspection batch failed with ${rejectedQty} rejected unit(s). An NC Record has been generated and high-priority escalation has been dispatched to the Quality Head & Supervisor.`,
          rejectedQty: rejectedQty,
        });
      }

      const progress = data?.progress;
      const wasAutoCompleted = progress && progress.totalPassedQty >= progress.plannedQty;

      if (wasAutoCompleted) {
        addNotification(
          'Operation Completed',
          `${progress.operationName} auto-completed - ${progress.totalPassedQty}/${progress.plannedQty} passed.`,
          'success'
        );
        setSelectedOpId(null);
        setMobileView('QUEUE');
        resetWizardForm();
      } else {
        const newRemaining = Math.max(0, (progress?.plannedQty || remaining) - (progress?.totalPassedQty || 0));
        addNotification('Inspection Logged', `Hour ${selectedSlotIndex || 1} logged. ${newRemaining} remaining.`, 'success');
        resetWizardForm();
      }
    },
    onError: (err: any) => {
      addNotification('Error', err.response?.data?.message || err.message, 'error');
    }
  });

  const handleNextStep = () => {
    const nextAllowed = (progress?.totalLoggedSlots || 0) + 1;
    if (selectedSlotIndex > nextAllowed) {
      addNotification(
        'Sequential Entry Enforced',
        `Please complete Hour ${nextAllowed} before proceeding to Hour ${selectedSlotIndex}.`,
        'warning'
      );
      return;
    }

    const isIntervalLocked = Boolean(
      progress?.isLocked &&
      !isSupervisorOverride &&
      !isBackfill &&
      (selectedSlotIndex === nextAllowed)
    );

    if (isIntervalLocked) {
      addNotification(
        'Interval Locked',
        'This hourly inspection is currently locked. Wait for the interval to open or contact an Admin.',
        'warning'
      );
      return;
    }

    if (wizardStep === 'QTY') {
      if (actualQty === 0 && incidentType) {
        // Operational stoppage with 0 parts produced — skip dimensional questions and proceed directly to summary
        setWizardStep('SUMMARY');
      } else if (questionSet && questionSet.questions && questionSet.questions.length > 0) {
        setWizardStep('QUESTION');
      } else {
        setWizardStep('SUMMARY');
      }
    } else if (wizardStep === 'QUESTION') {
      if (questionSet && currentQuestionIdx < questionSet.questions.length - 1) {
        setCurrentQuestionIdx(prev => prev + 1);
      } else {
        setWizardStep('SUMMARY');
      }
    }
  };

  const handlePrevStep = () => {
    if (wizardStep === 'SUMMARY') {
      if (questionSet && questionSet.questions && questionSet.questions.length > 0) {
        setWizardStep('QUESTION');
        setCurrentQuestionIdx(questionSet.questions.length - 1);
      } else {
        setWizardStep('QTY');
      }
    } else if (wizardStep === 'QUESTION') {
      if (currentQuestionIdx > 0) {
        setCurrentQuestionIdx(prev => prev - 1);
      } else {
        setWizardStep('QTY');
      }
    }
  };

  const setAnswer = (questionId: string, answer: any) => {
    setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ RENDER HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const renderQtyStep = () => {
    const nextAllowed = (progress?.totalLoggedSlots || 0) + 1;
    const isIntervalLocked = Boolean(
      progress?.isLocked &&
      countdownSeconds > 0 &&
      !isSupervisorOverride &&
      !isBackfill &&
      (selectedSlotIndex === nextAllowed)
    );

    return (
      <div className="il-wizard-step-container">
        {/* ─── Top Active Shift & Station Context Bar (Authority Required) ─── */}
        {hasStackAuthority && (
          <div style={{
            background: 'var(--bone-white, #FAF8F5)',
            border: '1px solid var(--silk, #E8E2D9)',
            borderRadius: 'var(--radius-sm, 8px)',
            padding: '10px 14px',
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.04))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shift:
                </label>
                <select
                  value={selectedShiftId || ''}
                  onChange={e => setSelectedShiftId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--copper-bronze, #8B6914)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--charcoal, #1C1A18)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {shifts.map(shift => {
                    const startStr = Array.isArray(shift.startTime) ? `${String(shift.startTime[0]).padStart(2, '0')}:${String(shift.startTime[1]).padStart(2, '0')}` : String(shift.startTime).substring(0, 5);
                    const endStr = Array.isArray(shift.endTime) ? `${String(shift.endTime[0]).padStart(2, '0')}:${String(shift.endTime[1]).padStart(2, '0')}` : String(shift.endTime).substring(0, 5);
                    return (
                      <option key={shift.id} value={shift.id}>
                        {shift.shiftName} ({startStr} - {endStr})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date:
                </label>
                <input
                  type="date"
                  value={selectedShiftDate}
                  onChange={e => setSelectedShiftDate(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--silk, #E8E2D9)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--charcoal, #1C1A18)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Machine:
                </label>
                <select
                  value={selectedMachineId || ''}
                  onChange={e => setSelectedMachineId(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--silk, #E8E2D9)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--charcoal, #1C1A18)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.machineName} ({m.machineCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Mode Switcher: Live Now vs Previous Entry */}
              <div style={{
                display: 'inline-flex',
                borderRadius: 6,
                border: '1px solid var(--silk, #E8E2D9)',
                backgroundColor: 'var(--linen, #EEE9E1)',
                padding: 2,
                gap: 2
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsBackfill(false);
                    addNotification('Live Mode', 'Inspection entries will be stamped with the current live time.', 'info');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: !isBackfill ? '#FFFFFF' : 'transparent',
                    color: !isBackfill ? 'var(--charcoal, #1C1A18)' : 'var(--slate, #4A4540)',
                    fontWeight: !isBackfill ? 700 : 500,
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: !isBackfill ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  <Clock size={12} style={{ color: !isBackfill ? 'var(--copper-bronze)' : 'inherit' }} />
                  Live Now
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsBackfill(true);
                    if (!customLogTime) {
                      setCustomLogTime(formatForDateTimeLocal(new Date()));
                    }
                    addNotification('Previous Entry Mode', 'Select the past date and time for this entry.', 'info');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: isBackfill ? 'var(--copper-bronze, #8B6914)' : 'transparent',
                    color: isBackfill ? '#FFFFFF' : 'var(--slate, #4A4540)',
                    fontWeight: isBackfill ? 700 : 500,
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: isBackfill ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <History size={12} style={{ color: isBackfill ? '#FFFFFF' : 'inherit' }} />
                  Previous Entry
                </button>
              </div>

              {/* Time Indicator or Datetime-Local Picker */}
              {!isBackfill ? (
                <span style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: 'var(--linen, #EEE9E1)',
                  color: 'var(--copper-dark, #6F5100)',
                  border: '1px solid var(--silk, #E8E2D9)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                  Live: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper-dark, #6F5100)', textTransform: 'uppercase' }}>
                    Entry Time:
                  </label>
                  <input
                    type="datetime-local"
                    value={customLogTime}
                    onChange={e => setCustomLogTime(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1.5px solid var(--copper-bronze, #8B6914)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--charcoal, #1C1A18)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Active Escalation Banner (Direct access to NC Records) ─── */}
        {progress?.slots?.some(s => s.isEscalated || s.isFailed) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            borderRadius: 8,
            marginBottom: 8,
            fontSize: 12,
            color: '#991B1B',
            boxShadow: '0 1px 2px rgba(220, 38, 38, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span>
                <strong>Escalated Non-Conformance Detected:</strong> Quality failures were recorded on this operation.
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/nc-records')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <span>View in NC Records</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        )}

        {/* ─── Shift Inspection Stack Bar (Authority Required) ─── */}
        {hasStackAuthority && (
          <HourlyInspectionStack
            progress={progress}
            selectedSlotIndex={selectedSlotIndex}
            hasAuthority={hasStackAuthority}
            onSelectSlot={(slot) => {
              const nextAllowed = (progress?.totalLoggedSlots || 0) + 1;
              if (slot.status === 'LOGGED') {
                addNotification(
                  'Slot Completed',
                  `Hour ${slot.slotNumber} has already been logged. Continue with Hour ${nextAllowed}.`,
                  'info'
                );
                return;
              }
              if (slot.status === 'MISSED') {
                setMissedSlotData(slot);
                setShowMissedModal(true);
                return;
              }
              // Allow selecting next slot or skipping ahead to current hour
              setSelectedSlotIndex(slot.slotNumber);
              setIsBackfill(false);
              if (slot.slotNumber > nextAllowed) {
                addNotification(
                  'Fast-Forward Entry',
                  `Skipping to Hour ${slot.slotNumber}. This inspection will be recorded live from current time.`,
                  'info'
                );
              }
            }}
            isOverrideUnlocked={isSupervisorOverride}
            onToggleOverride={() => setIsSupervisorOverride(prev => !prev)}
            canOverride={isAdmin}
          />
        )}

        {/* ─── Dark Progress Banner ─── */}
        <div className="il-progress-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, position: 'relative', zIndex: 1 }}>
            <h2 className="il-headline-md" style={{ color: 'white', margin: 0, fontSize: '0.9375rem' }}>Batch Progress</h2>
            <span className="il-data-label" style={{ color: '#D4A853', border: '1px solid #D4A853', padding: '1px 8px', borderRadius: 4, fontSize: '0.6875rem' }}>TGT: {totalTarget}</span>
          </div>
          <div className="il-progress-stats">
            <div>
              <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.625rem' }}>Passed</span>
              <span className="il-data-display" style={{ color: '#4ade80' }}>{totalPassed}</span>
            </div>
            <div>
              <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.625rem' }}>Failed</span>
              <span className="il-data-display" style={{ color: '#ff8a8a' }}>{totalInspected - totalPassed}</span>
            </div>
            <div>
              <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.625rem' }}>Remaining</span>
              <span className="il-data-display" style={{ color: '#FFDCBC' }}>{remaining}</span>
            </div>
          </div>
        </div>



        {/* ─── Quantity Input Card ─── */}
        <div className="il-input-card">
          <div className="il-input-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="il-body-lg" style={{ margin: 0, fontWeight: 700, color: 'var(--charcoal)', fontSize: '0.875rem' }}>Batch Quantities</h3>
            <button
              type="button"
              onClick={() => setShowIncidentModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: incidentType ? '1.5px solid var(--copper-bronze, #8B6914)' : '1px solid var(--silk, #E8E2D9)',
                backgroundColor: incidentType ? 'var(--copper-light, #FBF4E8)' : 'var(--warm-white, #F5F2ED)',
                color: incidentType ? 'var(--copper-dark, #6F5100)' : 'var(--charcoal, #1C1A18)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={13} style={{ color: incidentType ? 'var(--copper-dark, #6F5100)' : 'var(--copper-bronze, #8B6914)' }} />
              {incidentType ? `Incident: ${incidentType}` : 'Report Incident'}
            </button>
          </div>
          <div className="il-input-card-body">
            <div className="il-qty-grid">
              <div>
                <label className="il-data-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ash)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Target</label>
                <div className="il-input" style={{ background: 'var(--warm-white)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedOp?.gauge?.batchQuantity || 0}
                </div>
              </div>
              <div>
                <label className="il-data-label" style={{ display: 'block', marginBottom: 4, color: 'var(--copper-bronze)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Actual</label>
                <input
                  type="number"
                  min="0"
                  value={actualQty === 0 ? '0' : (actualQty || '')}
                  onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                  onChange={e => {
                    const val = e.target.value.trim();
                    setActualQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                  }}
                  className="il-input il-input--active"
                  autoFocus
                />
              </div>
              <div>
                <label className="il-data-label" style={{ display: 'block', marginBottom: 4, color: 'var(--ash)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Passed</label>
                <input
                  type="number"
                  min="0"
                  value={passedQty === 0 ? '0' : (passedQty || '')}
                  onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                  onChange={e => {
                    const val = e.target.value.trim();
                    setPassedQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                  }}
                  className="il-input"
                />
              </div>
            </div>

            {/* Variance row */}
            <div className="il-variance-row">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="il-data-label" style={{ color: 'var(--ash)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Variance:</span>
                <span className="il-data-display" style={{ fontSize: '0.9375rem', color: calculatedVariance !== 0 ? 'var(--status-rejected)' : '#3A6B4A' }}>
                  {calculatedVariance} units
                </span>
              </div>
              <div className="il-variance-rejection-inputs">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="il-label-sm" style={{ color: 'var(--warm-gray)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Rework</span>
                  <input
                    type="number"
                    min="0"
                    value={reworkQty === 0 ? '0' : (reworkQty || '')}
                    onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                    onChange={e => {
                      const val = e.target.value.trim();
                      setReworkQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                    }}
                    className="il-input il-input-sm"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="il-label-sm" style={{ color: 'var(--warm-gray)', textTransform: 'uppercase', fontSize: '0.6875rem' }}>Scrap</span>
                  <input
                    type="number"
                    min="0"
                    value={scrapQty === 0 ? '0' : (scrapQty || '')}
                    onFocus={e => { if (e.target.value === '0') e.target.select(); }}
                    onChange={e => {
                      const val = e.target.value.trim();
                      setScrapQty(val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0));
                    }}
                    className="il-input il-input-sm"
                  />
                </div>
              </div>
            </div>

            {/* Rejections Escalation Callout if rejects exist */}
            {reworkQty + scrapQty > 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid var(--status-rejected, #DC2626)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ShieldAlert size={15} style={{ color: 'var(--status-rejected, #DC2626)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-rejected, #DC2626)' }}>
                  {reworkQty + scrapQty} unit(s) rejected &bull; This batch will trigger Quality Head Escalation
                </span>
              </div>
            )}

            {/* Incident Reported Callout if any */}
            {incidentType && (
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: 'var(--copper-light, #FBF4E8)',
                  border: '1px solid var(--copper-bronze, #8B6914)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <AlertTriangle size={15} style={{ color: 'var(--copper-bronze, #8B6914)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem', fontWeight: 700, color: 'var(--copper-dark, #6F5100)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {incidentType.toUpperCase()} {incidentDurationMins ? `(${incidentDurationMins}M)` : ''}
                    </div>
                    {incidentRemarks && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate, #4A4540)', marginTop: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {incidentRemarks}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(true)}
                    style={{
                      padding: '3px 8px', fontSize: '0.6875rem', fontWeight: 600, borderRadius: 4,
                      border: '1px solid var(--copper-bronze, #8B6914)', background: '#FFFFFF',
                      color: 'var(--copper-dark, #6F5100)', cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIncidentType('');
                      setIncidentDurationMins(undefined);
                      setIncidentRemarks('');
                    }}
                    style={{
                      padding: '3px 8px', fontSize: '0.6875rem', fontWeight: 600, borderRadius: 4,
                      border: '1px solid var(--silk, #E8E2D9)', background: 'var(--warm-white, #F5F2ED)',
                      color: 'var(--ash, #8C857D)', cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Actions directly after the box ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          {calculatedVariance !== 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 6,
              background: 'var(--status-rejected-bg, #FDF2F2)',
              color: 'var(--status-rejected, #DC2626)',
              fontSize: '0.75rem',
              fontWeight: 600
            }}>
              <AlertCircle size={15} />
              <span>Imbalanced quantities ({calculatedVariance > 0 ? `+${calculatedVariance}` : calculatedVariance} units difference)</span>
            </div>
          )}

          {hasStackAuthority && selectedSlotIndex > ((progress?.totalLoggedSlots || 0) + 1) && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                backgroundColor: 'var(--copper-light, #FBF4E8)',
                border: '1px solid var(--silk, #E8E2D9)',
                borderLeft: '3px solid var(--copper-bronze, #8B6914)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                fontSize: '0.75rem',
                color: 'var(--copper-dark, #6F5100)',
                fontWeight: 600,
              }}
            >
              <span>Fast-Forward: Logging Hour {selectedSlotIndex} live from current time</span>
              <button
                type="button"
                onClick={() => setSelectedSlotIndex((progress?.totalLoggedSlots || 0) + 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--copper-bronze, #8B6914)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.6875rem',
                  textDecoration: 'underline'
                }}
              >
                Revert to Hour {(progress?.totalLoggedSlots || 0) + 1}
              </button>
            </div>
          )}

          {isIntervalLocked ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm, 8px)',
                backgroundColor: 'var(--copper-light, #FBF4E8)',
                border: '1px solid var(--silk, #E8E2D9)',
                borderLeft: '3px solid var(--copper-bronze, #8B6914)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--charcoal, #1C1A18)', fontWeight: 600 }}>
                <Lock size={15} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
                <span>Next hourly inspection locked ({countdownSeconds > 0 ? formatCountdown(countdownSeconds) : 'Ready'})</span>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsSupervisorOverride(true)}
                  style={{
                    fontSize: '0.75rem',
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--copper-bronze, #8B6914)',
                    backgroundColor: 'var(--bone-white, #FAF8F5)',
                    color: 'var(--copper-dark, #6F5100)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Unlock size={12} /> Admin Override
                </button>
              ) : (
                <span style={{ fontSize: '0.6875rem', color: 'var(--ash, #8C857D)', fontStyle: 'italic' }}>
                  Admin authorization required
                </span>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={calculatedVariance !== 0 || (actualQty === 0 && !incidentType)}
                className="il-btn-primary"
                style={{
                  width: '100%',
                  height: 46,
                  justifyContent: 'center',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  borderRadius: 8
                }}
              >
                Next Step <ChevronRight size={18} />
              </button>
              {actualQty === 0 && !incidentType && (
                <div style={{ marginTop: 8, textAlign: 'center', fontSize: '0.75rem', color: 'var(--ash, #8C857D)' }}>
                  If 0 parts were inspected due to stoppage or breakdown, click <strong>"Report Incident"</strong> above to log this hour.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionStep = () => {
    if (!questionSet || !questionSet.questions) return null;
    const q = questionSet.questions[currentQuestionIdx];
    const answer = questionAnswers[q.id!];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="il-data-label" style={{ color: 'var(--ash)', fontSize: '0.6875rem' }}>Question {currentQuestionIdx + 1} of {questionSet.questions.length}</span>
            {q.isCritical && <span className="il-chip" style={{ background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)' }}>CRITICAL</span>}
          </div>
          <div className="il-progress-track" style={{ background: 'var(--stone)', height: 4 }}>
            <div className="il-progress-fill" style={{ background: 'var(--copper-bronze)', width: `${((currentQuestionIdx + 1) / questionSet.questions.length) * 100}%` }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <h2 className="il-headline-lg" style={{ textAlign: 'center', marginBottom: 14, color: 'var(--charcoal)', fontSize: '1.125rem', lineHeight: '1.4' }}>{q.questionText}</h2>

          {/* ─── PDIR Checking Method & Min / Max Specifications Card ─── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 12,
            width: '100%',
            maxWidth: 620,
            background: 'var(--bone-white, #FAF8F5)',
            border: '1.5px solid var(--silk, #E8E2D9)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Checking Method (PDIR) */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ash, #8C857D)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Checking Method:
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--copper-dark, #6F5100)',
                backgroundColor: 'var(--linen, #EEE9E1)',
                padding: '3px 10px',
                borderRadius: 6,
                border: '1px solid var(--silk, #E8E2D9)'
              }}>
                {q.checkingMethod || 'Visual / Verification'}
              </span>
            </div>

            {/* Min and Max Display */}
            {(q.minValue != null || q.maxValue != null) && (
              <>
                <div style={{ width: 1, height: 18, background: 'var(--silk, #E8E2D9)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    background: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: 5,
                    border: '1px solid #D1D5DB'
                  }}>
                    <span style={{ fontWeight: 700, color: '#6B7280' }}>MIN:</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1F2937' }}>
                      {q.minValue != null ? q.minValue : '—'}
                    </span>
                  </div>

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    background: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: 5,
                    border: '1px solid #D1D5DB'
                  }}>
                    <span style={{ fontWeight: 700, color: '#6B7280' }}>MAX:</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#1F2937' }}>
                      {q.maxValue != null ? q.maxValue : '—'}
                    </span>
                  </div>

                  {q.unit && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warm-gray, #78716C)' }}>
                      {q.unit}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Expected Answer for non-numeric if present */}
            {q.questionType !== 'NUMERIC' && q.expectedAnswer && (
              <>
                <div style={{ width: 1, height: 18, background: 'var(--silk, #E8E2D9)' }} />
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase' }}>
                    Expected:
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {q.expectedAnswer}
                  </span>
                </div>
              </>
            )}
          </div>

          {q.questionType === 'PASS_FAIL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
              <button
                onClick={() => { setAnswer(q.id!, 'PASS'); handleNextStep(); }}
                className={`il-btn-pass ${answer === 'PASS' ? 'il-btn-pass--selected' : ''}`}
              >
                <CheckCircle2 size={32} />
                <span className="il-label-sm">PASS</span>
              </button>
              <button
                onClick={() => { setAnswer(q.id!, 'FAIL'); handleNextStep(); }}
                className={`il-btn-fail ${answer === 'FAIL' ? 'il-btn-fail--selected' : ''}`}
              >
                <AlertCircle size={32} />
                <span className="il-label-sm">FAIL</span>
              </button>
            </div>
          )}

          {q.questionType === 'NUMERIC' && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', flexWrap: 'wrap', gap: 8 }}>
                <input
                  type="number" step="0.001" value={answer || ''}
                  onChange={(e) => setAnswer(q.id!, e.target.value)}
                  className="il-input il-input--active"
                  style={{
                    fontSize: 36,
                    textAlign: 'center',
                    width: 240,
                    maxWidth: 'calc(100vw - 64px)',
                    fontWeight: 700,
                    borderColor: (() => {
                      if (!answer) return undefined;
                      const num = parseFloat(answer);
                      if (isNaN(num)) return undefined;
                      const isOutOfRange = (q.minValue != null && num < q.minValue) || (q.maxValue != null && num > q.maxValue);
                      return isOutOfRange ? '#DC2626' : '#16A34A';
                    })()
                  }}
                  autoFocus
                />
                {q.unit && <span className="il-data-label" style={{ color: 'var(--warm-gray)', fontWeight: 600 }}>{q.unit}</span>}
              </div>

              {/* Dynamic Tolerance Verification Feedback */}
              {answer && !isNaN(parseFloat(answer)) && (q.minValue != null || q.maxValue != null) && (
                <div style={{ marginTop: 10 }}>
                  {(() => {
                    const num = parseFloat(answer);
                    const isOutOfRange = (q.minValue != null && num < q.minValue) || (q.maxValue != null && num > q.maxValue);
                    return isOutOfRange ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#B91C1C',
                        backgroundColor: '#FEE2E2',
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid #FCA5A5'
                      }}>
                        Out of Tolerance Range (Min: {q.minValue ?? '—'}, Max: {q.maxValue ?? '—'} {q.unit || ''})
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#15803D',
                        backgroundColor: '#DCFCE7',
                        padding: '4px 12px',
                        borderRadius: 6,
                        border: '1px solid #86EFAC'
                      }}>
                        Within Tolerance Range (Min: {q.minValue ?? '—'}, Max: {q.maxValue ?? '—'} {q.unit || ''})
                      </span>
                    );
                  })()}
                </div>
              )}

              {(q.minValue != null || q.maxValue != null) && !answer && (
                <p className="il-body-md" style={{ marginTop: 12, color: 'var(--ash)' }}>
                  Acceptable Range: {q.minValue != null ? q.minValue : '—'} to {q.maxValue != null ? q.maxValue : '—'} {q.unit}
                </p>
              )}
            </div>
          )}

          {q.questionType === 'TEXT' && (
            <div style={{ width: '100%' }}>
              <textarea
                value={answer || ''} onChange={(e) => setAnswer(q.id!, e.target.value)}
                className="il-textarea" rows={4} placeholder="Type your observation here..." autoFocus
              />
            </div>
          )}

          {q.questionType === 'CHOICE' && q.choices && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
              {q.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => { setAnswer(q.id!, choice); handleNextStep(); }}
                  className={`il-choice-btn ${answer === choice ? 'il-choice-btn--selected' : ''}`}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}

          {/* ─── Actions directly after question ─── */}
          <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 20 }}>
            <button
              type="button"
              onClick={handlePrevStep}
              className="il-btn-secondary"
              style={{
                flex: 1,
                height: 44,
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: 8
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={handleNextStep}
              className="il-btn-primary"
              style={{
                flex: 2,
                height: 44,
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                borderRadius: 8
              }}
            >
              Next Step <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryStep = () => {
    const projectedPassed = totalPassed + passedQty;
    const projectedRemaining = Math.max(0, totalTarget - projectedPassed);
    const isBatchFailed = (reworkQty + scrapQty) > 0 || Object.values(questionAnswers).some(a => a === 'FAIL');

    return (
      <div className="il-wizard-step-container">
        {/* Status banner */}
        <div
          className="il-progress-banner"
          style={{
            textAlign: 'center',
            padding: '12px 16px',
            background: isBatchFailed ? 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)' : undefined,
            borderLeft: isBatchFailed ? '4px solid #EF4444' : undefined,
          }}
        >
          {isBatchFailed ? (
            <ShieldAlert size={28} style={{ color: '#FCA5A5', margin: '0 auto 8px', position: 'relative', zIndex: 1 }} />
          ) : (
            <CheckCircle2 size={28} style={{ color: '#4ade80', margin: '0 auto 8px', position: 'relative', zIndex: 1 }} />
          )}
          <h3 className="il-headline-md" style={{ color: 'white', margin: '0 0 4px', fontSize: '1rem', position: 'relative', zIndex: 1 }}>
            {isBatchFailed ? 'Defects Detected — Escalation Required' : 'Ready to Log'}
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10, position: 'relative', zIndex: 1 }}>
            <span className="il-data-label" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>{projectedPassed}/{totalTarget} Passed</span>
            <span className="il-data-label" style={{ color: projectedRemaining === 0 ? '#4ade80' : '#D4A853', fontSize: '0.75rem' }}>
              {projectedRemaining === 0 ? 'Target Reached' : `${projectedRemaining} Remaining`}
            </span>
          </div>
        </div>

        {/* Escalation Callout if Failed */}
        {isBatchFailed && (
          <div style={{
            background: 'rgba(186, 26, 26, 0.08)',
            border: '1.5px solid var(--status-rejected, #BA1A1A)',
            borderRadius: 8,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} style={{ color: 'var(--status-rejected, #BA1A1A)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--status-rejected, #BA1A1A)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Auto-Escalation to Quality Head
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--charcoal, #1C1A18)', marginTop: 4, lineHeight: 1.4 }}>
                Logging this entry will flag a non-conformance ({reworkQty + scrapQty} rejected items), generate an NC Record, and immediately dispatch a high-priority escalation notice to the Quality Supervisor and Plant Head.
              </div>
            </div>
          </div>
        )}

        {/* Quantity review card */}
        <div className="il-input-card">
          <div className="il-input-card-header">
            <h4 className="il-body-lg" style={{ margin: 0, fontWeight: 700 }}>Batch Quantities</h4>
          </div>
          <div className="il-input-card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Actual Inspected', value: actualQty, color: 'var(--charcoal)' },
                { label: 'Passed', value: passedQty, color: '#228B22' },
                { label: 'Rework', value: reworkQty, color: '#b45309' },
                { label: 'Scrap', value: scrapQty, color: 'var(--status-rejected)' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--silk)', paddingBottom: 10 }}>
                  <span className="il-body-md" style={{ color: 'var(--ash)' }}>{item.label}</span>
                  <span className="il-data-display" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Incident Summary Card if any */}
        {incidentType && (
          <div className="il-input-card" style={{ borderLeft: '3px solid var(--copper-bronze, #8B6914)' }}>
            <div className="il-input-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={15} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
              <h4 className="il-body-lg" style={{ margin: 0, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                Incident / Operational Stoppage
              </h4>
            </div>
            <div className="il-input-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: incidentRemarks ? 8 : 0 }}>
                <span className="il-body-md" style={{ color: 'var(--ash, #8C857D)' }}>Incident Type</span>
                <span className="il-data-label" style={{ color: 'var(--copper-dark, #6F5100)', fontWeight: 700 }}>{incidentType}</span>
              </div>
              {incidentDurationMins && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: incidentRemarks ? 8 : 0 }}>
                  <span className="il-body-md" style={{ color: 'var(--ash, #8C857D)' }}>Estimated Downtime</span>
                  <span className="il-data-label" style={{ color: 'var(--charcoal, #1C1A18)' }}>{incidentDurationMins} minutes</span>
                </div>
              )}
              {incidentRemarks && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--silk, #E8E2D9)' }}>
                  <span className="il-data-label" style={{ color: 'var(--ash, #8C857D)', display: 'block', marginBottom: 4 }}>Details</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--charcoal, #1C1A18)' }}>{incidentRemarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checklist summary */}
        {questionSet && questionSet.questions && (
          <div className="il-input-card">
            <div className="il-input-card-header">
              <h4 className="il-body-lg" style={{ margin: 0, fontWeight: 700 }}>Checklist & PDIR Specifications</h4>
            </div>
            <div className="il-input-card-body" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {questionSet.questions.map((q, i) => (
                <div key={q.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--silk)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="il-body-md" style={{ color: 'var(--charcoal)', fontWeight: 600 }}>
                      {i + 1}. {q.questionText}
                    </span>
                    <span className="il-data-label" style={{
                      color: questionAnswers[q.id!] === 'FAIL' ? '#DC2626' : questionAnswers[q.id!] === 'PASS' ? '#16A34A' : 'var(--charcoal)',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {questionAnswers[q.id!] || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--ash, #8C857D)', flexWrap: 'wrap' }}>
                    <span>
                      <strong>Checking Method (PDIR):</strong> {q.checkingMethod || 'Visual / Verification'}
                    </span>
                    {(q.minValue != null || q.maxValue != null) && (
                      <span>
                        <strong>Min:</strong> {q.minValue != null ? q.minValue : '—'} | <strong>Max:</strong> {q.maxValue != null ? q.maxValue : '—'} {q.unit || ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection reasons */}
        {(reworkQty > 0 || scrapQty > 0) && (
          <div>
            <span className="il-data-label" style={{ display: 'block', marginBottom: 10, color: 'var(--ash)', textTransform: 'uppercase' }}>Rejection Reasons</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REJECTION_REASONS.map(reason => {
                const active = selectedReasons.includes(reason);
                return (
                  <button
                    key={reason} onClick={() => toggleReason(reason)}
                    style={{
                      padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--copper-bronze)' : 'var(--silk)'}`,
                      background: active ? '#FFDCBC' : 'transparent',
                      color: active ? 'var(--copper-dark)' : 'var(--warm-gray)',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {reason}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Remarks */}
        <div>
          <span className="il-data-label" style={{ display: 'block', marginBottom: 8, color: 'var(--ash)', textTransform: 'uppercase' }}>Inspector Remarks</span>
          <textarea
            value={remarks} onChange={e => setRemarks(e.target.value)}
            placeholder="Enter specific observations..."
            rows={3} className="il-textarea"
          />
        </div>

        {/* ─── Actions directly after summary ─── */}
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 16 }}>
          <button
            type="button"
            onClick={handlePrevStep}
            className="il-btn-secondary"
            style={{
              flex: 1,
              height: 46,
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              borderRadius: 8
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="il-btn-primary"
            style={{
              flex: 2,
              height: 46,
              justifyContent: 'center',
              fontSize: '0.9375rem',
              fontWeight: 700,
              borderRadius: 8,
              background: isBatchFailed ? 'var(--status-rejected, #BA1A1A)' : '#228B22'
            }}
          >
            {submitMutation.isPending
              ? 'Logging & Escalating...'
              : isBatchFailed
              ? 'Log & Escalate to Quality Head'
              : 'Confirm & Log'}
          </button>
        </div>
      </div>
    );
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MAIN RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className={`il-page ${selectedOp && mobileView === 'WIZARD' ? 'il-page--wizard-active' : 'il-page--queue-active'}`}>

      {/* ─── Operations Queue + Wizard Grid ─── */}
      <div className="il-main-grid">

        {/* ─── LEFT: Operations Queue ─── */}
        <div className="il-queue">
          <div className="il-queue-header">
            <h3 className="il-headline-md" style={{ margin: 0, color: 'var(--charcoal)' }}>Active Batch</h3>
          </div>

          {/* Mobile Resume Active Inspection Banner */}
          {selectedOp && (
            <div
              className="il-mobile-resume-banner"
              onClick={() => setMobileView('WIZARD')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <span className="il-chip il-chip--active" style={{ flexShrink: 0 }}>Active</span>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--charcoal)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedOp.gauge?.serialNumber} — {selectedOp.operationName}
                </span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--copper-bronze)', fontSize: '0.8125rem', fontWeight: 600, flexShrink: 0 }}>
                Resume <ChevronRight size={14} />
              </span>
            </div>
          )}

          {/* Search + Customer Filter */}
          <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--warm-white)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="il-input il-input-sm"
                style={{ paddingLeft: 36, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
              />
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </div>
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="il-input il-input-sm"
              style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: customerFilter === 'ALL' ? 'var(--warm-gray)' : 'var(--charcoal)', cursor: 'pointer' }}
            >
              <option value="ALL">All Customers</option>
              {[...new Set(operations?.map(op => (op.gauge as any)?.purchaseOrder?.customer?.name || (op.gauge as any)?.purchaseOrder?.customerName).filter(Boolean))].map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="il-queue-list">
            {isOpsLoading ? (
              <div style={{ padding: 40, textAlign: 'center' }} className="il-body-md">Loading...</div>
            ) : !operations?.length ? (
              <div className="il-empty">
                <span style={{ fontSize: 36, opacity: 0.2, fontWeight: 300 }}>—</span>
                <p className="il-body-md">No active operations.</p>
              </div>
            ) : (() => {
              const filtered = operations.filter(op => {
                const matchSearch = !searchTerm || op.operationName.toLowerCase().includes(searchTerm.toLowerCase()) || (op.gauge?.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
                const custName = (op.gauge as any)?.purchaseOrder?.customer?.name || (op.gauge as any)?.purchaseOrder?.customerName || '';
                const matchCustomer = customerFilter === 'ALL' || custName === customerFilter;
                return matchSearch && matchCustomer;
              });
              return filtered.length === 0 ? (
                <div className="il-empty">
                  <span style={{ fontSize: 28, opacity: 0.2, fontWeight: 300 }}>∅</span>
                  <p className="il-body-md">No matching operations.</p>
                </div>
              ) : (
                filtered.map(op => (
                  <OperationCard
                    key={op.id}
                    op={op}
                    isSelected={selectedOpId === op.id}
                    selectedProgress={selectedOpId === op.id ? progress : undefined}
                    onClick={() => {
                      setSelectedOpId(op.id);
                      setMobileView('WIZARD');
                    }}
                  />
                ))
              );
            })()}
          </div>
        </div>

        {/* ─── RIGHT: Inspection Wizard ─── */}
        <div className="il-wizard">
          {!selectedOp ? (
            <div className="il-empty">
              <span style={{ fontSize: 36, opacity: 0.15, fontWeight: 300 }}>⎔</span>
              <p className="il-body-lg" style={{ color: 'var(--warm-gray)' }}>Select an operation to begin inspection.</p>
            </div>
          ) : (
            <>
              {/* Wizard Header */}
              <div className="il-wizard-header">
                {/* Desktop Header */}
                <div className="il-desktop-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span className="il-body-md" style={{ color: 'var(--ash)' }}>Operations</span>
                      <ChevronRight size={14} style={{ color: 'var(--warm-gray)' }} />
                      <span className="il-data-label" style={{ color: 'var(--ash)' }}>{selectedOp.gauge?.serialNumber}</span>
                      <ChevronRight size={14} style={{ color: 'var(--warm-gray)' }} />
                      <span className="il-body-md" style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{selectedOp.operationName}</span>
                    </div>
                    <h1 className="il-headline-lg" style={{ margin: 0, color: 'var(--charcoal)', wordBreak: 'break-word' }}>
                      {questionSet ? questionSet.name : 'Inspection Entry'}
                    </h1>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="il-label-sm" style={{ color: 'var(--warm-gray)', display: 'block', marginBottom: 6 }}>
                      STEP {wizardStep === 'QTY' ? '1' : wizardStep === 'QUESTION' ? '2' : '3'} OF {questionSet?.questions?.length ? '3' : '2'}
                    </span>
                    <div className="il-steps">
                      <div className={`il-step-seg ${wizardStep === 'QTY' || wizardStep === 'QUESTION' || wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                      {questionSet?.questions?.length ? (
                        <div className={`il-step-seg ${wizardStep === 'QUESTION' || wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                      ) : null}
                      <div className={`il-step-seg ${wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Mobile Header: Ultra-compact, crisp, fits in 44px on 375px screens */}
                <div className="il-mobile-only" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setMobileView('QUEUE')}
                      className="il-mobile-back-btn"
                    >
                      <ChevronLeft size={14} /> Tasks
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="il-label-sm" style={{ color: 'var(--warm-gray)', fontSize: 10 }}>
                        STEP {wizardStep === 'QTY' ? '1' : wizardStep === 'QUESTION' ? '2' : '3'}/{questionSet?.questions?.length ? '3' : '2'}
                      </span>
                      <div className="il-steps" style={{ width: 44, height: 4 }}>
                        <div className={`il-step-seg ${wizardStep === 'QTY' || wizardStep === 'QUESTION' || wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                        {questionSet?.questions?.length ? (
                          <div className={`il-step-seg ${wizardStep === 'QUESTION' || wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                        ) : null}
                        <div className={`il-step-seg ${wizardStep === 'SUMMARY' ? 'il-step-seg--active' : ''}`} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6875rem', fontWeight: 700, color: 'var(--copper-bronze)', flexShrink: 0 }}>
                      {selectedOp.gauge?.serialNumber}
                    </span>
                    <span style={{ color: 'var(--warm-gray)', fontSize: '0.75rem' }}>•</span>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedOp.operationName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wizard Body */}
              <div className="il-wizard-body">
                <div className="il-wizard-body-inner">
                  {wizardStep === 'QTY' && renderQtyStep()}
                  {wizardStep === 'QUESTION' && renderQuestionStep()}
                  {wizardStep === 'SUMMARY' && renderSummaryStep()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Auto-completion is handled by the backend â€” no manual dialog needed */}

      <InspectorIncidentModal
        isOpen={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        initialType={incidentType}
        initialDurationMins={incidentDurationMins}
        initialRemarks={incidentRemarks}
        onSave={(data) => {
          setIncidentType(data.incidentType);
          setIncidentDurationMins(data.incidentDurationMins);
          setIncidentRemarks(data.incidentRemarks);
          if (actualQty === 0) {
            setActualQty(0);
            setPassedQty(0);
            setReworkQty(0);
            setScrapQty(0);
          }
        }}
        onClear={() => {
          setIncidentType('');
          setIncidentDurationMins(undefined);
          setIncidentRemarks('');
        }}
      />

      {/* Missed Hourly Inspection Incident Prompt Modal */}
      <MissedInspectionModal
        isOpen={showMissedModal}
        onClose={() => setShowMissedModal(false)}
        operationName={selectedOp?.operationName || 'Operation'}
        serialNumber={selectedOp?.gauge?.serialNumber}
        missedSlot={missedSlotData || undefined}
        lastInspectorName={progress?.lastInspectorName}
        lastInspectionTime={progress?.lastInspectionTime}
        intervalHours={progress?.inspectionIntervalHours || progress?.intervalHours || 1}
        onLogIncident={async (data) => {
          setShowMissedModal(false);
          await handleLogMissedIncident(data);
        }}
        onStartBackfill={(slot) => {
          setShowMissedModal(false);
          handleStartBackfill(slot);
        }}
        onInspectLive={(slot) => {
          setShowMissedModal(false);
          setSelectedSlotIndex(slot.slotNumber);
          setIsBackfill(false);
          addNotification('Live Entry', `Recording Hour ${slot.slotNumber} live from current time.`, 'info');
        }}
      />

      {/* Escalation Alert Modal on Failure */}
      {escalationAlert?.show && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: 'var(--warm-white, #FAF8F5)',
            border: '2px solid var(--status-rejected, #BA1A1A)',
            borderRadius: 12,
            maxWidth: 480,
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              background: 'var(--status-rejected, #BA1A1A)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: 'white'
            }}>
              <ShieldAlert size={26} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                  Inspection Escalated to Quality Head
                </h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  Non-Conformance Triggered
                </span>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--charcoal, #1C1A18)', lineHeight: 1.5 }}>
                {escalationAlert.message}
              </p>

              <div style={{
                background: 'var(--bone-white, #F4EFEB)',
                border: '1px solid var(--silk, #E8E2D9)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: '0.8125rem',
                color: 'var(--charcoal, #1C1A18)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--ash, #8C857D)' }}>Status</span>
                  <span style={{ fontWeight: 700, color: 'var(--status-rejected, #BA1A1A)' }}>ESCALATED &bull; NC OPEN</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ash, #8C857D)' }}>Target Recipient</span>
                  <span style={{ fontWeight: 600 }}>Quality Head / Shift Supervisor</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEscalationAlert(null);
                    navigate('/nc-records');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--status-rejected, #BA1A1A)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <span>Open NC Records</span>
                  <ArrowUpRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setEscalationAlert(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'var(--charcoal, #1C1A18)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Operation Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OperationCard({ op, isSelected, selectedProgress, onClick }: { op: GaugeOperation; isSelected: boolean; selectedProgress?: CompletionProgress; onClick: () => void }) {
  const prog = isSelected ? selectedProgress : undefined;

  const target = prog?.plannedQty || op.gauge?.batchQuantity || 0;
  const passed = prog?.totalPassedQty || 0;
  const pct = target > 0 ? Math.min(100, Math.round((passed / target) * 100)) : 0;
  const rem = Math.max(0, target - passed);

  const barColor = pct >= 100 ? '#228B22' : 'var(--copper-bronze)';
  const custName = (op.gauge as any)?.purchaseOrder?.customer?.name || (op.gauge as any)?.purchaseOrder?.customerName || '';

  return (
    <div
      onClick={onClick}
      className={`il-q-card ${isSelected ? 'il-q-card--active' : ''}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, paddingLeft: isSelected ? 8 : 0 }}>
        <span className="il-data-label" style={{ color: isSelected ? 'var(--copper-bronze)' : 'var(--ash)' }}>
          {op.gauge?.serialNumber || 'N/A'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {prog?.slots?.some(s => s.isFailed || s.isEscalated) && (
            <span className="il-chip" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.4)', fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>
              ESCALATED
            </span>
          )}
          <span className={`il-chip ${rem === 0 ? 'il-chip--done' : isSelected ? 'il-chip--active' : 'il-chip--queued'}`}>
            {rem === 0 ? 'DONE' : 'IN PROG'}
          </span>
        </div>
      </div>
      <h4 className="il-body-lg il-q-card-name" style={{ margin: '0 0 4px', paddingLeft: isSelected ? 8 : 0, color: 'var(--charcoal)' }}>
        {op.operationName}
      </h4>
      {custName && (
        <span className="il-label-sm" style={{ display: 'block', paddingLeft: isSelected ? 8 : 0, color: 'var(--warm-gray)', marginBottom: 8 }}>
          {custName}
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: isSelected ? 8 : 0, marginBottom: 8 }}>
        <span className="il-data-label" style={{ color: 'var(--warm-gray)' }}>{passed}/{target} UNITS</span>
        {isSelected && <ChevronRight size={18} style={{ color: 'var(--copper-bronze)' }} />}
      </div>
      {/* Completion Progress Bar */}
      <div style={{ paddingLeft: isSelected ? 8 : 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span className="il-label-sm" style={{ color: 'var(--warm-gray)', fontSize: 10, textTransform: 'uppercase' }}>{pct}% Complete</span>
          <span className="il-label-sm" style={{ color: rem === 0 ? '#228B22' : 'var(--copper-bronze)', fontSize: 10 }}>{rem === 0 ? 'Done' : `${rem} left`}</span>
        </div>
        <div style={{ background: 'var(--stone)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  );
}
