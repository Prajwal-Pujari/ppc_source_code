import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getMyTasks } from '@/api/analytics.api';
import type { GaugeOperation } from '@/types/domain.types';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, FileText, ChevronDown, ArrowLeft } from 'lucide-react';
import OperationFlowLoader from '@/components/ui/loader/OperationFlowLoader';
import { useState } from 'react';

const css = `
  .completed-panel{background:white;border:1px solid var(--silk);border-radius:10px;overflow:hidden;transition:box-shadow .2s}
  .completed-panel:hover{box-shadow:0 4px 16px rgba(48,49,47,.04)}
`;

export default function CompletedTasksPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const navigate = useNavigate();
  const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});

  useEffect(() => { setPageTitle('Completed Work'); }, [setPageTitle]);

  const { data, isLoading } = useQuery({
    queryKey: ['worker-tasks'],
    queryFn: getMyTasks,
    refetchInterval: 30000,
  });

  const tasks = data?.data || [];
  const completedTasks = tasks.filter((t: GaugeOperation) => t.status === 'COMPLETED');

  const groupedTasks = useMemo(() => {
    const groups: Record<string, { po: any; tasks: GaugeOperation[] }> = {};
    completedTasks.forEach((task: any) => {
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
  }, [completedTasks]);

  const togglePO = (poId: string) => setExpandedPOs(p => ({ ...p, [poId]: p[poId] === undefined ? false : !p[poId] }));

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
          <div className="skeleton" style={{ width: 140, height: 40, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 140, height: 40, borderRadius: 999 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {[1, 2].map(i => (
            <div key={i} style={{ background: '#F5F3F0', borderRadius: 12, border: '1px solid #D1C5B240', overflow: 'hidden' }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #D1C5B240' }}>
                <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 6 }} />
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: 10 }} />
                <div className="skeleton" style={{ width: '100%', height: 160, borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => navigate('/tasks/my')}
          style={{ background: 'none', border: '1px solid var(--silk)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#807665' }}>
          <ArrowLeft size={15} /> Back to Tasks
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,139,34,0.06)', padding: '8px 18px', borderRadius: 999, border: '1px solid rgba(34,139,34,0.15)' }}>
          <CheckCircle size={16} color="#228B22" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#228B22' }}>{completedTasks.length} Completed</span>
        </div>
      </div>

      {/* Empty state */}
      {groupedTasks.length === 0 ? (
        <div style={{ padding: 80, textAlign: 'center', background: 'var(--warm-white)', border: '1px dashed var(--silk)', borderRadius: 10 }}>
          <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#228B22' }} />
          <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--charcoal)' }}>No completed tasks yet</p>
          <p style={{ fontSize: 14, marginTop: 8, color: 'var(--ash)' }}>Your finished work will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedTasks.map(({ po, tasks: poTasks }) => {
            const isExpanded = expandedPOs[po.id] !== false;
            return (
              <div key={po.id} style={{ background: '#F5F3F0', borderRadius: 12, border: '1px solid #D1C5B240', overflow: 'hidden' }}>
                {/* PO Header */}
                <div onClick={() => togglePO(po.id)} style={{
                  padding: '18px 24px', background: 'linear-gradient(135deg, rgba(34,139,34,0.04), rgba(34,139,34,0.01))',
                  borderBottom: isExpanded ? '1px solid #D1C5B240' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, cursor: 'pointer', userSelect: 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,139,34,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={18} color="#228B22" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: '#1B1C1A' }}>{po.poNumber}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#228B22', background: 'rgba(34,139,34,0.08)', padding: '2px 10px', borderRadius: 999 }}>
                          {poTasks.length} Done
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: '#807665', marginTop: 2, display: 'block' }}>{po.customer?.name || po.customerName || 'Customer'}</span>
                    </div>
                  </div>
                  <ChevronDown size={20} color="#807665" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {/* Completed Jobs */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {poTasks.map((task: GaugeOperation) => (
                      <div key={task.id} className="completed-panel" style={{ borderLeft: '3px solid #228B22' }}>
                        <div style={{ display: 'flex' }}>
                          {/* Left: Summary */}
                          <div style={{ width: '35%', padding: '16px 20px', borderRight: '1px solid var(--silk)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#1B1C1A' }}>Job Summary</span>
                              <span style={{ background: 'rgba(34,139,34,0.10)', color: '#228B22', padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>✓ COMPLETED</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 10, color: '#807665', textTransform: 'uppercase', letterSpacing: '.08em' }}>Serial Number</span>
                              <span className="font-mono" style={{ fontSize: 13, color: '#1B1C1A', fontWeight: 500 }}>{task.gauge?.serialNumber || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 10, color: '#807665', textTransform: 'uppercase', letterSpacing: '.08em' }}>Part / Product Name</span>
                              <span style={{ fontSize: 13, color: '#1B1C1A' }}>{task.gauge?.gaugeTypeName || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 10, color: '#807665', textTransform: 'uppercase', letterSpacing: '.08em' }}>Size</span>
                                <span className="font-mono" style={{ fontSize: 12 }}>{task.gauge?.nominalSize ?? 'N/A'} mm</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: 10, color: '#807665', textTransform: 'uppercase', letterSpacing: '.08em' }}>Material</span>
                                <span style={{ fontSize: 12 }}>{task.gauge?.materialGrade || 'Standard'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Operation Detail */}
                          <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: '#807665', background: '#D1C5B233', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>OP #{task.sequenceOrder}</span>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1B1C1A' }}>{task.operationName}</span>
                            </div>

                            {/* Timestamps */}
                            <div style={{ display: 'flex', gap: 24, background: '#F5F3F0', borderRadius: 8, padding: '10px 16px' }}>
                              {task.actualStart && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#807665' }}>
                                  <Clock size={13} />
                                  <span>Started: </span>
                                  <span className="font-mono" style={{ color: '#1B1C1A' }}>{new Date(task.actualStart).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                              {task.actualEnd && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#228B22' }}>
                                  <CheckCircle size={13} />
                                  <span>Completed: </span>
                                  <span className="font-mono" style={{ color: '#1B1C1A' }}>{new Date(task.actualEnd).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>

                            {/* Remarks & Measurement */}
                            {task.qualityParams?.measuredValue && (
                              <div style={{ background: 'rgba(139,105,20,0.04)', border: '1px solid rgba(139,105,20,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                <span style={{ fontWeight: 600, color: '#6F5100', marginRight: 8 }}>Measurement:</span>
                                <span className="font-mono">{task.qualityParams.measuredValue}</span>
                              </div>
                            )}
                            {task.remarks && (
                              <div style={{ background: '#F5F3F0', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                <span style={{ fontWeight: 600, color: '#1B1C1A', marginRight: 8 }}>Remarks:</span>
                                <span style={{ fontStyle: 'italic', color: '#4E4637' }}>"{task.remarks}"</span>
                              </div>
                            )}

                            <button onClick={() => navigate(`/job-cards/${task.gauge?.id}`)}
                              style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid var(--silk)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: '#6F5100', fontWeight: 500 }}>
                              View Full Job Card →
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
