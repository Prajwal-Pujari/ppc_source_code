import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getIs3455All } from '@/api/is3455.api';
import type { Is3455Range, Is3455ToleranceValue } from '@/api/is3455.api';
import { BookOpen, Filter } from 'lucide-react';

const GRADES = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const SYM_ORDER = ['T', 'H/2', 'Y', 'Z', 'A'];
const SYM_COLORS: Record<string, string> = {
  'T': '#1E3A8A', 'H/2': '#8B6914', 'Y': '#0E7490', 'Z': '#7C3AED', 'A': '#6B7280',
};

function getGradeVal(v: Is3455ToleranceValue, grade: number): number | null {
  const key = `grd${grade}` as keyof Is3455ToleranceValue;
  const val = v[key];
  return val as number | null;
}

export default function Is3455MasterPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('IS 3455 Tolerance Master'); }, [setPageTitle]);

  const [filterType, setFilterType] = useState<string>('Plug Tolerance');

  const { data: allRanges = [], isLoading } = useQuery({
    queryKey: ['is3455-all'],
    queryFn: getIs3455All,
  });

  const filtered = (allRanges as Is3455Range[]).filter((r: Is3455Range) => r.toleranceType === filterType);

  const thStyle: React.CSSProperties = {
    padding: '10px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--copper-bronze)', textAlign: 'center',
    borderBottom: '2px solid var(--silk)', position: 'sticky', top: 0, background: 'var(--bone-white)', zIndex: 2,
  };

  const tdStyle: React.CSSProperties = {
    padding: '6px 8px', fontSize: 12, fontFamily: 'var(--font-mono, monospace)',
    textAlign: 'center', borderBottom: '1px solid var(--silk)',
  };

  return (
    <div style={{ padding: 32, maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={22} color="var(--copper-bronze)" />
          IS 3455 Tolerance Tables
        </h1>
        <p style={{ margin: 0, color: 'var(--slate)', fontSize: 13 }}>
          Standard gauge tolerance values as per IS 3455 (1971). Values are auto-applied when creating Purchase Orders.
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        <Filter size={14} color="var(--ash)" />
        {['Plug Tolerance', 'Snap Tolerance'].map(type => (
          <button key={type} onClick={() => setFilterType(type)} style={{
            padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: filterType === type ? '2px solid var(--copper-bronze)' : '2px solid var(--silk)',
            background: filterType === type ? 'rgba(139,105,20,0.08)' : 'white',
            color: filterType === type ? 'var(--copper-bronze)' : 'var(--slate)',
            transition: 'all 0.15s',
          }}>
            {type === 'Plug Tolerance' ? 'Plug Gauge' : 'Snap Gauge'}
          </button>
        ))}
        <span style={{ fontSize: 12, color: 'var(--ash)', marginLeft: 8 }}>
          {filtered.length} ranges loaded
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--ash)' }}>Loading IS 3455 data...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid var(--silk)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', minWidth: 100 }}>Range</th>
                  <th style={{ ...thStyle, minWidth: 50 }}>Symbol</th>
                  {GRADES.map(g => (
                    <th key={g} style={thStyle}>IT {g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((range: Is3455Range, rIdx: number) => {
                  const sortedVals = SYM_ORDER.map(sym =>
                    range.values?.find((v: Is3455ToleranceValue) => v.symValue === sym)
                  ).filter(Boolean) as Is3455ToleranceValue[];

                  return sortedVals.map((val: Is3455ToleranceValue, vIdx: number) => (
                    <tr key={`${range.id}-${val.symValue}`}
                      style={{
                        background: vIdx === 0 ? 'rgba(139,105,20,0.03)' : 'transparent',
                        borderBottom: vIdx === sortedVals.length - 1 ? '2px solid var(--silk)' : undefined,
                      }}>
                      {vIdx === 0 && (
                        <td rowSpan={sortedVals.length} style={{
                          ...tdStyle, textAlign: 'left', fontWeight: 700, fontSize: 13,
                          color: 'var(--charcoal)', background: 'rgba(139,105,20,0.04)',
                          borderRight: '2px solid var(--silk)', verticalAlign: 'middle',
                        }}>
                          {range.rangeLabel}
                          <br />
                          <span style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 400 }}>
                            ≤ {range.nominalSizeMax} mm
                          </span>
                        </td>
                      )}
                      <td style={{
                        ...tdStyle, fontWeight: 700, fontSize: 11,
                        color: SYM_COLORS[val.symValue] || 'var(--charcoal)',
                        background: 'rgba(139,105,20,0.02)', borderRight: '1px solid var(--silk)',
                      }}>
                        {val.symValue}
                      </td>
                      {GRADES.map(g => {
                        const v = getGradeVal(val, g);
                        return (
                          <td key={g} style={{
                            ...tdStyle,
                            color: v === null || v === 0 ? 'var(--silk)' : 'var(--charcoal)',
                            fontWeight: val.symValue === 'T' ? 600 : 400,
                          }}>
                            {v === null ? '—' : v === 0 ? '0' : v.toFixed(4)}
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 10, background: 'rgba(139,105,20,0.04)', border: '1px solid rgba(139,105,20,0.12)' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12 }}>
          {SYM_ORDER.map(sym => (
            <span key={sym} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: SYM_COLORS[sym] }} />
              <strong style={{ color: SYM_COLORS[sym] }}>{sym}</strong>
              <span style={{ color: 'var(--slate)' }}>
                {sym === 'T' && '— Workpiece Tolerance'}
                {sym === 'H/2' && '— Gauge Mfg. Tolerance'}
                {sym === 'Y' && '— Wear Allowance'}
                {sym === 'Z' && '— Gauge Allowance'}
                {sym === 'A' && '— NOT GO Wear Allowance'}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
