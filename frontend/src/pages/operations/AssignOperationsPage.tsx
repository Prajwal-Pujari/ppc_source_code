import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { getWorkers } from '@/api/users.api';
import { assignOperation } from '@/api/gauge-operations.api';
import api from '@/lib/axios';
import { Users, UserPlus, CheckCircle, Clock, Play, Search, BarChart3 } from 'lucide-react';

export default function AssignOperationsPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('PENDING,QUEUED');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignModalOp, setAssignModalOp] = useState<any>(null);
  const [selectedWorker, setSelectedWorker] = useState('');

  useEffect(() => { setPageTitle('Assign Operations'); }, [setPageTitle]);

  const { data: opsData, isLoading } = useQuery({
    queryKey: ['assign-operations', statusFilter],
    queryFn: async () => {
      const res = await api.get('/gauge-operations', { params: { statuses: statusFilter } });
      return res.data;
    },
  });

  const { data: workersData } = useQuery({
    queryKey: ['workers-list'],
    queryFn: getWorkers,
  });

  const rawOps = opsData?.data || [];
  const workers = workersData?.data || [];

  const ops = rawOps.filter((op: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const sr = op.gauge?.serialNumber?.toLowerCase() || '';
    const type = op.gauge?.gaugeTypeName?.toLowerCase() || '';
    const name = op.operationName?.toLowerCase() || '';
    const worker = op.assignedTo?.fullName?.toLowerCase() || '';
    return sr.includes(q) || type.includes(q) || name.includes(q) || worker.includes(q);
  });

  const assignMut = useMutation({
    mutationFn: ({ opId, workerId }: { opId: string; workerId: string }) => assignOperation(opId, workerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assign-operations'] });
      setAssignModalOp(null);
      setSelectedWorker('');
    },
  });

  const statusColor: Record<string, { badge: string; color: string }> = {
    PENDING: { badge: 'badge-pending', color: 'var(--status-pending)' },
    QUEUED: { badge: 'badge-queued', color: 'var(--status-queued)' },
    IN_PROGRESS: { badge: 'badge-in-progress', color: 'var(--status-in-progress)' },
    COMPLETED: { badge: 'badge-completed', color: 'var(--status-completed)' },
  };

  const filters = [
    { label: 'Pending & Queued', value: 'PENDING,QUEUED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'All', value: 'PENDING,QUEUED,IN_PROGRESS,COMPLETED' },
  ];

  return (
    <div>
      {/* Top Navigation / Switcher Banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--bone-white) 0%, var(--warm-white) 100%)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>Operations Allocation & Dispatch</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate)' }}>Assign shop-floor operators to specific job card operation sequences.</p>
        </div>
        <Link to="/operations-tracking" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, background: 'white' }}>
          <BarChart3 size={16} color="var(--copper-dark)" /> Switch to Multi-Layer Operations Analytics Hub
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} color="var(--slate)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: 38, height: 40, width: '100%', fontSize: 13 }}
            placeholder="Search by Gauge Sr #, Type, Worker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {filters.map((f) => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1px solid ${statusFilter === f.value ? 'var(--copper-bronze)' : 'var(--silk)'}`,
                background: statusFilter === f.value ? 'rgba(139,105,20,0.06)' : 'transparent',
                color: statusFilter === f.value ? 'var(--copper-bronze)' : 'var(--slate)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Job Card</th>
              <th>Gauge Type</th>
              <th>Size / Qty</th>
              <th>Op #</th>
              <th>Operation</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Started</th>
              <th>Completed</th>
              <th style={{ width: 100 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 10 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>))}</tr>
              ))
            ) : ops.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No operations found</td></tr>
            ) : (
              ops.map((op: any) => {
                const sc = statusColor[op.status] || statusColor.PENDING;
                return (
                  <tr key={op.id}>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)', fontSize: 12 }}>{op.gauge?.serialNumber || '—'}</td>
                    <td style={{ fontSize: 13 }}>{op.gauge?.gaugeTypeName || '—'}</td>
                    <td className="font-mono" style={{ fontSize: 12 }}>
                      {op.gauge?.nominalSize} {op.gauge?.sizeUnit} <br/>
                      <span style={{ color: 'var(--slate)', fontSize: 11 }}>Qty: {op.gauge?.batchQuantity || 1}</span>
                    </td>
                    <td className="font-mono" style={{ fontSize: 12, textAlign: 'center' }}>#{op.sequenceOrder}</td>
                    <td style={{ fontWeight: 500 }}>{op.operationName}</td>
                    <td><span className={`badge ${sc.badge}`}>{op.status?.replace('_', ' ')}</span></td>
                    <td>
                      {op.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--copper-bronze)' }}>
                            {op.assignedTo.fullName?.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--charcoal)' }}>{op.assignedTo.fullName}</p>
                            <p className="font-mono" style={{ fontSize: 10, color: 'var(--ash)' }}>{op.assignedTo.employeeCode}</p>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--ash)' }}>Unassigned</span>
                      )}
                    </td>
                    <td className="font-mono" style={{ fontSize: 11, color: 'var(--ash)' }}>
                      {op.actualStart ? new Date(op.actualStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td className="font-mono" style={{ fontSize: 11, color: 'var(--ash)' }}>
                      {op.actualEnd ? new Date(op.actualEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>
                    <td>
                      {(op.status === 'PENDING' || op.status === 'QUEUED') && (
                        <button onClick={() => { setAssignModalOp(op); setSelectedWorker(op.assignedTo?.id || ''); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', background: 'rgba(139,105,20,0.06)', border: '1px solid var(--copper-bronze)', color: 'var(--copper-bronze)' }}>
                          <UserPlus size={12} /> Assign
                        </button>
                      )}
                      {op.status === 'COMPLETED' && (
                        <CheckCircle size={16} color="var(--status-completed)" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {assignModalOp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={() => setAssignModalOp(null)}>
          <div className="card" style={{ padding: 24, width: 420, maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 16 }}>Assign Worker</h3>
            <div style={{ padding: 12, borderRadius: 8, background: 'var(--bone-white)', marginBottom: 16 }}>
              <p className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--copper-bronze)' }}>
                {assignModalOp.gauge?.serialNumber} (Qty: {assignModalOp.gauge?.batchQuantity || 1})
              </p>
              <p style={{ fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>Op #{assignModalOp.sequenceOrder}: <strong>{assignModalOp.operationName}</strong></p>
            </div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 6 }}>Select Worker</label>
            <select className="input" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
              <option value="">Choose worker...</option>
              {workers.map((w: any) => (
                <option key={w.id} value={w.id}>{w.fullName} ({w.employeeCode})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-primary" disabled={!selectedWorker || assignMut.isPending}
                onClick={() => assignMut.mutate({ opId: assignModalOp.id, workerId: selectedWorker })}>
                {assignMut.isPending ? 'Assigning...' : 'Assign'}
              </button>
              <button className="btn btn-secondary" onClick={() => setAssignModalOp(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
