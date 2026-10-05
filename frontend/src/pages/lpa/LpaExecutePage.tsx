import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { lpaApi, type LpaSchedule, type LpaQuestionSet, type LpaQuestionItem } from '@/api/lpa.api';
import {
  CheckCircle2, AlertTriangle, ShieldAlert, Award, Play, Check, X,
  ArrowRight, RotateCcw, Loader2, Sparkles, AlertCircle, HelpCircle, FileText, Clock, Calendar,
  Search, ChevronDown, ArrowLeft
} from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export function LpaExecutePage({ auditType }: { auditType?: string }) {
  const [searchParams] = useSearchParams();
  const scheduleIdParam = searchParams.get('scheduleId');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<LpaSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<LpaSchedule | null>(null);

  // Execution State
  const [answers, setAnswers] = useState<Record<string, {
    answerValue: string;
    isPassed: boolean;
    correctiveAction?: string;
  }>>({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedResult, setCompletedResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [scheduleIdParam, auditType]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const [schedRes, qsRes] = await Promise.all([
        lpaApi.getSchedules(),
        lpaApi.getQuestionSets().catch(() => ({ data: [] }))
      ]);
      let list: LpaSchedule[] = getArray(schedRes);
      const allQs: LpaQuestionSet[] = getArray(qsRes);

      // Merge checkpoints/questions into schedule.questionSet if omitted by backend serialization
      list.forEach(s => {
        if (s.questionSet) {
          const qsId = s.questionSet.id || (s.questionSet as any);
          const fullQs = allQs.find(q => q.id === qsId);
          if (fullQs && fullQs.questions && fullQs.questions.length > 0) {
            s.questionSet = { ...s.questionSet, questions: fullQs.questions };
          }
        }
      });

      if (auditType) {
        list = list.filter((s: any) => s.auditType === auditType || s.questionSet?.auditType === auditType);
      } else {
        list = list.filter((s: any) => s.auditType !== 'SYSTEM_AUDIT' && s.auditType !== 'SUPPLIER_AUDIT' && s.questionSet?.auditType !== 'SYSTEM_AUDIT' && s.questionSet?.auditType !== 'SUPPLIER_AUDIT');
      }

      setSchedules(list);
      if (scheduleIdParam) {
        const found = list.find(s => s.id === scheduleIdParam);
        if (found) {
          handleSelectSchedule(found);
        }
      }
    } catch (err) {
      console.error('Failed to load audit schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchedule = (sched: LpaSchedule) => {
    setSelectedSchedule(sched);
    setCompletedResult(null);
    setErrorMessage(null);
    setGeneralNotes('');

    // Initialize answers
    const initAnswers: Record<string, any> = {};
    const qs = sched.questionSet;
    if (qs && qs.questions) {
      qs.questions.forEach((q, idx) => {
        const key = q.id || `q-${idx}`;
        initAnswers[key] = {
          answerValue: q.questionType === 'PASS_FAIL' ? 'PASS' : q.questionType === 'YES_NO' ? 'YES' : '',
          isPassed: true,
          correctiveAction: '',
        };
      });
    }
    setAnswers(initAnswers);
  };

  const handleAnswerChange = (q: LpaQuestionItem, idx: number, value: string) => {
    const key = q.id || `q-${idx}`;
    let isPassed = true;

    if (q.questionType === 'PASS_FAIL') {
      isPassed = value === 'PASS';
    } else if (q.questionType === 'YES_NO') {
      isPassed = value === 'YES';
    } else if (q.questionType === 'NUMERIC') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        if (q.minValue !== undefined && num < q.minValue) isPassed = false;
        if (q.maxValue !== undefined && num > q.maxValue) isPassed = false;
      }
    }

    setAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        answerValue: value,
        isPassed,
      },
    }));
  };

  const handleCorrectiveActionChange = (q: LpaQuestionItem, idx: number, text: string) => {
    const key = q.id || `q-${idx}`;
    setAnswers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        correctiveAction: text,
      },
    }));
  };

  const calculateScore = () => {
    if (!selectedSchedule?.questionSet?.questions?.length) return 100;
    const qs = selectedSchedule.questionSet.questions;
    let passedCount = 0;
    qs.forEach((q, idx) => {
      const key = q.id || `q-${idx}`;
      const ans = answers[key];
      if (ans && ans.isPassed) passedCount++;
    });
    return Math.round((passedCount / qs.length) * 100);
  };

  const handleSubmit = async () => {
    if (!selectedSchedule || !selectedSchedule.questionSet) return;
    const qs = selectedSchedule.questionSet.questions;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        auditType: selectedSchedule.auditType || selectedSchedule.questionSet.auditType || 'LAYERED_PROCESS',
        scheduleId: selectedSchedule.id,
        questionSetId: selectedSchedule.questionSet.id,
        operationMasterId: selectedSchedule.operationMaster?.id || selectedSchedule.questionSet.operationMaster?.id || null,
        gaugeMasterId: selectedSchedule.gaugeMaster?.id || selectedSchedule.questionSet.gaugeMaster?.id || null,
        machineMasterId: selectedSchedule.machineMaster?.id || selectedSchedule.questionSet.machineMaster?.id || null,
        remarks: generalNotes,
        answers: qs.map((q, idx) => {
          const key = q.id || `q-${idx}`;
          const ans = answers[key] || { answerValue: 'PASS', isPassed: true, correctiveAction: '' };
          return {
            questionId: q.id,
            status: ans.explicitStatus ? ans.explicitStatus : (ans.isPassed ? 'CONFORMING' : 'NON_CONFORMING'),
            actualValue: ans.answerValue || null,
            remarks: null,
            correctiveAction: ans.correctiveAction || null,
          };
        }),
      };

      const res = await lpaApi.submitAudit(payload);
      if (res && ((res as any).success || (res as any).data)) {
        setCompletedResult((res as any).data || { scorePercentage: calculateScore(), overallStatus: calculateScore() === 100 ? 'PASS' : 'FAIL' });
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to submit audit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: 60, textAlign: 'center', background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)' }}>
        <Award size={48} style={{ margin: '0 auto 16px', color: 'var(--copper-bronze)', opacity: 0.5 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 8 }}>No Audits Available</h2>
        <p style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 24 }}>
          There are currently no scheduled audits ready for execution. Create a schedule first to begin!
        </p>
        <button
          onClick={() => navigate('/lpa/schedules')}
          style={{ padding: '12px 24px', borderRadius: 10, background: 'var(--copper-bronze)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' }}
        >
          Go to Schedules
        </button>
      </div>
    );
  }

  const currentScore = calculateScore();
  const qsList = selectedSchedule?.questionSet?.questions || [];

  // Celebratory Completed View
  if (completedResult) {
    const isPerfect = completedResult.scorePercentage === 100 || currentScore === 100;
    return (
      <div style={{ maxWidth: 760, margin: '40px auto', animation: 'fadeIn 0.3s' }}>
        <div style={{
          padding: 48, borderRadius: 20, background: 'var(--warm-white)',
          border: `2px solid ${isPerfect ? '#16a34a' : 'var(--copper-bronze)'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: isPerfect ? 'rgba(34, 197, 94, 0.15)' : 'rgba(184, 115, 51, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isPerfect ? '#16a34a' : 'var(--copper-bronze)',
            boxShadow: isPerfect ? '0 0 30px rgba(34, 197, 94, 0.3)' : 'none',
          }}>
            {isPerfect ? <Sparkles size={44} /> : <Award size={44} />}
          </div>

          <div>
            <span style={{
              fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: isPerfect ? '#16a34a' : 'var(--copper-bronze)',
            }}>
              {isPerfect ? 'Perfect Audit Score!' : 'Audit Completed & Logged'}
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--charcoal)', margin: '6px 0 8px 0' }}>
              {selectedSchedule?.questionSet?.name}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0 }}>
              All verification responses and corrective actions have been recorded to the facility compliance log.
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 24, padding: '20px 36px',
            borderRadius: 14, background: 'var(--cream)', border: '1px solid var(--silk)',
            margin: '8px 0',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase' }}>Final Score</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: isPerfect ? '#16a34a' : 'var(--charcoal)', lineHeight: 1 }}>
                {Math.round(completedResult.scorePercentage || currentScore)}%
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--silk)' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase' }}>Status</div>
              <div style={{
                fontSize: 16, fontWeight: 800, color: isPerfect ? '#16a34a' : '#dc2626',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {isPerfect ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {isPerfect ? 'ALL PASS' : 'ACTION REQUIRED'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <button
              onClick={() => navigate('/lpa/dashboard')}
              style={{
                padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: 'var(--cream)', border: '1px solid var(--silk)', color: 'var(--charcoal)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => {
                setCompletedResult(null);
                fetchSchedules();
              }}
              style={{
                padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
                color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 6px 18px rgba(184,115,51,0.25)',
              }}
            >
              <RotateCcw size={16} /> Execute Another Audit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!selectedSchedule ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Available Audit Schedules</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Audit Type</th>
                  <th>Checklist Name</th>
                  <th>Target</th>
                  <th>Frequency</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const targetName = s.operationMaster?.operationName || s.machineMaster?.machineName || s.gaugeMaster?.gaugeName || '—';
                  const auditTypeBadge = s.auditType === 'PRODUCT_AUDIT' ? 'badge-in-progress' : 'badge-queued';
                  
                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleSelectSchedule(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className={`badge ${auditTypeBadge}`}>
                          {s.auditType.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                        {s.questionSet?.name}
                      </td>
                      <td style={{ color: 'var(--slate)' }}>
                        {targetName}
                      </td>
                      <td>
                        <span className="font-mono" style={{ 
                          fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 4, 
                          background: 'var(--warm-white)', border: '1px solid var(--silk)' 
                        }}>
                          {s.frequency}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }}>
                          Execute <ArrowRight size={14} style={{ marginLeft: 6 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={() => setSelectedSchedule(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 10, background: 'var(--warm-white)', border: '1px solid var(--silk)',
                fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--warm-white)'}
            >
              <ArrowLeft size={16} color="var(--copper-bronze)" /> Back to Schedules
            </button>
          </div>

      {errorMessage && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.4)', color: '#b91c1c',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Audit Target Header Banner */}
      {selectedSchedule && selectedSchedule.questionSet && (
        <div style={{
          padding: '24px 28px', borderRadius: 16, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 6px 20px rgba(0,0,0,0.02)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                background: 'var(--linen)', color: 'var(--copper-bronze)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {selectedSchedule.auditType.replace('_', ' ')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600 }}>
                • Task ID: {selectedSchedule.id.substring(0, 8)}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--charcoal)', margin: '0 0 6px 0' }}>
              {selectedSchedule.questionSet.name}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0, maxWidth: 700 }}>
              {selectedSchedule.questionSet.description || 'Standard quality verification and error-proofing checklist.'}
            </p>
          </div>

          {/* Live Score Meter Moved Here */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Score</span>
            <div style={{
              padding: '6px 18px', borderRadius: 20,
              background: currentScore === 100 ? 'rgba(34, 197, 94, 0.15)' : currentScore >= 80 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: currentScore === 100 ? '#16a34a' : currentScore >= 80 ? '#ca8a04' : '#dc2626',
              fontSize: 22, fontWeight: 800, border: `1px solid ${currentScore === 100 ? '#16a34a' : currentScore >= 80 ? '#ca8a04' : '#dc2626'}`,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {currentScore === 100 && <Sparkles size={18} />}
              <span>{currentScore}%</span>
            </div>
          </div>

          <div style={{ padding: '12px 18px', borderRadius: 12, background: 'var(--cream)', border: '1px solid var(--silk)', textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', marginBottom: 2 }}>Shared Master Target</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal)' }}>
              {selectedSchedule.questionSet.gaugeMaster?.gaugeTypeName ||
                selectedSchedule.questionSet.operationMaster?.operationName ||
                selectedSchedule.questionSet.machineMaster?.machineName ||
                'Plant-Wide Facility'}
            </div>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className="table-container" style={{ marginTop: 8 }}>
        {(() => {
          const isSystemOrSupplier = selectedSchedule?.auditType === 'SYSTEM_AUDIT' || selectedSchedule?.auditType === 'SUPPLIER_AUDIT' || selectedSchedule?.questionSet?.auditType === 'SYSTEM_AUDIT' || selectedSchedule?.questionSet?.auditType === 'SUPPLIER_AUDIT';
          return (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--warm-white)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--silk)' }}>
          <thead>
            <tr>
              <th style={{ width: '6%', padding: '16px 20px', borderBottom: '1px solid var(--silk)', color: 'var(--slate)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Check</th>
              <th style={{ width: '35%', padding: '16px 20px', borderBottom: '1px solid var(--silk)', color: 'var(--slate)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Inspection Details</th>
              <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--silk)', color: 'var(--slate)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Observations / Inputs</th>
              <th style={{ width: '18%', padding: '16px 20px', borderBottom: '1px solid var(--silk)', color: 'var(--slate)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Final Result</th>
            </tr>
          </thead>
          <tbody>
            {qsList.map((q, idx) => {
              const key = q.id || `q-${idx}`;
              const ans = answers[key] || { answerValue: 'PASS', isPassed: true, correctiveAction: '', explicitStatus: 'CONFORMING' };
              const isFailed = ans.explicitStatus ? ans.explicitStatus !== 'CONFORMING' : !ans.isPassed;

              return (
                <tr key={key} style={{ 
                  background: isFailed ? 'rgba(239, 68, 68, 0.03)' : 'transparent', 
                  borderBottom: '1px solid var(--silk)',
                  borderLeft: isFailed ? '3px solid #dc2626' : '3px solid transparent',
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: isFailed ? '#dc2626' : 'var(--copper-bronze)',
                      background: isFailed ? 'rgba(239, 68, 68, 0.12)' : 'var(--linen)',
                      padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap'
                    }}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {q.isCritical && (
                        <span style={{
                          alignSelf: 'flex-start', fontSize: 10, fontWeight: 700, background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04',
                          padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: '0.05em'
                        }}>
                          <ShieldAlert size={12} /> Critical Check
                        </span>
                      )}
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', lineHeight: 1.4 }}>
                        {q.questionText}
                      </div>
                      {q.checkingMethod && (
                        <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                          <HelpCircle size={14} style={{ color: 'var(--ash)', marginTop: 2, flexShrink: 0 }} />
                          <span>{q.checkingMethod}</span>
                        </div>
                      )}
                      {q.reactionPlan && isFailed && (
                        <div style={{ fontSize: 12, color: 'var(--charcoal)', background: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: 6, borderLeft: '3px solid #dc2626', marginTop: 4 }}>
                          <span style={{ fontWeight: 700 }}>Reaction Plan:</span> {q.reactionPlan}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(selectedSchedule?.auditType === 'PRODUCT_AUDIT' || selectedSchedule?.questionSet?.auditType === 'PRODUCT_AUDIT') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>5 Sample Observations:</span>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[0, 1, 2, 3, 4].map((sIdx) => {
                              const parts = (ans.answerValue || '').split(/[,|;]/).map((p: string) => p.trim());
                              return (
                                <input
                                  key={sIdx}
                                  type="text"
                                  placeholder={`#${sIdx + 1}`}
                                  value={parts[sIdx] || ''}
                                  onChange={(e) => {
                                    const newParts = [parts[0] || '', parts[1] || '', parts[2] || '', parts[3] || '', parts[4] || ''];
                                    newParts[sIdx] = e.target.value;
                                    handleAnswerChange(q, idx, newParts.join(', '));
                                  }}
                                  style={{
                                    width: 50, padding: '6px', borderRadius: 6, textAlign: 'center',
                                    border: `1px solid ${ans.isPassed ? 'var(--silk)' : '#fca5a5'}`, background: 'var(--cream)', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)'
                                  }}
                                />
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                handleAnswerChange(q, idx, 'OK, OK, OK, OK, OK');
                                setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: true } }));
                              }}
                              style={{
                                padding: '6px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                                fontSize: 11, fontWeight: 800, border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer'
                              }}
                            >
                              All OK
                            </button>
                          </div>
                        </div>
                      ) : q.questionType === 'NUMERIC' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            step="any"
                            placeholder={`Min: ${q.minValue ?? '-'}, Max: ${q.maxValue ?? '-'}`}
                            value={ans.answerValue}
                            onChange={(e) => handleAnswerChange(q, idx, e.target.value)}
                            style={{
                              width: 140, padding: '8px 12px', borderRadius: 6,
                              border: `1px solid ${ans.isPassed ? 'var(--silk)' : '#dc2626'}`,
                              background: 'var(--cream)', fontSize: 13, fontWeight: 700, color: 'var(--charcoal)',
                            }}
                          />
                          {q.unit && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)' }}>{q.unit}</span>}
                        </div>
                      ) : isSystemOrSupplier || (q.questionType !== 'PASS_FAIL' && q.questionType !== 'YES_NO') ? (
                        <textarea
                          placeholder={isSystemOrSupplier ? "Auditor's detailed observation..." : "Observation note..."}
                          rows={isSystemOrSupplier ? 3 : 1}
                          value={ans.answerValue || ''}
                          onChange={(e) => handleAnswerChange(q, idx, e.target.value)}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 6,
                            border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13, resize: 'vertical'
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic' }}>
                          (Direct boolean response)
                        </div>
                      )}

                      {/* Corrective Action Box for Failed Checks */}
                      {isFailed && (
                        <div style={{
                          padding: '10px 12px', borderRadius: 8, background: '#fff',
                          border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: 8,
                          animation: 'fadeIn 0.2s', marginTop: 4
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>
                            <AlertTriangle size={14} />
                            <span>{isSystemOrSupplier ? 'Requested Action' : 'Action Required'}</span>
                          </div>
                          <textarea
                            placeholder={isSystemOrSupplier ? "Describe the required action or remediation..." : "Containment & corrective action taken..."}
                            rows={2}
                            value={ans.correctiveAction || ''}
                            onChange={(e) => handleCorrectiveActionChange(q, idx, e.target.value)}
                            style={{
                              width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.4)',
                              background: '#fff', fontSize: 12, color: 'var(--charcoal)', outline: 'none', resize: 'vertical',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '20px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                      {isSystemOrSupplier ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              handleAnswerChange(q, idx, ans.answerValue || '');
                              setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: true, explicitStatus: 'CONFORMING' } }));
                            }}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.explicitStatus === 'CONFORMING' ? '#16a34a' : 'var(--cream)',
                              color: ans.explicitStatus === 'CONFORMING' ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.explicitStatus === 'CONFORMING' ? '#16a34a' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <Check size={14} /> COMPLIANCE
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAnswerChange(q, idx, ans.answerValue || '');
                              setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: false, explicitStatus: 'SCOPE_OF_IMPROVEMENT' } }));
                            }}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.explicitStatus === 'SCOPE_OF_IMPROVEMENT' ? '#ca8a04' : 'var(--cream)',
                              color: ans.explicitStatus === 'SCOPE_OF_IMPROVEMENT' ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.explicitStatus === 'SCOPE_OF_IMPROVEMENT' ? '#ca8a04' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <ShieldAlert size={14} /> SCOPE OF IMPROVEMENT
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAnswerChange(q, idx, ans.answerValue || '');
                              setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: false, explicitStatus: 'NON_CONFORMING' } }));
                            }}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.explicitStatus === 'NON_CONFORMING' ? '#dc2626' : 'var(--cream)',
                              color: ans.explicitStatus === 'NON_CONFORMING' ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.explicitStatus === 'NON_CONFORMING' ? '#dc2626' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <X size={14} /> NC
                          </button>
                        </>
                      ) : q.questionType === 'YES_NO' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q, idx, 'YES')}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.answerValue === 'YES' ? '#16a34a' : 'var(--cream)',
                              color: ans.answerValue === 'YES' ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.answerValue === 'YES' ? '#16a34a' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <Check size={14} /> YES
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswerChange(q, idx, 'NO')}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.answerValue === 'NO' ? '#dc2626' : 'var(--cream)',
                              color: ans.answerValue === 'NO' ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.answerValue === 'NO' ? '#dc2626' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <X size={14} /> NO
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if(selectedSchedule?.auditType !== 'PRODUCT_AUDIT' && q.questionType === 'PASS_FAIL') {
                                handleAnswerChange(q, idx, 'PASS');
                              } else {
                                setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: true } }));
                              }
                            }}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: ans.isPassed ? '#16a34a' : 'var(--cream)',
                              color: ans.isPassed ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.isPassed ? '#16a34a' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <Check size={14} /> PASS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if(selectedSchedule?.auditType !== 'PRODUCT_AUDIT' && q.questionType === 'PASS_FAIL') {
                                handleAnswerChange(q, idx, 'FAIL');
                              } else {
                                setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: false } }));
                              }
                            }}
                            style={{
                              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 800,
                              background: !ans.isPassed ? '#dc2626' : 'var(--cream)',
                              color: !ans.isPassed ? '#fff' : 'var(--slate)',
                              border: `1px solid ${!ans.isPassed ? '#dc2626' : 'var(--silk)'}`,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center'
                            }}
                          >
                            <X size={14} /> FAIL
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          );
        })()}
      </div>

      {/* General Notes & Submit Bar */}
      <div style={{
        padding: '24px', borderRadius: 16, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', boxShadow: '0 6px 20px rgba(0,0,0,0.02)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
            General Audit Summary / Auditor Remarks
          </label>
          <input
            type="text"
            placeholder="Optional summary notes regarding plant conditions, operator feedback, or 5S cleanliness..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--silk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--slate)' }}>Total Audit Score:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: currentScore === 100 ? '#16a34a' : currentScore >= 80 ? '#ca8a04' : '#dc2626' }}>
              {currentScore}%
            </span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '14px 36px', borderRadius: 10, fontSize: 15, fontWeight: 800,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
              color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 20px rgba(184,115,51,0.3)',
              opacity: submitting ? 0.7 : 1, transition: 'all 0.15s',
            }}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            <span>Submit & Log Audit Results</span>
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
