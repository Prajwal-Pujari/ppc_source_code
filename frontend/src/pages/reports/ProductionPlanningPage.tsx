import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getMyTasks, getCalibrationTasks } from '@/api/analytics.api';
import type { GaugeOperation } from '@/types/domain.types';
import { FileText, Search, Filter, AlertTriangle, CheckCircle, Clock, LayoutGrid, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';

type ViewMode = 'cards' | 'table';

const css = `
  .gradient-copper{background:linear-gradient(135deg,#8B6914,#6F5100)}
  .ambient-shadow{box-shadow:0 4px 20px 0 rgba(139,105,20,.04),0 12px 40px 0 rgba(48,49,47,.08)}
  .progress-bar-bg { background: rgba(139,105,20,0.1); border-radius: 999px; height: 8px; width: 100%; overflow: hidden; }
  .progress-bar-fill { background: #8B6914; height: 100%; transition: width 0.3s ease; }
  .progress-bar-fill.late { background: #DC2626; }
  .progress-bar-fill.risk { background: #D97706; }
  .progress-bar-fill.ontime { background: #059669; }
  
  .status-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; letter-spacing: 0.03em; }
  .status-late { background: rgba(220,38,38,0.1); color: #DC2626; border: 1px solid rgba(220,38,38,0.2); }
  .status-risk { background: rgba(217,119,6,0.1); color: #D97706; border: 1px solid rgba(217,119,6,0.2); }
  .status-ontime { background: rgba(5,150,105,0.1); color: #059669; border: 1px solid rgba(5,150,105,0.2); }
  
  .report-table { width: 100%; border-collapse: collapse; }
  .report-table th { background: #F5F3F0; color: #807665; font-weight: 600; font-size: 12px; text-transform: uppercase; padding: 12px 16px; text-align: left; border-bottom: 1px solid #D1C5B240; }
  .report-table td { padding: 16px; border-bottom: 1px solid #D1C5B233; color: #1B1C1A; font-size: 13px; }
  .report-table tr:hover { background: #FAFAFA; }
`;

interface PoTrackingData {
  poId: string;
  poNumber: string;
  customerName: string;
  expectedDeliveryDate: string | null;
  totalOperations: number;
  completedOperations: number;
  inProgressOperations: number;
  queuedOperations: number;
  progressPercent: number;
  status: 'LATE' | 'AT_RISK' | 'ON_TIME' | 'COMPLETED';
  currentOpNames: string[];
  nextOpNames: string[];
  tasks: GaugeOperation[];
}

export default function ProductionPlanningPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [expandedPOs, setExpandedPOs] = useState<Record<string, boolean>>({});

  useEffect(() => { setPageTitle('Production Planning & Tracking'); }, [setPageTitle]);

  // Fetch both normal and calibration factory-wide operations
  const { data: normalData, isLoading: isLoadingNormal } = useQuery({ queryKey: ['factory-operations'], queryFn: getMyTasks, refetchInterval: 15000 });
  const { data: calibData, isLoading: isLoadingCalib } = useQuery({ queryKey: ['factory-calibration-operations'], queryFn: getCalibrationTasks, refetchInterval: 15000 });
  
  const isLoading = isLoadingNormal || isLoadingCalib;
  
  const tasks = useMemo(() => {
    const normalTasks = normalData?.data || [];
    const calibTasks = calibData?.data || [];
    return [...normalTasks, ...calibTasks];
  }, [normalData, calibData]);

  const uniqueCustomers = Array.from(
    new Set(tasks.map((t: any) => t.gauge?.purchaseOrder?.customer?.name || t.gauge?.purchaseOrder?.customerName).filter(Boolean))
  ).sort() as string[];

  // Filter tasks before grouping
  const filteredTasks = tasks.filter((t: any) => {
    const opName = t.operationName?.toLowerCase() || '';
    const opCode = t.operationMaster?.operationCode?.toLowerCase() || '';
    const opNo = t.sequenceOrder?.toString() || '';
    const poNum = t.gauge?.purchaseOrder?.poNumber?.toLowerCase() || '';
    const gaugeName = t.gauge?.gaugeTypeName?.toLowerCase() || '';
    const custName = (t.gauge?.purchaseOrder?.customer?.name || t.gauge?.purchaseOrder?.customerName || '').toLowerCase();
    
    const term = searchTerm.toLowerCase();
    const tokens = term.split(/\s+/).filter(Boolean);
    
    const matchesSearch = tokens.length === 0 || tokens.every(token => {
      const cleanToken = token.replace(/[\s\-#_]/g, '');
      const numOnly = cleanToken.replace(/^op/i, '');
      const asOp = `op${numOnly}`;

      return opName.replace(/[\s\-#_]/g, '').includes(cleanToken) || 
             opName.replace(/[\s\-#_]/g, '').includes(asOp) ||
             opCode.replace(/[\s\-#_]/g, '').includes(cleanToken) || 
             opCode.replace(/[\s\-#_]/g, '').includes(asOp) ||
             opCode.replace(/[\s\-#_]/g, '').includes(numOnly) ||
             opNo.includes(numOnly) ||
             poNum.includes(cleanToken) ||
             gaugeName.replace(/[\s\-#_]/g, '').includes(cleanToken);
    });
    
    const matchesCustomer = !customerFilter || custName === customerFilter.toLowerCase();
    return matchesSearch && matchesCustomer;
  });

  // Aggregate into PO Tracking Data
  const groupedData = useMemo(() => {
    const groups: Record<string, PoTrackingData> = {};
    
    filteredTasks.forEach((task: any) => {
      const po = task.gauge?.purchaseOrder;
      const poId = po?.id || 'unassigned';
      
      if (!groups[poId]) {
        groups[poId] = {
          poId,
          poNumber: po?.poNumber || 'Unassigned',
          customerName: po?.customer?.name || po?.customerName || 'N/A',
          expectedDeliveryDate: po?.expectedDeliveryDate || null,
          totalOperations: 0,
          completedOperations: 0,
          inProgressOperations: 0,
          queuedOperations: 0,
          progressPercent: 0,
          status: 'ON_TIME',
          currentOpNames: [],
          nextOpNames: [],
          tasks: []
        };
      }
      
      const group = groups[poId];
      group.tasks.push(task);
      group.totalOperations++;
      
      if (task.status === 'COMPLETED') group.completedOperations++;
      else if (task.status === 'IN_PROGRESS') {
        group.inProgressOperations++;
        if (!group.currentOpNames.includes(task.operationName)) group.currentOpNames.push(task.operationName);
      }
      else if (task.status === 'QUEUED' || task.status === 'PENDING') {
        group.queuedOperations++;
        // Naive "next op" logic: just pick the first few queued
        if (group.nextOpNames.length < 2 && !group.nextOpNames.includes(task.operationName)) {
            group.nextOpNames.push(task.operationName);
        }
      }
    });

    return Object.values(groups).map(g => {
      g.progressPercent = g.totalOperations === 0 ? 0 : Math.round((g.completedOperations / g.totalOperations) * 100);
      
      // Algorithm for Latness
      if (g.progressPercent === 100) {
        g.status = 'COMPLETED';
      } else if (g.expectedDeliveryDate) {
        const today = new Date();
        const delivery = new Date(g.expectedDeliveryDate);
        const daysDiff = (delivery.getTime() - today.getTime()) / (1000 * 3600 * 24);
        
        if (daysDiff < 0) {
          g.status = 'LATE'; // Passed delivery date and not 100% complete
        } else if (daysDiff <= 3 && g.progressPercent < 80) {
          g.status = 'AT_RISK'; // Due within 3 days but < 80% complete
        } else if (daysDiff <= 7 && g.progressPercent < 50) {
          g.status = 'AT_RISK'; // Due within 7 days but < 50% complete
        } else {
          g.status = 'ON_TIME';
        }
      } else {
        // Fallback if no delivery date
        g.status = (g.progressPercent < 50 && g.inProgressOperations === 0) ? 'AT_RISK' : 'ON_TIME';
      }
      return g;
    }).sort((a, b) => a.poNumber.localeCompare(b.poNumber));
  }, [filteredTasks]);

  const togglePO = (poId: string) => setExpandedPOs(p => ({ ...p, [poId]: !p[poId] }));

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading reports...</div>;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <style>{css}</style>

      {/* ─── Top Control Panel ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, flex: 1, minWidth: 300 }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} color="#807665" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search PO, Gauge, Operation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', height: 42, paddingLeft: 40, paddingRight: 16, borderRadius: 10, border: '1px solid var(--silk)', fontSize: 14 }} 
            />
          </div>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Filter size={16} color="#807665" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <select 
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              style={{ width: '100%', height: 42, paddingLeft: 40, paddingRight: 16, borderRadius: 10, border: '1px solid var(--silk)', fontSize: 14, appearance: 'none', background: 'white' }}
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        
        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'white', borderRadius: 10, padding: 4, border: '1px solid var(--silk)' }}>
          <button onClick={() => setViewMode('cards')} style={{ padding: '8px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, background: viewMode === 'cards' ? 'rgba(139,105,20,0.1)' : 'transparent', color: viewMode === 'cards' ? '#6F5100' : '#807665', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none' }}>
            <LayoutGrid size={16} /> Cards
          </button>
          <button onClick={() => setViewMode('table')} style={{ padding: '8px 16px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, background: viewMode === 'table' ? 'rgba(139,105,20,0.1)' : 'transparent', color: viewMode === 'table' ? '#6F5100' : '#807665', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none' }}>
            <TableIcon size={16} /> Table
          </button>
        </div>
      </div>

      {/* ─── Customer Summary Stats (Optional but useful) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
         <StatCard title="Total Active POs" value={groupedData.length} />
         <StatCard title="Total Operations" value={groupedData.reduce((acc, g) => acc + g.totalOperations, 0)} />
         <StatCard title="Operations In Progress" value={groupedData.reduce((acc, g) => acc + g.inProgressOperations, 0)} />
         <StatCard title="Late POs" value={groupedData.filter(g => g.status === 'LATE').length} alert />
      </div>

      {/* ─── Main Content Area ─── */}
      {groupedData.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#807665', background: 'white', borderRadius: 12, border: '1px dashed var(--silk)' }}>No POs match your search criteria.</div>
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groupedData.map(group => (
            <div key={group.poId} className="ambient-shadow" style={{ background: 'white', borderRadius: 12, border: '1px solid var(--silk)', overflow: 'hidden' }}>
              
              {/* Card Header (Clickable) */}
              <div onClick={() => togglePO(group.poId)} style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none', background: expandedPOs[group.poId] ? '#FAFAFA' : 'white', borderBottom: expandedPOs[group.poId] ? '1px solid #D1C5B233' : 'none' }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flex: 1 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139,105,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} color="#8B6914" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1B1C1A' }}>{group.poNumber}</h3>
                    <span style={{ fontSize: 13, color: '#807665' }}>{group.customerName}</span>
                  </div>
                  <div style={{ margin: '0 30px', flex: 1, maxWidth: 300 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#807665', textTransform: 'uppercase' }}>Progress</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1B1C1A' }}>{group.progressPercent}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className={`progress-bar-fill ${group.status === 'LATE' ? 'late' : group.status === 'AT_RISK' ? 'risk' : 'ontime'}`} style={{ width: `${group.progressPercent}%` }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <StatusBadge status={group.status} deliveryDate={group.expectedDeliveryDate} />
                  {expandedPOs[group.poId] ? <ChevronUp size={20} color="#807665" /> : <ChevronDown size={20} color="#807665" />}
                </div>
              </div>

              {/* Expanded Area: Detailed Operations */}
              {expandedPOs[group.poId] && (
                <div style={{ padding: '24px', background: '#F5F3F0' }}>
                  <div style={{ display: 'flex', gap: 30, marginBottom: 20 }}>
                    <div style={{ flex: 1, background: 'white', padding: 16, borderRadius: 8, border: '1px solid var(--silk)' }}>
                      <span style={{ display: 'block', fontSize: 11, color: '#807665', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Currently Ongoing</span>
                      {group.currentOpNames.length > 0 ? 
                        group.currentOpNames.map(n => <div key={n} style={{ fontSize: 13, fontWeight: 500, color: '#1B1C1A', marginBottom: 4 }}>• {n}</div>)
                        : <span style={{ fontSize: 13, color: '#A0A0A0' }}>No active operations</span>
                      }
                    </div>
                    <div style={{ flex: 1, background: 'white', padding: 16, borderRadius: 8, border: '1px solid var(--silk)' }}>
                      <span style={{ display: 'block', fontSize: 11, color: '#807665', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Next Up (Queued)</span>
                      {group.nextOpNames.length > 0 ? 
                        group.nextOpNames.map(n => <div key={n} style={{ fontSize: 13, fontWeight: 500, color: '#1B1C1A', marginBottom: 4 }}>• {n}</div>)
                        : <span style={{ fontSize: 13, color: '#A0A0A0' }}>None queued</span>
                      }
                    </div>
                  </div>
                  
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1B1C1A', marginBottom: 12 }}>All Matching Operations ({group.tasks.length})</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="report-table" style={{ background: 'white', borderRadius: 8, overflow: 'hidden' }}>
                      <thead>
                        <tr>
                          <th>Gauge/Job</th>
                          <th>Op Code</th>
                          <th>Operation</th>
                          <th>Status</th>
                          <th>Worker</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.tasks.map((task: any) => (
                          <tr key={task.id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>{task.gauge?.serialNumber || 'N/A'}</div>
                              <div style={{ fontSize: 11, color: '#807665' }}>{task.gauge?.gaugeTypeName}</div>
                            </td>
                            <td className="font-mono">{task.operationMaster?.operationCode || `OP-${task.sequenceOrder}`}</td>
                            <td>{task.operationName}</td>
                            <td><OpStatusBadge status={task.status} /></td>
                            <td>{task.assignedTo?.fullName || 'Unassigned'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--silk)', overflow: 'hidden', overflowX: 'auto' }}>
          <table className="report-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Customer</th>
                <th>Delivery Date</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Active Operations</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map(group => (
                <tr key={group.poId}>
                  <td style={{ fontWeight: 600 }}>{group.poNumber}</td>
                  <td>{group.customerName}</td>
                  <td>{group.expectedDeliveryDate ? new Date(group.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="progress-bar-bg" style={{ width: 100 }}>
                        <div className={`progress-bar-fill ${group.status === 'LATE' ? 'late' : group.status === 'AT_RISK' ? 'risk' : 'ontime'}`} style={{ width: `${group.progressPercent}%` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{group.progressPercent}%</span>
                    </div>
                  </td>
                  <td><StatusBadge status={group.status} /></td>
                  <td>
                    {group.currentOpNames.length > 0 ? (
                       <span style={{ fontSize: 12 }}>{group.currentOpNames.join(', ')}</span>
                    ) : (
                       <span style={{ fontSize: 12, color: '#A0A0A0' }}>None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, alert }: { title: string, value: number, alert?: boolean }) {
  return (
    <div style={{ background: alert ? '#FEF2F2' : 'white', border: `1px solid ${alert ? '#FECACA' : 'var(--silk)'}`, borderRadius: 12, padding: 20 }}>
      <h4 style={{ margin: 0, fontSize: 13, color: alert ? '#DC2626' : '#807665', fontWeight: 600, textTransform: 'uppercase' }}>{title}</h4>
      <p style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 700, color: alert ? '#991B1B' : '#1B1C1A' }}>{value}</p>
    </div>
  );
}

function StatusBadge({ status, deliveryDate }: { status: string, deliveryDate?: string | null }) {
  if (status === 'LATE') return <span className="status-badge status-late"><AlertTriangle size={12}/> LATE</span>;
  if (status === 'AT_RISK') return <span className="status-badge status-risk"><Clock size={12}/> AT RISK</span>;
  if (status === 'COMPLETED') return <span className="status-badge status-ontime"><CheckCircle size={12}/> COMPLETED</span>;
  return <span className="status-badge status-ontime"><CheckCircle size={12}/> ON TIME</span>;
}

function OpStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'IN_PROGRESS': '#B8860B', 'COMPLETED': '#059669', 'QUEUED': '#6C757D', 'PENDING': '#6C757D'
  };
  return <span style={{ color: colors[status] || '#1B1C1A', fontSize: 12, fontWeight: 600 }}>{status.replace('_', ' ')}</span>;
}
