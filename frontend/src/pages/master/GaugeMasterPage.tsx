import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import {
  getGaugeMasters,
  createGaugeMaster,
  updateGaugeMaster,
  deleteGaugeMaster,
  getGaugeMasterOperations,
  addGaugeMasterOperation,
  removeGaugeMasterOperation,
  reorderGaugeMasterOperations,
} from '@/api/gauge-master.api';
import { getOperationMasters } from '@/api/operation-master.api';
import {
  Plus, Edit2, Trash2, ChevronDown, ChevronRight,
  Layers, Settings, X, GripVertical, Search, AlertCircle, Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedOp {
  id: string;                  // GaugeMasterOperation row id
  sequenceOrder: number;
  operationMasterId?: string;  // from GaugeMasterOperationResponse
  operationName?: string;
  operationCode?: string;
  operationMaster?: {
    id: string;
    operationName: string;
    operationCode?: string;
    department?: string;
  };
}

interface OperationMaster {
  id: string;
  operationName: string;
  operationCode: string;
  department?: string;
  isActive: boolean;
}

// Helper: extract operationMasterId from either shape the backend might return
function getOpMasterId(op: LinkedOp): string {
  return op.operationMasterId || op.operationMaster?.id || '';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GaugeMasterPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manageOpsGauge, setManageOpsGauge] = useState<any>(null);

  useEffect(() => { setPageTitle('Gauge Master'); }, [setPageTitle]);

  const { data, isLoading } = useQuery({
    queryKey: ['gauge-masters'],
    queryFn: () => getGaugeMasters({ size: 50 }),
  });
  const gauges = data?.data?.content || [];

  const createMut = useMutation({
    mutationFn: (d: any) => createGaugeMaster(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gauge-masters'] });
      setShowForm(false); setEditing(null);
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: any) => updateGaugeMaster(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gauge-masters'] });
      setShowForm(false); setEditing(null);
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteGaugeMaster(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gauge-masters'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const d = {
      gaugeTypeName: fd.get('gaugeTypeName'),
      categoryCode: fd.get('categoryCode'),
      defaultMaterialGrade: fd.get('defaultMaterialGrade'),
      unitOfMeasurement: fd.get('unitOfMeasurement'),
      notes: fd.get('notes'),
    };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>Gauge Types</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} style={{ marginRight: 6 }} /> Add Gauge Type
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--charcoal)' }}>
            {editing ? 'Edit Gauge Type' : 'New Gauge Type'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Gauge Type Name *</label>
                <input className="input" name="gaugeTypeName" defaultValue={editing?.gaugeTypeName || ''} required placeholder="e.g. Plain Plug Gauge" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Category Code</label>
                <input className="input" name="categoryCode" defaultValue={editing?.categoryCode || ''} placeholder="e.g. PPG" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Default Material Grade</label>
                <input className="input" name="defaultMaterialGrade" defaultValue={editing?.defaultMaterialGrade || ''} placeholder="e.g. EN-31 / SUJ2" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Unit of Measurement</label>
                <input className="input" name="unitOfMeasurement" defaultValue={editing?.unitOfMeasurement || ''} placeholder="mm" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Notes</label>
                <textarea className="input" name="notes" rows={2} defaultValue={editing?.notes || ''} style={{ minHeight: 60, padding: '8px 12px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                {editing ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Gauge Type</th>
              <th>Category</th>
              <th>Material Grade</th>
              <th>Unit</th>
              <th>Operations</th>
              <th style={{ width: 130 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : gauges.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>No gauge types found</td>
              </tr>
            ) : (
              gauges.map((g: any) => (
                <>
                  <tr key={g.id}>
                    <td>
                      <button
                        onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 2 }}
                      >
                        {expandedId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{g.gaugeTypeName}</td>
                    <td>
                      <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                        {g.categoryCode}
                      </span>
                    </td>
                    <td>{g.defaultMaterialGrade || '—'}</td>
                    <td className="font-mono">{g.unitOfMeasurement || '—'}</td>
                    <td className="font-mono">{g.operations?.length || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => setManageOpsGauge(g)} title="Manage Operations"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', padding: 2 }}>
                          <Settings size={14} />
                        </button>
                        <button onClick={() => { setEditing(g); setShowForm(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => { if (confirm('Delete this gauge type?')) deleteMut.mutate(g.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === g.id && <OperationSequenceRow gaugeMasterId={g.id} />}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {manageOpsGauge && (
        <ManageOperationsModal
          gauge={manageOpsGauge}
          onClose={() => {
            setManageOpsGauge(null);
            queryClient.invalidateQueries({ queryKey: ['gauge-masters'] });
            queryClient.invalidateQueries({ queryKey: ['gauge-master-ops', manageOpsGauge.id] });
          }}
        />
      )}
    </div>
  );
}

// ─── Expanded Sequence Row (read-only) ───────────────────────────────────────

function OperationSequenceRow({ gaugeMasterId }: { gaugeMasterId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['gauge-master-ops', gaugeMasterId],
    queryFn: () => getGaugeMasterOperations(gaugeMasterId),
  });
  const ops: LinkedOp[] = data?.data || [];

  return (
    <tr>
      <td colSpan={7} style={{ padding: '0 16px 16px 48px', background: 'var(--bone-white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Layers size={14} color="var(--copper-bronze)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Default Operation Sequence
          </span>
        </div>
        {isLoading ? (
          <div className="skeleton" style={{ height: 40, width: '100%' }} />
        ) : ops.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--ash)' }}>No operations assigned</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ops.map((op, idx) => (
              <div key={op.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--silk)',
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', background: 'var(--copper-bronze)',
                  color: 'white', fontSize: 10, fontWeight: 700, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>{idx + 1}</span>
                <span style={{ fontSize: 13, color: 'var(--charcoal)' }}>
                  {op.operationName || op.operationMaster?.operationName}
                </span>
                {idx < ops.length - 1 && <span style={{ color: 'var(--dust)', marginLeft: 4 }}>→</span>}
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Manage Operations Modal ──────────────────────────────────────────────────

function ManageOperationsModal({ gauge, onClose }: { gauge: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [localOps, setLocalOps] = useState<LinkedOp[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [reorderSaved, setReorderSaved] = useState(false);

  // Track whether local order differs from what's saved
  const [isDirty, setIsDirty] = useState(false);

  const { data: linkedData, isLoading: linkedLoading } = useQuery({
    queryKey: ['gauge-master-ops', gauge.id],
    queryFn: () => getGaugeMasterOperations(gauge.id),
  });

  const { data: allOpsData, isLoading: allOpsLoading } = useQuery({
    queryKey: ['operation-masters-all'],
    queryFn: () => getOperationMasters({ size: 200, isActive: true }),
  });

  const linkedOps: LinkedOp[] = linkedData?.data || [];
  const allOps: OperationMaster[] = allOpsData?.data?.content || allOpsData?.data || [];

  // Sync local state from server — but only when not dirty (don't clobber user's drag)
  useEffect(() => {
    if (!isDirty) {
      setLocalOps([...linkedOps].sort((a, b) => a.sequenceOrder - b.sequenceOrder));
    }
  }, [linkedData]);

  const linkedIds = new Set(localOps.map((o) => getOpMasterId(o)));

  const available = allOps.filter((op) =>
    !linkedIds.has(op.id) &&
    (op.operationName.toLowerCase().includes(search.toLowerCase()) ||
      op.operationCode?.toLowerCase().includes(search.toLowerCase()) ||
      op.department?.toLowerCase().includes(search.toLowerCase()))
  );

  // ── Add ──────────────────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: ({ operationMasterId, sequenceOrder }: { operationMasterId: string; sequenceOrder: number }) =>
      addGaugeMasterOperation(gauge.id, operationMasterId, sequenceOrder),
    onSuccess: () => {
      setIsDirty(false); // allow re-sync from server
      queryClient.invalidateQueries({ queryKey: ['gauge-master-ops', gauge.id] });
      setErrorMsg('');
    },
    onError: () => setErrorMsg('Failed to add operation. Please try again.'),
  });

  // ── Remove ───────────────────────────────────────────────────────────────────
  const removeMut = useMutation({
    // backend removeOperation uses operationMasterId as the path param (deleteByGaugeMasterIdAndOperationMasterId)
    mutationFn: (opMasterId: string) => removeGaugeMasterOperation(gauge.id, opMasterId),
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['gauge-master-ops', gauge.id] });
      setErrorMsg('');
    },
    onError: () => setErrorMsg('Failed to remove operation. Please try again.'),
  });

  // ── Reorder ──────────────────────────────────────────────────────────────────
  const reorderMut = useMutation({
    mutationFn: (orderedIds: string[]) => reorderGaugeMasterOperations(gauge.id, orderedIds),
    onSuccess: () => {
      setIsDirty(false);
      setReorderSaved(true);
      setTimeout(() => setReorderSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['gauge-master-ops', gauge.id] });
      setErrorMsg('');
    },
    onError: () => setErrorMsg('Failed to save new order. Please try again.'),
  });

  const handleAdd = (op: OperationMaster) => {
    setErrorMsg('');
    addMut.mutate({ operationMasterId: op.id, sequenceOrder: localOps.length + 1 });
  };

  const handleRemove = (op: LinkedOp) => {
    setErrorMsg('');
    removeMut.mutate(getOpMasterId(op));
  };

  const handleSaveOrder = () => {
    const orderedIds = localOps.map((op) => getOpMasterId(op));
    reorderMut.mutate(orderedIds);
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null); setDragOverIdx(null); return;
    }
    const reordered = [...localOps];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    setLocalOps(reordered);
    setIsDirty(true);        // mark as unsaved
    setReorderSaved(false);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const isPending = addMut.isPending || removeMut.isPending || reorderMut.isPending;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--silk)' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 2 }}>Manage Operations</h3>
            <p style={{ fontSize: 12, color: 'var(--slate)' }}>
              <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)', marginRight: 6 }}>
                {gauge.categoryCode}
              </span>
              {gauge.gaugeTypeName}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: 'rgba(220,53,69,0.06)', borderBottom: '1px solid rgba(220,53,69,0.15)', fontSize: 13, color: 'var(--status-rejected)' }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden' }}>

          {/* LEFT: sequence */}
          <div style={{ padding: 20, borderRight: '1px solid var(--silk)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Layers size={13} color="var(--copper-bronze)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Operation Sequence
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--slate)', background: 'var(--bone-white)', borderRadius: 10, padding: '1px 8px' }}>
                {localOps.length}
              </span>
            </div>

            {linkedLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))
            ) : localOps.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, textAlign: 'center' }}>
                <Layers size={28} color="var(--silk)" />
                <p style={{ fontSize: 13, color: 'var(--ash)' }}>No operations assigned yet</p>
                <p style={{ fontSize: 12, color: 'var(--dust)' }}>Add operations from the right panel</p>
              </div>
            ) : (
              localOps.map((op, idx) => {
                const name = op.operationName || op.operationMaster?.operationName || '—';
                const code = op.operationCode || op.operationMaster?.operationCode;
                const dept = op.operationMaster?.department;
                const isDragging = dragIdx === idx;
                const isDragOver = dragOverIdx === idx;

                return (
                  <div
                    key={op.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      border: `1px solid ${isDragOver ? 'var(--copper-bronze)' : isDirty ? 'rgba(139,105,20,0.3)' : 'var(--silk)'}`,
                      background: isDragging ? 'var(--linen)' : isDragOver ? 'rgba(139,105,20,0.04)' : 'var(--warm-white)',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: 'grab', transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <GripVertical size={14} color="var(--dust)" style={{ flexShrink: 0 }} />
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: isDirty ? 'rgba(139,105,20,0.5)' : 'var(--copper-bronze)',
                      color: 'white', fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: 'background 0.2s',
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                      </p>
                      {(code || dept) && (
                        <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>
                          {code && <span className="font-mono">{code}</span>}
                          {code && dept && ' · '}{dept}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(op)}
                      disabled={isPending}
                      title="Remove"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 3, flexShrink: 0, opacity: isPending ? 0.5 : 1 }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}

            {/* Save order button — only shown when dirty */}
            {localOps.length > 1 && (
              <div style={{ marginTop: 4 }}>
                {isDirty ? (
                  <button
                    onClick={handleSaveOrder}
                    disabled={reorderMut.isPending}
                    style={{
                      width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: reorderMut.isPending ? 'not-allowed' : 'pointer',
                      background: 'var(--copper-bronze)', color: 'white', border: 'none',
                      opacity: reorderMut.isPending ? 0.7 : 1, transition: 'opacity 0.15s',
                    }}
                  >
                    {reorderMut.isPending ? 'Saving order…' : 'Save New Order'}
                  </button>
                ) : reorderSaved ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', fontSize: 12, color: 'var(--status-completed)' }}>
                    <Check size={13} /> Order saved
                  </div>
                ) : (
                  <p style={{ fontSize: 11, color: 'var(--dust)', textAlign: 'center' }}>
                    Drag rows to reorder, then save
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: available */}
          <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Available Operations
              </span>
            </div>
            <div style={{ position: 'relative', marginBottom: 4 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)' }} />
              <input
                className="input"
                style={{ paddingLeft: 30, fontSize: 13 }}
                placeholder="Search by name, code or department…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {allOpsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
              ))
            ) : available.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 32, textAlign: 'center' }}>
                <Search size={24} color="var(--silk)" />
                <p style={{ fontSize: 13, color: 'var(--ash)' }}>
                  {search ? 'No operations match your search' : 'All operations are already linked'}
                </p>
              </div>
            ) : (
              available.map((op) => (
                <div key={op.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--warm-white)', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--copper-bronze)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--silk)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {op.operationName}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>
                      <span className="font-mono">{op.operationCode}</span>
                      {op.department && ` · ${op.department}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(op)}
                    disabled={isPending}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      background: 'rgba(139,105,20,0.07)', border: '1px solid var(--copper-bronze)',
                      color: 'var(--copper-bronze)', flexShrink: 0,
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: isPending ? 'var(--slate)' : 'transparent' }}>
            {reorderMut.isPending ? 'Saving order…' : addMut.isPending ? 'Adding…' : removeMut.isPending ? 'Removing…' : '·'}
          </span>
          {isDirty && (
            <span style={{ fontSize: 12, color: 'var(--copper-bronze)', fontWeight: 500 }}>
              ⚠ Unsaved order changes
            </span>
          )}
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}