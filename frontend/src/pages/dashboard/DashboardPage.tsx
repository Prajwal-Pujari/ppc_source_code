import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getDashboardSummary, getDailyProduction } from '@/api/analytics.api';
import { getPurchaseOrders } from '@/api/purchase-orders.api';
import { getGauges } from '@/api/gauges.api';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Package, Wrench, Users, AlertTriangle, Clock, Gauge, Plus, ArrowRight, CalendarDays, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid } from 'recharts';

const CHART_COLORS = ['#3A6B4A', '#C68B2F', '#4A6FA5', '#8B3A3A', '#6B5A8B', '#A05A2C'];
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#3A6B4A',
  IN_PRODUCTION: '#C68B2F',
  PENDING: '#4A6FA5',
  REJECTED: '#8B3A3A',
  IN_PROGRESS: '#C68B2F',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'WORKER') {
    return <Navigate to="/tasks/my" replace />;
  }

  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);

  const { data: summaryData, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 15000, // Live refresh every 15 seconds
  });

  const { data: posData } = useQuery({
    queryKey: ['dashboard-pos'],
    queryFn: () => getPurchaseOrders({ size: 10 }),
    refetchInterval: 30000,
  });

  const { data: gaugesData } = useQuery({
    queryKey: ['dashboard-gauges'],
    queryFn: () => getGauges({ size: 200 }),
    refetchInterval: 30000,
  });

  const { data: dailyData } = useQuery({
    queryKey: ['daily-production', dateRange],
    queryFn: () => getDailyProduction({ startDate: dateRange.start, endDate: dateRange.end }),
    refetchInterval: 60000,
  });

  const summary = summaryData?.data;
  const pos = posData?.data?.content || [];
  const gauges = gaugesData?.data?.content || [];
  const dailyProduction = dailyData?.data || [];

  // ─── Chart Data: Sum batchQuantity instead of counting rows ───
  const gaugeStatusData = (() => {
    const sums: Record<string, number> = {};
    gauges.forEach((g: any) => {
      const qty = g.batchQuantity || 1;
      sums[g.status] = (sums[g.status] || 0) + qty;
    });
    return Object.entries(sums).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      fill: STATUS_COLORS[name] || '#8C857D',
    }));
  })();

  const gaugeTypeData = (() => {
    const sums: Record<string, number> = {};
    gauges.forEach((g: any) => {
      const qty = g.batchQuantity || 1;
      sums[g.gaugeTypeName] = (sums[g.gaugeTypeName] || 0) + qty;
    });
    return Object.entries(sums).map(([name, value]) => ({ name, value }));
  })();

  const totalUnits = gauges.reduce((sum: number, g: any) => sum + (g.batchQuantity || 1), 0);

  // Format daily production for area chart
  const dailyChartData = dailyProduction.map((d: any) => ({
    date: new Date(d.summaryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    completed: d.gaugesCompleted || 0,
    rejected: d.gaugesRejected || 0,
    operations: d.operationsCompleted || 0,
  }));

  const statCards = [
    { label: 'Total Units', value: totalUnits, icon: Package, color: '#4A6FA5', subtitle: `${gauges.length} job cards` },
    { label: 'Completed', value: summary?.completedGaugesToday ?? '—', icon: Gauge, color: 'var(--status-completed)', subtitle: 'units produced' },
    { label: 'Ops Completed', value: summary?.operationsCompletedToday ?? '—', icon: Wrench, color: 'var(--copper-bronze)', subtitle: 'today' },
    { label: 'Active Workers', value: summary?.activeWorkers ?? '—', icon: Users, color: 'var(--status-in-progress)', subtitle: 'on floor' },
    { label: 'In Progress', value: summary?.operationsInProgress ?? '—', icon: Activity, color: '#C68B2F', subtitle: 'operations' },
    { label: 'Overdue', value: summary?.operationsOverdue ?? '—', icon: AlertTriangle, color: 'var(--status-rejected)', subtitle: 'need attention' },
  ];

  const statusBadge: Record<string, string> = {
    DRAFT: 'badge-pending', CONFIRMED: 'badge-queued', IN_PROGRESS: 'badge-in-progress',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-rejected',
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      {/* ─── Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Production Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(58,107,74,0.06)', border: '1px solid rgba(58,107,74,0.15)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3A6B4A', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, color: '#3A6B4A', fontWeight: 600 }}>LIVE</span>
            <span style={{ fontSize: 11, color: 'var(--ash)' }}>Updated {lastUpdated}</span>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/purchase-orders/new')} style={{ fontSize: 13, minHeight: 36, padding: '0 16px' }}>
            <Plus size={14} style={{ marginRight: 4 }} /> New PO
          </button>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card" style={{
              padding: '18px 20px', position: 'relative', overflow: 'hidden',
              borderLeft: `3px solid ${card.color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                  <div className="font-mono" style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: 'var(--charcoal)' }}>
                    {isLoading ? <div className="skeleton" style={{ width: 50, height: 28 }} /> : card.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>{card.subtitle}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${card.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={card.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Daily Production Trend + Date Filter ─── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={18} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Daily Production Trend</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={14} color="var(--ash)" />
            <input type="date" value={dateRange.start}
              onChange={(e) => setDateRange(r => ({ ...r, start: e.target.value }))}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, color: 'var(--slate)', background: 'var(--warm-white)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--ash)' }}>to</span>
            <input type="date" value={dateRange.end}
              onChange={(e) => setDateRange(r => ({ ...r, end: e.target.value }))}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, color: 'var(--slate)', background: 'var(--warm-white)' }}
            />
            {/* Quick presets */}
            {[
              { label: '7D', days: 7 },
              { label: '30D', days: 30 },
              { label: '90D', days: 90 },
            ].map(p => (
              <button key={p.label} onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - p.days);
                setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
              }} style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--silk)', background: 'transparent', color: 'var(--slate)',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {dailyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A6B4A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3A6B4A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B3A3A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B3A3A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ash)' }} axisLine={{ stroke: 'var(--silk)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ash)' }} axisLine={{ stroke: 'var(--silk)' }} />
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 13 }} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#3A6B4A" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#8B3A3A" strokeWidth={2} fillOpacity={1} fill="url(#colorRejected)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', flexDirection: 'column', gap: 8 }}>
            <TrendingUp size={32} style={{ opacity: 0.25 }} />
            <p style={{ fontSize: 14 }}>No production data for this date range</p>
          </div>
        )}
      </div>

      {/* ─── Charts Row ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Production Status Distribution (Pie) */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20 }}>Production Status (Units)</h3>
          {gaugeStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={gaugeStatusData} cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value"
                  label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {gaugeStatusData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>No data yet</div>
          )}
        </div>

        {/* Gauges by Type (Bar) */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20 }}>Units by Part / Product Name</h3>
          {gaugeTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gaugeTypeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--ash)' }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'var(--slate)' }} />
                <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="value" name="Units" fill="var(--copper-bronze)" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>No data yet</div>
          )}
        </div>
      </div>

      {/* ─── PO Tracker ─── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Purchase Order Tracker</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/purchase-orders')} style={{ fontSize: 12, minHeight: 32, padding: '0 12px' }}>
            View All <ArrowRight size={12} style={{ marginLeft: 4 }} />
          </button>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Progress</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No purchase orders yet</td></tr>
              ) : pos.map((po: any) => {
                const pct = po.totalGauges > 0 ? Math.round((po.completedGauges / po.totalGauges) * 100) : 0;
                const isOverdue = po.expectedDeliveryDate && new Date(po.expectedDeliveryDate) < new Date() && po.status !== 'COMPLETED';
                return (
                  <tr key={po.id} onClick={() => navigate(`/purchase-orders/${po.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)', fontSize: 13 }}>{po.poNumber}</td>
                    <td style={{ fontSize: 13 }}>{po.customer?.name || '—'}</td>
                    <td><span className={`badge ${statusBadge[po.status]}`}>{po.status?.replace('_', ' ')}</span></td>
                    <td className="font-mono" style={{
                      fontSize: 12,
                      color: isOverdue ? 'var(--status-rejected)' : 'var(--ash)',
                      fontWeight: isOverdue ? 600 : 400,
                    }}>
                      {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      {isOverdue && <AlertTriangle size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 6, flex: 1, borderRadius: 3, background: 'var(--silk)', overflow: 'hidden', minWidth: 80 }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: pct === 100 ? 'var(--status-completed)' : pct > 0 ? 'var(--copper-bronze)' : 'var(--silk)',
                            width: `${pct}%`, transition: 'width 0.5s ease',
                          }} />
                        </div>
                        <span className="font-mono" style={{ fontSize: 11, color: pct === 100 ? 'var(--status-completed)' : 'var(--ash)', fontWeight: pct === 100 ? 600 : 400, minWidth: 40 }}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td><ArrowRight size={14} color="var(--ash)" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 16 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/purchase-orders/new')}>New Purchase Order</button>
          <button className="btn btn-secondary" onClick={() => navigate('/job-cards')}>View Job Cards</button>
          <button className="btn btn-secondary" onClick={() => navigate('/master/gauges')}>Part / Product Master</button>
          <button className="btn btn-secondary" onClick={() => navigate('/master/operations')}>Operations</button>
          <button className="btn btn-secondary" onClick={() => navigate('/analytics')}>Analytics</button>
        </div>
      </div>

      {/* Pulse animation for LIVE indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
