import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings2, Save } from 'lucide-react';
import { machineSetupApi, type MachineSetupQuestionSet } from '@/api/machineSetup.api';
import type { MachineMaster } from '@/api/machines.api';
import toast from 'react-hot-toast';

interface Props {
  machine: MachineMaster;
  onClose: () => void;
}

export default function MachineSetupConfigModal({ machine, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<MachineSetupQuestionSet | null>(null);

  const [formData, setFormData] = useState({
    name: `${machine.machineName} Setup Checklist`,
    questions: [] as any[],
  });

  useEffect(() => {
    fetchConfig();
  }, [machine.id]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await machineSetupApi.getConfigForMachine(machine.id!);
      if (res.data) {
        setConfig(res.data);
        setFormData({
          name: res.data.name,
          questions: res.data.questions || [],
        });
      }
    } catch (error) {
      toast.error('Failed to load setup configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: crypto.randomUUID(), // Temp ID for UI mapping
          sequenceOrder: prev.questions.length + 1,
          questionText: '',
          questionType: 'PASS_FAIL',
          expectedAnswer: 'true',
          isCritical: false,
        }
      ]
    }));
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return { ...prev, questions: newQuestions };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        machineMasterId: machine.id!,
        name: formData.name,
        questions: formData.questions.map((q, i) => ({
          ...q,
          sequenceOrder: i + 1,
          id: undefined // Remove temp ID
        }))
      };

      await machineSetupApi.createConfig(payload);
      toast.success('Machine Setup Checklist saved successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(28,26,24,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: 20
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--silk)', background: 'var(--bone-white)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings2 size={20} color="var(--copper-bronze)" />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>
                Setup Checklist for {machine.machineName}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--slate)', margin: 0 }}>Define the mandatory setup steps for this machine</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>Loading configuration...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Checklist Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Setup Steps</h4>
                  <button onClick={handleAddQuestion} className="btn btn-secondary" style={{ fontSize: 12, minHeight: 32 }}>
                    <Plus size={14} style={{ marginRight: 4 }} /> Add Step
                  </button>
                </div>

                {formData.questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, background: 'var(--bone-white)', borderRadius: 8, border: '1px dashed var(--silk)' }}>
                    <p style={{ color: 'var(--ash)', fontSize: 13, margin: 0 }}>No setup steps defined yet. Add one to get started.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {formData.questions.map((q, index) => (
                      <div key={q.id || index} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bone-white)', padding: 16, borderRadius: 8, border: '1px solid var(--silk)' }}>
                        <div style={{ 
                          width: 24, height: 24, borderRadius: 12, background: 'var(--copper-bronze)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0
                        }}>
                          {index + 1}
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Step Description</label>
                              <input
                                type="text"
                                value={q.questionText}
                                onChange={(e) => handleUpdateQuestion(index, 'questionText', e.target.value)}
                                className="input"
                                placeholder="e.g. Check Lubrication Levels"
                                style={{ fontSize: 13 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Type</label>
                              <select
                                value={q.questionType}
                                onChange={(e) => handleUpdateQuestion(index, 'questionType', e.target.value)}
                                className="input"
                                style={{ fontSize: 13 }}
                              >
                                <option value="PASS_FAIL">Pass / Fail</option>
                                <option value="NUMERIC">Numeric Value</option>
                                <option value="TEXT">Text Input</option>
                              </select>
                            </div>
                          </div>

                          {q.questionType === 'NUMERIC' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Min Value</label>
                                <input
                                  type="number"
                                  value={q.minValue || ''}
                                  onChange={(e) => handleUpdateQuestion(index, 'minValue', e.target.value ? Number(e.target.value) : null)}
                                  className="input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Max Value</label>
                                <input
                                  type="number"
                                  value={q.maxValue || ''}
                                  onChange={(e) => handleUpdateQuestion(index, 'maxValue', e.target.value ? Number(e.target.value) : null)}
                                  className="input"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 4 }}>Unit</label>
                                <input
                                  type="text"
                                  value={q.unit || ''}
                                  onChange={(e) => handleUpdateQuestion(index, 'unit', e.target.value)}
                                  className="input"
                                  placeholder="e.g. mm"
                                  style={{ fontSize: 13 }}
                                />
                              </div>
                            </div>
                          )}

                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--charcoal)', cursor: 'pointer', width: 'fit-content' }}>
                            <input
                              type="checkbox"
                              checked={q.isCritical}
                              onChange={(e) => handleUpdateQuestion(index, 'isCritical', e.target.checked)}
                              style={{ width: 14, height: 14, accentColor: 'var(--copper-bronze)' }}
                            />
                            Critical Step (Must pass to complete setup)
                          </label>
                        </div>

                        <button onClick={() => handleRemoveQuestion(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', marginTop: 24 }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--silk)', background: 'var(--bone-white)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ minWidth: 120 }}>
            {saving ? 'Saving...' : <><Save size={16} style={{ marginRight: 6 }} /> Save Checklist</>}
          </button>
        </div>
      </div>
    </div>
  );
}
