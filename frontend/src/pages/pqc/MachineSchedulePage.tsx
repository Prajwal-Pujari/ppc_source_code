import React, { useState, useEffect } from 'react';
import { machinesApi } from '@/api/machines.api';
import { 
  Factory, Activity, CheckCircle, Clock, AlertTriangle, 
  Settings, Zap, Monitor, Cpu, ShieldCheck,
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, List as ListIcon, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MachineSchedulePage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  
  // Calendar State (show current month on front)
  const [viewMode, setViewMode] = useState<'LIVE' | 'CALENDAR'>('CALENDAR');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [selectedPOModal, setSelectedPOModal] = useState<{ poNumber: string, events: any[] } | null>(null);

  const toggleDayExpansion = (dayIndex: number) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex);
      } else {
        newSet.add(dayIndex);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchMachines();
    const interval = setInterval(() => setNow(new Date()), 30000); // update time every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchMachines = async () => {
    try {
      const [{ data: machinesData }, { data: eventsData }] = await Promise.all([
        machinesApi.getAll(),
        machinesApi.getEvents()
      ]);
      setMachines(Array.isArray(machinesData) ? machinesData : (machinesData as any)?.data || []);
      setEvents(Array.isArray(eventsData) ? eventsData : (eventsData as any)?.data || []);
    } catch (err) {
      toast.error('Failed to load machine schedule');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const getEventsForDay = (day: Date) => {
    if (!day) return [];
    return events.filter((e: any) => {
      if (!e.startDate || !e.endDate) return false;
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return day >= start && day <= end;
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'AVAILABLE': return 'var(--status-completed)'; // Green
      case 'PLANNED': return '#3B82F6'; // Blue
      case 'IN_USE': return 'var(--status-rejected)'; // Red
      case 'MAINTENANCE': return 'var(--status-pending)'; // Yellow
      default: return 'var(--ash)';
    }
  };

  const getStatusIcon = (status: string, size = 18) => {
    switch(status) {
      case 'AVAILABLE': return <CheckCircle size={size} />;
      case 'PLANNED': return <Clock size={size} />;
      case 'IN_USE': return <Zap size={size} />;
      case 'MAINTENANCE': return <AlertTriangle size={size} />;
      default: return <Monitor size={size} />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'UNKNOWN';
    return status.replace(/_/g, ' ');
  };

  // Check if an IN_USE operation is nearing completion (within 5 minutes)
  const isFading = (m: any) => {
    if (m.currentStatus !== 'IN_USE' || !m.activeOperationEndsAt) return false;
    const endsAt = new Date(m.activeOperationEndsAt);
    const diffMins = (endsAt.getTime() - now.getTime()) / 60000;
    return diffMins > -10 && diffMins <= 5; // Start fading 5 mins before, keep fading up to 10 mins after if not completed
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 24 }} className="fade-in">
      
      {/* Header */}
      <div style={{
        padding: '28px 32px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(250,248,245,0.98), rgba(245,240,235,0.98))',
        border: '1px solid var(--silk)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              background: 'rgba(184, 115, 51, 0.15)', color: 'var(--copper-bronze)',
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <ShieldCheck size={14} /> Shop Floor Command View
            </span>
            <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>
              • Real-Time Machine Synchronization
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            Live Machine Schedule
          </h1>
          <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0, maxWidth: 740, lineHeight: 1.5 }}>
            Real-time shop floor machine availability and active production monitoring.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', background: 'var(--warm-white)', padding: 4, borderRadius: 8, border: '1px solid var(--silk)' }}>
            <button 
              onClick={() => setViewMode('LIVE')}
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 6, border: 'none', background: viewMode === 'LIVE' ? 'var(--charcoal)' : 'transparent', color: viewMode === 'LIVE' ? 'white' : 'var(--slate)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <ListIcon size={16} /> Live
            </button>
            <button 
              onClick={() => setViewMode('CALENDAR')}
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 6, border: 'none', background: viewMode === 'CALENDAR' ? 'var(--charcoal)' : 'transparent', color: viewMode === 'CALENDAR' ? 'white' : 'var(--slate)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <CalendarIcon size={16} /> Calendar
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--status-completed)' }}></span> Available
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3B82F6' }}></span> Planned
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--slate)' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'var(--status-rejected)' }}></span> In Use
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card skeleton" style={{ height: 180 }}></div>
          ))}
        </div>
      ) : viewMode === 'CALENDAR' ? (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={prevMonth} className="btn btn-outline" style={{ padding: 8 }}><ChevronLeft size={18}/></button>
              <button onClick={nextMonth} className="btn btn-outline" style={{ padding: 8 }}><ChevronRight size={18}/></button>
            </div>
          </div>
          
          <div style={{ width: '100%' }}>
            <div className="calendar-grid">
              {weekDays.map(wd => (
                <div key={wd} className="calendar-day-header" style={{ padding: '12px 8px', background: 'var(--warm-white)', textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--slate)' }}>
                  {wd}
                </div>
              ))}
              {days.map((day, i) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday = day && day.toDateString() === new Date().toDateString();
                const isExpanded = expandedDays.has(i);
                
                const poGroups = dayEvents.reduce((acc: any, event: any) => {
                  if (!acc[event.poNumber]) acc[event.poNumber] = [];
                  acc[event.poNumber].push(event);
                  return acc;
                }, {});
                
                const poEntries = Object.entries(poGroups);
                const visiblePOs = isExpanded ? poEntries : poEntries.slice(0, 3);
                const hiddenCount = poEntries.length - 3;
                
                return (
                  <div key={i} className={`calendar-day-cell ${!day ? 'calendar-day-empty' : ''}`} style={{ 
                    minHeight: 120, padding: 8, background: day ? '#fff' : 'var(--warm-white)',
                    borderTop: day && isToday ? '2px solid var(--copper-bronze)' : 'none',
                    display: 'flex', flexDirection: 'column', minWidth: 0
                  }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--copper-bronze)' : 'var(--charcoal)', marginBottom: 8, textAlign: 'right', flexShrink: 0 }}>
                          {day.getDate()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
                          {visiblePOs.map(([poNumber, poEvents]: [string, any]) => {
                            const key = `${i}-${poNumber}`;
                            const isPoExpanded = expandedDays.has(key as any) || expandedDays.has(i);

                            return (
                              <div key={poNumber} style={{ marginBottom: 2 }}>
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.innerWidth <= 900) {
                                      setSelectedPOModal({ poNumber, events: poEvents });
                                    } else {
                                      setExpandedDays(prev => {
                                        const next = new Set(prev);
                                        if (next.has(key as any)) next.delete(key as any);
                                        else next.add(key as any);
                                        return next;
                                      });
                                    }
                                  }}
                                  style={{ 
                                    padding: '4px 6px', 
                                    background: 'var(--warm-white)', 
                                    borderRadius: 4, 
                                    borderLeft: `2px solid var(--charcoal)`, 
                                    fontSize: 11, 
                                    color: 'var(--charcoal)', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 4,
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    minWidth: 0
                                  }}
                                >
                                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{poNumber}</strong>
                                  {poEvents[0]?.poStatus && (
                                    <span style={{ flexShrink: 0, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: poEvents[0].poStatus === 'DRAFT' ? '#F59E0B20' : '#10B98120', color: poEvents[0].poStatus === 'DRAFT' ? '#D97706' : '#059669', fontWeight: 700 }}>
                                      {poEvents[0].poStatus}
                                    </span>
                                  )}
                                  <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {poEvents.length} mch {isPoExpanded ? '▼' : '▶'}
                                  </span>
                                </div>
                                
                                {isPoExpanded && (
                                  <div style={{ paddingLeft: 6, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {poEvents.map((e: any, idx: number) => {
                                      const m = machines.find((mach: any) => mach.id === e.machineId || mach.machineName === e.machineName);
                                      const isMachineInUse = m?.currentStatus === 'IN_USE';
                                      
                                      let bgColor = '#3B82F615';
                                      let borderColor = '#3B82F6';
                                      let textColor = 'var(--charcoal)';
                                      
                                      if (e.completed) {
                                        bgColor = 'rgba(16, 185, 129, 0.15)';
                                        borderColor = '#10B981';
                                        textColor = '#047857';
                                      } else if (isMachineInUse) {
                                        bgColor = '#EF444415';
                                        borderColor = '#EF4444';
                                      }
                                      
                                      return (
                                        <div key={idx} style={{ padding: '3px 6px', background: bgColor, borderRadius: 4, borderLeft: `2px solid ${borderColor}`, fontSize: 10, color: textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }} title={`${e.machineName} (${e.operationName})`}>
                                          <strong>{e.machineName}</strong> {e.completed && <span style={{fontSize: 9, fontWeight: 600, color: '#047857'}}>(Completed)</span>} <span style={{color: e.completed ? '#10B981' : 'var(--slate)'}}>{e.partName}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {hiddenCount > 0 && !isExpanded && (
                            <button 
                              onClick={() => toggleDayExpansion(i)}
                              style={{ background: 'none', border: 'none', color: 'var(--copper-bronze)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '4px 2px', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              + {hiddenCount} more POs
                            </button>
                          )}
                          
                          {isExpanded && poEntries.length > 3 && (
                            <button 
                              onClick={() => toggleDayExpansion(i)}
                              style={{ background: 'none', border: 'none', color: 'var(--ash)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '4px 2px', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : machines.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <Monitor size={48} style={{ color: 'var(--silk)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--charcoal)' }}>No Machines Found</h3>
          <p style={{ color: 'var(--slate)', marginTop: 8 }}>Please add machines to your factory to monitor them.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {machines.map((m: any) => {
            const color = getStatusColor(m.currentStatus);
            const fading = isFading(m);
            const statusLabel = getStatusLabel(m.currentStatus);

            return (
              <div 
                key={m.id} 
                className="card"
                style={{ 
                  padding: 0, 
                  overflow: 'hidden', 
                  borderTop: `4px solid ${color}`,
                  animation: fading ? 'pulse-faint 2s infinite ease-in-out' : 'none',
                  opacity: fading ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(250,250,250,0.5)' }}>
                  <div>
                    <h3 className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                      {m.machineName}
                    </h3>
                    <p style={{ fontSize: 13, color: 'var(--slate)', fontWeight: 500, letterSpacing: '0.05em' }}>
                      CODE: {m.machineCode}
                    </p>
                  </div>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', gap: 6, 
                    padding: '6px 12px', borderRadius: 20, 
                    background: `${color}15`, color: color,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.05em'
                  }}>
                    {getStatusIcon(m.currentStatus, 14)}
                    {statusLabel}
                  </div>
                </div>

                <div style={{ padding: '24px' }}>
                  {m.currentStatus === 'IN_USE' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, color: 'var(--status-rejected)' }}>
                          <Activity size={20} />
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Active Operation
                          </p>
                          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginTop: 2 }}>
                            {m.activeOperationName || 'Processing Batch...'}
                          </p>
                        </div>
                      </div>

                      {m.activeGaugeSerial && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--silk)', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, color: 'var(--slate)' }}>Job Card / Batch</span>
                          <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{m.activeGaugeSerial}</span>
                        </div>
                      )}

                      {m.activeOperationEndsAt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--silk)' }}>
                          <span style={{ fontSize: 13, color: 'var(--slate)' }}>Est. Completion</span>
                          <span className="font-mono" style={{ 
                            fontSize: 13, fontWeight: 700, 
                            color: fading ? 'var(--copper-bronze)' : 'var(--charcoal)'
                          }}>
                            {new Date(m.activeOperationEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {fading && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: 'var(--copper-bronze)' }}>(Ending soon)</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : m.currentStatus === 'PLANNED' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Clock size={32} style={{ color: '#3B82F6', opacity: 0.5, margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate)' }}>Reserved for upcoming Draft/PO</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <Settings size={32} style={{ color: 'var(--status-completed)', opacity: 0.5, margin: '0 auto 12px' }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate)' }}>Machine is idle and available</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPOModal && (
        <div className="sidebar-overlay" style={{ display: 'block', zIndex: 100 }} onClick={() => setSelectedPOModal(null)}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, 
              background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
              padding: '24px 20px', zIndex: 101, boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
              maxHeight: '85vh', display: 'flex', flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--charcoal)' }}>{selectedPOModal.poNumber}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--slate)', marginTop: 4 }}>
                  {selectedPOModal.events.length} machine{selectedPOModal.events.length !== 1 ? 's' : ''} planned
                </p>
              </div>
              <button 
                onClick={() => setSelectedPOModal(null)}
                style={{ background: 'var(--warm-white)', border: 'none', borderRadius: '50%', padding: 8, cursor: 'pointer', display: 'flex' }}
              >
                <X size={20} color="var(--charcoal)" />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
              {selectedPOModal.events.map((e: any, idx: number) => {
                const m = machines.find((mach: any) => mach.id === e.machineId || mach.machineName === e.machineName);
                const isMachineInUse = m?.currentStatus === 'IN_USE';
                
                let bgColor = '#3B82F615';
                let borderColor = '#3B82F6';
                let textColor = 'var(--charcoal)';
                
                if (e.completed) {
                  bgColor = 'rgba(16, 185, 129, 0.15)';
                  borderColor = '#10B981';
                  textColor = '#047857';
                } else if (isMachineInUse) {
                  bgColor = '#EF444415';
                  borderColor = '#EF4444';
                }
                
                return (
                  <div key={idx} style={{ 
                    padding: '12px 16px', background: bgColor, borderRadius: 8, 
                    borderLeft: `4px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: 4 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: 14, color: textColor }}>{e.machineName}</strong>
                      {e.completed && <span style={{fontSize: 11, fontWeight: 600, color: '#047857', background: '#fff', padding: '2px 6px', borderRadius: 12}}>Completed</span>}
                    </div>
                    <div style={{ fontSize: 13, color: e.completed ? '#10B981' : 'var(--slate)' }}>
                      <strong>Part:</strong> {e.partName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ash)' }}>
                      <strong>Op:</strong> {e.operationName}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-faint {
          0% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); }
          50% { opacity: 0.6; transform: scale(0.98); filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.4)); }
          100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 0 rgba(239, 68, 68, 0)); }
        }
      `}</style>
    </div>
  );
}
