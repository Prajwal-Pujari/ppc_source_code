import React, { useState, useEffect } from 'react';
import { lpaApi, LpaAuditType } from '@/api/lpa.api';
import type { LpaQuestionSet, LpaQuestionItem } from '@/api/lpa.api';
import { X, Save, AlertCircle, Loader2, Plus, Trash2, ClipboardList } from 'lucide-react';

export function ManageIndependentChecklistModal({
  auditType,
  questionSets,
  onClose,
  onRefresh,
}: {
  auditType: 'SYSTEM_AUDIT' | 'SUPPLIER_AUDIT';
  questionSets: LpaQuestionSet[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [sets, setSets] = useState<LpaQuestionSet[]>(questionSets);
  useEffect(() => { setSets(questionSets); }, [questionSets]);

  const [editingSet, setEditingSet] = useState<Partial<LpaQuestionSet> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreateNew = () => {
    setEditingSet({
      name: '',
      auditType: auditType,
      defaultFrequency: 'MONTHLY',
      questions: [],
    });
    setErrorMsg('');
  };

  const handleEdit = (qs: LpaQuestionSet) => {
    setEditingSet({ ...qs });
    setErrorMsg('');
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingSet?.name?.trim()) {
      setErrorMsg('Checklist title is required');
      return;
    }
    if (!editingSet.questions || editingSet.questions.length === 0) {
      setErrorMsg('Add at least one question');
      return;
    }
    if (editingSet.questions.some(q => !q.questionText?.trim())) {
      setErrorMsg('All questions must have text');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        name: editingSet.name,
        auditType: auditType,
        description: editingSet.description || '',
        defaultFrequency: editingSet.defaultFrequency || 'MONTHLY',
        questions: editingSet.questions.map((q, i) => ({
          sequenceOrder: i + 1,
          questionText: q.questionText,
          questionType: 'TEXT',
          isCritical: q.isCritical || false,
          checkingMethod: q.checkingMethod || '',
          reactionPlan: q.reactionPlan || '',
        })),
      };

      if (editingSet.id) {
        await lpaApi.updateQuestionSet(editingSet.id, payload);
      } else {
        await lpaApi.createQuestionSet(payload);
      }
      
      setEditingSet(null);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save checklist.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      return {
        ...prev,
        questions: [
          ...questions,
          { questionText: '', questionType: 'TEXT', isCritical: false, checkingMethod: '' }
        ]
      };
    });
  };

  const updateQuestion = (index: number, field: keyof LpaQuestionItem, value: any) => {
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

  const isSystem = auditType === 'SYSTEM_AUDIT';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 800, maxHeight: '90vh', background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--silk)', background: 'var(--cream)' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 2 }}>
              {editingSet ? (editingSet.id ? 'Edit Checklist' : 'New Checklist') : (isSystem ? 'Manage System Checklists' : 'Manage Supplier Checklists')}
            </h3>
          </div>
          <button onClick={editingSet ? () => setEditingSet(null) : onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {editingSet ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Basic Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Audit Category *
                  </label>
                  <select
                    value={auditType}
                    disabled
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--bone-white)', color: 'var(--slate)', fontSize: 13, cursor: 'not-allowed' }}
                  >
                    <option value="SYSTEM_AUDIT">System Audit</option>
                    <option value="SUPPLIER_AUDIT">Supplier Audit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Checklist Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ISO 9001 Facility Check"
                    value={editingSet.name || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Default Frequency *
                  </label>
                  <select
                    value={editingSet.defaultFrequency || 'MONTHLY'}
                    onChange={(e) => setEditingSet({ ...editingSet, defaultFrequency: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Questions Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--silk)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} color="var(--copper-bronze)" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal)' }}>
                    Audit Checkpoints & Questions ({editingSet.questions?.length || 0})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'var(--copper-bronze)', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  + Add Question
                </button>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {editingSet.questions?.map((q, idx) => (
                  <div key={idx} style={{ padding: 16, borderRadius: 10, background: 'var(--cream)', border: '1px solid var(--silk)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--linen)', color: 'var(--copper-bronze)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <input
                        type="text"
                        placeholder={`Question ${idx + 1}...`}
                        value={q.questionText}
                        onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 13 }}
                      />
                      <select
                        value="TEXT"
                        disabled
                        style={{ width: 140, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--bone-white)', color: 'var(--slate)', fontSize: 12, cursor: 'not-allowed' }}
                      >
                        <option value="TEXT">Free Text Note</option>
                      </select>
                      <button type="button" onClick={() => removeQuestion(idx)} style={{ padding: 6, background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </form>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Assigned Checklists ({sets.length})
                </div>
                <button
                  onClick={handleCreateNew}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'var(--copper-bronze)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Plus size={14} /> Add Checklist
                </button>
              </div>

              {sets.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: 'var(--cream)', borderRadius: 12, border: '1px dashed var(--silk)', color: 'var(--ash)', fontSize: 13 }}>
                  No checklists created for this category yet. Click "Add Checklist" above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sets.map(qs => (
                    <div key={qs.id} style={{
                      padding: 16, background: 'var(--cream)', borderRadius: 12, border: '1px solid var(--silk)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--charcoal)' }}>{qs.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                            {qs.auditType}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 16 }}>
                          <span>Freq: <strong style={{ color: 'var(--charcoal)' }}>{qs.defaultFrequency || 'MONTHLY'}</strong></span>
                          <span>Checkpoints: <strong style={{ color: 'var(--charcoal)' }}>{qs.questions?.length || 0}</strong> items</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(qs)}
                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)', cursor: 'pointer' }}
                      >
                        Edit Checkpoints
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {editingSet && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--silk)', background: 'var(--cream)' }}>
            <button
              type="button"
              onClick={() => setEditingSet(null)}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--slate)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Checklist Template</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
