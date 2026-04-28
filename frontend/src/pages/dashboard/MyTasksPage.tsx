import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getMyTasks, getMyTaskSummary } from '@/api/analytics.api';
import { startOperation, completeOperation, flagIssue } from '@/api/gauge-operations.api';
import type { GaugeOperation } from '@/types/domain.types';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, AlertTriangle, Clock, ListChecks, Loader, Wrench, ChevronDown, FileText } from 'lucide-react';
import OperationFlowLoader from '@/components/ui/loader/OperationFlowLoader';

type TabKey = 'in_progress' | 'queued' | 'all';

/* ─── style constants ─── */
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  IN_PROGRESS: { bg: 'rgba(255,191,0,0.10)', text: '#B8860B', dot: '#FFBF00', label: 'In Progress' },
  COMPLETED:   { bg: 'rgba(34,139,34,0.10)', text: '#228B22', dot: '#228B22', label: 'Completed' },
  QUEUED:      { bg: 'rgba(108,117,125,0.10)', text: '#6C757D', dot: '#6C757D', label: 'Queued' },
  PENDING:     { bg: 'rgba(108,117,125,0.10)', text: '#6C757D', dot: '#6C757D', label: 'Pending' },
};

const css = `
  .gradient-copper{background:linear-gradient(135deg,#8B6914,#6F5100)}
  .ambient-shadow{box-shadow:0 4px 20px 0 rgba(139,105,20,.04),0 12px 40px 0 rgba(48,49,47,.08)}
  @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
  .pulse-dot{animation:pulse-dot 1.5s ease-in-out infinite}
  .jc-panel{background:var(--bone-white);border:1px solid var(--silk);border-radius:10px;overflow:hidden;transition:box-shadow .2s}
  .jc-panel:hover{box-shadow:0 8px 30px rgba(48,49,47,.06)}
`;

export default function MyTasksPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [completeModal, setCompleteModal] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [reading, setReading] = useState('');
  const [flagModal, setFlagModal] = useState<string | null>(null);
  const [flagText, setFlagText] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});

  useEffect(() => { setPageTitle('My Tasks'); }, [setPageTitle]);

  /* ─── queries ─── */
  const { data, isLoading } = useQuery({ queryKey: ['worker-tasks'], queryFn: getMyTasks, refetchInterval: 15000 });
  const { data: summaryData } = useQuery({ queryKey: ['worker-task-summary'], queryFn: getMyTaskSummary, refetchInterval: 15000 });

  /* ─── mutations ─── */
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['worker-tasks'] }); queryClient.invalidateQueries({ queryKey: ['worker-task-summary'] }); };
  const startMut = useMutation({ mutationFn: (id: string) => startOperation(id), onSuccess: invalidate });
  const completeMut = useMutation({
    mutationFn: ({ id, remarks, reading }: { id: string; remarks: string; reading?: string }) =>
      completeOperation(id, { remarks, qualityParams: reading ? { measuredValue: reading } : undefined }),
    onSuccess: () => { invalidate(); setCompleteModal(null); setRemarks(''); setReading(''); },
  });
  const flagMut = useMutation({
    mutationFn: ({ id, desc }: { id: string; desc: string }) => flagIssue(id, desc),
    onSuccess: () => { invalidate(); setFlagModal(null); setFlagText(''); },
  });

  const tasks = data?.data || [];
  const summary = summaryData?.data || { queued: 0, inProgress: 0, completed: 0 };

  // Exclude completed tasks — they live on /completed-tasks
  const activeTasks = tasks.filter((t: GaugeOperation) => t.status !== 'COMPLETED');
  const completedCount = tasks.length - activeTasks.length;

  const filteredTasks = activeTasks.filter((t: GaugeOperation) => {
    if (activeTab === 'in_progress') return t.status === 'IN_PROGRESS';
    if (activeTab === 'queued') return t.status === 'QUEUED' || t.status === 'PENDING';
    return true;
  });

  /* ─── group by PO ─── */
  const groupedTasks = useMemo(() => {
    const groups: Record<string, { po: any; tasks: GaugeOperation[] }> = {};
    filteredTasks.forEach((task: any) => {
      const po = task.gauge?.purchaseOrder;
      const poId = po?.id || 'unassigned';
      if (!groups[poId]) {
        groups[poId] = { po: po || { id: 'unassigned', poNumber: 'Unassigned PO', customerName: 'N/A' }, tasks: [] };
      }
      groups[poId].tasks.push(task);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.po.id === 'unassigned') return 1;
      if (b.po.id === 'unassigned') return -1;
      return (a.po.poNumber || '').localeCompare(b.po.poNumber || '');
    });
  }, [filteredTasks]);

  const toggleCard = (id: string) => setExpandedCards(p => ({ ...p, [id]: !p[id] }));
  const togglePO = (poId: string) => setExpandedPOs(p => ({ ...p, [poId]: p[poId] === undefined ? false : !p[poId] }));

  const tabs: { key: TabKey; label: string; count: number; icon: any; }[] = [
    { key: 'all', label: 'All Tasks', count: activeTasks.length, icon: ListChecks },
    { key: 'in_progress', label: 'In Progress', count: Number(summary.inProgress) || 0, icon: Loader },
    { key: 'queued', label: 'Queued', count: Number(summary.queued) || 0, icon: Clock },
  ];

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ width: 120, height: 40, borderRadius: 999 }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: '#F5F3F0', borderRadius: 12, border: '1px solid #D1C5B240', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #D1C5B240' }}>
                <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 6 }} />
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: '100%', height: 180, borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─── helpers ─── */
  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CFG[status] || STATUS_CFG.QUEUED;
    return (
      <span style={{ background: cfg.bg, color: cfg.text, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '.03em' }}>
        <span className={status === 'IN_PROGRESS' ? 'pulse-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
        {cfg.label}
      </span>
    );
  };

  const Field = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: '#807665', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      <span className={mono ? 'font-mono' : ''} style={{ fontSize: 13, color: '#1B1C1A', fontWeight: mono ? 500 : 400 }}>{value || 'N/A'}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{css}</style>

      {/* ─── Tab Pills ─── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: '10px 20px', borderRadius: 999, border: active ? '1.5px solid #8B6914' : '1.5px solid var(--silk)',
              background: active ? 'rgba(139,105,20,0.06)' : 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s',
              fontWeight: active ? 600 : 400, color: active ? '#6F5100' : '#807665', fontSize: 13,
            }}>
              <Icon size={15} />
              {tab.label}
              <span className="font-mono" style={{ fontSize: 12, background: active ? '#8B6914' : 'var(--silk)', color: active ? 'white' : '#807665', padding: '1px 8px', borderRadius: 999, fontWeight: 600 }}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Empty State ─── */}
      {groupedTasks.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center', background: 'var(--warm-white)', border: '1px dashed var(--silk)', borderRadius: 10 }}>
          <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--charcoal)' }}>No tasks in this category</p>
          <p style={{ fontSize: 14, marginTop: 8, color: 'var(--ash)' }}>Check back later for new assignments.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groupedTasks.map(({ po, tasks: poTasks }) => (
            <div key={po.id} style={{ background: '#F5F3F0', borderRadius: 12, border: '1px solid #D1C5B2' + '40', overflow: 'hidden' }}>
              {/* ─── PO Card Header (clickable) ─── */}
              <div onClick={() => togglePO(po.id)} style={{ padding: '18px 24px', background: 'linear-gradient(135deg, rgba(139,105,20,0.06), rgba(111,81,0,0.03))', borderBottom: (expandedPOs[po.id] !== false) ? '1px solid #D1C5B240' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(139,105,20,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} color="#8B6914" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: '#6F5100', letterSpacing: '-0.02em' }}>{po.poNumber}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#807665', background: 'white', padding: '2px 10px', borderRadius: 999, border: '1px solid #D1C5B240' }}>{poTasks.length} {poTasks.length === 1 ? 'Job' : 'Jobs'}</span>
                    </div>
                    <span style={{ fontSize: 13, color: '#807665', marginTop: 2, display: 'block' }}>{po.customer?.name || po.customerName || 'Customer'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {po.specialInstructions && (
                    <div style={{ fontSize: 12, color: '#B8860B', background: 'rgba(255,191,0,0.08)', border: '1px solid rgba(255,191,0,0.15)', padding: '6px 14px', borderRadius: 8, maxWidth: 400, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, marginRight: 6 }}>Note:</span>{po.specialInstructions}
                    </div>
                  )}
                  <ChevronDown size={20} color="#807665" style={{ transform: (expandedPOs[po.id] !== false) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {/* ─── Job Cards inside this PO (collapsible) ─── */}
              {(expandedPOs[po.id] !== false) && (
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {poTasks.map((task: GaugeOperation) => {
                  const sCfg = STATUS_CFG[task.status] || STATUS_CFG.QUEUED;
                  const isOpen = expandedCards[task.id] ?? (task.status === 'IN_PROGRESS');
                  const isInProgress = task.status === 'IN_PROGRESS';

                  return (
                    <div key={task.id} className="jc-panel" style={{ borderLeft: `3px solid ${sCfg.dot}` }}>
                      {/* ─── Card Layout: 30% Left + 70% Right ─── */}
                      <div style={{ display: 'flex', minHeight: 0 }}>

                        {/* ─── LEFT: Job Summary (30%) ─── */}
                        <div style={{ width: '32%', padding: '20px 22px', borderRight: '1px solid var(--silk)', background: 'white', display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #D1C5B2' + '33' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1B1C1A' }}>Job Summary</span>
                            <StatusBadge status={task.status} />
                          </div>

                          <Field label="Serial Number" value={task.gauge?.serialNumber || 'N/A'} mono />
                          <Field label="Gauge Type" value={task.gauge?.gaugeTypeName || 'N/A'} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Field label="Nominal Size" value={`${task.gauge?.nominalSize ?? 'N/A'} mm`} mono />
                            <Field label="Material" value={task.gauge?.materialGrade || 'Standard'} />
                          </div>

                          {task.actualStart && (
                            <Field label="Started" value={new Date(task.actualStart).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} mono />
                          )}

                          {/* ─── Action Buttons ─── */}
                          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #D1C5B2' + '33', display: 'flex', gap: 8 }}>
                            {(task.status === 'QUEUED' || task.status === 'PENDING') && (
                              <button onClick={() => startMut.mutate(task.id)} disabled={startMut.isPending}
                                className="gradient-copper" style={{ flex: 1, color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'filter .2s' }}>
                                {startMut.isPending ? <Loader size={14} className="spin" /> : <Play size={14} />} Start Job
                              </button>
                            )}
                            {isInProgress && (
                              <>
                                <button onClick={() => setCompleteModal(task.id)}
                                  style={{ flex: 1, background: '#228B22', color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <CheckCircle size={14} /> Complete
                                </button>
                                <button onClick={() => setFlagModal(task.id)}
                                  style={{ background: 'white', color: '#BA1A1A', padding: '10px 14px', borderRadius: 10, border: '1px solid #BA1A1A40', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                  <AlertTriangle size={14} />
                                </button>
                              </>
                            )}
                            {task.status === 'COMPLETED' && (
                              <span style={{ flex: 1, textAlign: 'center', color: '#228B22', fontSize: 13, fontWeight: 500, padding: '10px 0' }}>✓ Done</span>
                            )}
                          </div>
                        </div>

                        {/* ─── RIGHT: Operation Detail (70%) ─── */}
                        <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Operation Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#1B1C1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, color: '#807665', background: '#D1C5B2' + '33', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>OP #{task.sequenceOrder}</span>
                              {task.operationName}
                            </h3>
                            <button onClick={() => toggleCard(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#807665', padding: 4 }}>
                              <ChevronDown size={18} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                            </button>
                          </div>

                          {/* Active Operation Indicator */}
                          {isInProgress && (
                            <div className="ambient-shadow" style={{ position: 'relative', overflow: 'hidden', background: 'white', border: '1px solid rgba(139,105,20,0.2)', borderRadius: 8, padding: '14px 18px' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: 'linear-gradient(135deg,#8B6914,#6F5100)' }} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBF00' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#B8860B', letterSpacing: '.03em' }}>OPERATION IN PROGRESS</span>
                                {task.actualStart && (
                                  <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 12, color: '#807665' }}>
                                    Since {new Date(task.actualStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Completed info */}
                          {task.status === 'COMPLETED' && task.actualEnd && (
                            <div style={{ background: 'rgba(34,139,34,0.05)', border: '1px solid rgba(34,139,34,0.15)', borderRadius: 8, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <CheckCircle size={16} color="#228B22" />
                              <span style={{ fontSize: 13, color: '#228B22', fontWeight: 500 }}>Completed</span>
                              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: 12, color: '#807665' }}>
                                {new Date(task.actualEnd).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}

                          {/* Expandable Details */}
                          {isOpen && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                              {/* Line Notes */}
                              {task.gauge?.poLineItem?.lineNotes && (
                                <div style={{ background: 'rgba(139,105,20,0.04)', border: '1px solid rgba(139,105,20,0.12)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                                  <span style={{ fontWeight: 600, color: '#6F5100', marginRight: 8 }}>Line Note:</span>
                                  <span style={{ color: '#4E4637' }}>{task.gauge.poLineItem.lineNotes}</span>
                                </div>
                              )}

                              {/* Previous Remarks / Reading */}
                              {task.remarks && (
                                <div style={{ background: '#F5F3F0', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                                  <span style={{ fontWeight: 600, color: '#1B1C1A', marginRight: 8 }}>Remarks:</span>
                                  <span style={{ color: '#4E4637', fontStyle: 'italic' }}>"{task.remarks}"</span>
                                </div>
                              )}
                              {task.qualityParams?.measuredValue && (
                                <div style={{ background: 'rgba(139,105,20,0.04)', border: '1px solid rgba(139,105,20,0.12)', borderRadius: 8, padding: '12px 16px', fontSize: 13 }}>
                                  <span style={{ fontWeight: 600, color: '#6F5100', marginRight: 8 }}>Measurement:</span>
                                  <span className="font-mono" style={{ color: '#1B1C1A' }}>{task.qualityParams.measuredValue}</span>
                                </div>
                              )}

                              {/* Serial Number Link */}
                              <button onClick={() => navigate(`/job-cards/${task.gauge?.id}`)}
                                style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--silk)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, color: '#6F5100', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                View Full Job Card →
                              </button>
                            </div>
                          )}

                          {/* ─── INLINE: Complete Modal ─── */}
                          {completeModal === task.id && (
                            <div style={{ marginTop: 8, padding: 20, background: 'white', borderRadius: 10, border: '1px solid rgba(34,139,34,0.3)', boxShadow: '0 4px 12px rgba(34,139,34,0.08)' }}>
                              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#1B1C1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={16} color="#228B22" /> Complete Operation
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Reading</label>
                                  <input type="text" className="input font-mono" value={reading} onChange={e => setReading(e.target.value)}
                                    style={{ height: 40, width: '100%', borderRadius: 8 }} placeholder="e.g. 10.005 mm" />
                                </div>
                                <div>
                                  <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Remarks</label>
                                  <input type="text" className="input" value={remarks} onChange={e => setRemarks(e.target.value)}
                                    style={{ height: 40, width: '100%', borderRadius: 8 }} placeholder="Add observations..." />
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => { setCompleteModal(null); setReading(''); setRemarks(''); }}
                                  style={{ height: 38, padding: '0 18px', background: 'white', border: '1px solid var(--silk)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                                <button onClick={() => completeMut.mutate({ id: task.id, remarks, reading })} disabled={completeMut.isPending}
                                  style={{ height: 38, padding: '0 22px', background: '#228B22', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                                  {completeMut.isPending ? <Loader size={14} className="spin" /> : 'Confirm'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ─── INLINE: Flag Issue Modal ─── */}
                          {flagModal === task.id && (
                            <div style={{ marginTop: 8, padding: 20, background: '#FFF5F5', borderRadius: 10, border: '1px solid rgba(186,26,26,0.2)' }}>
                              <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#BA1A1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertTriangle size={16} /> Report Issue
                              </h4>
                              <textarea className="input" value={flagText} onChange={e => setFlagText(e.target.value)} rows={3}
                                style={{ resize: 'vertical', width: '100%', padding: 10, borderRadius: 8, minHeight: 60 }} placeholder="Describe the problem..." />
                              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                                <button onClick={() => setFlagModal(null)}
                                  style={{ height: 38, padding: '0 18px', background: 'white', border: '1px solid var(--silk)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                                <button onClick={() => flagMut.mutate({ id: task.id, desc: flagText })} disabled={flagMut.isPending}
                                  style={{ height: 38, padding: '0 22px', background: '#BA1A1A', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                                  {flagMut.isPending ? <Loader size={14} className="spin" /> : 'Submit'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Completed Work Banner */}
      {completedCount > 0 && (
        <div onClick={() => navigate('/completed-tasks')} style={{
          marginTop: 24, padding: '16px 24px', borderRadius: 10,
          background: 'rgba(34,139,34,0.04)', border: '1px solid rgba(34,139,34,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'background 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={20} color="#228B22" />
            <span style={{ fontSize: 14, color: '#228B22', fontWeight: 500 }}>
              {completedCount} completed {completedCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#228B22', fontWeight: 500 }}>View Completed Work →</span>
        </div>
      )}
    </div>
  );
}
