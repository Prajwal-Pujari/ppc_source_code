import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getPurchaseOrder, getPurchaseOrderGauges, getPurchaseOrderLineItems, confirmPurchaseOrder } from '@/api/purchase-orders.api';
import { getGaugeMasters } from '@/api/gauge-master.api';
import api from '@/lib/axios';
import type { PurchaseOrder, Gauge } from '@/types/domain.types';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Package, Plus, Edit3, Trash2, Layers } from 'lucide-react';

import PoProcessingLoader from '@/components/ui/loader/PoProcessingLoader';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-pending', CONFIRMED: 'badge-queued', IN_PROGRESS: 'badge-in-progress',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-rejected',
};
const gaugeBadge: Record<string, string> = {
  PENDING: 'badge-pending', IN_PRODUCTION: 'badge-in-progress', ON_HOLD: 'badge-on-hold',
  COMPLETED: 'badge-completed', REJECTED: 'badge-rejected',
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ gaugeMasterId: '', nominalSize: '', quantity: '1', sizeUnit: 'mm', materialGradeOverride: '', lineNotes: '' });

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
      // Create a new PO with the added line item by calling a custom endpoint
      const res = await api.post(`/purchase-orders/${id}/line-items`, item);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      setShowAddItem(false);
      setNewItem({ gaugeMasterId: '', nominalSize: '', quantity: '1', sizeUnit: 'mm', materialGradeOverride: '', lineNotes: '' });
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

  return (
    <div>
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
      <div className="table-container" style={{ marginBottom: 20 }}>
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
        <table>
          <thead>
            <tr>
              <th>Gauge Type</th>
              <th>Nominal Size</th>
              <th>Unit</th>
              <th>Qty</th>
              <th>Material Override</th>
              <th>Notes</th>
              {isDraft && <th style={{ width: 60 }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {lineItemsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: isDraft ? 7 : 6 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>))}</tr>
              ))
            ) : lineItems.length === 0 ? (
              <tr>
                <td colSpan={isDraft ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>
                  {isDraft ? 'No line items yet. Click "Add Item" above to add gauges to this order.' : 'No line items found.'}
                </td>
              </tr>
            ) : (
              lineItems.map((li: any) => {
                console.log('line item:', li);
                return (
                  <tr key={li.id}>
                    <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{li.gaugeMaster?.gaugeTypeName || '—'}</td>
                    <td className="font-mono">{li.nominalSize}</td>
                    <td>{li.sizeUnit || 'mm'}</td>
                    <td className="font-mono" style={{ fontWeight: 600 }}>{li.quantity}</td>
                    <td style={{ fontSize: 13 }}>{li.materialGradeOverride || '—'}</td>
                    <td style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{li.lineNotes || '—'}</td>
                    {isDraft && (
                      <td>
                        <button onClick={() => { if (confirm('Delete this line item?')) deleteLineItemMut.mutate(li.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Line Item Modal */}
      {showAddItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
          onClick={() => setShowAddItem(false)}>
          <div className="card" style={{ padding: 28, width: 480, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
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
                  <input className="input" type="number" step="0.0001" value={newItem.nominalSize} onChange={e => setNewItem(p => ({ ...p, nominalSize: e.target.value }))} placeholder="e.g. 25.0000" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Unit</label>
                  <select className="input" value={newItem.sizeUnit} onChange={e => setNewItem(p => ({ ...p, sizeUnit: e.target.value }))}>
                    <option value="mm">mm</option><option value="inch">inch</option>
                  </select>
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
                onClick={() => addLineItemMut.mutate({ gaugeMasterId: newItem.gaugeMasterId, nominalSize: parseFloat(newItem.nominalSize), quantity: parseInt(newItem.quantity), sizeUnit: newItem.sizeUnit, materialGradeOverride: newItem.materialGradeOverride || null, lineNotes: newItem.lineNotes || null })}>
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