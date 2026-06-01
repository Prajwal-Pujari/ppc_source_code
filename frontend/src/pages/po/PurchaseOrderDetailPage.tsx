import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getPurchaseOrder, getPurchaseOrderGauges, getPurchaseOrderLineItems, confirmPurchaseOrder } from '@/api/purchase-orders.api';
import { getGaugeMasters } from '@/api/gauge-master.api';
import api from '@/lib/axios';
import type { PurchaseOrder, Gauge } from '@/types/domain.types';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Package, Plus, Trash2, Layers, ChevronDown, Ruler, Target, Shield, Printer } from 'lucide-react';

import PoProcessingLoader from '@/components/ui/loader/PoProcessingLoader';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-pending', CONFIRMED: 'badge-queued', IN_PROGRESS: 'badge-in-progress',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-rejected',
};
const gaugeBadge: Record<string, string> = {
  PENDING: 'badge-pending', IN_PRODUCTION: 'badge-in-progress', ON_HOLD: 'badge-on-hold',
  COMPLETED: 'badge-completed', REJECTED: 'badge-rejected',
};

const css = `
  .li-expand-btn { background: none; border: none; cursor: pointer; color: var(--ash); padding: 4px; transition: transform 0.2s; }
  .li-expand-btn.open { transform: rotate(180deg); }
  .li-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
  .tol-card { background: var(--bone-white); border: 1px solid var(--silk); border-radius: 10px; padding: 16px 18px; }
  .tol-card h5 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px; display: flex; align-items: center; gap: 6px; }
  .tol-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(0,0,0,0.04); }
  .tol-row:last-child { border-bottom: none; }
  .tol-label { font-size: 12px; color: var(--ash); font-weight: 500; }
  .tol-val { font-size: 13px; font-weight: 600; color: var(--charcoal); font-family: 'JetBrains Mono', monospace; }
  .tol-val.go { color: #228B22; }
  .tol-val.nogo { color: #BA1A1A; }
  .tol-val.wear { color: #B8860B; }
  .is3455-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.04em; }
  .is3455-badge.plug { background: rgba(30,58,138,0.08); color: #1E3A8A; border: 1px solid rgba(30,58,138,0.15); }
  .is3455-badge.snap { background: rgba(139,105,20,0.08); color: #6F5100; border: 1px solid rgba(139,105,20,0.15); }
  .line-item-card { border: 1px solid var(--silk); border-radius: 12px; overflow: hidden; background: white; transition: box-shadow 0.2s; }
  .line-item-card:hover { box-shadow: 0 4px 16px rgba(48,49,47,0.06); }
  .line-item-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; cursor: pointer; user-select: none; }
  .line-item-header:hover { background: rgba(0,0,0,0.01); }
  .line-item-body { padding: 0 20px 20px; border-top: 1px solid var(--silk); }
  .formula-box { background: linear-gradient(135deg, rgba(30,58,138,0.03), rgba(30,58,138,0.01)); border: 1px solid rgba(30,58,138,0.1); border-radius: 8px; padding: 12px 16px; font-size: 12px; color: var(--slate); line-height: 1.6; }
  .formula-box code { font-family: 'JetBrains Mono', monospace; background: rgba(30,58,138,0.06); padding: 1px 5px; border-radius: 4px; font-size: 11px; color: #1E3A8A; }
`;

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    gaugeMasterId: '', nominalSize: '', quantity: '1', sizeUnit: 'mm',
    materialGradeOverride: '', lineNotes: '', toleranceType: '', higherSize: '', lowerSize: ''
  });
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['po', id], queryFn: () => getPurchaseOrder(id!), enabled: !!id, staleTime: 0,
  });

  const { data: gaugesData, isLoading: gaugesLoading } = useQuery({
    queryKey: ['po-gauges', id], queryFn: () => getPurchaseOrderGauges(id!), enabled: !!id, staleTime: 0,
  });

  const { data: lineItemsData, isLoading: lineItemsLoading } = useQuery({
    queryKey: ['po-line-items', id], queryFn: () => getPurchaseOrderLineItems(id!), enabled: !!id, staleTime: 0,
  });

  const { data: gaugeMastersData } = useQuery({
    queryKey: ['gauge-masters-dropdown'], queryFn: () => getGaugeMasters({ size: 100 }), enabled: showAddItem,
  });

  const po: PurchaseOrder | undefined = poData?.data;
  const gauges: Gauge[] = gaugesData?.data ?? [];
  const lineItems: any[] = lineItemsData?.data ?? [];
  const gaugeMasters = gaugeMastersData?.data?.content || [];

  useEffect(() => { if (po?.poNumber) setPageTitle(`PO: ${po.poNumber}`); }, [po, setPageTitle]);

  const confirmMut = useMutation({
    mutationFn: () => confirmPurchaseOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      queryClient.invalidateQueries({ queryKey: ['po-gauges', id] });
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
    },
  });

  const addLineItemMut = useMutation({
    mutationFn: async (item: any) => {
      const res = await api.post(`/purchase-orders/${id}/line-items`, item);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      setShowAddItem(false);
      setNewItem({
        gaugeMasterId: '', nominalSize: '', quantity: '1', sizeUnit: 'mm',
        materialGradeOverride: '', lineNotes: '', toleranceType: '', higherSize: '', lowerSize: ''
      });
    },
  });

  const deleteLineItemMut = useMutation({
    mutationFn: async (lineItemId: string) => {
      const res = await api.delete(`/purchase-orders/${id}/line-items/${lineItemId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
      queryClient.invalidateQueries({ queryKey: ['po', id] });
    },
  });

  if (poLoading) {
    return <PoProcessingLoader />;
  }

  if (!po) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>
        Purchase order not found.{' '}
        <button onClick={() => navigate('/purchase-orders')} style={{ color: 'var(--copper-bronze)', background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button>
      </div>
    );
  }

  const progress = po.totalGauges > 0 ? Math.round((po.completedGauges / po.totalGauges) * 100) : 0;
  const inProgressCount = gauges.filter(g => g.status === 'IN_PRODUCTION').length;
  const isDraft = po.status === 'DRAFT';

  const toggleItem = (itemId: string) => setExpandedItems(p => ({ ...p, [itemId]: !p[itemId] }));

  const fmt = (v: any) => {
    if (v == null || v === '') return '—';
    const n = typeof v === 'number' ? v : parseFloat(v);
    if (isNaN(n)) return String(v);
    return n.toFixed(4);
  };

  return (
    <div>
      <style>{css}</style>
      <button onClick={() => navigate('/purchase-orders')} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500, marginBottom: 20,
      }}>
        <ArrowLeft size={16} /> Back to Orders
      </button>

      {/* Header Card */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h2 className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)' }}>{po.poNumber}</h2>
              <span className={`badge ${statusBadge[po.status] || 'badge-pending'}`}>{po.status?.replace(/_/g, ' ')}</span>
            </div>
            <p style={{ fontSize: 15, color: 'var(--slate)' }}>{po.customer?.name ?? '—'}</p>
          </div>
          {isDraft && lineItems.length > 0 && (
            <button className="btn btn-primary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle size={16} style={{ marginRight: 6 }} />
              {confirmMut.isPending ? 'Confirming…' : 'Confirm PO'}
            </button>
          )}
          {progress === 100 && (
            <div style={{ display: 'flex', gap: 10 }}>
               <button className="btn btn-secondary" onClick={() => window.open(`/print/po/${id}/job-cards`, '_blank')} style={{ minHeight: 36, fontSize: 13 }}>
                 <Printer size={16} style={{ marginRight: 6 }} /> Print Job Cards
               </button>
               <button className="btn btn-primary" onClick={() => window.open(`/print/po/${id}/calibration`, '_blank')} style={{ minHeight: 36, fontSize: 13 }}>
                 <Printer size={16} style={{ marginRight: 6 }} /> Print Calibration Reports
               </button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 24 }}>
          <InfoBlock label="Order Date" value={po.orderDate} mono />
          <InfoBlock label="Delivery Date" value={po.expectedDeliveryDate || '—'} mono />
          <InfoBlock label="Priority" value={po.priority}
            color={po.priority === 'URGENT' ? 'var(--status-rejected)' : po.priority === 'HIGH' ? 'var(--status-in-progress)' : 'var(--ash)'} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progress</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <div style={{ height: 8, flex: 1, borderRadius: 4, background: 'var(--silk)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: progress === 100 ? 'var(--status-completed)' : 'var(--copper-bronze)', width: `${progress}%`, transition: 'width 0.3s ease' }} />
              </div>
              <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{progress}%</span>
            </div>
          </div>
        </div>

        {po.specialInstructions && (
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'var(--status-in-progress-bg)', border: '1px solid rgba(198,139,47,0.15)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--status-in-progress)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Special Instructions</span>
            <p style={{ fontSize: 13, color: 'var(--charcoal)', marginTop: 4 }}>{po.specialInstructions}</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard icon={<Package size={18} />} label="Total Gauges" value={po.totalGauges ?? 0} color="var(--copper-bronze)" />
        <StatCard icon={<CheckCircle size={18} />} label="Completed" value={po.completedGauges ?? 0} color="var(--status-completed)" />
        <StatCard icon={<Clock size={18} />} label="In Production" value={inProgressCount} color="var(--status-in-progress)" />
        <StatCard icon={<AlertTriangle size={18} />} label="Rejected" value={po.rejectedGauges ?? 0} color="var(--status-rejected)" />
      </div>

      {/* Draft Banner */}
      {isDraft && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(139,105,20,0.06)', border: '1px solid rgba(139,105,20,0.2)', marginBottom: 16, fontSize: 13, color: 'var(--copper-bronze)',
        }}>
          <AlertTriangle size={15} />
          This PO is a <strong>Draft</strong>. Add line items below, then click <strong>Confirm PO</strong> to generate job cards.
        </div>
      )}

      {/* ══════ LINE ITEMS SECTION ══════ */}
      <div className="card" style={{ marginBottom: 20, overflow: 'visible' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={16} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>Line Items</h3>
            {!lineItemsLoading && <span style={{ fontSize: 12, color: 'var(--ash)', background: 'var(--bone-white)', borderRadius: 10, padding: '1px 8px' }}>{lineItems.length}</span>}
          </div>
          {isDraft && (
            <button className="btn btn-primary" style={{ minHeight: 34, fontSize: 12, padding: '0 14px' }} onClick={() => setShowAddItem(true)}>
              <Plus size={14} style={{ marginRight: 4 }} /> Add Item
            </button>
          )}
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lineItemsLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
            ))
          ) : lineItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)', border: '2px dashed var(--silk)', borderRadius: 10 }}>
              {isDraft ? 'No line items yet. Click "Add Item" above to add gauges to this order.' : 'No line items found.'}
            </div>
          ) : (
            lineItems.map((li: any, idx: number) => {
              const isOpen = expandedItems[li.id] ?? false;
              const hasCalc = li.goSize != null || li.nogoSize != null;
              const isPlug = li.toleranceType?.toUpperCase() === 'PLUG';

              return (
                <div key={li.id} className="line-item-card">
                  {/* Header - always visible */}
                  <div className="line-item-header" onClick={() => toggleItem(li.id)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--copper-bronze)', background: 'rgba(139,105,20,0.08)', padding: '4px 10px', borderRadius: 6, flexShrink: 0, marginTop: 2 }}>
                        #{idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Row 1: Gauge type + badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, color: 'var(--charcoal)', fontSize: 15 }}>{li.gaugeMaster?.gaugeTypeName || '—'}</span>
                          {li.toleranceType && (
                            <span className={`is3455-badge ${isPlug ? 'plug' : 'snap'}`}>
                              {isPlug ? <Target size={10} /> : <Shield size={10} />}
                              {li.toleranceType.toUpperCase()} GAUGE
                            </span>
                          )}
                        </div>
                        {/* Row 2: Key details - always visible, bold */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', background: 'rgba(30,58,138,0.06)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(30,58,138,0.1)' }}>
                            {li.nominalSize || '—'} {li.sizeUnit || 'mm'}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', background: 'var(--bone-white)', padding: '3px 10px', borderRadius: 6, border: '1px solid var(--silk)' }}>
                            Qty: {li.quantity}
                          </span>
                          {li.materialGradeOverride && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#6F5100', background: 'rgba(139,105,20,0.06)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(139,105,20,0.12)' }}>
                              {li.materialGradeOverride}
                            </span>
                          )}
                          {li.lineNotes && (
                            <span style={{ fontSize: 12, color: 'var(--slate)', fontStyle: 'italic', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              📝 {li.lineNotes}
                            </span>
                          )}
                        </div>
                        {/* Row 3: Quick GO/NOGO summary when collapsed */}
                        {!isOpen && hasCalc && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: '#228B22', fontWeight: 600 }}>
                              GO: <span className="font-mono">{fmt(li.goTolMinus)} — {fmt(li.goTolPlus)}</span>
                            </span>
                            <span style={{ fontSize: 12, color: '#BA1A1A', fontWeight: 600 }}>
                              NOGO: <span className="font-mono">{fmt(li.nogoTolMinus)} — {fmt(li.nogoTolPlus)}</span>
                            </span>
                            <span style={{ fontSize: 12, color: '#B8860B', fontWeight: 600 }}>
                              Wear: <span className="font-mono">{fmt(li.wearLimit)}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {isDraft && (
                        <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this line item?')) deleteLineItemMut.mutate(li.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                      <ChevronDown size={16} className={`li-expand-btn ${isOpen ? 'open' : ''}`} />
                    </div>
                  </div>

                  {/* Expandable Detail */}
                  {isOpen && (
                    <div className="line-item-body" style={{ paddingTop: 16 }}>
                      {/* Higher / Lower / Tolerance T */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                        <MiniField label="Higher Size" value={fmt(li.higherSize)} />
                        <MiniField label="Lower Size" value={fmt(li.lowerSize)} />
                        <MiniField label="Workpiece Tolerance (T)" value={fmt(li.workpieceToleranceT)} />
                        <MiniField label="Matched Range" value={li.matchedRange || '—'} />
                        <MiniField label="Matched Grade" value={li.matchedGrade ? `IT ${li.matchedGrade}` : '—'} />
                      </div>

                      {hasCalc ? (
                        <>
                          {/* IS 3455 Constants */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                            <div className="tol-card">
                              <h5 style={{ color: '#1E3A8A' }}><span style={{ fontSize: 13 }}>H/2</span></h5>
                              <span className="tol-val">{fmt(li.gaugeToleranceH)}</span>
                            </div>
                            <div className="tol-card">
                              <h5 style={{ color: '#6F5100' }}><span style={{ fontSize: 13 }}>Y</span> (Wear)</h5>
                              <span className="tol-val">{fmt(li.wearAllowanceY)}</span>
                            </div>
                            <div className="tol-card">
                              <h5 style={{ color: '#1E3A8A' }}><span style={{ fontSize: 13 }}>Z</span> (Allowance)</h5>
                              <span className="tol-val">{fmt(li.gaugeAllowanceZ)}</span>
                            </div>
                            <div className="tol-card">
                              <h5 style={{ color: '#BA1A1A' }}><span style={{ fontSize: 13 }}>A</span> (NOGO Wear)</h5>
                              <span className="tol-val">{fmt(li.nogoWearAllowanceA)}</span>
                            </div>
                          </div>

                          {/* GO / NOGO / Wear Limit */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            {/* GO */}
                            <div className="tol-card" style={{ borderLeft: '3px solid #228B22' }}>
                              <h5 style={{ color: '#228B22' }}>
                                <CheckCircle size={12} /> GO Gauge
                              </h5>
                              <div className="tol-row">
                                <span className="tol-label">Center</span>
                                <span className="tol-val go">{fmt(li.goSize)}</span>
                              </div>
                              <div className="tol-row">
                                <span className="tol-label">GO (+)</span>
                                <span className="tol-val go">{fmt(li.goTolPlus)}</span>
                              </div>
                              <div className="tol-row">
                                <span className="tol-label">GO (−)</span>
                                <span className="tol-val go">{fmt(li.goTolMinus)}</span>
                              </div>
                            </div>

                            {/* NOGO */}
                            <div className="tol-card" style={{ borderLeft: '3px solid #BA1A1A' }}>
                              <h5 style={{ color: '#BA1A1A' }}>
                                <AlertTriangle size={12} /> NOGO Gauge
                              </h5>
                              <div className="tol-row">
                                <span className="tol-label">Center</span>
                                <span className="tol-val nogo">{fmt(li.nogoSize)}</span>
                              </div>
                              <div className="tol-row">
                                <span className="tol-label">NOGO (+)</span>
                                <span className="tol-val nogo">{fmt(li.nogoTolPlus)}</span>
                              </div>
                              <div className="tol-row">
                                <span className="tol-label">NOGO (−)</span>
                                <span className="tol-val nogo">{fmt(li.nogoTolMinus)}</span>
                              </div>
                            </div>

                            {/* Wear Limit */}
                            <div className="tol-card" style={{ borderLeft: '3px solid #B8860B' }}>
                              <h5 style={{ color: '#B8860B' }}>
                                <Shield size={12} /> Wear Limit
                              </h5>
                              <div className="tol-row">
                                <span className="tol-label">Wear Limit</span>
                                <span className="tol-val wear">{fmt(li.wearLimit)}</span>
                              </div>
                              {isPlug ? (
                                <div className="formula-box" style={{ marginTop: 8 }}>
                                  <code>Lower − Y</code> = {fmt(li.lowerSize)} − {fmt(li.wearAllowanceY)}
                                </div>
                              ) : (
                                <div className="formula-box" style={{ marginTop: 8 }}>
                                  <code>Higher + Y</code> = {fmt(li.higherSize)} + {fmt(li.wearAllowanceY)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Formulas summary */}
                          <div className="formula-box" style={{ marginTop: 16 }}>
                            <strong style={{ color: '#1E3A8A', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              IS 3455 Calculation Summary ({isPlug ? 'Plug' : 'Snap'} Gauge)
                            </strong>
                            <div style={{ marginTop: 8 }}>
                              {isPlug ? (
                                <>
                                  <div>GO Center = <code>Lower + Z</code> = {fmt(li.lowerSize)} + {fmt(li.gaugeAllowanceZ)} = <strong>{fmt(li.goSize)}</strong></div>
                                  <div>NOGO Center = <code>Higher</code> = <strong>{fmt(li.nogoSize)}</strong></div>
                                  <div>Wear Limit = <code>Lower − Y</code> = {fmt(li.lowerSize)} − {fmt(li.wearAllowanceY)} = <strong>{fmt(li.wearLimit)}</strong></div>
                                </>
                              ) : (
                                <>
                                  <div>GO Center = <code>Higher − Z</code> = {fmt(li.higherSize)} − {fmt(li.gaugeAllowanceZ)} = <strong>{fmt(li.goSize)}</strong></div>
                                  <div>NOGO Center = <code>Lower</code> = <strong>{fmt(li.nogoSize)}</strong></div>
                                  <div>Wear Limit = <code>Higher + Y</code> = {fmt(li.higherSize)} + {fmt(li.wearAllowanceY)} = <strong>{fmt(li.wearLimit)}</strong></div>
                                </>
                              )}
                              <div style={{ marginTop: 4 }}>Tolerance Band = <code>±H/2</code> = ±{fmt(li.gaugeToleranceH)}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ash)', background: 'var(--bone-white)', borderRadius: 8, border: '1px dashed var(--silk)' }}>
                          No IS 3455 calculations available. Enter tolerance type, higher and lower sizes during PO creation.
                        </div>
                      )}

                      {/* Notes */}
                      {li.lineNotes && (
                        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(139,105,20,0.04)', border: '1px solid rgba(139,105,20,0.12)', fontSize: 13, color: 'var(--slate)' }}>
                          <strong style={{ color: '#6F5100' }}>Notes:</strong> {li.lineNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Line Item Modal */}
      {showAddItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={() => setShowAddItem(false)}>
          <div className="card" style={{ padding: 28, width: 520, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20 }}>Add Line Item</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Gauge Type *</label>
                <select className="input" value={newItem.gaugeMasterId} onChange={e => setNewItem(p => ({ ...p, gaugeMasterId: e.target.value }))}>
                  <option value="">Select gauge type...</option>
                  {gaugeMasters.map((gm: any) => <option key={gm.id} value={gm.id}>{gm.gaugeTypeName} ({gm.categoryCode})</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Nominal Size *</label>
                  <input className="input font-mono" type="text" value={newItem.nominalSize} onChange={e => setNewItem(p => ({ ...p, nominalSize: e.target.value }))} placeholder="e.g. 34.50g6" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Unit</label>
                  <select className="input" value={newItem.sizeUnit} onChange={e => setNewItem(p => ({ ...p, sizeUnit: e.target.value }))}>
                    <option value="mm">mm</option><option value="inch">inch</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Tolerance Type</label>
                <select className="input" value={newItem.toleranceType} onChange={e => setNewItem(p => ({ ...p, toleranceType: e.target.value }))}>
                  <option value="">Select type...</option>
                  <option value="PLUG">Plug (Hole)</option>
                  <option value="SNAP">Snap (Shaft)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Higher Size</label>
                  <input className="input font-mono" type="number" step="0.0001" value={newItem.higherSize} onChange={e => setNewItem(p => ({ ...p, higherSize: e.target.value }))} placeholder="e.g. 25.021" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Lower Size</label>
                  <input className="input font-mono" type="number" step="0.0001" value={newItem.lowerSize} onChange={e => setNewItem(p => ({ ...p, lowerSize: e.target.value }))} placeholder="e.g. 25.000" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Quantity *</label>
                <input className="input" type="number" min="1" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Material Grade Override</label>
                <input className="input" value={newItem.materialGradeOverride} onChange={e => setNewItem(p => ({ ...p, materialGradeOverride: e.target.value }))} placeholder="Leave blank for default" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Notes</label>
                <textarea className="input" value={newItem.lineNotes} onChange={e => setNewItem(p => ({ ...p, lineNotes: e.target.value }))} rows={2} style={{ resize: 'vertical', minHeight: 40, padding: 10 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-primary" disabled={!newItem.gaugeMasterId || !newItem.nominalSize || !newItem.quantity || addLineItemMut.isPending}
                onClick={() => addLineItemMut.mutate({
                  gaugeMasterId: newItem.gaugeMasterId,
                  nominalSize: newItem.nominalSize,
                  quantity: parseInt(newItem.quantity),
                  sizeUnit: newItem.sizeUnit,
                  materialGradeOverride: newItem.materialGradeOverride || null,
                  lineNotes: newItem.lineNotes || null,
                  toleranceType: newItem.toleranceType || null,
                  higherSize: newItem.higherSize ? parseFloat(newItem.higherSize) : null,
                  lowerSize: newItem.lowerSize ? parseFloat(newItem.lowerSize) : null,
                })}>
                {addLineItemMut.isPending ? 'Adding...' : 'Add Item'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddItem(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ JOB CARDS TABLE ══════ */}
      {!isDraft && (
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>Job Cards</h3>
            {!gaugesLoading && <span style={{ fontSize: 12, color: 'var(--ash)', background: 'var(--bone-white)', borderRadius: 10, padding: '1px 8px' }}>{gauges.length}</span>}
          </div>
          <table>
            <thead>
              <tr><th>Serial Number</th><th>Gauge Type</th><th>Size</th><th>Material</th><th>Status</th><th>NC Count</th></tr>
            </thead>
            <tbody>
              {gaugesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>))}</tr>
                ))
              ) : gauges.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No job cards found</td></tr>
              ) : (
                gauges.map((g: Gauge) => (
                  <tr key={g.id} onClick={() => navigate(`/job-cards/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--copper-bronze)' }}>{g.serialNumber}</td>
                    <td>{g.gaugeTypeName}</td>
                    <td className="font-mono">{g.nominalSize} {g.sizeUnit}</td>
                    <td>{g.materialGrade || '—'}</td>
                    <td><span className={`badge ${gaugeBadge[g.status] || 'badge-pending'}`}>{g.status?.replace(/_/g, ' ')}</span></td>
                    <td className="font-mono">{g.rejectionCount ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{value}</span>
    </div>
  );
}

function InfoBlock({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <p className={mono ? 'font-mono' : ''} style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--charcoal)', marginTop: 4 }}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      <div>
        <p className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)' }}>{value}</p>
        <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      </div>
    </div>
  );
}