import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getCalibrationTasks, getCalibrationTaskSummary } from '@/api/analytics.api';
import { startOperation, flagIssue } from '@/api/gauge-operations.api';
import type { GaugeOperation } from '@/types/domain.types';
import { useNavigate } from 'react-router-dom';
import { Play, AlertTriangle, Clock, ListChecks, Loader, Wrench, ChevronDown, FileText, Search, Filter, ClipboardList, CheckCircle } from 'lucide-react';
import CalibrationObservationForm from './CalibrationObservationForm';

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

export default function CalibrationTasksPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [flagModal, setFlagModal] = useState<string | null>(null);
  const [flagText, setFlagText] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});
  const [activeObservation, setActiveObservation] = useState<{ taskId: string; gauge: any } | null>(null);

  useEffect(() => { setPageTitle('Calibration Tasks'); }, [setPageTitle]);

  /* ─── queries ─── */
  const { data, isLoading } = useQuery({ queryKey: ['calibration-tasks'], queryFn: getCalibrationTasks, refetchInterval: 15000 });
  const { data: summaryData } = useQuery({ queryKey: ['calibration-task-summary'], queryFn: getCalibrationTaskSummary, refetchInterval: 15000 });

  /* ─── mutations ─── */
  const invalidate = () => { 
    queryClient.invalidateQueries({ queryKey: ['calibration-tasks'] }); 
    queryClient.invalidateQueries({ queryKey: ['calibration-task-summary'] }); 
  };
  
  const startMut = useMutation({ mutationFn: (id: string) => startOperation(id), onSuccess: invalidate });
  
  const flagMut = useMutation({
    mutationFn: ({ id, desc }: { id: string; desc: string }) => flagIssue(id, desc),
    onSuccess: () => { invalidate(); setFlagModal(null); setFlagText(''); },
  });

  const tasks = data?.data || [];
  const summary = summaryData?.data || { queued: 0, inProgress: 0, completed: 0 };

  // Exclude completed tasks
  const activeTasks = tasks.filter((t: GaugeOperation) => t.status !== 'COMPLETED');
  const completedCount = tasks.length - activeTasks.length;

  const uniqueCustomers = Array.from(
    new Set(activeTasks.map((t: any) => t.gauge?.purchaseOrder?.customer?.name || t.gauge?.purchaseOrder?.customerName).filter(Boolean))
  ).sort() as string[];

  const filteredTasks = activeTasks.filter((t: any) => {
    if (activeTab === 'in_progress' && t.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'queued' && t.status !== 'QUEUED' && t.status !== 'PENDING') return false;

    const opName = t.operationName?.toLowerCase() || '';
    const opCode = t.operationMaster?.operationCode?.toLowerCase() || '';
    const opNo = t.sequenceOrder?.toString() || '';
    const serialNo = t.gauge?.serialNumber?.toLowerCase() || '';
    const custName = (t.gauge?.purchaseOrder?.customer?.name || t.gauge?.purchaseOrder?.customerName || '').toLowerCase();
    
    const term = searchTerm.toLowerCase();
    const tokens = term.split(/\s+/).filter(Boolean);
    
    const cleanOpCode = opCode.replace(/[\s\-#_]/g, '');
    const cleanOpName = opName.replace(/[\s\-#_]/g, '');

    const matchesSearch = tokens.length === 0 || tokens.every(token => {
      const cleanToken = token.replace(/[\s\-#_]/g, '');
      const numOnly = cleanToken.replace(/^op/i, '');
      const asOp = `op${numOnly}`;

      return cleanOpName.includes(cleanToken) || 
             cleanOpName.includes(asOp) ||
             cleanOpCode.includes(cleanToken) || 
             cleanOpCode.includes(asOp) ||
             cleanOpCode.includes(numOnly) ||
             opNo.includes(numOnly) ||
             serialNo.includes(token);
    });
    
    const matchesCustomer = !customerFilter || custName === customerFilter.toLowerCase();
    
    return matchesSearch && matchesCustomer;
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
    { key: 'all', label: 'All Calibration Tasks', count: activeTasks.length, icon: ListChecks },
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
              <span style={{
                background: active ? '#8B6914' : '#D1C5B2', color: 'white',
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search & Filters ─── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 300px' }}>
          <Search size={16} color="#807665" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by operation name or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', height: 42, paddingLeft: 40, paddingRight: 16,
              borderRadius: 10, border: '1px solid var(--silk)', background: 'white',
              fontSize: 14, color: '#1B1C1A', outline: 'none', transition: 'border-color 0.2s'
            }} 
          />
        </div>
        <div style={{ position: 'relative', minWidth: 200 }}>
          <Filter size={16} color="#807665" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <select 
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={{ 
              width: '100%', height: 42, paddingLeft: 40, paddingRight: 16,
              borderRadius: 10, border: '1px solid var(--silk)', background: 'white',
              fontSize: 14, color: '#1B1C1A', outline: 'none', appearance: 'none', cursor: 'pointer'
            }}
          >
            <option value="">All Customers</option>
            {uniqueCustomers.map(cust => (
              <option key={cust} value={cust}>{cust}</option>
            ))}
          </select>
          <ChevronDown size={16} color="#807665" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ─── Job Cards ─── */}
      {filteredTasks.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center', background: 'var(--warm-white)', border: '1px dashed var(--silk)', borderRadius: 10 }}>
          <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--charcoal)' }}>No calibration tasks in this category</p>
          <p style={{ fontSize: 14, marginTop: 8, color: 'var(--ash)' }}>Check back later for new calibration assignments.</p>
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
                              task.status === 'PENDING' && task.operationMaster?.isCalibration ? (
                                <button disabled
                                  style={{ flex: 1, background: '#F5F3F0', color: '#A0A0A0', padding: '10px 0', borderRadius: 10, border: '1px solid #D1C5B240', fontWeight: 500, fontSize: 12, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  Cannot Start (Prerequisites Pending)
                                </button>
                              ) : (
                                <button onClick={() => startMut.mutate(task.id)} disabled={startMut.isPending}
                                  className="gradient-copper" style={{ flex: 1, color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'filter .2s' }}>
                                  {startMut.isPending ? <Loader size={14} className="spin" /> : <Play size={14} />} Start Calibration
                                </button>
                              )
                            )}
                            {isInProgress && (
                              <>
                                <button onClick={() => setActiveObservation({ taskId: task.id, gauge: task.gauge })}
                                  style={{ flex: 1, background: '#8B6914', color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <ClipboardList size={14} /> Enter Observations
                                </button>
                                <button onClick={() => setFlagModal(task.id)}
                                  style={{ background: 'white', color: '#BA1A1A', padding: '10px 14px', borderRadius: 10, border: '1px solid #BA1A1A40', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                  <AlertTriangle size={14} />
                                </button>
                              </>
                            )}
                            {task.status === 'COMPLETED' && (
                              <span style={{ flex: 1, textAlign: 'center', color: '#228B22', fontSize: 13, fontWeight: 500, padding: '10px 0' }}>✓ Calibration Completed</span>
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
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#B8860B', letterSpacing: '.03em' }}>CALIBRATION IN PROGRESS</span>
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

                              {/* Serial Number Link */}
                              <button onClick={() => navigate(`/calibration-report/${task.gauge?.id}`)}
                                style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--silk)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, color: '#6F5100', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                View Calibration Report Page →
                              </button>
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
              {completedCount} completed calibration {completedCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#228B22', fontWeight: 500 }}>View Completed Work →</span>
        </div>
      )}

      {/* ─── FLOATING MODAL OVERLAY: Calibration Observations ─── */}
      {activeObservation && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }} 
          onClick={() => setActiveObservation(null)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: 1100,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--silk)',
              position: 'relative'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <CalibrationObservationForm
              gaugeOperationId={activeObservation.taskId}
              gauge={activeObservation.gauge}
              onClose={() => setActiveObservation(null)}
              onCompleted={() => {
                setActiveObservation(null);
                invalidate();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
