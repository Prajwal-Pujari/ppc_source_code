import { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { getJobCards } from '@/api/gauges.api';
import {
  Search, CheckCircle, Clock, PlayCircle, AlertTriangle, Pause,
  Package, ArrowRight, XCircle, Layers, Briefcase, Calendar
} from 'lucide-react';

/* ── Status ── */
const S: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:       { color: '#4A6FA5', bg: '#EEF2F8', icon: Clock,         label: 'Pending' },
  IN_PRODUCTION: { color: '#C68B2F', bg: '#FBF4E8', icon: PlayCircle,    label: 'In Production' },
  ON_HOLD:       { color: '#6B5A8B', bg: '#F2EFF8', icon: Pause,         label: 'On Hold' },
  COMPLETED:     { color: '#3A6B4A', bg: '#EBF4EE', icon: CheckCircle,   label: 'Completed' },
  REJECTED:      { color: '#8B3A3A', bg: '#F8EEEE', icon: AlertTriangle, label: 'Rejected' },
};

const ACCENTS = ['#8B6914','#4A6FA5','#6B5A8B','#3A6B4A','#8B3A3A','#C68B2F','#2D6A7E','#7A5C3E'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function JobCardListPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeCustomer, setActiveCustomer] = useState<string | null>(null);
  const [activePO, setActivePO] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  useEffect(() => { setPageTitle('Job Cards'); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['job-cards'],
    queryFn: () => getJobCards({}),
  });

  const rawGauges: any[] = data?.data || [];

  const gauges = useMemo(() => {
    if (!search.trim()) return rawGauges;
    const q = search.toLowerCase().trim();
    return rawGauges.filter((g: any) => {
      const cust = g.purchaseOrder?.customer?.name || g.purchaseOrder?.customerName || '';
      const po = g.purchaseOrder?.poNumber || '';
      const sr = g.serialNumber || '';
      const type = g.gaugeTypeName || '';
      return cust.toLowerCase().includes(q) ||
             po.toLowerCase().includes(q) ||
             sr.toLowerCase().includes(q) ||
             type.toLowerCase().includes(q);
    });
  }, [rawGauges, search]);

  /* ── Build customer → PO → gauges tree ── */
  const tree = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    for (const g of gauges) {
      const customer = g.purchaseOrder?.customer?.name || g.purchaseOrder?.customerName || 'Unknown Client';
      const po = g.purchaseOrder?.poNumber || 'No PO';
      if (!map[customer]) map[customer] = {};
      if (!map[customer][po]) map[customer][po] = [];
      map[customer][po].push(g);
    }
    return Object.entries(map)
      .map(([name, pos]) => ({
        name,
        pos: Object.entries(pos).map(([poNum, gs]) => ({
          poNum,
          gauges: gs,
          orderDate: gs[0]?.purchaseOrder?.orderDate || gs[0]?.createdAt,
        })),
        totalGauges: Object.values(pos).flat().length,
        completed: Object.values(pos).flat().filter((g: any) => g.status === 'COMPLETED').length,
        active: Object.values(pos).flat().filter((g: any) => g.status === 'IN_PRODUCTION').length,
        rejected: Object.values(pos).flat().filter((g: any) => g.status === 'REJECTED').length,
      }))
      .sort((a, b) => b.active - a.active || b.totalGauges - a.totalGauges);
  }, [gauges]);

  // Auto-select first customer if none selected or if activeCustomer filtered out
  useEffect(() => {
    if (tree.length > 0 && (!activeCustomer || !tree.find(c => c.name === activeCustomer))) {
      setActiveCustomer(tree[0].name);
      if (tree[0].pos.length > 0) setActivePO(tree[0].pos[0].poNum);
    }
  }, [tree, activeCustomer]);

  const selectedCustomer = tree.find(c => c.name === activeCustomer);

  /* ── Available months PER CUSTOMER ── */
  const customerMonths = useMemo(() => {
    if (!selectedCustomer) return [];
    const set = new Set<string>();
    for (const po of selectedCustomer.pos) {
      const d = po.orderDate;
      if (d) {
        // orderDate can be "2026-04-15" (LocalDate) or ISO datetime
        const parts = String(d).split(/[-T]/);
        if (parts.length >= 2) {
          const y = parts[0];
          const m = String(parseInt(parts[1]) - 1).padStart(2, '0'); // 0-indexed month
          set.add(`${y}-${m}`);
        }
      }
    }
    return Array.from(set).sort().reverse();
  }, [selectedCustomer]);

  // Reset month filter when switching customers
  useEffect(() => {
    setMonthFilter('ALL');
  }, [activeCustomer]);

  /* ── Filter POs by month ── */
  const filteredPOs = useMemo(() => {
    if (!selectedCustomer) return [];
    if (monthFilter === 'ALL') return selectedCustomer.pos;
    return selectedCustomer.pos.filter(po => {
      const d = po.orderDate;
      if (!d) return false;
      const parts = String(d).split(/[-T]/);
      if (parts.length < 2) return false;
      const y = parts[0];
      const m = String(parseInt(parts[1]) - 1).padStart(2, '0');
      return `${y}-${m}` === monthFilter;
    });
  }, [selectedCustomer, monthFilter]);

  const selectedPO = filteredPOs.find(p => p.poNum === activePO) || filteredPOs[0];

  // Auto-select first PO when filtered list changes
  useEffect(() => {
    if (filteredPOs.length > 0 && !filteredPOs.find(p => p.poNum === activePO)) {
      setActivePO(filteredPOs[0].poNum);
    }
  }, [filteredPOs, activePO]);

  /* ── Skeleton ── */
  if (isLoading) return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - var(--header-height) - 60px)' }}>
      <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: '100%', borderRadius: 12 }} />
      </div>
    </div>
  );

  return (
    <div className="responsive-flex jobcard-split" style={{ display: 'flex', gap: 0, height: 'calc(100vh - var(--header-height) - 60px)', overflow: 'hidden' }}>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  LEFT: Customer Directory
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="split-left" style={{
        width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--silk)', background: 'white',
        borderRadius: '12px 0 0 12px', overflow: 'hidden',
      }}>
        {/* Search */}
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone)' }} />
            <input
              ref={searchInputRef}
              autoFocus
              className="input"
              style={{ paddingLeft: 34, height: 38, fontSize: 12, borderRadius: 8, background: 'var(--bone-white)', border: '1px solid var(--silk)' }}
              placeholder="Search gauges..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ash)' }}>
            Clients ({tree.length})
          </span>
          <span style={{ fontSize: 10, color: 'var(--stone)' }}>{gauges.length} cards</span>
        </div>

        {/* Customer List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {tree.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', fontSize: 12 }}>
              No job cards found
            </div>
          ) : tree.map((customer, idx) => {
            const isActive = activeCustomer === customer.name;
            const progress = customer.totalGauges > 0 ? Math.round((customer.completed / customer.totalGauges) * 100) : 0;
            const accent = ACCENTS[idx % ACCENTS.length];
            return (
              <button
                key={customer.name}
                onClick={() => { setActiveCustomer(customer.name); setMonthFilter('ALL'); setActivePO(customer.pos[0]?.poNum || null); }}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '14px 14px', borderRadius: 10, marginBottom: 4,
                  background: isActive ? 'var(--bone-white)' : 'transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(139,105,20,0.06)' : 'none',
                  transition: 'all 0.2s',
                  borderLeft: isActive ? `3px solid ${accent}` : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                    border: `1.5px solid ${accent}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: accent,
                  }}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: isActive ? 'var(--charcoal)' : 'var(--slate)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {customer.name}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 10, color: 'var(--ash)' }}>
                      <span>{customer.pos.length} PO{customer.pos.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{customer.totalGauges} gauge{customer.totalGauges !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <div style={{ height: 4, flex: 1, borderRadius: 2, background: 'var(--silk)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2, transition: 'width 0.4s',
                          background: progress === 100 ? '#3A6B4A' : accent,
                          width: `${progress}%`,
                        }} />
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                        color: progress === 100 ? '#3A6B4A' : 'var(--ash)',
                      }}>
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  RIGHT: Customer Detail Panel
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="split-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedCustomer ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ash)' }}>
            <div style={{ textAlign: 'center' }}>
              <Briefcase size={48} style={{ color: 'var(--stone)', marginBottom: 12 }} />
              <p style={{ fontSize: 15 }}>Select a client to view their job cards</p>
            </div>
          </div>
        ) : (
          <>
            {/* Customer Header */}
            <div style={{
              padding: '20px 28px', background: 'white',
              borderBottom: '1px solid var(--silk)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0, letterSpacing: '-0.02em' }}>
                  {selectedCustomer.name}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--ash)', margin: '4px 0 0' }}>
                  {selectedCustomer.pos.length} purchase order{selectedCustomer.pos.length !== 1 ? 's' : ''} • {selectedCustomer.totalGauges} total gauges
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <StatChip icon={PlayCircle} label="Active" value={selectedCustomer.active} color="#C68B2F" />
                <StatChip icon={CheckCircle} label="Done" value={selectedCustomer.completed} color="#3A6B4A" />
                {selectedCustomer.rejected > 0 && (
                  <StatChip icon={AlertTriangle} label="NC" value={selectedCustomer.rejected} color="#8B3A3A" />
                )}
              </div>
            </div>

            {/* Month Filter + PO Tabs Row */}
            <div style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)' }}>
              {/* Month Filter */}
              {customerMonths.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 0', overflowX: 'auto' }}>
                  <Calendar size={13} color="var(--ash)" />
                  <button onClick={() => setMonthFilter('ALL')} style={{
                    padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    border: monthFilter === 'ALL' ? '1.5px solid var(--copper-bronze)' : '1px solid var(--silk)',
                    background: monthFilter === 'ALL' ? 'rgba(139,105,20,0.06)' : 'white',
                    color: monthFilter === 'ALL' ? 'var(--copper-bronze)' : 'var(--ash)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>All Time</button>
                  {customerMonths.map(m => {
                    const [y, mo] = m.split('-');
                    const label = `${MONTHS[parseInt(mo)]} ${y}`;
                    const active = monthFilter === m;
                    return (
                      <button key={m} onClick={() => setMonthFilter(m)} style={{
                        padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        border: active ? '1.5px solid var(--copper-bronze)' : '1px solid var(--silk)',
                        background: active ? 'rgba(139,105,20,0.06)' : 'white',
                        color: active ? 'var(--copper-bronze)' : 'var(--ash)',
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                      }}>{label}</button>
                    );
                  })}
                </div>
              )}

              {/* PO Tabs */}
              <div style={{ display: 'flex', gap: 0, padding: '0 20px', overflowX: 'auto' }}>
                {filteredPOs.map(po => {
                  const isActive = activePO === po.poNum;
                  const done = po.gauges.filter((g: any) => g.status === 'COMPLETED').length;
                  const orderDate = po.orderDate ? new Date(po.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
                  return (
                    <button
                      key={po.poNum}
                      onClick={() => setActivePO(po.poNum)}
                      style={{
                        padding: '12px 20px', border: 'none', cursor: 'pointer',
                        background: 'transparent',
                        borderBottom: isActive ? '2px solid var(--copper-bronze)' : '2px solid transparent',
                        color: isActive ? 'var(--copper-bronze)' : 'var(--ash)',
                        fontSize: 12, fontWeight: isActive ? 700 : 500,
                        fontFamily: "'JetBrains Mono', monospace",
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <Package size={14} />
                      <div style={{ textAlign: 'left' }}>
                        <div>{po.poNum}</div>
                        {orderDate && <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--ash)', fontFamily: 'Inter, sans-serif' }}>{orderDate}</div>}
                      </div>
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 4,
                        background: done === po.gauges.length && po.gauges.length > 0 ? '#EBF4EE' : 'var(--linen)',
                        color: done === po.gauges.length && po.gauges.length > 0 ? '#3A6B4A' : 'var(--ash)',
                        fontWeight: 700,
                      }}>
                        {done}/{po.gauges.length}
                      </span>
                    </button>
                  );
                })}
                {filteredPOs.length === 0 && (
                  <div style={{ padding: '14px 0', fontSize: 12, color: 'var(--ash)' }}>No POs found for this period</div>
                )}
              </div>
            </div>

            {/* Job Cards Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--bone-white)' }}>
              {!selectedPO || selectedPO.gauges.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--ash)' }}>
                  <Layers size={36} style={{ color: 'var(--stone)', marginBottom: 8 }} />
                  <p style={{ fontSize: 13 }}>No gauges under this PO</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                  {selectedPO.gauges.map((g: any) => {
                    const cfg = S[g.status] || S.PENDING;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={g.id}
                        onClick={() => navigate(`/job-cards/${g.id}`)}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(-3px)';
                          el.style.boxShadow = '0 8px 24px rgba(139,105,20,0.10)';
                          el.style.borderColor = cfg.color + '60';
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'none';
                          el.style.boxShadow = 'var(--shadow-card)';
                          el.style.borderColor = 'var(--silk)';
                        }}
                        style={{
                          borderRadius: 12, cursor: 'pointer',
                          background: 'white',
                          border: '1px solid var(--silk)',
                          boxShadow: 'var(--shadow-card)',
                          transition: 'all 0.25s ease',
                          position: 'relative', overflow: 'hidden',
                        }}
                      >
                        <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)` }} />

                        <div style={{ padding: '16px 18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                            <div>
                              <p style={{
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                                color: 'var(--copper-bronze)', margin: 0, letterSpacing: '-0.01em',
                              }}>
                                {g.serialNumber}
                              </p>
                              <p style={{ fontSize: 13, color: 'var(--slate)', margin: '3px 0 0', fontWeight: 500 }}>
                                {g.gaugeTypeName}
                              </p>
                            </div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                              background: cfg.bg, color: cfg.color, letterSpacing: '0.02em',
                            }}>
                              <Icon size={12} />
                              {cfg.label}
                            </span>
                          </div>

                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                            gap: 0, borderRadius: 8, overflow: 'hidden',
                            border: '1px solid var(--silk)', background: 'var(--bone-white)',
                          }}>
                            <DataCell label="Nominal Size" value={`${g.nominalSize} ${g.sizeUnit}`} mono border />
                            <DataCell label="Material" value={g.materialGrade || '—'} border />
                            <DataCell label="NC" value={g.rejectionCount > 0 ? `${g.rejectionCount} issue${g.rejectionCount !== 1 ? 's' : ''}` : 'Clean'} alert={g.rejectionCount > 0} />
                          </div>

                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--silk)',
                          }}>
                            <span style={{ fontSize: 10, color: 'var(--ash)' }}>
                              Created {new Date(g.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontSize: 11, fontWeight: 600, color: 'var(--copper-bronze)',
                            }}>
                              View Card <ArrowRight size={12} />
                            </span>
                          </div>
                        </div>

                        {g.status === 'COMPLETED' && (
                          <div style={{
                            position: 'absolute', top: 14, right: -28,
                            background: '#3A6B4A', color: 'white',
                            fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
                            padding: '3px 32px', transform: 'rotate(45deg)',
                            textTransform: 'uppercase',
                          }}>
                            DONE
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ━━━ Sub-components ━━━ */
function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: color + '08', border: `1px solid ${color}20`,
    }}>
      <Icon size={14} color={color} />
      <div>
        <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color, margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}

function DataCell({ label, value, mono, border, alert }: { label: string; value: string; mono?: boolean; border?: boolean; alert?: boolean }) {
  return (
    <div style={{ padding: '10px 12px', borderRight: border ? '1px solid var(--silk)' : undefined }}>
      <span style={{ display: 'block', fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--stone)', marginBottom: 3 }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: alert ? '#8B3A3A' : 'var(--charcoal)',
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
