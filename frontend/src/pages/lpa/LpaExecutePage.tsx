import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { lpaApi, type LpaSchedule, type LpaQuestionSet, type LpaQuestionItem } from '@/api/lpa.api';
import {
  CheckCircle2, AlertTriangle, ShieldAlert, Award, Play, Check, X,
  ArrowRight, RotateCcw, Loader2, Sparkles, AlertCircle, HelpCircle, FileText
} from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export function LpaExecutePage() {
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
  }, [scheduleIdParam]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const [schedRes, qsRes] = await Promise.all([
        lpaApi.getSchedules(),
        lpaApi.getQuestionSets().catch(() => ({ data: [] }))
      ]);
      const list: LpaSchedule[] = getArray(schedRes);
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

      setSchedules(list);
      if (scheduleIdParam) {
        const found = list.find(s => s.id === scheduleIdParam);
        if (found) {
          handleSelectSchedule(found);
        }
      } else if (list.length > 0 && !selectedSchedule) {
        handleSelectSchedule(list[0]);
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

    // Check if any failed critical check lacks corrective action
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const key = q.id || `q-${i}`;
      const ans = answers[key];
      if (ans && !ans.isPassed && (!ans.correctiveAction || !ans.correctiveAction.trim())) {
        setErrorMessage(`Check #${i + 1} ("${q.questionText}") failed! Please enter the Corrective Action Taken.`);
        return;
      }
    }

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
            status: ans.isPassed ? 'CONFORMING' : 'NON_CONFORMING',
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
      {/* Top Selector Bar */}
      <div style={{
        padding: '16px 20px', borderRadius: 14, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>Active Schedule:</span>
          <select
            value={selectedSchedule?.id || ''}
            onChange={(e) => {
              const found = schedules.find(s => s.id === e.target.value);
              if (found) handleSelectSchedule(found);
            }}
            style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--copper-bronze)',
              background: 'var(--cream)', fontSize: 14, fontWeight: 700, color: 'var(--charcoal)',
              minWidth: 320,
            }}
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>{s.questionSet?.name} ({s.auditType})</option>
            ))}
          </select>
        </div>

        {/* Live Score Meter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase' }}>Live Compliance Score:</span>
          <div style={{
            padding: '6px 16px', borderRadius: 20,
            background: currentScore === 100 ? 'rgba(34, 197, 94, 0.15)' : currentScore >= 80 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: currentScore === 100 ? '#16a34a' : currentScore >= 80 ? '#ca8a04' : '#dc2626',
            fontSize: 18, fontWeight: 800, border: `1px solid ${currentScore === 100 ? '#16a34a' : currentScore >= 80 ? '#ca8a04' : '#dc2626'}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {currentScore === 100 && <Sparkles size={16} />}
            <span>{currentScore}%</span>
          </div>
        </div>
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
                {selectedSchedule.auditType}
              </span>
              <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>
                • Freq: {selectedSchedule.frequency}
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--charcoal)', margin: '0 0 6px 0' }}>
              {selectedSchedule.questionSet.name}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0, maxWidth: 700 }}>
              {selectedSchedule.questionSet.description || 'Standard quality verification and error-proofing checklist.'}
            </p>
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

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {qsList.map((q, idx) => {
          const key = q.id || `q-${idx}`;
          const ans = answers[key] || { answerValue: 'PASS', isPassed: true, correctiveAction: '' };
          const isFailed = !ans.isPassed;

          return (
            <div
              key={key}
              style={{
                padding: '22px 26px', borderRadius: 16,
                background: isFailed ? 'rgba(239, 68, 68, 0.04)' : 'var(--warm-white)',
                border: `2px solid ${isFailed ? '#ef4444' : 'var(--silk)'}`,
                boxShadow: isFailed ? '0 8px 24px rgba(239,68,68,0.1)' : '0 4px 16px rgba(0,0,0,0.02)',
                transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 800, color: isFailed ? '#dc2626' : 'var(--copper-bronze)',
                      background: isFailed ? 'rgba(239, 68, 68, 0.12)' : 'var(--linen)',
                      padding: '4px 10px', borderRadius: 8,
                    }}>
                      Check #{idx + 1}
                    </span>
                    {q.isCritical && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04',
                        padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <ShieldAlert size={13} /> Critical Poka-Yoke Check
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', lineHeight: 1.4, marginBottom: 6 }}>
                    {q.questionText}
                  </div>
                  {q.checkingMethod && (
                    <div style={{ fontSize: 13, color: 'var(--slate)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={14} style={{ color: 'var(--ash)' }} />
                      <span>Method: {q.checkingMethod}</span>
                    </div>
                  )}
                </div>

                {/* Answer Input Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {(selectedSchedule?.auditType === 'PRODUCT_AUDIT' || selectedSchedule?.questionSet?.auditType === 'PRODUCT_AUDIT') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>5 Sample Observations:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: true } }));
                            }}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                              background: ans.isPassed ? '#16a34a' : 'var(--cream)',
                              color: ans.isPassed ? '#fff' : 'var(--slate)',
                              border: `1px solid ${ans.isPassed ? '#16a34a' : 'var(--silk)'}`, cursor: 'pointer'
                            }}
                          >
                            PASS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers(prev => ({ ...prev, [q.id || `q-${idx}`]: { ...prev[q.id || `q-${idx}`], isPassed: false } }));
                            }}
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                              background: !ans.isPassed ? '#dc2626' : 'var(--cream)',
                              color: !ans.isPassed ? '#fff' : 'var(--slate)',
                              border: `1px solid ${!ans.isPassed ? '#dc2626' : 'var(--silk)'}`, cursor: 'pointer'
                            }}
                          >
                            FAIL
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
                                width: 58, padding: '8px 6px', borderRadius: 8, textAlign: 'center',
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
                            padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#16a34a',
                            fontSize: 11, fontWeight: 800, border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', whiteSpace: 'nowrap'
                          }}
                        >
                          All OK
                        </button>
                      </div>
                    </div>
                  ) : q.questionType === 'PASS_FAIL' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q, idx, 'PASS')}
                        style={{
                          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                          background: ans.answerValue === 'PASS' ? '#16a34a' : 'var(--cream)',
                          color: ans.answerValue === 'PASS' ? '#fff' : 'var(--slate)',
                          border: `1px solid ${ans.answerValue === 'PASS' ? '#16a34a' : 'var(--silk)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                          boxShadow: ans.answerValue === 'PASS' ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
                        }}
                      >
                        <Check size={16} /> PASS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q, idx, 'FAIL')}
                        style={{
                          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                          background: ans.answerValue === 'FAIL' ? '#dc2626' : 'var(--cream)',
                          color: ans.answerValue === 'FAIL' ? '#fff' : 'var(--slate)',
                          border: `1px solid ${ans.answerValue === 'FAIL' ? '#dc2626' : 'var(--silk)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                          boxShadow: ans.answerValue === 'FAIL' ? '0 4px 12px rgba(220,38,38,0.3)' : 'none',
                        }}
                      >
                        <X size={16} /> FAIL
                      </button>
                    </div>
                  ) : q.questionType === 'YES_NO' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q, idx, 'YES')}
                        style={{
                          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                          background: ans.answerValue === 'YES' ? '#16a34a' : 'var(--cream)',
                          color: ans.answerValue === 'YES' ? '#fff' : 'var(--slate)',
                          border: `1px solid ${ans.answerValue === 'YES' ? '#16a34a' : 'var(--silk)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Check size={16} /> YES
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnswerChange(q, idx, 'NO')}
                        style={{
                          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                          background: ans.answerValue === 'NO' ? '#dc2626' : 'var(--cream)',
                          color: ans.answerValue === 'NO' ? '#fff' : 'var(--slate)',
                          border: `1px solid ${ans.answerValue === 'NO' ? '#dc2626' : 'var(--silk)'}`,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <X size={16} /> NO
                      </button>
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
                          width: 140, padding: '10px 14px', borderRadius: 8,
                          border: `2px solid ${ans.isPassed ? 'var(--silk)' : '#dc2626'}`,
                          background: 'var(--cream)', fontSize: 14, fontWeight: 700, color: 'var(--charcoal)',
                        }}
                      />
                      {q.unit && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ash)' }}>{q.unit}</span>}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter observation note..."
                      value={ans.answerValue}
                      onChange={(e) => handleAnswerChange(q, idx, e.target.value)}
                      style={{
                        width: 260, padding: '10px 14px', borderRadius: 8,
                        border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13,
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Reaction Plan & Corrective Action Box for Failed Checks */}
              {isFailed && (
                <div style={{
                  padding: '16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', flexDirection: 'column', gap: 10,
                  animation: 'fadeIn 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 800, fontSize: 13 }}>
                    <AlertTriangle size={16} />
                    <span>Non-Conformance Detected! Mandatory Corrective Action Required:</span>
                  </div>

                  {q.reactionPlan && (
                    <div style={{ fontSize: 12, color: 'var(--charcoal)', background: 'rgba(255,255,255,0.7)', padding: '8px 12px', borderRadius: 6, borderLeft: '3px solid #dc2626' }}>
                      <span style={{ fontWeight: 700 }}>Documented Reaction Plan:</span> {q.reactionPlan}
                    </div>
                  )}

                  <textarea
                    placeholder="Describe immediate containment, root cause observed, and corrective action taken to resolve this non-conformance..."
                    rows={2}
                    value={ans.correctiveAction || ''}
                    onChange={(e) => handleCorrectiveActionChange(q, idx, e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.4)',
                      background: '#fff', fontSize: 13, color: 'var(--charcoal)', outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
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
    </div>
  );
}
