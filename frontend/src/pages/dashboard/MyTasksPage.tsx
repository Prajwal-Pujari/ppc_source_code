import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getMyTasks, getMyTaskSummary } from '@/api/analytics.api';
import { startOperation, completeOperation, flagIssue } from '@/api/gauge-operations.api';
import { pqcApi } from '@/api/pqc.api';
import { shiftsApi, type FactoryShift } from '@/api/shifts.api';
import { machinesApi, type MachineMaster } from '@/api/machines.api';
import type { GaugeOperation } from '../../types/domain.types';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, AlertTriangle, Clock, ListChecks, Loader, Wrench, ChevronDown, ChevronRight, FileText, Settings, X } from 'lucide-react';
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
  const [setupModal, setSetupModal] = useState<GaugeOperation | null>(null);
  const [remarks, setRemarks] = useState('');
  const [reading, setReading] = useState('');
  const [flagModal, setFlagModal] = useState<string | null>(null);
  const [flagText, setFlagText] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});

  const [passedQty, setPassedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);

  const [gamifiedModalTask, setGamifiedModalTask] = useState<any>(null);
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [machines, setMachines] = useState<MachineMaster[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');

  useEffect(() => { setPageTitle('My Tasks'); }, [setPageTitle]);

  useEffect(() => {
    shiftsApi.getAll().then(res => {
      const allShifts = res.data;
      setShifts(allShifts);
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}:00`;
      let matchedShiftId = '';
      for (const shift of allShifts) {
        let start = shift.startTime;
        let end = shift.endTime;
        
        // Handle Spring Boot LocalTime array format: [hour, minute]
        if (Array.isArray(start)) start = `${String(start[0]).padStart(2, '0')}:${String(start[1]).padStart(2, '0')}:00`;
        if (Array.isArray(end)) end = `${String(end[0]).padStart(2, '0')}:${String(end[1]).padStart(2, '0')}:00`;

        if (start <= end) {
          if (currentTimeStr >= start && currentTimeStr <= end) { matchedShiftId = shift.id; break; }
        } else {
          if (currentTimeStr >= start || currentTimeStr <= end) { matchedShiftId = shift.id; break; }
        }
      }
      if (matchedShiftId) { setSelectedShiftId(matchedShiftId); }
      else if (allShifts.length > 0) { setSelectedShiftId(allShifts[0].id); }
    }).catch(console.error);

    machinesApi.getAll().then(res => setMachines(res.data)).catch(console.error);
  }, []);

  /* ─── queries ─── */
  const { data, isLoading } = useQuery({ queryKey: ['worker-tasks'], queryFn: getMyTasks, refetchInterval: 15000 });
  const { data: summaryData } = useQuery({ queryKey: ['worker-task-summary'], queryFn: getMyTaskSummary, refetchInterval: 15000 });

  /* ─── mutations ─── */
  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['worker-tasks'] }); queryClient.invalidateQueries({ queryKey: ['worker-task-summary'] }); };
  const startMut = useMutation({ mutationFn: (id: string) => startOperation(id), onSuccess: invalidate });
  const logInspectionMut = useMutation({
    mutationFn: async ({ task, passedQty, rejectedQty, remarks, answers, shiftId, machineId }: any) => {
      const answersArray = Object.entries(answers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
      await pqcApi.logInspection({
        gaugeOperationId: task.id,
        shiftId,
        machineId,
        actualQty: passedQty + rejectedQty,
        passedQty,
        rejectedQty,
        reworkQty: rejectedQty,
        scrapQty: 0,
        remarks,
        questionAnswers: answersArray
      });
    },
    onSuccess: () => { invalidate(); setGamifiedModalTask(null); setRemarks(''); },
    onError: (err: any) => { alert('Error logging inspection: ' + err.message); }
  });
  const completeMut = useMutation({
    mutationFn: ({ id, remarks, reading }: { id: string; remarks: string; reading?: string }) =>
      completeOperation(id, { remarks, qualityParams: reading ? { measuredValue: reading } : undefined }),
    onSuccess: () => { invalidate(); setCompleteModal(null); setRemarks(''); setReading(''); },
  });
  const flagMut = useMutation({
    mutationFn: ({ id, desc }: { id: string; desc: string }) => flagIssue(id, desc),
    onSuccess: () => { invalidate(); setFlagModal(null); setFlagText(''); },
  });

  const openCompleteModal = (task: GaugeOperation) => {
    setCompleteModal(task.id);
    setRemarks('');
    setReading('');
    setPassedQty(task.gauge?.batchQuantity || 0);
    setRejectedQty(0);
  };

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
                          <Field label="Part / Product Name" value={task.gauge?.gaugeTypeName || 'N/A'} />
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <Field label="Nominal Size" value={`${task.gauge?.nominalSize ?? 'N/A'} mm`} mono />
                            <Field label="Material" value={task.gauge?.materialGrade || 'Standard'} />
                          </div>

                          {task.actualStart && (
                            <Field label="Started" value={new Date(task.actualStart).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} mono />
                          )}

                          {/* ─── Setup Warning ─── */}
                          {task.setupInfo && task.setupInfo.setupStatus === 'PENDING' && (
                            <div style={{ background: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#E65100' }}>
                              <strong style={{ display: 'block', marginBottom: 4 }}>Setup Required</strong>
                              Complete the machine setup checklist before starting this operation.
                            </div>
                          )}

                          {/* ─── Action Buttons ─── */}
                          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #D1C5B2' + '33', display: 'flex', gap: 8 }}>
                            {(task.status === 'QUEUED' || task.status === 'PENDING') && (
                              <>
                                {task.setupInfo && task.setupInfo.setupStatus === 'PENDING' ? (
                                  <button onClick={() => setSetupModal(task)} 
                                    className="gradient-copper" style={{ flex: 1, color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'filter .2s' }}>
                                    <Settings size={14} /> Complete Setup
                                  </button>
                                ) : (
                                  <button onClick={() => startMut.mutate(task.id)} disabled={startMut.isPending}
                                    className="gradient-copper" style={{ flex: 1, color: 'white', padding: '10px 0', borderRadius: 10, border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'filter .2s' }}>
                                    {startMut.isPending ? <Loader size={14} className="spin" /> : <Play size={14} />} Start Job
                                  </button>
                                )}
                              </>
                            )}
                            {isInProgress && (
                              <>
                                <button onClick={() => openCompleteModal(task)}
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
                          {completeModal === task.id && (() => {
                            return (
                              <div style={{ marginTop: 8, padding: 20, background: 'white', borderRadius: 10, border: '1px solid rgba(34,139,34,0.3)', boxShadow: '0 4px 12px rgba(34,139,34,0.08)' }}>
                                <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#1B1C1A', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <CheckCircle size={16} color="#228B22" /> Complete Operation
                                </h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                                  <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Passed Qty</label>
                                    <input type="number" className="input font-mono" value={passedQty} onChange={e => setPassedQty(Number(e.target.value))}
                                      style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #D1C5B2' }} />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Rejected/Scrap Qty</label>
                                    <input type="number" className="input font-mono" value={rejectedQty} onChange={e => setRejectedQty(Number(e.target.value))}
                                      style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #D1C5B2' }} />
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                                  <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Reading</label>
                                    <input type="text" className="input font-mono" value={reading} onChange={e => setReading(e.target.value)}
                                      style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #D1C5B2' }} placeholder="Enter measurement reading..." />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', display: 'block', marginBottom: 6 }}>Observation</label>
                                    <input type="text" className="input" value={remarks} onChange={e => setRemarks(e.target.value)}
                                      style={{ height: 40, width: '100%', borderRadius: 8, border: '1px solid #D1C5B2' }} placeholder="Any observations..." />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                                  <button className="btn" onClick={() => { setCompleteModal(null); setReading(''); setRemarks(''); }}
                                    style={{ height: 38, padding: '0 18px', background: 'white', border: '1px solid var(--silk)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                                  
                                  <button onClick={() => {
                                      setCompleteModal(null);
                                      setGamifiedModalTask({ task, passedQty, rejectedQty, remarks, answers: {} });
                                    }}
                                    style={{ height: 38, padding: '0 22px', background: '#228B22', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
                                    Continue <ChevronRight size={14} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

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
        <div onClick={() => navigate('/tasks/completed')} style={{
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
      {/* ─── GAMIFIED SHIFT/MACHINE POPUP ─── */}
      {gamifiedModalTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bone-white)', padding: 40, borderRadius: 24, width: 500, maxWidth: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 30 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6914, #6F5100)', color: 'white', marginBottom: 16 }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1B1C1A' }}>Great job!</h2>
              <p style={{ margin: '8px 0 0', color: '#807665', fontSize: 15 }}>Just a quick check before we log this batch.</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Which Shift?</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                {shifts.map(s => (
                  <button key={s.id} onClick={() => setSelectedShiftId(s.id!)} style={{
                    padding: '12px 8px', borderRadius: 12, border: selectedShiftId === s.id ? '2px solid #8B6914' : '2px solid transparent',
                    background: selectedShiftId === s.id ? 'rgba(139,105,20,0.1)' : 'white', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: selectedShiftId === s.id ? '0 4px 12px rgba(139,105,20,0.1)' : '0 2px 6px rgba(0,0,0,0.04)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: selectedShiftId === s.id ? '#6F5100' : '#4E4637' }}>{s.shiftName}</span>
                    <span className="font-mono" style={{ fontSize: 11, color: '#807665' }}>
                      {Array.isArray(s.startTime) ? `${String(s.startTime[0]).padStart(2, '0')}:${String(s.startTime[1]).padStart(2, '0')}` : s.startTime.substring(0,5)} - {Array.isArray(s.endTime) ? `${String(s.endTime[0]).padStart(2, '0')}:${String(s.endTime[1]).padStart(2, '0')}` : s.endTime.substring(0,5)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 30 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#807665', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Which Machine?</label>
              <select value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)} className="input" style={{ width: '100%', height: 48, borderRadius: 12, fontSize: 15, border: '1px solid #D1C5B2', background: 'white', color: selectedMachineId ? '#1B1C1A' : '#807665' }}>
                <option value="" disabled>Select the machine you used...</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.machineCode} - {m.machineName}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => { setGamifiedModalTask(null); setCompleteModal(gamifiedModalTask?.task?.id); }} style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '1px solid #D1C5B2', borderRadius: 12, color: '#4E4637', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Wait, go back</button>
              <button onClick={() => logInspectionMut.mutate({ ...gamifiedModalTask, shiftId: selectedShiftId, machineId: selectedMachineId })} disabled={logInspectionMut.isPending || !selectedShiftId || !selectedMachineId} style={{ flex: 2, padding: '14px 0', background: 'linear-gradient(135deg, #228B22, #186B18)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (!selectedShiftId || !selectedMachineId) ? 0.6 : 1 }}>
                {logInspectionMut.isPending ? <Loader size={18} className="spin" /> : <><CheckCircle size={18} /> Confirm & Log Batch</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SETUP MODAL ─── */}
      {setupModal && (
        <MachineSetupModal 
          task={setupModal}
          onClose={() => setSetupModal(null)}
          onComplete={() => {
            setSetupModal(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function MachineSetupModal({ task, onClose, onComplete }: { task: GaugeOperation, onClose: () => void, onComplete: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const accessToken = useAuthStore(state => state.accessToken);

  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [globalTimeSeconds, setGlobalTimeSeconds] = useState(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [completedQuestions, setCompletedQuestions] = useState<Record<string, boolean>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const { data: configData, isLoading } = useQuery({
    queryKey: ['machine-setup-config', task.machineMasterId || task.machineMaster?.id],
    queryFn: () => fetch(`/api/v1/machine-setup/config/${task.machineMasterId || task.machineMaster?.id}/${task.operationMasterId || task.operationMaster?.id}${task.gaugeMasterId ? `?gaugeMasterId=${task.gaugeMasterId}` : ''}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to fetch config');
      return res.json();
    })
  });

  const config = configData?.data;

  // Set initial active question
  useEffect(() => {
    if (config?.questions?.length > 0 && !activeQuestionId) {
      setActiveQuestionId(config.questions[0].id);
    }
  }, [config, activeQuestionId]);

  // Timers
  useEffect(() => {
    if (!isStarted || isPaused) return;
    const interval = setInterval(() => {
      setGlobalTimeSeconds(prev => prev + 1);
      if (activeQuestionId && !completedQuestions[activeQuestionId]) {
        setQuestionTimes(prev => ({
          ...prev,
          [activeQuestionId]: (prev[activeQuestionId] || 0) + 1
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isStarted, isPaused, activeQuestionId, completedQuestions]);

  const handleCompleteQuestion = (qId: string) => {
    setCompletedQuestions(prev => ({ ...prev, [qId]: true }));
    const qList = config?.questions || [];
    const idx = qList.findIndex((q: any) => q.id === qId);
    if (idx >= 0 && idx < qList.length - 1) {
      for (let i = idx + 1; i < qList.length; i++) {
        if (!completedQuestions[qList[i].id]) {
          setActiveQuestionId(qList[i].id);
          break;
        }
      }
    }
  };

  const submitMut = useMutation({
    mutationFn: async (body: any) => {
      const response = await fetch('/api/v1/machine-setup/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(body)
      });
      return response.json();
    },
    onSuccess: onComplete
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    submitMut.mutate({
      poLineItemOperationId: task.setupInfo?.poLineItemOperationId,
      questionSetId: config.id,
      remarks,
      totalTimeSeconds: globalTimeSeconds,
      answers: Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        answerValue: ans,
        timeTakenSeconds: questionTimes[qId] || 0
      }))
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', padding: 32, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Loader size={32} className="spin" color="#8B6914" />
          <p style={{ marginTop: 16, fontWeight: 500 }}>Loading setup checklist...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', padding: 32, borderRadius: 16, maxWidth: 400, textAlign: 'center' }}>
          <AlertTriangle size={32} color="#BA1A1A" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>No Checklist Found</h3>
          <p style={{ color: 'var(--ash)', fontSize: 14, marginBottom: 24 }}>There is no Machine Setup configuration available for this operation. You can proceed without setup.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={onClose} className="btn" style={{ flex: 1, background: 'white', color: 'var(--charcoal)', border: '1px solid var(--silk)' }}>Cancel</button>
            <button onClick={() => {
              submitMut.mutate({
                poLineItemOperationId: task.setupInfo?.poLineItemOperationId,
                questionSetId: null, remarks: 'Skipped - No configuration available', totalTimeSeconds: 0, answers: []
              });
            }} className="gradient-copper" style={{ flex: 1, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }} disabled={submitMut.isPending}>
              {submitMut.isPending ? <Loader size={14} className="spin" /> : 'Skip Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #8B6914, #6F5100)', color: 'white' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Machine Setup Checklist</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 16 }}>
              <Clock size={16} /> {formatTime(globalTimeSeconds)}
            </div>
            
            {!isStarted ? (
              <button onClick={() => setIsStarted(true)} style={{ background: '#228B22', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={14} fill="currentColor" /> Start Setup
              </button>
            ) : (
              <button onClick={() => setIsPaused(!isPaused)} style={{ background: isPaused ? '#FFBF00' : 'white', color: isPaused ? 'white' : '#8B6914', border: 'none', padding: '6px 16px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {isPaused ? <Play size={14} fill="currentColor" /> : <div style={{width: 10, height: 10, borderLeft: '3px solid', borderRight: '3px solid'}} />} {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 32, flex: 1, overflow: 'auto', background: 'var(--bone-white)', opacity: (!isStarted || isPaused) ? 0.5 : 1, pointerEvents: (!isStarted || isPaused) ? 'none' : 'auto', transition: 'all 0.3s' }}>
            
            <div className="card" style={{ marginBottom: 32, padding: 24, border: '1px solid var(--silk)', boxShadow: 'var(--shadow-card)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--status-in-progress-bg)', color: 'var(--status-in-progress)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListChecks size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--ash)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Checklist</span>
                    <div style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 16 }}>{config.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--status-pending-bg)', color: 'var(--status-pending)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wrench size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--ash)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Machine</span>
                    <div style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 16 }}>{config.machineMaster?.machineName || 'N/A'}</div>
                  </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {config.questions?.map((q: any, i: number) => {
                const isActive = activeQuestionId === q.id;
                const isCompleted = !!completedQuestions[q.id];
                const timeStr = formatTime(questionTimes[q.id] || 0);

                return (
                <div key={q.id} className="card" style={{ padding: 24, border: isActive ? '2px solid var(--copper-bronze)' : '1px solid var(--silk)', boxShadow: isActive ? '0 4px 12px rgba(139,105,20,0.1)' : 'var(--shadow-card)', display: 'flex', gap: 20, transition: 'all 0.2s', background: isCompleted ? '#FAFAF8' : 'white' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: isCompleted ? 'var(--status-completed-bg)' : isActive ? 'var(--status-in-progress-bg)' : 'var(--status-pending-bg)', color: isCompleted ? 'var(--status-completed)' : isActive ? 'var(--status-in-progress)' : 'var(--status-pending)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                    {isCompleted ? <CheckCircle size={18} /> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {q.questionText}
                        {q.isCritical && <span style={{ fontSize: 11, background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>CRITICAL</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, color: isActive ? 'var(--copper-bronze)' : 'var(--ash)', background: isActive ? 'rgba(139,105,20,0.1)' : 'var(--warm-white)', padding: '4px 8px', borderRadius: 6 }}>
                          ⏱ {timeStr}
                        </div>
                        {!isCompleted ? (
                          <button type="button" onClick={() => handleCompleteQuestion(q.id)} disabled={!answers[q.id]} style={{ background: answers[q.id] ? '#228B22' : 'var(--silk)', color: answers[q.id] ? 'white' : 'var(--ash)', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, cursor: answers[q.id] ? 'pointer' : 'not-allowed', fontSize: 13, transition: 'all 0.2s' }}>
                            Complete
                          </button>
                        ) : (
                          <button type="button" onClick={() => {
                            setCompletedQuestions(p => ({ ...p, [q.id]: false }));
                            setActiveQuestionId(q.id);
                          }} style={{ background: 'none', border: '1px solid var(--silk)', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--slate)' }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ opacity: isCompleted ? 0.6 : 1, pointerEvents: isCompleted ? 'none' : 'auto' }}>
                      {q.questionType === 'PASS_FAIL' && (
                        <div style={{ display: 'flex', gap: 16, maxWidth: 300 }}>
                          <button type="button" onClick={() => { setAnswers(prev => ({ ...prev, [q.id]: 'true' })); if(!isActive) setActiveQuestionId(q.id); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', border: answers[q.id] === 'true' ? '2px solid var(--status-completed)' : '2px solid var(--silk)', background: answers[q.id] === 'true' ? 'var(--status-completed-bg)' : 'white', borderRadius: 12, fontWeight: 600, color: answers[q.id] === 'true' ? 'var(--status-completed)' : 'var(--ash)', cursor: 'pointer', transition: 'all 0.2s' }}>PASS</button>
                          <button type="button" onClick={() => { setAnswers(prev => ({ ...prev, [q.id]: 'false' })); if(!isActive) setActiveQuestionId(q.id); }} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', border: answers[q.id] === 'false' ? '2px solid var(--status-rejected)' : '2px solid var(--silk)', background: answers[q.id] === 'false' ? 'var(--status-rejected-bg)' : 'white', borderRadius: 12, fontWeight: 600, color: answers[q.id] === 'false' ? 'var(--status-rejected)' : 'var(--ash)', cursor: 'pointer', transition: 'all 0.2s' }}>FAIL</button>
                        </div>
                      )}
                      
                      {q.questionType === 'NUMERIC' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <input type="number" step="any" className="input" style={{ width: 150, fontSize: 16 }} placeholder="Enter value..." value={answers[q.id] || ''} onFocus={() => { if(!isActive) setActiveQuestionId(q.id); }} onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />
                          {q.unit && <span style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 16 }}>{q.unit}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
            
            <div className="card" style={{ marginTop: 24, padding: 24, border: '1px solid var(--silk)', boxShadow: 'var(--shadow-card)' }}>
              <label className="form-label" style={{ fontSize: 15 }}>Additional Remarks</label>
              <textarea className="input" rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any observations during setup..." style={{ fontSize: 15 }} />
            </div>
          </div>
          
          <div style={{ padding: 24, borderTop: '1px solid var(--silk)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'white' }}>
            {!isStarted && <div style={{ color: 'var(--ash)', display: 'flex', alignItems: 'center', marginRight: 'auto', fontSize: 14 }}>Click 'Start Setup' to begin</div>}
            {isPaused && <div style={{ color: '#FFBF00', display: 'flex', alignItems: 'center', marginRight: 'auto', fontSize: 14, fontWeight: 600 }}>Setup is paused</div>}
            <button type="button" className="btn" onClick={onClose} disabled={submitMut.isPending} style={{ padding: '12px 24px', fontSize: 15 }}>Cancel</button>
            <button type="submit" className="btn gradient-copper" disabled={!isStarted || submitMut.isPending || config.questions?.some((q:any) => q.questionType !== 'NUMERIC' && !completedQuestions[q.id])} style={{ padding: '12px 24px', fontSize: 15, color: 'white', border: 'none' }}>
              {submitMut.isPending ? 'Submitting...' : 'Complete All & Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
