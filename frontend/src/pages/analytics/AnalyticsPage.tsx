import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getDailyProduction, getWorkerPerformance, getRejectionAnalysis, getPoCompletionTracker, getMyTasks } from '@/api/analytics.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Download, TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Filter } from 'lucide-react';
import { buildCustomerStats, buildGrowthPrediction, exportToExcel, COLORS } from './analyticsHelpers';

export default function AnalyticsPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const [custFilter, setCustFilter] = useState('');
  useEffect(() => { setPageTitle('Analytics & Business Intelligence'); }, [setPageTitle]);

  const { data: dailyData } = useQuery({ queryKey: ['daily-production'], queryFn: () => getDailyProduction() });
  const { data: workerData } = useQuery({ queryKey: ['worker-performance'], queryFn: () => getWorkerPerformance() });
  const { data: rejectionData } = useQuery({ queryKey: ['rejection-analysis'], queryFn: () => getRejectionAnalysis() });
  const { data: poTrackerData } = useQuery({ queryKey: ['po-completion-tracker'], queryFn: () => getPoCompletionTracker() });
  const { data: taskData } = useQuery({ queryKey: ['factory-operations-analytics'], queryFn: getMyTasks, refetchInterval: 30000 });

  const tasks = taskData?.data || [];
  const customerStats = useMemo(() => buildCustomerStats(tasks), [tasks]);
  const growthData = useMemo(() => buildGrowthPrediction(dailyData?.data || []), [dailyData]);
  const uniqueCustomers = customerStats.map(c => c.name);

  const filteredStats = custFilter ? customerStats.filter(c => c.name === custFilter) : customerStats;
  const totalLate = customerStats.reduce((a, c) => a + c.latePOs, 0);
  const totalOnTime = customerStats.reduce((a, c) => a + c.onTimePOs, 0);
  const avgOnTimeRate = customerStats.length > 0 ? Math.round(customerStats.reduce((a, c) => a + c.onTimeRate, 0) / customerStats.length) : 0;

  // Delivery pie data
  const deliveryPie = [
    { name: 'On Time', value: totalOnTime, color: '#059669' },
    { name: 'Late', value: totalLate, color: '#DC2626' },
    { name: 'At Risk', value: customerStats.reduce((a, c) => a + c.atRiskPOs, 0), color: '#D97706' }
  ].filter(d => d.value > 0);

  // Customer comparison bar data
  const custBarData = filteredStats.map(c => ({
    name: c.name.length > 12 ? c.name.slice(0, 12) + '…' : c.name,
    'Completed': c.completedPOs, 'Active': c.totalPOs - c.completedPOs, 'Late': c.latePOs
  }));

  // Customer radar data
  const radarData = filteredStats.slice(0, 6).map(c => ({
    metric: c.name.length > 10 ? c.name.slice(0, 10) + '…' : c.name,
    'On-Time %': c.onTimeRate, 'Completion %': c.totalOps > 0 ? Math.round((c.completedOps / c.totalOps) * 100) : 0
  }));

  const handleExport = () => exportToExcel(customerStats, dailyData?.data || [], tasks);

  const cardStyle = { background: 'white', borderRadius: 12, border: '1px solid var(--silk)', padding: 24, boxShadow: '0 4px 20px rgba(48,49,47,0.06)' };
  const headingStyle = { fontSize: 15, fontWeight: 600 as const, color: 'var(--charcoal)', marginBottom: 20, letterSpacing: '-0.01em' };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Filter size={16} color="#807665" />
          <select value={custFilter} onChange={e => setCustFilter(e.target.value)}
            style={{ height: 40, paddingLeft: 12, paddingRight: 32, borderRadius: 10, border: '1px solid var(--silk)', fontSize: 13, appearance: 'none' as const, background: 'white', minWidth: 200 }}>
            <option value="">All Customers</option>
            {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#1B1C1A', color: 'white', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          <Download size={16} /> Export to Excel
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <KPI icon={<Users size={20} color="#8B6914" />} label="Active Customers" value={customerStats.length} bg="#FFF9E6" />
        <KPI icon={<CheckCircle size={20} color="#059669" />} label="Avg On-Time Rate" value={`${avgOnTimeRate}%`} bg="#ECFDF5" />
        <KPI icon={<AlertTriangle size={20} color="#DC2626" />} label="Late POs" value={totalLate} bg="#FEF2F2" alert={totalLate > 0} />
        <KPI icon={<TrendingUp size={20} color="#4A6FA5" />} label="Total Operations" value={tasks.length} bg="#EFF6FF" />
      </div>

      {/* ── Row 1: Growth Prediction + Delivery Accuracy ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}><TrendingUp size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />Production Growth & 7-Day Forecast</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B6914" stopOpacity={0.3}/><stop offset="95%" stopColor="#8B6914" stopOpacity={0}/></linearGradient>
                <linearGradient id="gPredicted" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4A6FA5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4A6FA5" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="actual" stroke="#8B6914" fill="url(#gActual)" strokeWidth={2} name="Actual" connectNulls={false} />
              <Area type="monotone" dataKey="predicted" stroke="#4A6FA5" fill="url(#gPredicted)" strokeWidth={2} strokeDasharray="6 3" name="Predicted" connectNulls={false} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Overall Delivery Accuracy</h3>
          {deliveryPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={deliveryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={55} paddingAngle={3}>
                  {deliveryPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', fontSize: 13 }}>No delivery data yet</div>}
        </div>
      </div>

      {/* ── Row 2: Customer Comparison + Radar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Customer PO Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={custBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--ash)', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="Completed" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Active" stackId="a" fill="#8B6914" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Late" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Customer Performance Radar</h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--silk)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--ash)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="On-Time %" dataKey="On-Time %" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                <Radar name="Completion %" dataKey="Completion %" stroke="#8B6914" fill="#8B6914" fillOpacity={0.2} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', fontSize: 13 }}>Need more customers for radar</div>}
        </div>
      </div>

      {/* ── Row 3: Daily Production + Rejections ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Daily Production Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dailyData?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" />
              <XAxis dataKey="summaryDate" tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="gaugesCompleted" fill="var(--copper-bronze)" radius={[4, 4, 0, 0]} name="Completed" />
              <Bar dataKey="gaugesRejected" fill="var(--status-rejected)" radius={[4, 4, 0, 0]} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Rejection Categories</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={rejectionData?.data || []} dataKey="rejectionCount" nameKey="rejectionCategory" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                {(rejectionData?.data || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 4: Worker Performance + Customer Detail Table ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Worker Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={workerData?.data || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--silk)" />
              <XAxis type="number" tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <YAxis dataKey="workerName" type="category" width={100} tick={{ fill: 'var(--ash)', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="operationsCompleted" fill="var(--status-completed)" radius={[0, 4, 4, 0]} name="Ops Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={cardStyle}>
          <h3 style={headingStyle}>Customer Delivery Scorecard</h3>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Customer', 'POs', 'On-Time', 'Late', 'Rate'].map(h =>
                  <th key={h} style={{ background: '#F5F3F0', color: '#807665', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' as const, padding: '10px 12px', textAlign: 'left' as const, borderBottom: '1px solid #D1C5B240' }}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {filteredStats.map(c => (
                  <tr key={c.name} style={{ borderBottom: '1px solid #D1C5B220' }}>
                    <td style={{ padding: '12px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '12px', fontSize: 13 }}>{c.totalPOs}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: '#059669', fontWeight: 600 }}>{c.onTimePOs}</td>
                    <td style={{ padding: '12px', fontSize: 13, color: c.latePOs > 0 ? '#DC2626' : '#A0A0A0', fontWeight: 600 }}>{c.latePOs}</td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: '#E5E7EB', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${c.onTimeRate}%`, background: c.onTimeRate >= 80 ? '#059669' : c.onTimeRate >= 50 ? '#D97706' : '#DC2626' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{c.onTimeRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStats.length === 0 && <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#A0A0A0', fontSize: 13 }}>No customer data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ icon, label, value, bg, alert }: { icon: React.ReactNode; label: string; value: string | number; bg: string; alert?: boolean }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '20px 18px', border: alert ? '1px solid #FECACA' : '1px solid transparent' }}>
      <div style={{ marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 11, color: '#807665', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1B1C1A', marginTop: 4 }}>{value}</div>
    </div>
  );
}
