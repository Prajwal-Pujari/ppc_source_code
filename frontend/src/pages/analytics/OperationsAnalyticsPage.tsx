import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import api from '@/lib/axios';
import { 
  BarChart3, Search, Filter, Layers, CheckCircle, Clock, Play, 
  AlertTriangle, ArrowUpRight, ChevronDown, ChevronRight, User, Briefcase, 
  FileText, ExternalLink, RefreshCw, Sparkles, Building2, Calendar, QrCode, Printer
} from 'lucide-react';

export default function OperationsAnalyticsPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const [activeTab, setActiveTab] = useState<'summary' | 'table'>('summary');
  
  // Multi-search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [workerFilter, setWorkerFilter] = useState('ALL');
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPageTitle('Operations Analytics & Tracking');
  }, [setPageTitle]);

  // Fetch all operations (including completed and all relations)
  const { data: opsRes, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['ops-analytics'],
    queryFn: async () => {
      const res = await api.get('/gauge-operations', { params: { statuses: 'ALL' } });
      return res.data;
    },
    refetchInterval: 30000, // Live auto refresh every 30s
  });

  const rawOps = opsRes?.data || [];

  // Extract unique customers & workers for filter dropdowns
  const { uniqueCustomers, uniqueWorkers } = useMemo(() => {
    const custSet = new Set<string>();
    const workSet = new Map<string, string>();

    rawOps.forEach((op: any) => {
      const custName = op.gauge?.purchaseOrder?.customer?.name || 
                       op.gauge?.purchaseOrder?.customerName || 
                       op.gauge?.customerName || 'Direct / Walk-in';
      custSet.add(custName);

      if (op.assignedTo) {
        workSet.set(op.assignedTo.id, op.assignedTo.fullName);
      }
    });

    return {
      uniqueCustomers: Array.from(custSet).sort(),
      uniqueWorkers: Array.from(workSet.entries()).sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [rawOps]);

  // Apply multi search & multi filters
  const filteredOps = useMemo(() => {
    return rawOps.filter((op: any) => {
      const g = op.gauge || {};
      const po = g.purchaseOrder || {};
      const custName = po.customer?.name || po.customerName || g.customerName || 'Direct / Walk-in';
      const workerName = op.assignedTo?.fullName || 'Unassigned';

      // 1. Status Filter
      if (statusFilter !== 'ALL' && op.status !== statusFilter) {
        if (statusFilter === 'PENDING_QUEUED' && (op.status !== 'PENDING' && op.status !== 'QUEUED')) return false;
        if (statusFilter !== 'PENDING_QUEUED') return false;
      }

      // 2. Customer Filter
      if (customerFilter !== 'ALL' && custName !== customerFilter) return false;

      // 3. Worker Filter
      if (workerFilter !== 'ALL') {
        if (workerFilter === 'UNASSIGNED' && op.assignedTo) return false;
        if (workerFilter !== 'UNASSIGNED' && op.assignedTo?.id !== workerFilter) return false;
      }

      // 4. Multi-text Search (matches Customer, Sr No, WO No, Op Name, Worker Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCust = custName.toLowerCase().includes(q);
        const matchSr = (g.serialNumber || '').toLowerCase().includes(q);
        const matchWo = (po.poNumber || '').toLowerCase().includes(q);
        const matchOp = (op.operationName || '').toLowerCase().includes(q);
        const matchWork = workerName.toLowerCase().includes(q);

        if (!matchCust && !matchSr && !matchWo && !matchOp && !matchWork) return false;
      }

      return true;
    });
  }, [rawOps, statusFilter, customerFilter, workerFilter, searchQuery]);

  // Compute overall KPI stats from filtered data
  const kpis = useMemo(() => {
    let total = filteredOps.length;
    let inProgress = 0;
    let pending = 0;
    let completed = 0;
    let rework = 0;
    const activeJobCards = new Set<string>();

    filteredOps.forEach((op: any) => {
      if (op.gauge?.id) activeJobCards.add(op.gauge.id);
      if (op.status === 'IN_PROGRESS') inProgress++;
      else if (op.status === 'PENDING' || op.status === 'QUEUED') pending++;
      else if (op.status === 'COMPLETED' || op.status === 'SKIPPED') completed++;
      else if (op.status === 'REWORK') rework++;
    });

    return {
      totalOps: total,
      jobCardsCount: activeJobCards.size,
      inProgress,
      pending,
      completed,
      rework,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [filteredOps]);

  // Compute Multi-layer Customer Grouped Analytics
  const customerSummary = useMemo(() => {
    const map = new Map<string, {
      customerName: string;
      totalOps: number;
      completedOps: number;
      inProgressOps: number;
      pendingOps: number;
      reworkOps: number;
      jobCards: Map<string, {
        id: string;
        serialNumber: string;
        gaugeTypeName: string;
        woNumber: string;
        opsTotal: number;
        opsCompleted: number;
        status: string;
      }>;
    }>();

    filteredOps.forEach((op: any) => {
      const g = op.gauge || {};
      const po = g.purchaseOrder || {};
      const custName = po.customer?.name || po.customerName || g.customerName || 'Direct / Walk-in';

      if (!map.has(custName)) {
        map.set(custName, {
          customerName: custName,
          totalOps: 0,
          completedOps: 0,
          inProgressOps: 0,
          pendingOps: 0,
          reworkOps: 0,
          jobCards: new Map(),
        });
      }

      const c = map.get(custName)!;
      c.totalOps++;
      if (op.status === 'COMPLETED' || op.status === 'SKIPPED') c.completedOps++;
      else if (op.status === 'IN_PROGRESS') c.inProgressOps++;
      else if (op.status === 'PENDING' || op.status === 'QUEUED') c.pendingOps++;
      else if (op.status === 'REWORK') c.reworkOps++;

      if (g.id) {
        if (!c.jobCards.has(g.id)) {
          c.jobCards.set(g.id, {
            id: g.id,
            serialNumber: g.serialNumber || '—',
            gaugeTypeName: g.gaugeTypeName || '—',
            woNumber: po.poNumber || '—',
            opsTotal: 0,
            opsCompleted: 0,
            status: g.status || (op.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS'),
          });
        }
        const jc = c.jobCards.get(g.id)!;
        jc.opsTotal++;
        if (op.status === 'COMPLETED' || op.status === 'SKIPPED') jc.opsCompleted++;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Show incomplete/active customers first, then by volume
      const aRem = a.totalOps - a.completedOps;
      const bRem = b.totalOps - b.completedOps;
      if (aRem > 0 && bRem === 0) return -1;
      if (bRem > 0 && aRem === 0) return 1;
      return b.totalOps - a.totalOps;
    });
  }, [filteredOps]);

  const toggleCustomer = (custName: string) => {
    setExpandedCustomers(prev => ({ ...prev, [custName]: !prev[custName] }));
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
      case 'SKIPPED':
        return 'badge-completed';
      case 'IN_PROGRESS':
        return 'badge-in-progress';
      case 'QUEUED':
      case 'PENDING':
        return 'badge-pending';
      default:
        return 'badge-pending';
    }
  };

  const fmtTime = (d: string | undefined) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

  return (
    <div style={{ paddingBottom: 60 }}>
      
      {/* ── TOP PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, background: 'var(--linen)', color: 'var(--copper-bronze)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 8, border: '1px solid var(--silk)' }}>
            <Sparkles size={12} /> SUPERVISORY ANALYTICS & TRACKING
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.02em' }}>
            Operations Tracking & Customer Progress
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--slate)' }}>
            Aggregated real-time oversight of ongoing job cards, workshop bottlenecks, and completed customer consignments.
          </p>
        </div>

        <button 
          onClick={() => refetch()} 
          disabled={isRefetching}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
          <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} />
          {isRefetching ? 'Syncing...' : 'Refresh Live Telemetry'}
        </button>
      </div>

      {/* ── SECTION 1: IN-DEPTH KPI METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--copper-bronze)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>Total Job Cards</span>
            <Briefcase size={16} color="var(--copper-bronze)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)' }}>{kpis.jobCardsCount}</div>
          <span style={{ fontSize: 11, color: 'var(--ash)' }}>Across {customerSummary.length} Customers</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #C68B2F' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#C68B2F', textTransform: 'uppercase' }}>In Production</span>
            <Play size={16} color="#C68B2F" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)' }}>{kpis.inProgress}</div>
          <span style={{ fontSize: 11, color: '#C68B2F', fontWeight: 600 }}>Active Workshop Ops</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid var(--slate)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase' }}>Queued Steps</span>
            <Clock size={16} color="var(--slate)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)' }}>{kpis.pending}</div>
          <span style={{ fontSize: 11, color: 'var(--ash)' }}>Pending Allocation</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #3A6B4A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3A6B4A', textTransform: 'uppercase' }}>Completed Ops</span>
            <CheckCircle size={16} color="#3A6B4A" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)' }}>{kpis.completed}</div>
          <span style={{ fontSize: 11, color: '#3A6B4A', fontWeight: 600 }}>{kpis.completionRate}% Overall Velocity</span>
        </div>

        <div className="card" style={{ padding: '18px 20px', borderLeft: '4px solid #8B3A3A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8B3A3A', textTransform: 'uppercase' }}>Rework / Issues</span>
            <AlertTriangle size={16} color="#8B3A3A" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: kpis.rework > 0 ? '#8B3A3A' : 'var(--charcoal)' }}>{kpis.rework}</div>
          <span style={{ fontSize: 11, color: '#8B3A3A' }}>Requires Intervention</span>
        </div>

      </div>

      {/* ── SECTION 2: MULTI SEARCH & MULTI FILTER BAR ── */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 24, background: 'var(--linen)', border: '1px solid var(--silk)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Filter size={16} color="var(--copper-bronze)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Multi-Aspect Filter Bar</span>
          { (searchQuery || statusFilter !== 'ALL' || customerFilter !== 'ALL' || workerFilter !== 'ALL') && (
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setCustomerFilter('ALL'); setWorkerFilter('ALL'); }}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#8B3A3A', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
              Clear Filters
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>Search Keyword</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, color: 'var(--ash)' }} />
              <input 
                type="text" 
                placeholder="Customer, Sr #, WO #, Op..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, background: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>Customer Name</label>
            <select 
              value={customerFilter} 
              onChange={e => setCustomerFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, background: 'white', outline: 'none' }}>
              <option value="ALL">All Customers ({uniqueCustomers.length})</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>Operation Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, background: 'white', outline: 'none' }}>
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_QUEUED">Pending & Queued</option>
              <option value="COMPLETED">Completed</option>
              <option value="REWORK">Rework Required</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', marginBottom: 4 }}>Assigned Operator</label>
            <select 
              value={workerFilter} 
              onChange={e => setWorkerFilter(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, background: 'white', outline: 'none' }}>
              <option value="ALL">All Operators</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {uniqueWorkers.map(([wid, wname]) => <option key={wid} value={wid}>{wname}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* ── SECTION 3: TAB SWITCHER ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button 
          onClick={() => setActiveTab('summary')}
          className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Building2 size={16} /> Layer 1: Customer Progress Overview ({customerSummary.length})
        </button>

        <button 
          onClick={() => setActiveTab('table')}
          className={`btn ${activeTab === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Layers size={16} /> Layer 2: All Operations Queue ({filteredOps.length})
        </button>
      </div>

      {/* ── TAB CONTENT 1: CUSTOMER GROUPED SUMMARY (ACCORDION) ── */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--ash)' }}>Loading production analytics...</div>
          ) : customerSummary.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--ash)' }}>
              No operations match your current search and filter criteria.
            </div>
          ) : (
            customerSummary.map((cust) => {
              const isExpanded = expandedCustomers[cust.customerName] !== false; // Expanded by default!
              const remaining = cust.totalOps - cust.completedOps;
              const isAllCompleted = remaining === 0 && cust.totalOps > 0;
              const progressPct = cust.totalOps > 0 ? Math.round((cust.completedOps / cust.totalOps) * 100) : 0;
              const jobCardsList = Array.from(cust.jobCards.values());

              return (
                <div key={cust.customerName} className="card" style={{ overflow: 'hidden', border: isAllCompleted ? '1px solid #3A6B4A' : '1px solid var(--silk)' }}>
                  
                  {/* Customer Accordion Header */}
                  <div 
                    onClick={() => toggleCustomer(cust.customerName)}
                    style={{ 
                      padding: '16px 20px', background: isAllCompleted ? '#EBF4EE' : (isExpanded ? 'var(--linen)' : 'white'), cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                      borderBottom: isExpanded ? '1px solid var(--silk)' : 'none', transition: 'background 0.2s'
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isExpanded ? <ChevronDown size={18} color="var(--copper-bronze)" /> : <ChevronRight size={18} color="var(--ash)" />}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--charcoal)' }}>{cust.customerName}</h3>
                          {isAllCompleted ? (
                            <span className="badge badge-completed" style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={12} /> Consignment Ready
                            </span>
                          ) : (
                            <span className="badge badge-in-progress" style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Play size={12} /> In Production
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2, display: 'block' }}>
                          {jobCardsList.length} Job Card{jobCardsList.length !== 1 ? 's' : ''} • {cust.completedOps} / {cust.totalOps} Operations Completed
                        </span>
                      </div>
                    </div>

                    {/* Customer Live Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', display: 'block' }}>Remaining</span>
                        <span style={{ fontSize: 15, fontWeight: 800, color: remaining > 0 ? '#C68B2F' : '#3A6B4A' }}>{remaining} Ops</span>
                      </div>

                      {cust.inProgressOps > 0 && (
                        <div style={{ padding: '4px 8px', borderRadius: 6, background: '#FBF4E8', color: '#C68B2F', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Play size={12} /> {cust.inProgressOps} In Progress
                        </div>
                      )}

                      {cust.reworkOps > 0 && (
                        <div style={{ padding: '4px 8px', borderRadius: 6, background: '#FCEAEA', color: '#8B3A3A', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> {cust.reworkOps} Rework
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div style={{ width: 130 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          <span style={{ color: 'var(--slate)' }}>Progress</span>
                          <span style={{ color: 'var(--charcoal)' }}>{progressPct}%</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 3.5, background: 'white', border: '1px solid var(--silk)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${progressPct}%`, background: isAllCompleted ? '#3A6B4A' : 'var(--copper-bronze)', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Customer Job Cards Breakdown */}
                  {isExpanded && (
                    <div style={{ padding: '18px 20px', background: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Job Card Inventory & Calibration Reports for {cust.customerName}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
                        {jobCardsList.map(jc => {
                          const jcPct = jc.opsTotal > 0 ? Math.round((jc.opsCompleted / jc.opsTotal) * 100) : 0;
                          const isJcComplete = jc.opsCompleted === jc.opsTotal && jc.opsTotal > 0;

                          return (
                            <div key={jc.id} style={{ border: isJcComplete ? '1px solid #3A6B4A' : '1px solid var(--silk)', borderRadius: 8, padding: '14px 16px', background: isJcComplete ? '#FAFCFA' : 'var(--linen)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                  <Link to={`/job-cards/${jc.id}`} className="font-mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--copper-bronze)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {jc.serialNumber} <ExternalLink size={12} />
                                  </Link>
                                  <span className={`badge ${isJcComplete ? 'badge-completed' : 'badge-in-progress'}`} style={{ fontSize: 9 }}>
                                    {isJcComplete ? 'COMPLETED' : 'IN PROGRESS'}
                                  </span>
                                </div>

                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 4px' }}>{jc.gaugeTypeName}</p>
                                <span style={{ fontSize: 11, color: 'var(--slate)', display: 'block' }}>WO Reference: {jc.woNumber}</span>
                              </div>

                              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--silk)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                                  <span style={{ color: 'var(--slate)' }}>Operations ({jc.opsCompleted}/{jc.opsTotal})</span>
                                  <span style={{ color: 'var(--charcoal)' }}>{jcPct}%</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 3, background: '#E6E1DA', overflow: 'hidden', marginBottom: 12 }}>
                                  <div style={{ height: '100%', width: `${jcPct}%`, background: isJcComplete ? '#3A6B4A' : 'var(--copper-bronze)' }} />
                                </div>

                                {/* Quick Action Footer Links */}
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <Link to={`/job-cards/${jc.id}`} className="btn btn-secondary" style={{ flex: 1, padding: '5px 8px', fontSize: 11, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                                    <FileText size={12} /> Job Card
                                  </Link>
                                  {isJcComplete && (
                                    <Link to={`/calibration-report/${jc.id}`} className="btn btn-primary" style={{ flex: 1.2, padding: '5px 8px', fontSize: 11, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                                      <Printer size={12} /> Cal Report
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB CONTENT 2: ALL OPERATIONS TABLE VIEW ── */}
      {activeTab === 'table' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--linen)', borderBottom: '1px solid var(--silk)', color: 'var(--charcoal)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Job Card Sr #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Gauge Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Op #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Operation Step</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Operator</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Started</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700 }}>Completed</th>
                  <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: 'var(--ash)' }}>Loading live operations data...</td></tr>
                ) : filteredOps.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 60, color: 'var(--ash)' }}>No operations found matching current filters.</td></tr>
                ) : (
                  filteredOps.map((op: any) => {
                    const g = op.gauge || {};
                    const po = g.purchaseOrder || {};
                    const custName = po.customer?.name || po.customerName || g.customerName || 'Direct / Walk-in';
                    const badgeCls = getStatusBadge(op.status);

                    return (
                      <tr key={op.id} style={{ borderBottom: '1px solid var(--linen)' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: 'var(--charcoal)' }}>{custName}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <Link to={`/job-cards/${g.id}`} className="font-mono" style={{ fontWeight: 700, color: 'var(--copper-bronze)', textDecoration: 'none' }}>
                            {g.serialNumber || '—'}
                          </Link>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {g.gaugeTypeName || '—'} <br/>
                          <span className="font-mono" style={{ fontSize: 11, color: 'var(--slate)' }}>{g.nominalSize} {g.sizeUnit} (Qty: {g.batchQuantity || 1})</span>
                        </td>
                        <td className="font-mono" style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--slate)' }}>
                          #{op.sequenceOrder}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--charcoal)' }}>{op.operationName}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span className={`badge ${badgeCls}`}>{op.status?.replace('_', ' ')}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {op.assignedTo ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--linen)', color: 'var(--copper-bronze)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                                {op.assignedTo.fullName?.charAt(0)}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>{op.assignedTo.fullName}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--ash)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td className="font-mono" style={{ padding: '10px 16px', fontSize: 11, color: 'var(--slate)' }}>
                          {fmtTime(op.actualStart)} <br/>
                          <span style={{ fontSize: 10, color: 'var(--ash)' }}>{fmtDate(op.actualStart)}</span>
                        </td>
                        <td className="font-mono" style={{ padding: '10px 16px', fontSize: 11, color: 'var(--slate)' }}>
                          {fmtTime(op.actualEnd)} <br/>
                          <span style={{ fontSize: 10, color: 'var(--ash)' }}>{fmtDate(op.actualEnd)}</span>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {g.id && (
                            <Link to={`/job-cards/${g.id}`} className="btn btn-secondary" style={{ padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 11 }}>
                              View <ArrowUpRight size={13} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
