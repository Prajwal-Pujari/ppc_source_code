import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getAllNcRecords, createNcRecord } from '@/api/nc-records.api';
import { getGauges } from '@/api/gauges.api';
import { AlertTriangle, Plus, Search } from 'lucide-react';

const categoryColors: Record<string, string> = {
  DIMENSIONAL_ERROR: 'badge-rejected', SURFACE_DEFECT: 'badge-in-progress', MATERIAL_DEFECT: 'badge-pending',
  OPERATOR_ERROR: 'badge-rework', MACHINE_ISSUE: 'badge-on-hold', TOOLING_WEAR: 'badge-queued', OTHER: 'badge-pending',
};
const actionColors: Record<string, string> = { REWORK: 'badge-rework', SCRAP: 'badge-rejected', ACCEPT_WITH_DEVIATION: 'badge-queued' };

export default function NcRecordsPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [searchGauge, setSearchGauge] = useState('');

  // Create form state
  const [gaugeId, setGaugeId] = useState('');
  const [opId, setOpId] = useState('');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('');
  const [deviation, setDeviation] = useState('');

  useEffect(() => { setPageTitle('NC Records'); }, [setPageTitle]);

  const { data, isLoading } = useQuery({ queryKey: ['nc-records'], queryFn: getAllNcRecords });
  const records = data?.data || [];

  // Get gauges for the create form gauge selector
  const { data: gaugesData } = useQuery({
    queryKey: ['nc-gauges-search', searchGauge],
    queryFn: () => getGauges({ search: searchGauge, size: 20 }),
    enabled: showCreate,
  });
  const gaugesList = gaugesData?.data?.content || [];

  // Get selected part / product's operations
  const { data: gaugeOpsData } = useQuery({
    queryKey: ['nc-gauge-ops', gaugeId],
    queryFn: async () => {
      const { getGaugeOperations } = await import('@/api/gauges.api');
      return getGaugeOperations(gaugeId);
    },
    enabled: !!gaugeId,
  });
  const gaugeOps = gaugeOpsData?.data || [];

  const createMut = useMutation({
    mutationFn: (data: any) => createNcRecord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nc-records'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const resetForm = () => { setGaugeId(''); setOpId(''); setCategory(''); setReason(''); setAction(''); setDeviation(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMut.mutate({
      gaugeId, gaugeOperationId: opId, rejectionCategory: category,
      rejectionReason: reason, actionTaken: action, deviationNote: deviation || null,
    });
  };

  const categories = ['DIMENSIONAL_ERROR', 'SURFACE_DEFECT', 'MATERIAL_DEFECT', 'OPERATOR_ERROR', 'MACHINE_ISSUE', 'TOOLING_WEAR', 'OTHER'];
  const actions = ['REWORK', 'SCRAP', 'ACCEPT_WITH_DEVIATION'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>
          <AlertTriangle size={18} style={{ marginRight: 6, verticalAlign: 'text-bottom', color: 'var(--status-rejected)' }} />
          Non-Conformance Records ({records.length})
        </h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> New NC Record
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={() => setShowCreate(false)}>
          <div className="card" style={{ padding: 28, width: 520, maxHeight: '85vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--status-rejected)', marginBottom: 20 }}>
              <AlertTriangle size={18} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} /> Report Non-Conformance
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Job Card (Part / Product) *</label>
                  <select className="input" value={gaugeId} onChange={e => { setGaugeId(e.target.value); setOpId(''); }} required>
                    <option value="">Select gauge...</option>
                    {gaugesList.map((g: any) => <option key={g.id} value={g.id}>{g.serialNumber} — {g.gaugeTypeName}</option>)}
                  </select>
                </div>
                {gaugeId && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Operation *</label>
                    <select className="input" value={opId} onChange={e => setOpId(e.target.value)} required>
                      <option value="">Select operation...</option>
                      {gaugeOps.map((op: any) => <option key={op.id} value={op.id}>#{op.sequenceOrder} {op.operationName} ({op.status})</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Category *</label>
                  <select className="input" value={category} onChange={e => setCategory(e.target.value)} required>
                    <option value="">Select category...</option>
                    {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Rejection Reason *</label>
                  <textarea className="input" value={reason} onChange={e => setReason(e.target.value)} required rows={3}
                    style={{ resize: 'vertical', minHeight: 44, padding: 10 }} placeholder="Describe the defect..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Action *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {actions.map(a => (
                      <button key={a} type="button" onClick={() => setAction(a)} style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em',
                        border: `2px solid ${action === a ? (a === 'SCRAP' ? 'var(--status-rejected)' : a === 'REWORK' ? 'var(--status-rework)' : 'var(--status-queued)') : 'var(--silk)'}`,
                        background: action === a ? (a === 'SCRAP' ? 'var(--status-rejected-bg)' : a === 'REWORK' ? 'var(--status-rework-bg)' : 'var(--status-queued-bg)') : 'transparent',
                        color: action === a ? (a === 'SCRAP' ? 'var(--status-rejected)' : a === 'REWORK' ? 'var(--status-rework)' : 'var(--status-queued)') : 'var(--ash)',
                      }}>
                        {a.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                {action === 'ACCEPT_WITH_DEVIATION' && (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Deviation Note</label>
                    <textarea className="input" value={deviation} onChange={e => setDeviation(e.target.value)} rows={2}
                      style={{ resize: 'vertical', minHeight: 44, padding: 10 }} placeholder="Describe the accepted deviation..." />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || !gaugeId || !opId || !category || !reason || !action}>
                  {createMut.isPending ? 'Creating...' : 'Submit NC Record'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</button>
              </div>
              {createMut.isError && (
                <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', fontSize: 12 }}>
                  Failed to create NC record. Please try again.
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Job Card</th>
              <th>Operation</th>
              <th>Category</th>
              <th>Reason</th>
              <th>Action</th>
              <th>Initiated By</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>))}</tr>
              ))
            ) : records.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No NC records found</td></tr>
            ) : (
              records.map((nc: any) => (
                <tr key={nc.id}>
                  <td className="font-mono" style={{ fontSize: 12 }}>{nc.createdAt ? new Date(nc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                  <td className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)', fontSize: 12 }}>{nc.gauge?.serialNumber || '—'}</td>
                  <td style={{ fontSize: 13 }}>{nc.gaugeOperation?.operationName || '—'}</td>
                  <td><span className={`badge ${categoryColors[nc.rejectionCategory] || 'badge-pending'}`}>{nc.rejectionCategory?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.rejectionReason}</td>
                  <td><span className={`badge ${actionColors[nc.actionTaken] || 'badge-pending'}`}>{nc.actionTaken?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: 13 }}>{nc.initiatedBy?.fullName || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
