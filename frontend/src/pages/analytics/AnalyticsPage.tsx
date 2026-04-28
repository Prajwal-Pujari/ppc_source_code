import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getDailyProduction, getWorkerPerformance, getRejectionAnalysis, getPoCompletionTracker } from '@/api/analytics.api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#8B6914', '#3A6B4A', '#8B3A3A', '#4A6FA5', '#6B5A8B', '#C68B2F', '#A05A2C'];

export default function AnalyticsPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  useEffect(() => { setPageTitle('Analytics'); }, []);

  const { data: dailyData } = useQuery({
    queryKey: ['daily-production'],
    queryFn: () => getDailyProduction(),
  });

  const { data: workerData } = useQuery({
    queryKey: ['worker-performance'],
    queryFn: () => getWorkerPerformance(),
  });

  const { data: rejectionData } = useQuery({
    queryKey: ['rejection-analysis'],
    queryFn: () => getRejectionAnalysis(),
  });

  const { data: poTrackerData } = useQuery({
    queryKey: ['po-completion-tracker'],
    queryFn: () => getPoCompletionTracker(),
  });

  return (
    <div>
      {/* Production Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20, letterSpacing: '-0.01em' }}>
            Daily Production
          </h3>
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

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20, letterSpacing: '-0.01em' }}>
            Rejection Categories
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={rejectionData?.data || []}
                dataKey="rejectionCount"
                nameKey="rejectionCategory"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
              >
                {(rejectionData?.data || []).map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--slate)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Worker Performance & PO Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20, letterSpacing: '-0.01em' }}>
            Worker Performance
          </h3>
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

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20, letterSpacing: '-0.01em' }}>
            PO Completion Tracker
          </h3>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {(poTrackerData?.data || []).map((po: any) => (
              <div key={po.id} style={{
                padding: '12px 0', borderBottom: '1px solid var(--silk)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <span className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)', fontSize: 13 }}>
                    {po.poNumber}
                  </span>
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--ash)' }}>{po.customerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--silk)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: parseFloat(po.percentComplete) >= 100 ? 'var(--status-completed)' : 'var(--copper-bronze)',
                      width: `${po.percentComplete}%`,
                    }} />
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ash)', minWidth: 36 }}>
                    {po.percentComplete}%
                  </span>
                </div>
              </div>
            ))}
            {(poTrackerData?.data || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)', fontSize: 13 }}>No PO data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
