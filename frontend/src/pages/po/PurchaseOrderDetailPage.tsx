import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getPurchaseOrder, getPurchaseOrderGauges, getPurchaseOrderLineItems, confirmPurchaseOrder, updatePurchaseOrder, updateLineItem } from '@/api/purchase-orders.api';
import { getGaugeMasters } from '@/api/gauge-master.api';
import { machinesApi } from '@/api/machines.api';
import { shiftsApi } from '@/api/shifts.api';
import { updateLineItemOperation } from '@/api/purchase-orders.api';
import api from '@/lib/axios';
import type { PurchaseOrder, Gauge } from '@/types/domain.types';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, Package, Plus, Edit3, Trash2, Layers, ChevronDown, ChevronRight, Settings } from 'lucide-react';

import PoProcessingLoader from '@/components/ui/loader/PoProcessingLoader';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-pending', CONFIRMED: 'badge-queued', IN_PROGRESS: 'badge-in-progress',
  COMPLETED: 'badge-completed', CANCELLED: 'badge-rejected',
};
const gaugeBadge: Record<string, string> = {
  PENDING: 'badge-pending', IN_PRODUCTION: 'badge-in-progress', ON_HOLD: 'badge-on-hold',
  COMPLETED: 'badge-completed', REJECTED: 'badge-rejected',
};

export default function PurchaseOrderDetailPage({ isPqcMode = false }: { isPqcMode?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showAddItem, setShowAddItem] = useState(false);
  const [expandedLineItemId, setExpandedLineItemId] = useState<string | null>(null);
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});
  const [localCycleTimes, setLocalCycleTimes] = useState<Record<string, number>>({});
  const qtyTimeoutRef = useRef<any>(null);
  const cycleTimeTimeoutRef = useRef<any>(null);
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
    queryKey: ['gauge-masters-dropdown'], queryFn: () => getGaugeMasters({ size: 1000, isActive: true }), enabled: showAddItem,
  });

  const { data: machinesData } = useQuery({
    queryKey: ['machines-all'], queryFn: () => machinesApi.getAll(),
  });

  const { data: shiftsData } = useQuery({
    queryKey: ['shifts-all'], queryFn: () => shiftsApi.getAll(),
  });

  const po: PurchaseOrder | undefined = poData?.data;
  const gauges: Gauge[] = gaugesData?.data ?? [];
  const lineItems: any[] = lineItemsData?.data ?? [];
  const gaugeMasters = gaugeMastersData?.data?.content || [];
  const machines = machinesData?.data || [];
  const shifts = shiftsData?.data || [];

  useEffect(() => { if (po?.poNumber) setPageTitle(`PO: ${po.poNumber}`); }, [po, setPageTitle]);

  const confirmMut = useMutation({
    mutationFn: () => confirmPurchaseOrder(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po', id] });
      queryClient.invalidateQueries({ queryKey: ['po-gauges', id] });
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
    },
  });

  const updatePoMut = useMutation({
    mutationFn: (data: { orderDate?: string; expectedDeliveryDate?: string }) => updatePurchaseOrder(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po', id] });
    },
  });

  const updateLineItemMut = useMutation({
    mutationFn: ({ lineItemId, quantity }: { lineItemId: string, quantity: number }) => updateLineItem(id!, lineItemId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
      queryClient.invalidateQueries({ queryKey: ['po', id] });
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

  const updateOperationMut = useMutation({
    mutationFn: (data: { lineItemId: string; opId: string; machineMasterId: string | null; cycleTimeMins: number | null }) => 
      updateLineItemOperation(id!, data.lineItemId, data.opId, { machineMasterId: data.machineMasterId, cycleTimeMins: data.cycleTimeMins }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-line-items', id] });
    },
  });

  const handleQuantityChange = useCallback((lineItemId: string, valStr: string) => {
    const newQty = parseInt(valStr, 10);
    if (isNaN(newQty) || newQty <= 0) return;
    setLocalQuantities(prev => ({ ...prev, [lineItemId]: newQty }));
    if (qtyTimeoutRef.current) clearTimeout(qtyTimeoutRef.current);
    qtyTimeoutRef.current = setTimeout(() => {
      updateLineItemMut.mutate({ lineItemId, quantity: newQty });
    }, 500);
  }, [updateLineItemMut]);

  const handleCycleTimeChange = useCallback((lineItemId: string, op: any, valStr: string) => {
    const val = valStr ? parseFloat(valStr) : 0;
    setLocalCycleTimes(prev => ({ ...prev, [op.id]: val }));
    if (cycleTimeTimeoutRef.current) clearTimeout(cycleTimeTimeoutRef.current);
    cycleTimeTimeoutRef.current = setTimeout(() => {
      updateOperationMut.mutate({ lineItemId, opId: op.id, machineMasterId: op.machineMaster?.id || null, cycleTimeMins: val || null });
    }, 500);
  }, [updateOperationMut]);

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
  
  // Calculate available days for production
  let daysAvailable = 1;
  if (po.orderDate) {
    const start = new Date(po.orderDate);
    const end = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : start;
    let diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) diffTime = 0;
    daysAvailable = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <div>
      <button onClick={() => navigate(isPqcMode ? '/pqc/po-tracker' : '/purchase-orders')} style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500, marginBottom: 20,
      }}>
        <ArrowLeft size={16} /> {isPqcMode ? 'Back to PO Tracker' : 'Back to Orders'}
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
          {!isPqcMode && isDraft && lineItems.length > 0 && (
            <button className="btn btn-primary" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle size={16} style={{ marginRight: 6 }} />
              {confirmMut.isPending ? 'Confirming…' : 'Confirm PO'}
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 24 }}>
          {isDraft && !isPqcMode ? (
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order Date</span>
              <input type="date" className="input" defaultValue={po.orderDate} 
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== po.orderDate) {
                    updatePoMut.mutate({ orderDate: e.target.value });
                  }
                }}
                style={{ marginTop: 4, width: '100%', padding: '6px 12px', height: 32 }} />
            </div>
          ) : (
            <InfoBlock label="Order Date" value={po.orderDate} mono />
          )}
          
          {isDraft && !isPqcMode ? (
            <div>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery Date</span>
              <input type="date" className="input" defaultValue={po.expectedDeliveryDate || ''} 
                onBlur={(e) => {
                  if (e.target.value !== (po.expectedDeliveryDate || '')) {
                    updatePoMut.mutate({ expectedDeliveryDate: e.target.value || undefined });
                  }
                }}
                style={{ marginTop: 4, width: '100%', padding: '6px 12px', height: 32 }} />
            </div>
          ) : (
            <InfoBlock label="Delivery Date" value={po.expectedDeliveryDate || '---'} mono />
          )}
          
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
        <StatCard icon={<Package size={18} />} label="Total Parts / Products" value={po.totalGauges ?? 0} color="var(--copper-bronze)" />
        <StatCard icon={<CheckCircle size={18} />} label="Completed" value={po.completedGauges ?? 0} color="var(--status-completed)" />
        <StatCard icon={<Clock size={18} />} label="In Production" value={inProgressCount} color="var(--status-in-progress)" />
        <StatCard icon={<AlertTriangle size={18} />} label="Rejected" value={po.rejectedGauges ?? 0} color="var(--status-rejected)" />
      </div>

      {/* Draft Banner */}
      {!isPqcMode && isDraft && (
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
          {!isPqcMode && isDraft && (
            <button className="btn btn-primary" style={{ minHeight: 34, fontSize: 12, padding: '0 14px' }} onClick={() => setShowAddItem(true)}>
              <Plus size={14} style={{ marginRight: 4 }} /> Add Item
            </button>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Part / Product Name</th>
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
                <tr key={i}>{Array.from({ length: (!isPqcMode && isDraft) ? 8 : 7 }).map((_, j) => (<td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>))}</tr>
              ))
            ) : lineItems.length === 0 ? (
              <tr>
                <td colSpan={(!isPqcMode && isDraft) ? 8 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>
                  {isDraft ? 'No line items yet. Click "Add Item" above to Add Part / Products to this order.' : 'No line items found.'}
                </td>
              </tr>
            ) : (
              lineItems.map((li: any) => {
                const isExpanded = expandedLineItemId === li.id;
                const currentQuantity = localQuantities[li.id] ?? li.quantity;
                
                // Calculate Production Estimates
                const totalCycleTimeMins = li.operations?.reduce((sum: number, op: any) => sum + (localCycleTimes[op.id] ?? op.cycleTimeMins ?? 0), 0) || 0;
                const totalTimeForQtyMins = totalCycleTimeMins * currentQuantity;
                const partsPerHour = totalCycleTimeMins > 0 ? (60 / totalCycleTimeMins) : 0;
                
                return (
                  <React.Fragment key={li.id}>
                    <tr style={isExpanded ? { background: 'rgba(139,105,20,0.03)' } : {}}>
                      <td style={{ paddingLeft: 20 }}>
                        <button 
                          onClick={() => setExpandedLineItemId(isExpanded ? null : li.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{li.gaugeMaster?.gaugeTypeName || '—'}</td>
                      <td className="font-mono">{li.nominalSize}</td>
                      <td>{li.sizeUnit || 'mm'}</td>
                        <td className="font-mono" style={{ fontWeight: 600 }}>
                          {!isPqcMode && isDraft ? (
                            <input 
                              type="number" 
                              className="input font-mono" 
                              value={localQuantities[li.id] ?? li.quantity}
                              min={1}
                              onChange={(e) => handleQuantityChange(li.id, e.target.value)}
                              style={{ width: 80, padding: '4px 8px', height: 28, textAlign: 'right' }} 
                            />
                          ) : (
                            currentQuantity
                          )}
                        </td>
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
                    {isExpanded && (
                      <tr>
                        <td colSpan={(!isPqcMode && isDraft) ? 8 : 7} style={{ padding: 0, borderBottom: '2px solid var(--copper-bronze)' }}>
                          <div style={{ padding: '20px 40px', background: 'rgba(139,105,20,0.02)', borderTop: '1px solid var(--silk)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                              <Settings size={16} color="var(--copper-bronze)" />
                              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Production Settings & Time Estimates
                              </h4>
                            </div>
                            
                            {li.operations && li.operations.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <table style={{ background: 'white', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--silk)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                  <thead style={{ background: 'var(--bone-white)' }}>
                                    <tr>
                                      <th style={{ fontSize: 11, padding: '10px 16px' }}>Seq</th>
                                      <th style={{ fontSize: 11, padding: '10px 16px' }}>Operation Name</th>
                                      <th style={{ fontSize: 11, padding: '10px 16px' }}>Cycle Time (Mins)</th>
                                      <th style={{ fontSize: 11, padding: '10px 16px' }}>Estimated Time (Qty: {currentQuantity})</th>
                                      <th style={{ fontSize: 11, padding: '10px 16px' }}>Machine Assignment</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {li.operations.map((op: any) => (
                                      <tr key={op.id}>
                                        <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--ash)' }}>{op.sequenceOrder}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500 }}>{op.operationName}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 13 }}>
                                          {!isPqcMode && isDraft ? (
                                            <input 
                                              type="number" 
                                              className="input" 
                                              style={{ width: 80, padding: '4px 8px', minHeight: 30 }} 
                                              value={localCycleTimes[op.id] ?? op.cycleTimeMins ?? ''}
                                              onChange={(e) => handleCycleTimeChange(li.id, op, e.target.value)}
                                            />
                                          ) : (
                                            <span className="font-mono">{(localCycleTimes[op.id] ?? op.cycleTimeMins)?.toFixed(2) || '-'}</span>
                                          )}
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: 13 }} className="font-mono">
                                          {(localCycleTimes[op.id] ?? op.cycleTimeMins) ? (
                                            ((localCycleTimes[op.id] ?? op.cycleTimeMins) * currentQuantity) > 60 
                                              ? (((localCycleTimes[op.id] ?? op.cycleTimeMins) * currentQuantity) / 60).toFixed(2) + ' hrs'
                                              : ((localCycleTimes[op.id] ?? op.cycleTimeMins) * currentQuantity).toFixed(2) + ' mins'
                                          ) : '—'}
                                        </td>
                                        <td style={{ padding: '10px 16px', fontSize: 13 }}>
                                          {!isPqcMode && isDraft ? (
                                            <select 
                                              className="input" 
                                              style={{ padding: '4px 8px', minHeight: 30 }}
                                              value={op.machineMaster?.id || ''}
                                              onChange={(e) => updateOperationMut.mutate({ lineItemId: li.id, opId: op.id, machineMasterId: e.target.value || null, cycleTimeMins: localCycleTimes[op.id] ?? op.cycleTimeMins })}
                                            >
                                              <option value="">No Machine Assigned</option>
                                              {machines.map((m: any) => {
                                                const isBusy = m.currentStatus === 'IN_USE' || m.currentStatus === 'PLANNED';
                                                const statusLabel = m.currentStatus === 'IN_USE' ? ' (In Use)' : (m.currentStatus === 'PLANNED' ? ' (Planned)' : '');
                                                return (
                                                  <option key={m.id} value={m.id} disabled={isBusy && op.machineMaster?.id !== m.id}>
                                                    {m.machineName} ({m.machineCode}){statusLabel}
                                                  </option>
                                                );
                                              })}
                                            </select>
                                          ) : (
                                            <span>
                                              {op.machineMaster ? `${op.machineMaster.machineName} (${op.machineMaster.machineCode})` : <span style={{color: 'var(--ash)'}}>Unassigned</span>}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* Production Summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12 }}>
                                  <div style={{ background: 'white', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--silk)' }}>
                                    <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Cycle Time</p>
                                    <p className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
                                      {totalCycleTimeMins > 60 ? (totalCycleTimeMins / 60).toFixed(2) : totalCycleTimeMins.toFixed(2)} 
                                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate)' }}> {totalCycleTimeMins > 60 ? 'hrs/part' : 'mins/part'}</span>
                                    </p>
                                  </div>
                                  <div style={{ background: 'white', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--silk)' }}>
                                    <p style={{ fontSize: 11, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Production Rate</p>
                                    <p className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>{partsPerHour.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--slate)' }}>parts/hr</span></p>
                                  </div>
                                  <div style={{ background: 'var(--status-in-progress-bg)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--status-in-progress)' }}>
                                    <p style={{ fontSize: 11, color: 'var(--status-in-progress)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Time for Order</p>
                                    <p className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--status-in-progress)' }}>
                                      {totalTimeForQtyMins > 60 ? `${(totalTimeForQtyMins / 60).toFixed(1)} hours` : `${totalTimeForQtyMins.toFixed(0)} mins`}
                                    </p>
                                  </div>
                                </div>

                                {/* Shift Estimations */}
                                <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16, marginBottom: 8 }}>
                                  Required Production Rate By Delivery ({daysAvailable} Days)
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                                  {shifts.map((s: any) => {
                                    let requiredPartsPerHour = 0;
                                    let meetsQuantity = false;
                                    if (s.startTime && s.endTime) {
                                      const startHours = parseInt(s.startTime.split(':')[0]) + parseInt(s.startTime.split(':')[1])/60;
                                      const endHours = parseInt(s.endTime.split(':')[0]) + parseInt(s.endTime.split(':')[1])/60;
                                      let durationHours = endHours - startHours;
                                      if (durationHours < 0) durationHours += 24;
                                      
                                      const totalShiftHours = durationHours * daysAvailable;
                                      requiredPartsPerHour = totalShiftHours > 0 ? currentQuantity / totalShiftHours : 0;
                                      meetsQuantity = partsPerHour >= requiredPartsPerHour;
                                    }
                                    return (
                                      <div key={s.id} style={{ background: meetsQuantity ? 'var(--status-completed-bg)' : 'var(--status-rejected-bg)', padding: '12px 16px', borderRadius: 8, border: `1px solid ${meetsQuantity ? 'var(--status-completed)' : 'var(--status-rejected)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                          <p style={{ fontSize: 11, color: meetsQuantity ? 'var(--status-completed)' : 'var(--status-rejected)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.shiftName}</p>
                                          {meetsQuantity ? <CheckCircle size={12} color="var(--status-completed)" /> : <AlertTriangle size={12} color="var(--status-rejected)" />}
                                        </div>
                                        <p className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: meetsQuantity ? 'var(--status-completed)' : 'var(--status-rejected)' }}>
                                          {requiredPartsPerHour.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 500 }}>req. parts/hr</span>
                                        </p>
                                        <p style={{ fontSize: 10, color: 'var(--ash)', marginTop: 4 }}>
                                          Machine Cap: {partsPerHour.toFixed(1)} / hr
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p style={{ fontSize: 13, color: 'var(--ash)' }}>No default operations found for this part.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Part / Product Name *</label>
                <select className="input" value={newItem.gaugeMasterId} onChange={e => setNewItem(p => ({ ...p, gaugeMasterId: e.target.value }))}>
                  <option value="">Select Part / Product name...</option>
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
              <tr><th>Serial Number</th><th>Part / Product Name</th><th>Size</th><th>Material</th><th>Status</th><th>NC Count</th></tr>
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