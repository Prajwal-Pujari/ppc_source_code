import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Check, Save, X, Settings, Search, AlertCircle, ClipboardList, Copy, BookOpen,
} from 'lucide-react';
import { pqcApi } from '../../api/pqc.api';
import { getOperationMasters } from '../../api/operation-master.api';
import { getGaugeMasters } from '../../api/gauge-master.api';
import type { PqcQuestionSet, OperationMaster, PqcQuestion, QuestionType, GaugeMaster } from '../../types/domain.types';
import toast from 'react-hot-toast';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PqcQuestionSetMasterPage() {
  const [questionSets, setQuestionSets] = useState<PqcQuestionSet[]>([]);
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [gaugeMasters, setGaugeMasters] = useState<GaugeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);
  const [manageOp, setManageOp] = useState<OperationMaster | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qsRes, opsRes, gmRes] = await Promise.all([
        pqcApi.getAllQuestionSets(),
        getOperationMasters({ size: 1000, isActive: true }),
        getGaugeMasters({ size: 1000 })
      ]);
      setQuestionSets(qsRes.data || []);
      setOperations(opsRes.data?.content || opsRes.data || []);
      setGaugeMasters(gmRes.data?.content || gmRes.data || []);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Group question sets by operation master id
  const qsByOp = questionSets.reduce<Record<string, PqcQuestionSet[]>>((acc, qs) => {
    const opId = qs.operationMaster?.id;
    if (opId) {
      if (!acc[opId]) acc[opId] = [];
      acc[opId].push(qs);
    }
    return acc;
  }, {});

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>Operations & Question Sets</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>Assign multiple inspection checklists per operation</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Operation</th>
              <th>Code</th>
              <th>Department</th>
              <th>Question Sets</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : operations.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No operations found. Add operations in Operations Master first.</td>
              </tr>
            ) : (
              operations.map((op) => {
                const sets = qsByOp[op.id] || [];
                return (
                  <React.Fragment key={op.id}>
                    <tr>
                      <td>
                        <button
                          onClick={() => setExpandedOpId(expandedOpId === op.id ? null : op.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 2 }}
                        >
                          {expandedOpId === op.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{op.operationName}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                          {op.operationCode}
                        </span>
                      </td>
                      <td>{op.department || '—'}</td>
                      <td className="font-mono">{sets.length}</td>
                      <td>
                        <button
                          onClick={() => setManageOp(op)}
                          title="Manage Question Sets"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', padding: 2 }}
                        >
                          <Settings size={14} />
                        </button>
                      </td>
                    </tr>
                    {expandedOpId === op.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0 16px 16px 48px', background: 'var(--bone-white)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <ClipboardList size={14} color="var(--copper-bronze)" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Linked Question Sets
                            </span>
                          </div>
                          {sets.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--ash)' }}>No question sets assigned to this operation</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {sets.map((qs) => (
                                <div key={qs.id} style={{
                                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                  background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--silk)',
                                }}>
                                  <ClipboardList size={14} color="var(--copper-bronze)" />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>{qs.name}</p>
                                        {qs.gaugeMaster ? (
                                          <span style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                                            Part: {qs.gaugeMaster.gaugeTypeName}
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 10, background: '#f8fafc', color: '#475569', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                            Global (All Parts)
                                          </span>
                                        )}
                                      </div>
                                      <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>
                                        <span className="font-mono">{qs.inspectionFrequency}</span>
                                        {' · '}{qs.questions?.length || 0} questions
                                        {qs.isActive ? (
                                          <span style={{ color: '#3A6B4A', marginLeft: 8 }}>● Active</span>
                                      ) : (
                                        <span style={{ color: '#8B3A3A', marginLeft: 8 }}>● Inactive</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {manageOp && (
        <ManageQuestionSetsModal
          operation={manageOp}
          questionSets={qsByOp[manageOp.id] || []}
          allQuestionSets={questionSets}
          allOperations={operations}
          gaugeMasters={gaugeMasters}
          onClose={() => {
            setManageOp(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// ─── Manage Question Sets Modal ───────────────────────────────────────────────

function ManageQuestionSetsModal({
  operation, questionSets, allQuestionSets, allOperations, gaugeMasters, onClose,
}: {
  operation: OperationMaster;
  questionSets: PqcQuestionSet[];
  allQuestionSets: PqcQuestionSet[];
  allOperations: OperationMaster[];
  gaugeMasters: GaugeMaster[];
  onClose: () => void;
}) {
  const [sets, setSets] = useState<PqcQuestionSet[]>(questionSets);
  const [editingSet, setEditingSet] = useState<Partial<PqcQuestionSet> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [libSearch, setLibSearch] = useState('');
  const [libraryData, setLibraryData] = useState<PqcQuestionSet[]>([]);
  const [localGaugeMasters, setLocalGaugeMasters] = useState<GaugeMaster[]>(gaugeMasters);

  // Fetch ALL question sets and parts fresh from API for the library/dropdowns
  useEffect(() => {
    pqcApi.getAllQuestionSets().then(res => {
      setLibraryData(res.data || []);
    }).catch(() => {});

    getGaugeMasters({ size: 1000 }).then(res => {
      const parts = res.data?.content || res.data || [];
      console.log('[ManageQuestionSetsModal] Loaded parts list:', parts);
      setLocalGaugeMasters(parts);
    }).catch((err) => {
      console.error('[ManageQuestionSetsModal] Error loading parts list:', err);
    });
  }, []);

  // Build a library of all unique questions from ALL sets
  const questionLibrary = libraryData.flatMap(qs =>
    (qs.questions || []).map(q => ({ ...q, fromSet: qs.name, fromOp: qs.operationMaster?.operationName || '—' }))
  ).filter(q => q.questionText && (
    !libSearch || q.questionText.toLowerCase().includes(libSearch.toLowerCase()) ||
    q.fromSet.toLowerCase().includes(libSearch.toLowerCase()) ||
    q.fromOp.toLowerCase().includes(libSearch.toLowerCase())
  ));

  const importQuestion = (q: any) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      // Clone the question without id so it creates a new one
      const imported: PqcQuestion = {
        sequenceOrder: questions.length + 1,
        questionText: q.questionText,
        questionType: q.questionType,
        expectedAnswer: q.expectedAnswer,
        unit: q.unit,
        minValue: q.minValue,
        maxValue: q.maxValue,
        choices: q.choices,
        isCritical: q.isCritical || false,
      };
      return { ...prev, questions: [...questions, imported] };
    });
    toast.success('Question imported');
  };

  const handleCreateNew = () => {
    setEditingSet({
      name: '',
      inspectionFrequency: '1/Hr',
      operationMaster: operation as any,
      questions: [
        { sequenceOrder: 1, questionText: '', questionType: 'PASS_FAIL', isCritical: false }
      ]
    });
  };

  const handleEdit = (set: PqcQuestionSet) => {
    setEditingSet(JSON.parse(JSON.stringify(set)));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this question set?')) return;
    try {
      await pqcApi.deleteQuestionSet(id);
      setSets(prev => prev.filter(s => s.id !== id));
      toast.success('Question set deleted');
    } catch {
      setErrorMsg('Failed to delete question set');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet) return;
    setErrorMsg('');

    try {
      const payload = {
        operationMasterId: operation.id,
        gaugeMasterId: editingSet.gaugeMaster?.id,
        name: editingSet.name,
        inspectionFrequency: editingSet.inspectionFrequency,
        questions: editingSet.questions?.map((q, i) => ({
          ...q,
          sequenceOrder: i + 1,
          choices: q.questionType === 'CHOICE' ? q.choices : null,
        }))
      };

      if (editingSet.id) {
        const res = await pqcApi.updateQuestionSet(editingSet.id, payload);
        setSets(prev => prev.map(s => s.id === editingSet.id ? res.data : s));
        toast.success('Question set updated');
      } else {
        const res = await pqcApi.createQuestionSet(payload);
        setSets(prev => [...prev, res.data]);
        toast.success('Question set created');
      }
      setEditingSet(null);
    } catch (err) {
      setErrorMsg('Failed to save question set');
      console.error(err);
    }
  };

  const addQuestion = () => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      return { ...prev, questions: [...questions, { sequenceOrder: questions.length + 1, questionText: '', questionType: 'PASS_FAIL' as QuestionType, isCritical: false }] };
    });
  };

  const updateQuestion = (index: number, field: keyof PqcQuestion, value: any) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const removeQuestion = (index: number) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      return { ...prev, questions: prev.questions?.filter((_, i) => i !== index) || [] };
    });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--silk)' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 2 }}>
              {editingSet ? (editingSet.id ? 'Edit Question Set' : 'New Question Set') : 'Manage Question Sets'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--slate)' }}>
              <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)', marginRight: 6 }}>
                {operation.operationCode}
              </span>
              {operation.operationName}
            </p>
          </div>
          <button onClick={editingSet ? () => setEditingSet(null) : onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Error ── */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'rgba(220,53,69,0.06)', borderBottom: '1px solid rgba(220,53,69,0.15)', fontSize: 13, color: 'var(--status-rejected)' }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {editingSet ? (
            /* ── Question Set Edit Form ── */
            <form onSubmit={handleSave} id="qs-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Set Name *</label>
                  <input
                    className="input"
                    value={editingSet.name || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    placeholder="e.g. Turning Inspection Checklist"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Applies To Part (Optional)</label>
                  <select
                    className="input"
                    onClick={() => console.log('[Part Dropdown Clicked] Current available parts:', localGaugeMasters)}
                    value={editingSet.gaugeMaster?.id || ''}
                    onChange={(e) => {
                      const gaugeId = e.target.value;
                      if (!gaugeId) {
                        setEditingSet({ ...editingSet, gaugeMaster: undefined });
                      } else {
                        const gauge = localGaugeMasters.find(g => g.id === gaugeId);
                        if (gauge) setEditingSet({ ...editingSet, gaugeMaster: gauge });
                      }
                    }}
                  >
                    <option value="">Global / All Parts</option>
                    {localGaugeMasters.map(g => (
                      <option key={g.id} value={g.id}>{g.gaugeTypeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Inspection Frequency *</label>
                  <input
                    className="input font-mono"
                    value={editingSet.inspectionFrequency || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, inspectionFrequency: e.target.value })}
                    placeholder="e.g. 1/Hr"
                    required
                  />
                </div>
              </div>

              {/* Questions header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--silk)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={13} color="var(--copper-bronze)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Checklist Questions
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', background: 'var(--bone-white)', borderRadius: 10, padding: '1px 8px' }}>
                    {editingSet.questions?.length || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setShowLibrary(!showLibrary)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', background: showLibrary ? 'var(--copper-bronze)' : 'var(--bone-white)',
                      border: '1px solid var(--copper-bronze)',
                      color: showLibrary ? 'white' : 'var(--copper-bronze)',
                    }}
                  >
                    <BookOpen size={12} /> {showLibrary ? 'Hide' : 'Import from'} Library
                  </button>
                  <button
                    type="button"
                    onClick={addQuestion}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', background: 'rgba(139,105,20,0.07)', border: '1px solid var(--copper-bronze)',
                      color: 'var(--copper-bronze)',
                    }}
                  >
                    <Plus size={12} /> Add Blank
                  </button>
                </div>
              </div>

              {/* Question Library Panel */}
              {showLibrary && (
                <div style={{ marginBottom: 12, padding: 12, background: 'var(--bone-white)', borderRadius: 8, border: '1px solid var(--silk)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <BookOpen size={13} color="var(--copper-bronze)" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase' }}>Question Library</span>
                    <span style={{ fontSize: 10, color: 'var(--ash)' }}>— click to import into current set</span>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)' }} />
                    <input className="input" style={{ paddingLeft: 26, fontSize: 12 }} placeholder="Search questions..." value={libSearch} onChange={e => setLibSearch(e.target.value)} />
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {questionLibrary.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--ash)', textAlign: 'center', padding: 12 }}>No questions found</p>
                    ) : questionLibrary.map((q, i) => (
                      <div key={`${q.id || i}`} onClick={() => importQuestion(q)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6,
                        border: '1px solid var(--silk)', background: 'white', cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--copper-bronze)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--silk)')}
                      >
                        <Copy size={11} color="var(--copper-bronze)" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.questionText}</p>
                          <p style={{ fontSize: 10, color: 'var(--ash)' }}>
                            <span className="font-mono">{q.questionType}</span> · from {q.fromOp} → {q.fromSet}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '45vh', overflowY: 'auto', paddingRight: 4 }}>
                {editingSet.questions?.map((q, index) => (
                  <div key={index} style={{
                    padding: '14px 16px', borderRadius: 8, border: '1px solid var(--silk)',
                    background: 'var(--warm-white)', position: 'relative',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)', fontFamily: 'monospace' }}>
                        Q{String(index + 1).padStart(2, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B3A3A', padding: 2 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Question Text *</label>
                        <input
                          className="input"
                          style={{ fontSize: 13 }}
                          value={q.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          placeholder="e.g. Is surface finish within tolerance?"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Type</label>
                        <select
                          className="input"
                          style={{ fontSize: 13 }}
                          value={q.questionType}
                          onChange={(e) => updateQuestion(index, 'questionType', e.target.value as QuestionType)}
                        >
                          <option value="PASS_FAIL">Pass / Fail</option>
                          <option value="NUMERIC">Numeric Entry</option>
                          <option value="TEXT">Text Input</option>
                          <option value="CHOICE">Multiple Choice</option>
                        </select>
                      </div>
                    </div>

                    {/* Conditional fields */}
                    {q.questionType === 'PASS_FAIL' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Expected</label>
                          <select className="input font-mono" style={{ fontSize: 13 }} value={q.expectedAnswer || 'PASS'} onChange={(e) => updateQuestion(index, 'expectedAnswer', e.target.value)}>
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {q.questionType === 'NUMERIC' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Min Value</label>
                          <input className="input font-mono" style={{ fontSize: 13 }} type="number" step="0.0001" value={q.minValue || ''} onChange={(e) => updateQuestion(index, 'minValue', parseFloat(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Max Value</label>
                          <input className="input font-mono" style={{ fontSize: 13 }} type="number" step="0.0001" value={q.maxValue || ''} onChange={(e) => updateQuestion(index, 'maxValue', parseFloat(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Unit</label>
                          <input className="input" style={{ fontSize: 13 }} value={q.unit || ''} onChange={(e) => updateQuestion(index, 'unit', e.target.value)} placeholder="mm" />
                        </div>
                      </div>
                    )}

                    {q.questionType === 'CHOICE' && (
                      <div style={{ marginTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Choices (comma separated)</label>
                        <input className="input" style={{ fontSize: 13 }} value={q.choices ? q.choices.join(', ') : ''} onChange={(e) => updateQuestion(index, 'choices', e.target.value.split(',').map(s => s.trim()))} placeholder="e.g. Acceptable, Needs Rework, Scrap" />
                      </div>
                    )}

                    {/* Critical toggle */}
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={q.isCritical}
                        onChange={(e) => updateQuestion(index, 'isCritical', e.target.checked)}
                        style={{ accentColor: 'var(--copper-bronze)' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--charcoal)' }}>Critical (failure auto-rejects part)</span>
                    </div>
                  </div>
                ))}

                {(!editingSet.questions || editingSet.questions.length === 0) && (
                  <div style={{
                    textAlign: 'center', padding: 32, color: 'var(--ash)', fontSize: 13,
                    border: '2px dashed var(--silk)', borderRadius: 8,
                  }}>
                    No questions added yet. Click "Add Question" above.
                  </div>
                )}
              </div>
            </form>
          ) : (
            /* ── Question Sets List ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sets.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: 40, textAlign: 'center',
                }}>
                  <ClipboardList size={28} color="var(--silk)" />
                  <p style={{ fontSize: 13, color: 'var(--ash)' }}>No question sets assigned to this operation</p>
                  <p style={{ fontSize: 12, color: 'var(--dust)' }}>Click "Add New Set" to create one</p>
                </div>
              ) : (
                sets.map((qs) => (
                  <div key={qs.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--warm-white)',
                    transition: 'border-color 0.15s',
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: '50%', background: 'var(--copper-bronze)',
                      color: 'white', fontSize: 12, fontWeight: 700, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {qs.questions?.length || 0}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>{qs.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>
                        <span className="font-mono">{qs.inspectionFrequency}</span>
                        {' · '}{qs.questions?.length || 0} questions
                        {qs.isActive ? (
                          <span style={{ color: '#3A6B4A', marginLeft: 8 }}>● Active</span>
                        ) : (
                          <span style={{ color: '#8B3A3A', marginLeft: 8 }}>● Inactive</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleEdit(qs)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', padding: 4 }}
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(qs.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B3A3A', padding: 4 }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingSet ? (
            <>
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', background: 'var(--bone-white)', border: '1px solid var(--silk)',
                  color: 'var(--charcoal)',
                }}
              >
                ← Back to List
              </button>
              <button
                type="submit"
                form="qs-form"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: 'var(--copper-bronze)', border: 'none',
                  color: 'white',
                }}
              >
                <Save size={14} /> Save Question Set
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCreateNew}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: 'rgba(139,105,20,0.07)', border: '1px solid var(--copper-bronze)',
                  color: 'var(--copper-bronze)',
                }}
              >
                <Plus size={14} /> Add New Set
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: 'var(--copper-bronze)', border: 'none',
                  color: 'white',
                }}
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
