import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lpaApi, type LpaSchedule, type LpaQuestionSet, type LpaAuditType } from '@/api/lpa.api';
import { getUsersApi } from '@/api/users.api';
import {
  Calendar, Plus, Clock, CheckCircle2, AlertTriangle, ShieldAlert,
  Search, Filter, Save, X, AlertCircle, Loader2, Play, UserCheck, Layers
} from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export function LpaSchedulePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<LpaSchedule[]>([]);
  const [questionSets, setQuestionSets] = useState<LpaQuestionSet[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [questionSetId, setQuestionSetId] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [nextDueDate, setNextDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, qsRes, userRes] = await Promise.all([
        lpaApi.getSchedules(),
        lpaApi.getQuestionSets(),
        getUsersApi(),
      ]);

      setSchedules(getArray(schedRes));
      setQuestionSets(getArray(qsRes));
      setUsers(getArray(userRes));
    } catch (err) {
      console.error('Failed to load LPA schedules or master lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionSetId) {
      setMessage({ type: 'error', text: 'Please select a checklist to schedule.' });
      return;
    }
    if (!assignedToId && !assignedRole) {
      setMessage({ type: 'error', text: 'Please assign the audit to either a specific employee or a role.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const selectedQs = questionSets.find(q => q.id === questionSetId);
      const payload = {
        auditType: selectedQs?.auditType || 'LAYERED_PROCESS',
        questionSetId,
        operationMasterId: selectedQs?.operationMaster?.id || null,
        gaugeMasterId: selectedQs?.gaugeMaster?.id || null,
        machineMasterId: selectedQs?.machineMaster?.id || null,
        assignedToId: assignedToId || null,
        assignedRole: assignedRole || null,
        frequency,
        nextDueDate: nextDueDate ? new Date(nextDueDate).toISOString() : new Date().toISOString(),
      };

      const res = await lpaApi.createSchedule(payload);
      if (res && ((res as any).success || (res as any).data)) {
        setMessage({ type: 'success', text: 'Audit schedule created and active!' });
        setShowModal(false);
        setQuestionSetId('');
        setAssignedToId('');
        setAssignedRole('');
        fetchData();
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create schedule. Please check input parameters.',
      });
    } finally {
      setSaving(false);
    }
  };

  const categoryNames: Record<string, { label: string; badgeColor: string }> = {
    LAYERED_PROCESS: { label: 'Layered Process Audit', badgeColor: 'var(--copper-bronze)' },
    PRODUCT_AUDIT: { label: 'Product Audit', badgeColor: '#2563eb' },
    PROCESS_AUDIT: { label: 'Process Audit', badgeColor: '#16a34a' },
    POKA_YOKE: { label: 'Poka-Yoke Audit', badgeColor: '#ca8a04' },
  };

  const filteredSchedules = schedules.filter(s => {
    const matchesType = selectedType === 'ALL' || s.auditType === selectedType;
    const matchesSearch = (s.questionSet?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assignedTo?.fullName || s.assignedRole || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
            Audit Scheduling & Dispatch
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
            Configure recurring audit frequencies (Shift-wise, Daily, Weekly, Monthly) and assign to personnel or roles.
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setMessage(null); }}
          style={{
            padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
            color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(184,115,51,0.25)', transition: 'all 0.15s',
          }}
        >
          <Plus size={18} /> Schedule New Audit
        </button>
      </div>

      {message && (
        <div style={{
          padding: '14px 18px', borderRadius: 8,
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        padding: '16px 20px', borderRadius: 12, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedType('ALL')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: selectedType === 'ALL' ? 700 : 500,
              background: selectedType === 'ALL' ? 'var(--charcoal)' : 'transparent',
              color: selectedType === 'ALL' ? '#fff' : 'var(--slate)',
              border: `1px solid ${selectedType === 'ALL' ? 'var(--charcoal)' : 'var(--silk)'}`,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            All Schedules ({schedules.length})
          </button>
          {Object.entries(categoryNames).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: selectedType === key ? 700 : 500,
                background: selectedType === key ? val.badgeColor : 'transparent',
                color: selectedType === key ? '#fff' : 'var(--slate)',
                border: `1px solid ${selectedType === key ? val.badgeColor : 'var(--silk)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {val.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: 260 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--ash)' }} />
          <input
            type="text"
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--silk)', background: 'var(--cream)', color: 'var(--charcoal)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Schedules Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)', color: 'var(--ash)' }}>
          <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }}>No Schedules Found</div>
          <div style={{ fontSize: 13 }}>Schedule your first recurring audit checklist above!</div>
        </div>
      ) : (
        <div style={{ background: 'var(--warm-white)', borderRadius: 14, border: '1px solid var(--silk)', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--silk)' }}>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase' }}>Checklist & Category</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase' }}>Assigned To</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase' }}>Frequency</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase' }}>Next Due Date</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: 'var(--dust)', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((s) => {
                const catInfo = categoryNames[s.auditType] || { label: s.auditType, badgeColor: 'var(--ash)' };
                const isOverdue = s.status === 'OVERDUE';
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--silk)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--charcoal)', marginBottom: 4 }}>
                        {s.questionSet?.name || 'Unnamed Checklist'}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: 'var(--linen)', color: catInfo.badgeColor,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {catInfo.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--slate)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--charcoal)' }}>
                        <UserCheck size={16} style={{ color: 'var(--copper-bronze)' }} />
                        {s.assignedTo?.fullName || s.assignedRole || 'Unassigned'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--slate)' }}>
                      <span style={{ fontWeight: 600 }}>{s.frequency}</span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: isOverdue ? '#dc2626' : 'var(--slate)', fontWeight: isOverdue ? 700 : 500 }}>
                      {new Date(s.nextDueDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12,
                        background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: isOverdue ? '#dc2626' : '#16a34a',
                        textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {isOverdue && <AlertTriangle size={12} />}
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/lpa/execute?scheduleId=${s.id}`)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: isOverdue ? '#dc2626' : 'var(--charcoal)',
                          color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex',
                          alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        }}
                      >
                        <Play size={13} fill="currentColor" /> Execute Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div style={{
            width: '100%', maxWidth: 580,
            background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--silk)', background: 'var(--cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--charcoal)', margin: 0 }}>
                    Schedule Recurring Audit
                  </h2>
                  <div style={{ fontSize: 12, color: 'var(--ash)' }}>
                    Assign checklists to personnel or roles with automated reminders
                  </div>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Select Checklist / Question Set <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={questionSetId}
                  onChange={(e) => setQuestionSetId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                >
                  <option value="">-- Choose Checklist Template --</option>
                  {questionSets.map((qs) => (
                    <option key={qs.id} value={qs.id}>{qs.name} ({qs.auditType})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Audit Frequency <span style={{ color: 'red' }}>*</span>
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                  >
                    <option value="SHIFT_WISE">Shift-Wise (Every Shift)</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    First Due Date <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 10, background: 'var(--cream)', border: '1px solid var(--silk)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 12 }}>
                  Assignment Target (Choose Employee OR Role)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                      Specific Employee
                    </label>
                    <select
                      value={assignedToId}
                      onChange={(e) => { setAssignedToId(e.target.value); if (e.target.value) setAssignedRole(''); }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                    >
                      <option value="">-- Unassigned / Role-based --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                      Role Assignment
                    </label>
                    <select
                      value={assignedRole}
                      onChange={(e) => { setAssignedRole(e.target.value); if (e.target.value) setAssignedToId(''); }}
                      disabled={!!assignedToId}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: assignedToId ? '#e2e8f0' : 'var(--warm-white)', fontSize: 12 }}
                    >
                      <option value="">-- No Role Restriction --</option>
                      <option value="ADMIN">Plant Admin</option>
                      <option value="SUPERVISOR">Shift Supervisor</option>
                      <option value="QUALITY_INSPECTOR">Quality Inspector</option>
                      <option value="WORKER">Operator / Worker</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTop: '1px solid var(--silk)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--slate)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                    background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
                    color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Confirm Audit Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
