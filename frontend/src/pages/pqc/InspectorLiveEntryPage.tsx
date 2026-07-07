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
import type { GaugeOperation, PqcQuestionSet, PqcQuestion, CompletionProgress } from '../../types/domain.types';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import './inspector-live.css';

const REJECTION_REASONS = [
  'Dimensional OOT', 'Surface Finish', 'Tool Marks', 'Material Defect'
];

type WizardStep = 'QTY' | 'QUESTION' | 'SUMMARY';

export function InspectorLiveEntryPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('PQC Inspections'); }, [setPageTitle]);

  const [selectedShiftId, setSelectedShiftId] = useState<string | undefined>(undefined);
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>(undefined);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  // Fetch Shifts and Auto-select
  useEffect(() => {
    shiftsApi.getAll().then(res => {
      const allShifts = res.data;
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

        if (start <= end) {
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

  // Auto-complete state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionProgress, setCompletionProgress] = useState<CompletionProgress | null>(null);

  const addNotification = useNotificationStore(state => state.addNotification);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

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

  // Fetch cumulative progress for the selected operation
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['op-progress', selectedOpId],
    queryFn: async () => {
      const res = await pqcApi.getCompletionProgress(selectedOpId!);
      return res.data as CompletionProgress;
    },
    enabled: !!selectedOpId,
  });

  const totalTarget = progress?.plannedQty || selectedOp?.gauge?.batchQuantity || 0;
  const totalPassed = progress?.totalPassedQty || 0;
  const totalInspected = progress?.totalActualQty || 0;
  const remaining = Math.max(0, totalTarget - totalPassed);
  const progressPct = totalTarget > 0 ? Math.min(100, Math.round((totalPassed / totalTarget) * 100)) : 0;

  useEffect(() => {
    if (selectedOp) {
      setWizardStep('QTY');
      setCurrentQuestionIdx(0);
      setActualQty(0); setPassedQty(0); setReworkQty(0); setScrapQty(0);
      setSelectedReasons([]); setRemarks('');
      setQuestionAnswers({});
    }
  }, [selectedOpId]);

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

      const res = await pqcApi.logInspection({
        gaugeOperationId: selectedOp.id,
        shiftId: selectedShiftId,
        machineId: selectedMachineId,
        actualQty, passedQty, rejectedQty, reworkQty, scrapQty,
        rejectionReasons: selectedReasons.map(r => ({ reason: r, count: 1 })),
        questionAnswers: answersArray,
        remarks,
      });

      // Check progress after logging â€” backend may have auto-completed
      const progressRes = await pqcApi.getCompletionProgress(selectedOp.id);
      return { inspection: res, progress: progressRes.data };
    },
    onSuccess: (data) => {
      refetchProgress();
      queryClient.invalidateQueries({ queryKey: ['active-operations'] });

      const progress = data?.progress;
      const wasAutoCompleted = progress && progress.totalPassedQty >= progress.plannedQty;

      if (wasAutoCompleted) {
        // Operation was auto-completed by the backend
        addNotification(
          'Operation Completed âœ“',
          `${progress.operationName} auto-completed â€” ${progress.totalPassedQty}/${progress.plannedQty} passed.`,
          'success'
        );
        // Deselect since this operation is now COMPLETED
        setSelectedOpId(null);
        setWizardStep('QTY');
        setCurrentQuestionIdx(0);
        setActualQty(0); setPassedQty(0); setReworkQty(0); setScrapQty(0);
        setSelectedReasons([]); setRemarks(''); setQuestionAnswers({});
      } else {
        // Normal batch logged, more to go
        const newRemaining = Math.max(0, (progress?.plannedQty || remaining) - (progress?.totalPassedQty || 0));
        addNotification('Inspection Logged', `Batch logged. ${newRemaining} remaining.`, 'success');
        setWizardStep('QTY');
        setCurrentQuestionIdx(0);
        setActualQty(0); setPassedQty(0); setReworkQty(0); setScrapQty(0);
        setSelectedReasons([]); setRemarks(''); setQuestionAnswers({});
      }
    },
    onError: (err: any) => {
      addNotification('Error', err.response?.data?.message || err.message, 'error');
    }
  });

  const handleNextStep = () => {
    if (wizardStep === 'QTY') {
      if (questionSet && questionSet.questions && questionSet.questions.length > 0) {
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

  const renderQtyStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* â”€â”€ Dark Progress Banner â”€â”€ */}
      <div className="il-progress-banner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <h2 className="il-headline-md" style={{ color: 'white', margin: 0 }}>Batch Progress</h2>
          <span className="il-data-label" style={{ color: '#D4A853', border: '1px solid #D4A853', padding: '2px 10px' }}>TGT: {totalTarget}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 16 }}>
          <div>
            <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Passed</span>
            <span className="il-data-display" style={{ fontSize: 32, lineHeight: 1, color: '#4ade80' }}>{totalPassed}</span>
          </div>
          <div>
            <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Failed</span>
            <span className="il-data-display" style={{ fontSize: 32, lineHeight: 1, color: '#ff8a8a' }}>{totalInspected - totalPassed}</span>
          </div>
          <div>
            <span className="il-label-sm" style={{ color: 'var(--silk)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Remaining</span>
            <span className="il-data-display" style={{ fontSize: 32, lineHeight: 1, color: '#FFDCBC' }}>{remaining}</span>
          </div>
        </div>
      </div>

      {/* ─── Shift Selection ─── */}
      <div className="il-input-card" style={{ marginBottom: -8 }}>
        <div className="il-input-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}>
          <label className="il-data-label" style={{ color: 'var(--charcoal)', textTransform: 'uppercase' }}>Production Shift</label>
          <select
            value={selectedShiftId || ''}
            onChange={e => setSelectedShiftId(e.target.value)}
            className="il-input il-input-sm"
            style={{ width: 250, fontFamily: "'DM Sans', sans-serif" }}
          >
            <option value="" disabled>Select Shift...</option>
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
      </div>

      {/* ─── Machine Selection ─── */}
      <div className="il-input-card" style={{ marginBottom: -8 }}>
        <div className="il-input-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}>
          <label className="il-data-label" style={{ color: 'var(--charcoal)', textTransform: 'uppercase' }}>Machine Used</label>
          <select
            value={selectedMachineId || ''}
            onChange={e => setSelectedMachineId(e.target.value)}
            className="il-input il-input-sm"
            style={{ width: 250, fontFamily: "'DM Sans', sans-serif" }}
          >
            <option value="" disabled>Select Machine...</option>
            {machines.map(machine => (
              <option key={machine.id} value={machine.id}>
                {machine.machineName} ({machine.machineCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Quantity Input Card ─── */}
      <div className="il-input-card">
        <div className="il-input-card-header">
          <h3 className="il-body-lg" style={{ margin: 0, fontWeight: 700, color: 'var(--charcoal)' }}>Batch Quantities</h3>
        </div>
        <div className="il-input-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="il-data-label" style={{ display: 'block', marginBottom: 8, color: 'var(--ash)', textTransform: 'uppercase' }}>Target Batch</label>
              <div className="il-input" style={{ background: 'var(--warm-white)', cursor: 'default' }}>
                {selectedOp?.gauge?.batchQuantity || 0}
              </div>
            </div>
            <div>
              <label className="il-data-label" style={{ display: 'block', marginBottom: 8, color: 'var(--copper-bronze)', textTransform: 'uppercase' }}>Actual Inspected</label>
              <input
                type="number" value={actualQty || ''} onChange={e => setActualQty(parseInt(e.target.value) || 0)}
                className="il-input il-input--active" autoFocus
              />
            </div>
            <div>
              <label className="il-data-label" style={{ display: 'block', marginBottom: 8, color: 'var(--ash)', textTransform: 'uppercase' }}>Passed Qty</label>
              <input
                type="number" value={passedQty || ''} onChange={e => setPassedQty(parseInt(e.target.value) || 0)}
                className="il-input"
              />
            </div>
          </div>

          {/* Variance row */}
          <div style={{ background: 'var(--linen)', border: '1px solid var(--silk)', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="il-data-label" style={{ color: 'var(--ash)', textTransform: 'uppercase' }}>Variance:</span>
              <span className="il-data-display" style={{ color: calculatedVariance !== 0 ? 'var(--status-rejected)' : '#3A6B4A' }}>
                {calculatedVariance} units
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <span className="il-label-sm" style={{ display: 'block', color: 'var(--warm-gray)', marginBottom: 4, textTransform: 'uppercase' }}>Rework</span>
                <input type="number" value={reworkQty || ''} onChange={e => setReworkQty(parseInt(e.target.value) || 0)}
                  className="il-input il-input-sm" style={{ width: 70, textAlign: 'center' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span className="il-label-sm" style={{ display: 'block', color: 'var(--warm-gray)', marginBottom: 4, textTransform: 'uppercase' }}>Scrap</span>
                <input type="number" value={scrapQty || ''} onChange={e => setScrapQty(parseInt(e.target.value) || 0)}
                  className="il-input il-input-sm" style={{ width: 70, textAlign: 'center' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestionStep = () => {
    if (!questionSet || !questionSet.questions) return null;
    const q = questionSet.questions[currentQuestionIdx];
    const answer = questionAnswers[q.id!];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="il-data-label" style={{ color: 'var(--ash)' }}>Question {currentQuestionIdx + 1} of {questionSet.questions.length}</span>
            {q.isCritical && <span className="il-chip" style={{ background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)' }}>CRITICAL</span>}
          </div>
          <div className="il-progress-track" style={{ background: 'var(--stone)' }}>
            <div className="il-progress-fill" style={{ background: 'var(--copper-bronze)', width: `${((currentQuestionIdx + 1) / questionSet.questions.length) * 100}%` }} />
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <h2 className="il-headline-lg" style={{ textAlign: 'center', marginBottom: 40, color: 'var(--charcoal)' }}>{q.questionText}</h2>

          {q.questionType === 'PASS_FAIL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
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
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <input
                  type="number" step="0.001" value={answer || ''}
                  onChange={(e) => setAnswer(q.id!, e.target.value)}
                  className="il-input il-input--active"
                  style={{ fontSize: 40, textAlign: 'center', width: 280, fontWeight: 700 }}
                  autoFocus
                />
                {q.unit && <span className="il-data-label" style={{ position: 'absolute', bottom: 16, right: -48, color: 'var(--warm-gray)' }}>{q.unit}</span>}
              </div>
              {(q.minValue !== undefined || q.maxValue !== undefined) && (
                <p className="il-body-md" style={{ marginTop: 12, color: 'var(--ash)' }}>
                  Range: {q.minValue ?? '-âˆž'} to {q.maxValue ?? 'âˆž'} {q.unit}
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
        </div>
      </div>
    );
  };

  const renderSummaryStep = () => {
    const projectedPassed = totalPassed + passedQty;
    const projectedRemaining = Math.max(0, totalTarget - projectedPassed);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Status banner */}
        <div className="il-progress-banner" style={{ textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: '#4ade80', margin: '0 auto 12px', position: 'relative', zIndex: 1 }} />
          <h3 className="il-headline-md" style={{ color: 'white', margin: '0 0 4px', position: 'relative', zIndex: 1 }}>Ready to Log</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 16, position: 'relative', zIndex: 1 }}>
            <span className="il-data-label" style={{ color: 'rgba(255,255,255,0.85)' }}>{projectedPassed}/{totalTarget} Passed</span>
            <span className="il-data-label" style={{ color: projectedRemaining === 0 ? '#4ade80' : '#D4A853' }}>
              {projectedRemaining === 0 ? 'âœ“ Target Reached' : `${projectedRemaining} Remaining`}
            </span>
          </div>
        </div>

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

        {/* Checklist summary */}
        {questionSet && questionSet.questions && (
          <div className="il-input-card">
            <div className="il-input-card-header">
              <h4 className="il-body-lg" style={{ margin: 0, fontWeight: 700 }}>Checklist</h4>
            </div>
            <div className="il-input-card-body" style={{ maxHeight: 160, overflowY: 'auto' }}>
              {questionSet.questions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--silk)' }}>
                  <span className="il-body-md" style={{ color: 'var(--ash)' }}>{i + 1}. {q.questionText}</span>
                  <span className="il-data-label" style={{ color: 'var(--charcoal)', flexShrink: 0 }}>{questionAnswers[q.id!] || 'â€”'}</span>
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
      </div>
    );
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ MAIN RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  return (
    <div className="il-page">

      {/* â”€â”€ Operations Queue + Wizard Grid â”€â”€ */}
      <div className="il-main-grid">

        {/* â”€â”€ LEFT: Operations Queue â”€â”€ */}
        <div className="il-queue">
          <div className="il-queue-header">
            <h3 className="il-headline-md" style={{ margin: 0, color: 'var(--charcoal)' }}>Active Batch</h3>
          </div>

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
                  <OperationCard key={op.id} op={op} isSelected={selectedOpId === op.id} onClick={() => setSelectedOpId(op.id)} />
                ))
              );
            })()}
          </div>
        </div>

        {/* â”€â”€ RIGHT: Inspection Wizard â”€â”€ */}
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
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="il-body-md" style={{ color: 'var(--ash)' }}>Operations</span>
                    <ChevronRight size={14} style={{ color: 'var(--warm-gray)' }} />
                    <span className="il-data-label" style={{ color: 'var(--ash)' }}>{selectedOp.gauge?.serialNumber}</span>
                    <ChevronRight size={14} style={{ color: 'var(--warm-gray)' }} />
                    <span className="il-body-md" style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{selectedOp.operationName}</span>
                  </div>
                  <h1 className="il-headline-lg" style={{ margin: 0, color: 'var(--charcoal)' }}>
                    {questionSet ? questionSet.name : 'Inspection Entry'}
                  </h1>
                </div>
                <div style={{ textAlign: 'right' }}>
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

              {/* Wizard Body */}
              <div className="il-wizard-body">
                <div className="il-wizard-body-inner">
                  {wizardStep === 'QTY' && renderQtyStep()}
                  {wizardStep === 'QUESTION' && renderQuestionStep()}
                  {wizardStep === 'SUMMARY' && renderSummaryStep()}
                </div>
              </div>

              {/* Wizard Footer */}
              <div className="il-wizard-footer">
                <div>
                  {wizardStep === 'QTY' && calculatedVariance !== 0 && (
                    <span className="il-label-sm" style={{ color: 'var(--status-rejected)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} /> Imbalanced Quantities
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {wizardStep !== 'QTY' && (
                    <button onClick={handlePrevStep} className="il-btn-secondary">
                      <ChevronLeft size={16} /> Back
                    </button>
                  )}
                  {wizardStep !== 'SUMMARY' ? (
                    <button
                      onClick={handleNextStep}
                      disabled={wizardStep === 'QTY' && calculatedVariance !== 0}
                      className="il-btn-primary"
                    >
                      Next Step <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      className="il-btn-primary"
                      style={{ background: '#228B22' }}
                    >
                      {submitMutation.isPending ? 'Logging...' : 'Confirm & Log'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Auto-completion is handled by the backend â€” no manual dialog needed */}

    </div>
  );
}

// â”€â”€â”€ Operation Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OperationCard({ op, isSelected, onClick }: { op: GaugeOperation; isSelected: boolean; onClick: () => void }) {
  const { data: prog } = useQuery({
    queryKey: ['card-progress', op.id],
    queryFn: async () => {
      const res = await pqcApi.getCompletionProgress(op.id);
      return res.data as CompletionProgress;
    },
    refetchInterval: 30000,
  });

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
        <span className={`il-chip ${rem === 0 ? 'il-chip--done' : isSelected ? 'il-chip--active' : 'il-chip--queued'}`}>
          {rem === 0 ? 'DONE' : 'IN PROG'}
        </span>
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
          <span className="il-label-sm" style={{ color: rem === 0 ? '#228B22' : 'var(--copper-bronze)', fontSize: 10 }}>{rem === 0 ? 'âœ“ Done' : `${rem} left`}</span>
        </div>
        <div style={{ background: 'var(--stone)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 3, background: barColor, width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>
    </div>
  );
}
