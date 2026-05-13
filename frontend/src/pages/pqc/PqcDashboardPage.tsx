import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import api from '@/lib/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Target, Factory, CheckCircle2, XCircle, Wrench, Trash2,
  TrendingUp, Clock, AlertTriangle, Activity,
} from 'lucide-react';

/* ────────── colour palette ────────── */
const COLORS = {
  planned:  '#4A6FA5',
  produced: '#8B6914',
  passed:   '#3A6B4A',
  rejected: '#ba1a1a',
  rework:   '#6B5A8B',
  scrap:    '#C68B2F',
};

const PIE_PALETTE = ['#ba1a1a', '#C68B2F', '#6B5A8B', '#4A6FA5', '#3A6B4A', '#8B6914'];

/* ────────── API call ────────── */
const fetchDashboard = async (period: string) => {
  const res = await api.get('/pqc/dashboard', { params: { period } });
  return res.data?.data || res.data;
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  MAIN COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function PqcDashboardPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('PQC Dashboard'); }, [setPageTitle]);

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pqc-dashboard', period],
    queryFn: () => fetchDashboard(period),
    refetchInterval: 30_000, // auto-refresh every 30 s
  });

  const summary = data?.summary || {};
  const hourly: any[] = data?.hourly || [];
  const rejectionBreakdown: any[] = data?.rejectionBreakdown || [];
  const recentInspections: any[] = data?.recentInspections || [];

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'Last 7 Days' : 'Last 30 Days';

  /* ── hourly chart formatting ── */
  const hourlyData = hourly.map((h: any) => ({
    ...h,
    label: `${String(h.hour).padStart(2, '0')}:00`,
  }));

  /* ── stat cards config ── */
  const stats = [
    { key: 'planned',  label: 'PARTS PLANNED', value: summary.planned ?? 0,  sub: `${summary.batchCount ?? 0} batches`, color: COLORS.planned,  icon: Target },
    { key: 'produced', label: 'PRODUCED',      value: summary.produced ?? 0, sub: `${periodLabel}`,                      color: COLORS.produced, icon: Factory },
    { key: 'passed',   label: 'PASSED',        value: summary.passed ?? 0,   sub: `Yield: ${summary.yieldRate ?? 0}%`,   color: COLORS.passed,   icon: CheckCircle2 },
    { key: 'rejected', label: 'REJECTED',      value: summary.rejected ?? 0, sub: `of ${summary.produced ?? 0} produced`,color: COLORS.rejected, icon: XCircle },
    { key: 'rework',   label: 'REWORK',        value: summary.rework ?? 0,   sub: `can be salvaged`,                     color: COLORS.rework,   icon: Wrench },
    { key: 'scrap',    label: 'SCRAPPED',      value: summary.scrap ?? 0,    sub: `permanent loss`,                      color: COLORS.scrap,    icon: Trash2 },
  ];

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: 0 }}>
            PQC Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A6B4A', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live quality overview — {today}
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--linen)', borderRadius: 6, padding: 3 }}>
          {(['today', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: period === p ? 'var(--copper-bronze)' : 'transparent',
                color: period === p ? 'white' : 'var(--charcoal)',
              }}
            >
              {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : '30 Days'}
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* ── Loading / Error ── */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {isError && (
        <div style={{ padding: 20, background: '#FFF5F5', border: '1px solid #ba1a1a30', borderRadius: 8, color: '#ba1a1a', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> Failed to load dashboard data. Backend may be restarting.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* ── Stat Cards Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
            {stats.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.key} style={{
                  background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
                  padding: '16px 18px', borderTop: `3px solid ${card.color}`,
                  boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(28,26,24,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(28,26,24,0.04)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ash)' }}>
                      {card.label}
                    </span>
                    <Icon size={18} color={card.color} style={{ opacity: 0.6 }} />
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ash)' }}>{card.sub}</div>
                </div>
              );
            })}
          </div>

          {/* ── Charts Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>

            {/* Hourly Production Bar Chart */}
            <div style={{
              background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
              padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} color="var(--copper-bronze)" />
                  Production by Hour
                </h3>
                <span style={{ fontSize: 11, color: 'var(--ash)' }}>{periodLabel}</span>
              </div>
              {hourlyData.length === 0 ? (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', fontSize: 13, background: 'var(--bone-white)', borderRadius: 6, border: '1px dashed var(--stone)' }}>
                  No inspection data for this period yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={hourlyData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8C857D' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#8C857D' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #E8E2D9', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      labelFormatter={v => `Hour: ${v}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="passed" name="Passed" fill={COLORS.passed} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill={COLORS.rejected} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Rejection Reasons Pie Chart */}
            <div style={{
              background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
              padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#ba1a1a" />
                Rejection Breakdown
              </h3>
              {rejectionBreakdown.length === 0 ? (
                <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)', fontSize: 13, background: 'var(--bone-white)', borderRadius: 6, border: '1px dashed var(--stone)', flexDirection: 'column', gap: 8 }}>
                  <CheckCircle2 size={32} color="#3A6B4A" style={{ opacity: 0.4 }} />
                  No rejections! 🎉
                </div>
              ) : (
                <div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={rejectionBreakdown}
                        dataKey="count"
                        nameKey="reason"
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={80}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {rejectionBreakdown.map((_: any, i: number) => (
                          <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {rejectionBreakdown.map((r: any, i: number) => (
                      <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_PALETTE[i % PIE_PALETTE.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, color: 'var(--charcoal)' }}>{r.reason}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: 'var(--charcoal)' }}>{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Yield Gauge */}
            <div style={{
              background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
              padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--copper-bronze)" />
                Quality Yield
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Current Period */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>{periodLabel}</div>
                  <YieldCircle value={summary.yieldRate ?? 0} />
                </div>
                {/* All Time */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--ash)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>All Time</div>
                  <YieldCircle value={summary.allTimeYield ?? 0} />
                </div>
              </div>
            </div>

            {/* Recent Inspections */}
            <div style={{
              background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
              padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="var(--copper-bronze)" />
                  Recent Inspections
                </h3>
                <span style={{ fontSize: 11, color: 'var(--ash)' }}>{recentInspections.length} logs</span>
              </div>
              {recentInspections.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 13, background: 'var(--bone-white)', borderRadius: 6 }}>
                  No inspections logged yet.
                </div>
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--silk)', position: 'sticky', top: 0, background: 'white' }}>
                        <th style={thS}>Time</th>
                        <th style={thS}>Inspector</th>
                        <th style={thS}>Operation</th>
                        <th style={{ ...thS, textAlign: 'center' }}>Qty</th>
                        <th style={{ ...thS, textAlign: 'center' }}>Pass</th>
                        <th style={{ ...thS, textAlign: 'center' }}>Rej</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInspections.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--silk)' }}>
                          <td style={tdS}>{new Date(r.logTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td style={tdS}>{r.inspectorName}</td>
                          <td style={tdS}>{r.operationName}</td>
                          <td style={{ ...tdS, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{r.actualQty}</td>
                          <td style={{ ...tdS, textAlign: 'center', color: '#3A6B4A', fontWeight: 600 }}>{r.passedQty}</td>
                          <td style={{ ...tdS, textAlign: 'center', color: r.rejectedQty > 0 ? '#ba1a1a' : 'inherit', fontWeight: r.rejectedQty > 0 ? 600 : 400 }}>{r.rejectedQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ━━━ Yield Circle Sub-Component ━━━ */
function YieldCircle({ value }: { value: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 95 ? '#3A6B4A' : value >= 80 ? '#C68B2F' : '#ba1a1a';

  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={radius} fill="none" stroke="#E8E2D9" strokeWidth="10" />
      <circle
        cx="65" cy="65" r={radius} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 65 65)"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
      <text x="65" y="60" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--charcoal)" fontFamily="'JetBrains Mono', monospace">
        {value}%
      </text>
      <text x="65" y="78" textAnchor="middle" fontSize="10" fill="#8C857D">
        yield
      </text>
    </svg>
  );
}

/* ━━━ Table styles ━━━ */
const thS: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ash)',
};

const tdS: React.CSSProperties = {
  padding: '8px 10px', color: 'var(--charcoal)',
};
