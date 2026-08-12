import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Check, Save, X, Settings, Search, AlertCircle, ClipboardList, Copy, BookOpen,
  Monitor, UploadCloud
} from 'lucide-react';
import { machineSetupApi, type MachineSetupQuestionSet, type MachineSetupQuestion } from '@/api/machineSetup.api';
import { getOperationMasters } from '@/api/operation-master.api';
import { getGaugeMasters, getGaugeMasterOperations } from '@/api/gauge-master.api';
import { machinesApi, type MachineMaster } from '@/api/machines.api';
import type { OperationMaster, GaugeMaster } from '@/types/domain.types';
import toast from 'react-hot-toast';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MachineSetupMasterPage() {
  const [questionSets, setQuestionSets] = useState<MachineSetupQuestionSet[]>([]);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [gaugeMasters, setGaugeMasters] = useState<GaugeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMachineId, setExpandedMachineId] = useState<string | null>(null);
  const [manageMachine, setManageMachine] = useState<MachineMaster | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qsRes, machinesRes, opsRes, gmRes] = await Promise.all([
        machineSetupApi.getAllConfigs(),
        machinesApi.getAll(),
        getOperationMasters({ size: 1000, isActive: true }),
        getGaugeMasters({ size: 1000 })
      ]);
      const qsData = qsRes.data as any;
      setQuestionSets(Array.isArray(qsData?.data) ? qsData.data : (Array.isArray(qsData) ? qsData : []));
      setMachines(Array.isArray(machinesRes.data) ? machinesRes.data : []);
      const opsData = opsRes.data as any;
      setOperations(Array.isArray(opsData?.content) ? opsData.content : (Array.isArray(opsData) ? opsData : []));
      const gmData = gmRes.data as any;
      setGaugeMasters(Array.isArray(gmData?.content) ? gmData.content : (Array.isArray(gmData) ? gmData : []));
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Group question sets by machine master id
  const qsByMachine = questionSets.reduce<Record<string, MachineSetupQuestionSet[]>>((acc, qs) => {
    const mId = qs.machineMaster?.id;
    if (mId) {
      if (!acc[mId]) acc[mId] = [];
      acc[mId].push(qs);
    }
    return acc;
  }, {});

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>Machine Setup Checklists</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 2 }}>Assign setup checklists to specific machines and parts</p>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Machine Name</th>
              <th>Code</th>
              <th>Department</th>
              <th>Setup Configs</th>
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
            ) : machines.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No machines found. Add machines in Machine Master first.</td>
              </tr>
            ) : (
              machines.map((machine) => {
                const sets = qsByMachine[machine.id || ''] || [];
                const isExpanded = expandedMachineId === machine.id;
                return (
                  <React.Fragment key={machine.id}>
                    <tr>
                      <td style={{ color: 'var(--slate)' }}>
                        <button
                          onClick={() => setExpandedMachineId(isExpanded ? null : (machine.id || null))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 2 }}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(139,105,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Monitor size={14} color="var(--copper-bronze)" />
                          </div>
                          {machine.machineName}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                          {machine.machineCode}
                        </span>
                      </td>
                      <td>{machine.department || '—'}</td>
                      <td className="font-mono">{sets.length}</td>
                      <td>
                        <button
                          onClick={() => setManageMachine(machine)}
                          title="Manage Setup Configs"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', padding: 2 }}
                        >
                          <Settings size={14} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0 16px 16px 48px', background: 'var(--bone-white)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <ClipboardList size={14} color="var(--copper-bronze)" />
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Assigned Setup Configurations
                            </span>
                          </div>
                          {sets.length === 0 ? (
                            <p style={{ fontSize: 13, color: 'var(--ash)' }}>No setup checklists assigned to this machine</p>
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
                                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, border: '1px solid #fde68a' }}>
                                          Op: {qs.operationMaster?.operationName || '—'}
                                        </span>
                                        {qs.gaugeMaster ? (
                                          <span style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                                            Part: {qs.gaugeMaster.gaugeTypeName}
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 10, background: '#f8fafc', color: '#475569', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                            All Parts
                                          </span>
                                        )}
                                      </div>
                                      <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 4 }}>
                                        {qs.questions?.length || 0} setup steps
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

      {manageMachine && (
        <ManageMachineSetupModal
          machine={manageMachine}
          questionSets={qsByMachine[manageMachine.id || ''] || []}
          allOperations={operations}
          gaugeMasters={gaugeMasters}
          onClose={() => {
            setManageMachine(null);
            fetchData();
          }}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

// ─── Manage Machine Setup Modal ───────────────────────────────────────────────

function ManageMachineSetupModal({
  machine, questionSets, allOperations, gaugeMasters, onClose, onRefresh,
}: {
  machine: MachineMaster;
  questionSets: MachineSetupQuestionSet[];
  allOperations: OperationMaster[];
  gaugeMasters: GaugeMaster[];
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [sets, setSets] = useState<MachineSetupQuestionSet[]>(questionSets);
  useEffect(() => { setSets(questionSets); }, [questionSets]);
  const [editingSet, setEditingSet] = useState<Partial<MachineSetupQuestionSet> & { operationMasterId?: string; gaugeMasterId?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [linkedOperations, setLinkedOperations] = useState<OperationMaster[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSet?.gaugeMasterId) {
      getGaugeMasterOperations(editingSet.gaugeMasterId)
        .then(res => {
          const ops = res.data?.map((o: any) => ({
            id: o.operationMasterId,
            operationName: o.operationName,
            operationCode: o.operationCode,
          })) || [];
          setLinkedOperations(ops);
        })
        .catch(console.error);
    } else {
      setLinkedOperations([]);
      if (editingSet) setEditingSet(prev => prev ? { ...prev, operationMasterId: '' } : prev);
    }
  }, [editingSet?.gaugeMasterId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setSubmitting(true);
      const res = await machineSetupApi.uploadExcel(machine.id!, file);
      const data = res.data?.data as any;
      toast.success(`Uploaded successfully! Created ${data?.questionSetsCreated || 0} checklists and ${data?.questionsCreated || 0} questions.`);
      onRefresh?.();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload Excel file');
      toast.error('Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNew = () => {

    setEditingSet({
      name: '',
      operationMasterId: '',
      gaugeMasterId: '',
      questions: [
        { sequenceOrder: 1, questionText: '', questionType: 'PASS_FAIL', isCritical: false, checkingMethod: 'Visual', showInPdir: true }
      ]
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet) return;
    if (!editingSet.gaugeMasterId) {
      setErrorMsg('Please select a Part.');
      return;
    }
    if (!editingSet.operationMasterId) {
      setErrorMsg('Please select an Operation.');
      return;
    }
    setErrorMsg('');

    try {
      const payload = {
        machineMasterId: machine.id!,
        operationMasterId: editingSet.operationMasterId,
        gaugeMasterId: editingSet.gaugeMasterId,
        name: editingSet.name || 'Setup Checklist',
        questions: editingSet.questions?.map((q, i) => ({
          ...q,
          sequenceOrder: i + 1,
          choices: q.questionType === 'CHOICE' ? q.choices : undefined,
        })) || []
      };

      if (editingSet.id) {
        await machineSetupApi.updateConfig(editingSet.id, payload);
        toast.success('Setup config updated');
      } else {
        await machineSetupApi.createConfig(payload);
        toast.success('Setup config created');
      }
      setEditingSet(null);
      onRefresh?.();
    } catch (err) {
      setErrorMsg('Failed to save setup config');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this checklist?')) return;
    try {
      await machineSetupApi.deleteConfig(id);
      toast.success('Checklist deleted');
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete checklist');
    }
  };

  const handleEdit = (qs: MachineSetupQuestionSet) => {
    setEditingSet({
      ...qs,
      operationMasterId: qs.operationMaster?.id || '',
      gaugeMasterId: qs.gaugeMaster?.id || ''
    });
  };

  const addQuestion = () => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      return { ...prev, questions: [...questions, { sequenceOrder: questions.length + 1, questionText: '', questionType: 'PASS_FAIL', isCritical: false, checkingMethod: 'Visual', showInPdir: true }] };
    });
  };

  const updateQuestion = (index: number, field: keyof MachineSetupQuestion, value: any) => {
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
              {editingSet ? 'New Setup Checklist' : 'Manage Setup Checklists'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--slate)' }}>
              <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)', marginRight: 6 }}>
                {machine.machineCode}
              </span>
              <span style={{ fontWeight: 600 }}>{machine.machineName}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Checklist Name *</label>
                  <input
                    className="input"
                    value={editingSet.name || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    placeholder="e.g. Roughing Setup"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Part *</label>
                  <select
                    className="input"
                    value={editingSet.gaugeMasterId || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, gaugeMasterId: e.target.value })}
                    required
                  >
                    <option value="">Select Part</option>
                    {gaugeMasters.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.categoryCode} - {g.gaugeTypeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Operation *</label>
                  <select
                    className="input"
                    value={editingSet.operationMasterId || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, operationMasterId: e.target.value })}
                    disabled={!editingSet.gaugeMasterId}
                    required
                  >
                    <option value="">{editingSet.gaugeMasterId ? 'Select Operation' : 'Select Part First'}</option>
                    {linkedOperations.map((op: any) => (
                      <option key={op.id} value={op.id}>{op.operationCode} - {op.operationName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--silk)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={13} color="var(--copper-bronze)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Setup Checklist Steps
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', background: 'var(--bone-white)', borderRadius: 10, padding: '1px 8px' }}>
                    {editingSet.questions?.length || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
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
                    <Plus size={12} /> Add Step
                  </button>
                </div>
              </div>

              {/* Questions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '45vh', overflowY: 'auto', paddingRight: 4 }}>
                {editingSet.questions?.map((q, index) => (
                  <div key={index} style={{
                    padding: '14px 16px', borderRadius: 8, border: '1px solid var(--silk)',
                    background: 'var(--warm-white)', position: 'relative',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)', fontFamily: 'monospace' }}>
                        Step {String(index + 1).padStart(2, '0')}
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
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Checklist Text *</label>
                        <input
                          className="input"
                          style={{ fontSize: 13 }}
                          value={q.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          placeholder="e.g. Load program, Verify fixture..."
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Type</label>
                        <select
                          className="input"
                          style={{ fontSize: 13 }}
                          value={q.questionType}
                          onChange={(e) => updateQuestion(index, 'questionType', e.target.value as any)}
                        >
                          <option value="PASS_FAIL">Confirm / Cancel</option>
                          <option value="NUMERIC">Numeric Entry</option>
                          <option value="TEXT">Text Input</option>
                        </select>
                      </div>
                    </div>

                    {q.questionType === 'PASS_FAIL' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 10 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--slate)', marginBottom: 3 }}>Expected</label>
                          <select className="input font-mono" style={{ fontSize: 13 }} value={q.expectedAnswer || 'true'} onChange={(e) => updateQuestion(index, 'expectedAnswer', e.target.value)}>
                            <option value="true">Confirmed</option>
                            <option value="false">Denied</option>
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
                  </div>
                ))}

                {(!editingSet.questions || editingSet.questions.length === 0) && (
                  <div style={{
                    textAlign: 'center', padding: 32, color: 'var(--ash)', fontSize: 13,
                    border: '2px dashed var(--silk)', borderRadius: 8,
                  }}>
                    No checklist steps added yet. Click "Add Step" above.
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
                  <p style={{ fontSize: 13, color: 'var(--ash)' }}>No setup checklists assigned to this machine</p>
                  <p style={{ fontSize: 12, color: 'var(--dust)' }}>Click "Add New Checklist" to create one</p>
                </div>
              ) : (
                sets.map((qs) => (
                  <div key={qs.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--warm-white)',
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: 4, border: '1px solid #fde68a' }}>
                          Op: {qs.operationMaster?.operationName || '—'}
                        </span>
                        {qs.gaugeMaster && (
                          <span style={{ fontSize: 10, background: '#f0fdf4', color: '#166534', padding: '2px 6px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                            Part: {qs.gaugeMaster.gaugeTypeName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        title="Edit Checklist"
                        onClick={() => handleEdit(qs)}
                        style={{
                          background: 'none', border: '1px solid var(--silk)', borderRadius: 6, cursor: 'pointer',
                          padding: 6, color: 'var(--copper-bronze)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        title="Delete Checklist"
                        onClick={() => qs.id && handleDelete(qs.id)}
                        style={{
                          background: 'none', border: '1px solid var(--silk)', borderRadius: 6, cursor: 'pointer',
                          padding: 6, color: '#DC3545', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                <Save size={14} /> Save Checklist
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
                <Plus size={14} /> Add New Checklist
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx,.xls" 
                onChange={handleFileUpload} 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--bone-white)', border: '1px solid var(--copper-bronze)',
                  color: 'var(--copper-bronze)', opacity: submitting ? 0.7 : 1
                }}
              >
                <UploadCloud size={14} /> {submitting ? 'Uploading...' : 'Bulk Upload Excel'}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', background: 'var(--bone-white)', border: '1px solid var(--silk)',
                }}
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
