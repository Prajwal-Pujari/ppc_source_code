import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pqcApi } from '../../api/pqc.api';
import api from '@/lib/axios';
import { useNotificationStore } from '../../store/notificationStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { getMyTasks } from '../../api/analytics.api';
import type { GaugeOperation, PqcQuestionSet, PqcQuestion, CompletionProgress } from '../../types/domain.types';
import { ChevronRight, ChevronLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const REJECTION_REASONS = [
  'Dimensional OOT', 'Surface Finish', 'Tool Marks', 'Material Defect'
];

/* ─── tiny reusable style helpers ─── */
const label: React.CSSProperties = {
  display: 'block', fontFamily: 'Inter', fontSize: 11, fontWeight: 500,
  letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ash)', marginBottom: 6,
};

const monoValue: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 500, color: 'var(--charcoal)',
};

type WizardStep = 'QTY' | 'QUESTION' | 'SUMMARY';

export function InspectorLiveEntryPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('PQC Inspections'); }, [setPageTitle]);

  const [selectedShift, setSelectedShift] = useState('Morning');
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('QTY');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

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

  // Fetch Question Set for the selected operation
  const { data: questionSet, isLoading: isQsLoading } = useQuery({
    queryKey: ['question-set', selectedOp?.operationMaster?.id || selectedOp?.operationName], // Hacky fallback if operationMaster not fully populated
    queryFn: async () => {
      // In a real app we'd use selectedOp.operationMaster.id, but since our nested fetches might be shallow, 
      // we might need to rely on the backend finding it via the gauge operation id if needed.
      // For now, let's assume we can fetch by operationName or we fetch all and filter.
      try {
        const res = await pqcApi.getAllQuestionSets();
        const sets = res.data;
        // Find the set matching the operation name
        return sets.find(s => s.operationMaster.operationName === selectedOp?.operationName) || null;
      } catch (e) {
        return null;
      }
    },
    enabled: !!selectedOp
  });

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
        shiftId: undefined, // Let backend determine based on time or user
        actualQty, passedQty, rejectedQty, reworkQty, scrapQty,
        rejectionReasons: selectedReasons.map(r => ({ reason: r, count: 1 })),
        questionAnswers: answersArray,
        remarks,
      });

      // After logging, check if we reached completion
      const progressRes = await pqcApi.getCompletionProgress(selectedOp.id);
      if (progressRes.data.readyForCompletion) {
        setCompletionProgress(progressRes.data);
        setShowCompletionDialog(true);
      }

      return res;
    },
    onSuccess: (data, variables, context) => {
      if (!showCompletionDialog) {
        addNotification('success', 'Inspection Logged', 'Data has been successfully recorded.');
        setSelectedOpId(null);
        queryClient.invalidateQueries({ queryKey: ['active-operations'] });
      }
    },
    onError: (err: any) => {
      addNotification('error', 'Error logging inspection', err.response?.data?.message || err.message);
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

  /* ─────────────── RENDER HELPERS ─────────────── */

  const renderQtyStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
        <h3 className="text-blue-800 font-semibold mb-1">Step 1: Quantities</h3>
        <p className="text-sm text-blue-600">Enter the number of parts inspected in this batch.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ border: '1px solid var(--stone)', borderRadius: 4, padding: '12px 14px', background: 'var(--warm-white)' }}>
          <span style={label}>TARGET BATCH QTY</span>
          <span style={monoValue}>{selectedOp?.gauge?.batchQuantity || 0}</span>
        </div>
        <div style={{ border: '2px solid var(--copper-bronze)', borderRadius: 4, padding: '12px 14px', background: 'white', boxShadow: '0 1px 4px rgba(139,105,20,0.08)' }}>
          <span style={{ ...label, color: 'var(--copper-bronze)' }}>ACTUAL QTY INSPECTED</span>
          <input
            type="number" value={actualQty || ''} onChange={e => setActualQty(parseInt(e.target.value) || 0)}
            style={{ ...monoValue, width: '100%', border: 'none', outline: 'none', background: 'none', padding: 0 }}
            autoFocus
          />
        </div>
        <div style={{ border: '1px solid var(--stone)', borderRadius: 4, padding: '12px 14px', background: 'white', boxShadow: '0 1px 3px rgba(28,26,24,0.04)' }}>
          <span style={label}>PASSED QTY</span>
          <input
            type="number" value={passedQty || ''} onChange={e => setPassedQty(parseInt(e.target.value) || 0)}
            style={{ ...monoValue, width: '100%', border: 'none', outline: 'none', background: 'none', padding: 0 }}
          />
        </div>
      </div>

      <div style={{
        background: 'var(--linen)', border: '1px solid var(--silk)', borderRadius: 4,
        padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ ...label, margin: 0 }}>CALCULATED VARIANCE:</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600,
            color: calculatedVariance !== 0 ? '#ba1a1a' : '#3A6B4A',
          }}>
            {calculatedVariance} UNITS
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...label, fontSize: 10, marginBottom: 4 }}>REJECTED</span>
            <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 500, color: 'var(--charcoal)' }}>{rejectedQty}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...label, fontSize: 10, marginBottom: 4 }}>REWORK</span>
            <input
              type="number" value={reworkQty || ''} onChange={e => setReworkQty(parseInt(e.target.value) || 0)}
              style={{ width: 60, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, border: '1px solid var(--stone)', borderRadius: 3, padding: '3px 4px', background: 'white', outline: 'none' }}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ ...label, fontSize: 10, marginBottom: 4 }}>SCRAP</span>
            <input
              type="number" value={scrapQty || ''} onChange={e => setScrapQty(parseInt(e.target.value) || 0)}
              style={{ width: 60, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, border: '1px solid var(--stone)', borderRadius: 3, padding: '3px 4px', background: 'white', outline: 'none' }}
            />
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
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">Question {currentQuestionIdx + 1} of {questionSet.questions.length}</span>
            {q.isCritical && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Critical</span>}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-[var(--pqc-copper)] h-1.5 rounded-full" style={{ width: `${((currentQuestionIdx + 1) / questionSet.questions.length) * 100}%` }}></div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center max-w-2xl mx-auto w-full">
          <h2 className="text-3xl font-semibold text-gray-800 text-center mb-12 leading-tight">{q.questionText}</h2>

          {q.questionType === 'PASS_FAIL' && (
            <div className="grid grid-cols-2 gap-6 w-full">
              <button
                onClick={() => { setAnswer(q.id!, 'PASS'); handleNextStep(); }}
                className={`py-8 rounded-2xl border-4 text-2xl font-bold transition-all ${
                  answer === 'PASS' 
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-lg scale-105' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                PASS
              </button>
              <button
                onClick={() => { setAnswer(q.id!, 'FAIL'); handleNextStep(); }}
                className={`py-8 rounded-2xl border-4 text-2xl font-bold transition-all ${
                  answer === 'FAIL' 
                    ? 'border-red-500 bg-red-50 text-red-700 shadow-lg scale-105' 
                    : 'border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:bg-red-50'
                }`}
              >
                FAIL
              </button>
            </div>
          )}

          {q.questionType === 'NUMERIC' && (
            <div className="w-full text-center">
              <div className="relative inline-block">
                <input
                  type="number"
                  step="0.001"
                  value={answer || ''}
                  onChange={(e) => setAnswer(q.id!, e.target.value)}
                  className="text-5xl font-mono text-center w-64 pb-2 border-b-4 border-gray-300 focus:border-[var(--pqc-copper)] outline-none bg-transparent"
                  autoFocus
                />
                {q.unit && <span className="absolute bottom-4 -right-12 text-xl text-gray-400 font-medium">{q.unit}</span>}
              </div>
              {(q.minValue !== undefined || q.maxValue !== undefined) && (
                <p className="text-sm text-gray-500 mt-4">
                  Acceptable Range: {q.minValue !== undefined ? q.minValue : '-∞'} to {q.maxValue !== undefined ? q.maxValue : '∞'} {q.unit}
                </p>
              )}
            </div>
          )}

          {q.questionType === 'TEXT' && (
            <div className="w-full">
              <textarea
                value={answer || ''}
                onChange={(e) => setAnswer(q.id!, e.target.value)}
                className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-[var(--pqc-copper)] outline-none"
                rows={4}
                placeholder="Type your observation here..."
                autoFocus
              />
            </div>
          )}

          {q.questionType === 'CHOICE' && q.choices && (
            <div className="flex flex-col gap-4 w-full">
              {q.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => { setAnswer(q.id!, choice); handleNextStep(); }}
                  className={`py-4 px-6 text-left rounded-xl border-2 text-lg font-medium transition-all ${
                    answer === choice 
                      ? 'border-[var(--pqc-copper)] bg-orange-50 text-[var(--pqc-copper-dark)] shadow-md' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[var(--pqc-copper)] hover:bg-orange-50/30'
                  }`}
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

  const renderSummaryStep = () => (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900 mb-1">Inspection Ready to Log</h3>
        <p className="text-gray-500">Please review the quantities and remarks before submitting.</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Quantity Summary</h4>
          <ul className="space-y-3">
            <li className="flex justify-between"><span className="text-gray-500">Actual Qty:</span> <span className="font-mono font-medium">{actualQty}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Passed:</span> <span className="font-mono text-green-600 font-medium">{passedQty}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Rework:</span> <span className="font-mono text-orange-500 font-medium">{reworkQty}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Scrap:</span> <span className="font-mono text-red-500 font-medium">{scrapQty}</span></li>
          </ul>
        </div>
        
        {questionSet && questionSet.questions && (
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Checklist Summary</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {questionSet.questions.map((q, i) => (
                <div key={q.id} className="flex justify-between items-start text-sm">
                  <span className="text-gray-600 truncate pr-4">{i+1}. {q.questionText}</span>
                  <span className="font-semibold text-gray-900 shrink-0">{questionAnswers[q.id!] || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {(reworkQty > 0 || scrapQty > 0) && (
        <div>
          <span style={{ ...label, marginBottom: 10 }}>REJECTION REASONS (SELECT APPLICABLE)</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REJECTION_REASONS.map(reason => {
              const active = selectedReasons.includes(reason);
              return (
                <button
                  key={reason} onClick={() => toggleReason(reason)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    border: `1px solid ${active ? 'var(--copper-bronze)' : 'var(--stone)'}`,
                    background: active ? 'rgba(139,105,20,0.08)' : 'transparent',
                    color: active ? 'var(--copper-bronze)' : 'var(--ash)',
                  }}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <span style={label}>INSPECTOR REMARKS</span>
        <textarea
          value={remarks} onChange={e => setRemarks(e.target.value)}
          placeholder="Enter specific observations..."
          rows={3}
          style={{
            width: '100%', background: 'var(--bone-white)', border: '1px solid var(--stone)',
            borderRadius: 4, padding: 12, fontSize: 13, color: 'var(--charcoal)',
            fontFamily: 'Inter, sans-serif', resize: 'none', outline: 'none',
          }}
        />
      </div>
    </div>
  );

  /* ─────────────── MAIN RENDER ─────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height))', overflow: 'hidden' }}>

      {/* ── Page Header ── */}
      <div style={{ padding: '24px 28px 16px', display: 'flex', justifyItems: 'space-between', alignItems: 'flex-end' }}>
        <div className="flex-1">
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: 0 }}>
            Live Inspection Entry
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4 }}>
            Active Operations Awaiting Inspection
          </p>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, padding: '0 28px 28px', overflow: 'hidden' }}>

        {/* ── LEFT: Operation Cards ── */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 6, paddingBottom: 12 }}>
          {isOpsLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 13 }}>Loading active operations...</div>
          ) : !operations?.length ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 13, background: 'white', border: '1px solid var(--silk)', borderRadius: 8 }}>
              No active operations to inspect.
            </div>
          ) : (
            operations.map(op => {
              const isSelected = selectedOpId === op.id;
              const initials = op.assignedTo?.fullName
                ? op.assignedTo.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                : '';

              return (
                <div
                  key={op.id}
                  onClick={() => setSelectedOpId(op.id)}
                  style={{
                    background: isSelected ? '#EEF3FC' : 'white',
                    border: `1px solid ${isSelected ? '#a8c7f0' : 'var(--silk)'}`,
                    borderLeft: `4px solid ${isSelected ? '#1a73e8' : 'var(--copper-bronze)'}`,
                    borderRadius: 8,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected
                      ? '0 2px 8px rgba(26,115,232,0.12)'
                      : '0 1px 3px rgba(28,26,24,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>{op.operationName}</h3>
                  </div>
                  <div style={{
                    background: 'var(--linen)', padding: '10px 14px', borderRadius: 4, marginBottom: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ ...label, fontSize: 10, marginBottom: 3 }}>GAUGE SN</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', margin: 0 }}>
                        {op.gauge?.serialNumber || '---'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ ...label, fontSize: 10, marginBottom: 3 }}>TARGET QTY</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--charcoal)', margin: 0 }}>{op.gauge?.batchQuantity || 1}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── RIGHT: Inspection Wizard ── */}
        <div style={{
          background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 2px 6px rgba(28,26,24,0.05)',
        }}>
          {!selectedOp ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ash)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.35 }}>rule</span>
              <p style={{ fontSize: 14 }}>Select an operation from the list to log an inspection.</p>
            </div>
          ) : (
            <>
              {/* Form Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--silk)', background: 'var(--bone-white)' }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 4px' }}>
                  {questionSet ? questionSet.name : 'Inspection Entry'}
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
                  Gauge: <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{selectedOp.gauge?.serialNumber}</span> | Operation: {selectedOp.operationName}
                </p>
              </div>

              {/* Form Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
                {wizardStep === 'QTY' && renderQtyStep()}
                {wizardStep === 'QUESTION' && renderQuestionStep()}
                {wizardStep === 'SUMMARY' && renderSummaryStep()}
              </div>

              {/* Form Footer / Navigation */}
              <div style={{
                padding: '16px 24px', borderTop: '1px solid var(--silk)', background: 'var(--bone-white)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {wizardStep === 'QTY' && calculatedVariance !== 0 && (
                    <span className="text-red-500 text-sm font-medium flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" /> Imbalanced Quantities
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  {wizardStep !== 'QTY' && (
                    <button
                      onClick={handlePrevStep}
                      className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 flex items-center"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </button>
                  )}
                  
                  {wizardStep !== 'SUMMARY' ? (
                    <button
                      onClick={handleNextStep}
                      disabled={wizardStep === 'QTY' && calculatedVariance !== 0}
                      className={`px-6 py-2.5 rounded-lg font-medium text-white flex items-center transition-colors ${
                        (wizardStep === 'QTY' && calculatedVariance !== 0) 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-[var(--pqc-copper)] hover:bg-[var(--pqc-copper-dark)]'
                      }`}
                    >
                      Next <ChevronRight className="w-5 h-5 ml-1" />
                    </button>
                  ) : (
                    <button
                      onClick={() => submitMutation.mutate()}
                      disabled={submitMutation.isPending}
                      className="px-8 py-2.5 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 flex items-center shadow-md transition-all"
                    >
                      {submitMutation.isPending ? 'Logging...' : 'Confirm & Log Inspection'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Complete Confirmation Dialog */}
      {showCompletionDialog && completionProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Target Reached!</h3>
              <p className="text-gray-600 mb-6">
                You have passed {completionProgress.totalPassedQty} units out of the targeted {completionProgress.plannedQty} for this operation.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Operation:</span>
                  <span className="font-medium">{completionProgress.operationName}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Total Actual Inspected:</span>
                  <span className="font-mono font-medium">{completionProgress.totalActualQty}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-900 font-semibold">Total Passed:</span>
                  <span className="font-mono font-bold text-green-600">{completionProgress.totalPassedQty} / {completionProgress.plannedQty}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCompletionDialog(false);
                    addNotification('success', 'Inspection Logged', 'Data has been successfully recorded.');
                    setSelectedOpId(null);
                    queryClient.invalidateQueries({ queryKey: ['active-operations'] });
                  }}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
                >
                  Keep Open
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Call the MES operation completion API here (you might need to import or add this to pqcApi if it crosses domains, but assuming MES API handles it)
                      await api.post(`/gauge-operations/${completionProgress.operationId}/complete`, { remarks: 'Auto-completed from PQC inspection threshold' });
                      setShowCompletionDialog(false);
                      addNotification('success', 'Operation Completed', `${completionProgress.operationName} has been marked as complete.`);
                      setSelectedOpId(null);
                      queryClient.invalidateQueries({ queryKey: ['active-operations'] });
                    } catch (e) {
                      addNotification('error', 'Error', 'Failed to complete operation');
                    }
                  }}
                  className="flex-1 py-2.5 bg-green-600 rounded-lg font-medium text-white hover:bg-green-700 shadow-sm"
                >
                  Complete Operation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
