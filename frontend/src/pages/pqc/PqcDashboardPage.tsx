import { useEffect } from 'react';
import { useUiStore } from '@/store/uiStore';

const statCards = [
  { label: 'PARTS PLANNED', value: '--', sub: 'Target for Shift', color: '#1a73e8' },
  { label: 'PRODUCED', value: '--', sub: 'vs last hr', color: '#8B6914' },
  { label: 'PASSED', value: '--', sub: 'Yield Rate', color: '#3A6B4A' },
  { label: 'REJECTED', value: '--', sub: 'vs avg', color: '#ba1a1a' },
  { label: 'REWORK', value: '--', sub: 'of rejects', color: '#6B5A8B' },
  { label: 'SCRAPPED', value: '--', sub: 'overall loss', color: '#C68B2F' },
];

const statIcons: Record<string, string> = {
  'PARTS PLANNED': 'target',
  'PRODUCED': 'precision_manufacturing',
  'PASSED': 'check_circle',
  'REJECTED': 'cancel',
  'REWORK': 'build',
  'SCRAPPED': 'delete',
};

export default function PqcDashboardPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('PQC Dashboard'); }, [setPageTitle]);

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: 0 }}>
            PQC Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A6B4A', display: 'inline-block' }} />
            Live quality overview — Morning Shift, {today}
          </p>
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 20px', borderRadius: 4, fontSize: 13, fontWeight: 600,
          background: 'var(--copper-bronze)', color: 'white', border: 'none',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
          Export Report
        </button>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
            padding: '16px 18px', borderTop: `3px solid ${card.color}`,
            boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ash)' }}>
                {card.label}
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: card.color, opacity: 0.6 }}>
                {statIcons[card.label]}
              </span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ash)' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Hourly Production */}
        <div style={{
          background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
          padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)', minHeight: 300,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 8px' }}>
            Hourly Production vs Plan
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 220, color: 'var(--ash)', fontSize: 13,
            background: 'var(--bone-white)', borderRadius: 6, border: '1px dashed var(--stone)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3, display: 'block', marginBottom: 8 }}>bar_chart</span>
              Chart will populate with inspection data
            </div>
          </div>
        </div>

        {/* Rejection Reasons */}
        <div style={{
          background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
          padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)', minHeight: 300,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 8px' }}>
            Rejection Reasons Today
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: 220, color: 'var(--ash)', fontSize: 13,
            background: 'var(--bone-white)', borderRadius: 6, border: '1px dashed var(--stone)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.3, display: 'block', marginBottom: 8 }}>donut_large</span>
              Chart will populate with rejection data
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Overdue Inspections */}
        <div style={{
          background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
          padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ba1a1a' }}>warning</span>
              Overdue Inspections
            </h3>
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: 'rgba(186,26,26,0.1)', color: '#ba1a1a',
            }}>
              0 Items
            </span>
          </div>
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 13,
            background: 'var(--bone-white)', borderRadius: 6,
          }}>
            No overdue inspections. All operations are on schedule.
          </div>
        </div>

        {/* Recent Inspections */}
        <div style={{
          background: 'white', border: '1px solid var(--silk)', borderRadius: 8,
          padding: 24, boxShadow: '0 1px 3px rgba(28,26,24,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Recent Inspections
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A6B4A', display: 'inline-block' }} />
            </h3>
            <button style={{
              background: 'none', border: 'none', fontSize: 12, fontWeight: 500,
              color: 'var(--copper-bronze)', cursor: 'pointer',
            }}>
              View All
            </button>
          </div>
          <div style={{
            padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 13,
            background: 'var(--bone-white)', borderRadius: 6,
          }}>
            No inspections logged yet. Start by logging an inspection from the Inspections page.
          </div>
        </div>
      </div>
    </div>
  );
}
