import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { createPurchaseOrder } from '@/api/purchase-orders.api';
import { getGaugeMasters, getGaugeMasterOperations } from '@/api/gauge-master.api';
import { getCustomers, createCustomer } from '@/api/customers.api';
import {
  ArrowLeft, Plus, Trash2, AlertCircle, ChevronDown,
  X, UserPlus, Check, ChevronRight,
} from 'lucide-react';
import type { FieldError } from '@/types/api.types';

interface LineItem {
  gaugeMasterId: string;
  gaugeTypeName: string;
  nominalSize: string;
  sizeUnit: string;
  quantity: string;
  materialGradeOverride: string;
  lineNotes: string;
}

// ─── Operation Sequence Preview ───────────────────────────────────────────────

function GaugeOperationsPreview({ gaugeMasterId }: { gaugeMasterId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['gauge-master-ops', gaugeMasterId],
    queryFn: () => getGaugeMasterOperations(gaugeMasterId),
    enabled: !!gaugeMasterId,
  });

  // API returns ApiResponse<any[]>; the actual array is at .data
  const ops: any[] = (data?.data ?? [])
    .slice()
    .sort((a: any, b: any) => (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0));

  return (
    <div style={{ marginTop: 14 }}>
      {/* ── Collapsed header bar ── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 14px',
          borderRadius: expanded ? '8px 8px 0 0' : 8,
          background: 'var(--linen)',
          border: '1px solid rgba(139,105,20,0.18)',
          borderBottom: expanded ? '1px solid rgba(139,105,20,0.12)' : '1px solid rgba(139,105,20,0.18)',
          cursor: 'pointer',
          transition: 'border-radius 0.15s',
        }}
      >
        {/* Label + step count */}
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--copper-bronze)',
          flex: 1,
          textAlign: 'left',
        }}>
          Operation Sequence
        </span>

        {isLoading ? (
          <span style={{ fontSize: 11, color: 'var(--ash)', fontStyle: 'italic' }}>Loading…</span>
        ) : (
          // Step dots preview (collapsed)
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {!expanded && ops.slice(0, 6).map((_, idx) => (
              <span key={idx} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: idx === 0 ? 'var(--copper-bronze)' : 'rgba(139,105,20,0.25)',
              }} />
            ))}
            {!expanded && ops.length > 6 && (
              <span style={{ fontSize: 10, color: 'var(--ash)', marginLeft: 2 }}>+{ops.length - 6}</span>
            )}
            <span style={{
              fontSize: 10, fontWeight: 700, color: 'var(--slate)',
              background: 'rgba(139,105,20,0.1)', borderRadius: 8,
              padding: '2px 7px', marginLeft: 6,
            }}>
              {isLoading ? '…' : `${ops.length} step${ops.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {expanded
          ? <ChevronDown size={13} color="var(--copper-bronze)" />
          : <ChevronRight size={13} color="var(--copper-bronze)" />}
      </button>

      {/* ── Expanded step flow ── */}
      {expanded && (
        <div style={{
          padding: '18px 20px 20px',
          background: 'var(--linen)',
          border: '1px solid rgba(139,105,20,0.18)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 72, width: 100, borderRadius: 8 }} />
              ))}
            </div>
          ) : ops.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--ash)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
              No operations assigned to this Part / Product name yet.
            </p>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 0,
              rowGap: 16,
            }}>
              {ops.map((op: any, idx: number) => {
                const name = op.operationName ?? op.operationMaster?.operationName ?? '—';
                const code = op.operationCode ?? op.operationMaster?.operationCode;
                const dept = op.department ?? op.operationMaster?.department;
                const isLast = idx === ops.length - 1;

                return (
                  <div key={op.id ?? idx} style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Step card */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 7,
                      width: 88,
                    }}>
                      {/* Circle with step number */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: idx === 0
                          ? 'var(--copper-bronze)'
                          : 'var(--warm-white)',
                        border: `1.5px solid ${idx === 0 ? 'var(--copper-bronze)' : 'rgba(139,105,20,0.35)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        flexShrink: 0,
                        boxShadow: idx === 0
                          ? '0 2px 8px rgba(139,105,20,0.22)'
                          : '0 1px 4px rgba(0,0,0,0.06)',
                      }}>
                        <span style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: idx === 0 ? 'white' : 'var(--copper-bronze)',
                          fontFamily: 'var(--font-mono, monospace)',
                        }}>
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Operation name */}
                      <p style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--charcoal)',
                        textAlign: 'center',
                        lineHeight: 1.3,
                        maxWidth: 84,
                        margin: 0,
                      }}>
                        {name}
                      </p>

                      {/* Code or dept badge */}
                      {(code || dept) && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--copper-bronze)',
                          background: 'rgba(139,105,20,0.1)',
                          borderRadius: 4,
                          padding: '2px 6px',
                          maxWidth: 84,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {code ?? dept}
                        </span>
                      )}
                    </div>

                    {/* Connector arrow between steps */}
                    {!isLast && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingBottom: 28, // align with circle centre
                        flexShrink: 0,
                      }}>
                        <div style={{
                          width: 20,
                          height: 1,
                          background: 'rgba(139,105,20,0.3)',
                        }} />
                        <svg width="8" height="10" viewBox="0 0 8 10" style={{ flexShrink: 0 }}>
                          <path d="M1 1L6 5L1 9" fill="none" stroke="rgba(139,105,20,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: tolerance / unit hint */}
          {ops.length > 0 && (
            <p style={{
              marginTop: 14,
              fontSize: 10,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'rgba(139,105,20,0.5)',
              textAlign: 'right',
            }}>
              {ops.length} operation{ops.length !== 1 ? 's' : ''} · default sequence
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Smart Customer Combobox ──────────────────────────────────────────────────

interface CustomerComboboxProps {
  value: string;
  onChange: (name: string) => void;
  hasError?: boolean;
}

function CustomerCombobox({ value, onChange, hasError }: CustomerComboboxProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newGst, setNewGst] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: custData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => getCustomers({ size: 200 }),
  });
  const customers = custData?.data?.content || custData?.data || [];

  const filtered = customers.filter((c: any) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson?.toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: (data: any) => createCustomer(data),
    onSuccess: (res) => {
      const created = res?.data;
      if (created?.name) {
        onChange(created.name);
        queryClient.invalidateQueries({ queryKey: ['customers-list'] });
      }
      setOpen(false); setShowNewForm(false); setSearch('');
      setNewName(''); setNewContact(''); setNewPhone(''); setNewEmail(''); setNewGst('');
    },
  });

  const handleCreateNew = () => {
    if (!newName.trim()) return;
    createMut.mutate({
      name: newName.trim(), contactPerson: newContact.trim() || undefined,
      phone: newPhone.trim() || undefined, email: newEmail.trim() || undefined,
      gstNumber: newGst.trim() || undefined, isActive: true,
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setShowNewForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); setShowNewForm(false); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 12px', height: 38, borderRadius: 8, cursor: 'pointer', fontSize: 13,
          border: `1px solid ${hasError ? 'var(--status-rejected)' : open ? 'var(--copper-bronze)' : 'var(--silk)'}`,
          background: 'var(--warm-white)', color: value ? 'var(--charcoal)' : 'var(--ash)',
          transition: 'border-color 0.15s', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'Search or create customer…'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {value && (
            <span onClick={(e) => { e.stopPropagation(); onChange(''); }}
              style={{ display: 'flex', alignItems: 'center', padding: 2, color: 'var(--ash)', cursor: 'pointer' }}>
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} color="var(--ash)"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--warm-white)', border: '1px solid var(--silk)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 10px 6px' }}>
            <input autoFocus className="input" style={{ fontSize: 13, padding: '6px 10px' }}
              placeholder="Search customers…" value={search}
              onChange={(e) => { setSearch(e.target.value); setShowNewForm(false); }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <p style={{ padding: '8px 14px', fontSize: 13, color: 'var(--ash)' }}>No customers found</p>
            )}
            {filtered.map((c: any) => (
              <button key={c.id} type="button"
                onClick={() => { onChange(c.name); setOpen(false); setSearch(''); }}
                style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '8px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'var(--charcoal)', borderBottom: '1px solid var(--bone-white)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bone-white)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <div>
                  <p style={{ fontWeight: 500 }}>{c.name}</p>
                  {c.contactPerson && (
                    <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 1 }}>{c.contactPerson}</p>
                  )}
                </div>
                {value === c.name && <Check size={14} color="var(--copper-bronze)" />}
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--silk)' }}>
            {!showNewForm ? (
              <button type="button" onClick={() => { setShowNewForm(true); setNewName(search); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: 'var(--copper-bronze)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--linen)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <UserPlus size={14} />
                {search ? `Create "${search}" as new customer` : 'Create new customer'}
              </button>
            ) : (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={13} /> New Customer
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Name *</label>
                    <input autoFocus className="input" style={{ fontSize: 12, padding: '5px 9px' }}
                      placeholder="Company / customer name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Contact Person</label>
                    <input className="input" style={{ fontSize: 12, padding: '5px 9px' }}
                      placeholder="e.g. Rahul Sharma" value={newContact} onChange={(e) => setNewContact(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Phone</label>
                    <input className="input" style={{ fontSize: 12, padding: '5px 9px' }}
                      placeholder="+91 98765 43210" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Email</label>
                    <input className="input" style={{ fontSize: 12, padding: '5px 9px' }}
                      placeholder="email@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>GST Number</label>
                    <input className="input" style={{ fontSize: 12, padding: '5px 9px' }}
                      placeholder="22AAAAA0000A1Z5" value={newGst} onChange={(e) => setNewGst(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button type="button" onClick={handleCreateNew}
                    disabled={!newName.trim() || createMut.isPending}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 12, fontWeight: 600,
                      cursor: !newName.trim() || createMut.isPending ? 'not-allowed' : 'pointer',
                      background: 'var(--copper-bronze)', color: 'white', border: 'none',
                      opacity: !newName.trim() || createMut.isPending ? 0.6 : 1,
                    }}>
                    {createMut.isPending ? 'Saving…' : 'Save & Select'}
                  </button>
                  <button type="button" onClick={() => setShowNewForm(false)}
                    style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', background: 'none', border: '1px solid var(--silk)', color: 'var(--slate)' }}>
                    Back
                  </button>
                </div>
                {createMut.isError && (
                  <p style={{ fontSize: 11, color: 'var(--status-rejected)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={11} /> Failed to save customer. Try again.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PurchaseOrderCreatePage() {
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => { setPageTitle('New Purchase Order'); }, [setPageTitle]);

  const { data: gmData } = useQuery({
    queryKey: ['gauge-masters-list'],
    queryFn: () => getGaugeMasters({ size: 1000, isActive: true }),
  });
  const gaugeMasters = gmData?.data?.content || [];

  const [poNumber, setPoNumber] = useState(
    () => `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`
  );
  const [workOrderNo, setWorkOrderNo] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [instructions, setInstructions] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  const addLine = () =>
    setLines([...lines, {
      gaugeMasterId: '', gaugeTypeName: '', nominalSize: '',
      sizeUnit: 'mm', quantity: '1', materialGradeOverride: '', lineNotes: '',
    }]);

  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));

  const updateLine = (i: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[i] = { ...updated[i], [field]: value };
    if (field === 'gaugeMasterId') {
      const gm = gaugeMasters.find((g: any) => g.id === value);
      if (gm) {
        updated[i].gaugeTypeName = gm.gaugeTypeName;
        if (gm.unitOfMeasurement) updated[i].sizeUnit = gm.unitOfMeasurement;
      }
    }
    setLines(updated);
  };

  const createMut = useMutation({
    mutationFn: (data: any) => createPurchaseOrder(data),
    onSuccess: (res) => {
      const id = res?.data?.id;
      navigate(id ? `/purchase-orders/${id}` : '/purchase-orders');
    },
    onError: (err: any) => {
      const errs = err?.response?.data?.fieldErrors;
      if (errs) setFieldErrors(errs);
    },
  });

  const getFieldError = (field: string) =>
    fieldErrors.find((e) => e.field === field)?.message;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors([]);
    if (!customerName.trim()) {
      setFieldErrors([{ field: 'customerName', message: 'Please select or create a customer' }]);
      return;
    }
    if (lines.length === 0) {
      setFieldErrors([{ field: 'lineItems', message: 'Add at least one gauge line item' }]);
      return;
    }
    const badIdx = lines.findIndex((l) => !l.gaugeMasterId || !l.nominalSize || !l.quantity);
    if (badIdx !== -1) {
      setFieldErrors([{ field: `lineItems[${badIdx}]`, message: `Line item #${badIdx + 1} is incomplete` }]);
      return;
    }
    createMut.mutate({
      poNumber,
      workOrderNo: workOrderNo.trim(),
      customerName: customerName.trim(),
      orderDate,
      expectedDeliveryDate: deliveryDate || null,
      priority,
      specialInstructions: instructions || null,
      lineItems: lines.map((l) => ({
        gaugeMasterId: l.gaugeMasterId,
        nominalSize: parseFloat(l.nominalSize),
        sizeUnit: l.sizeUnit || 'mm',
        quantity: parseInt(l.quantity, 10),
        materialGradeOverride: l.materialGradeOverride || null,
        lineNotes: l.lineNotes || null,
      })),
    });
  };

  return (
    <div>
      <button
        onClick={() => navigate('/purchase-orders')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500, marginBottom: 20 }}
      >
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <form onSubmit={handleSubmit}>
        {/* PO Header */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 20 }}>Order Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>PO Number *</label>
              <input className="input font-mono" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required />
              {getFieldError('poNumber') && (
                <p style={{ fontSize: 11, color: 'var(--status-rejected)', marginTop: 3 }}>{getFieldError('poNumber')}</p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Work Order No. *</label>
              <input className="input font-mono" value={workOrderNo} onChange={(e) => setWorkOrderNo(e.target.value)} required />
              {getFieldError('workOrderNo') && (
                <p style={{ fontSize: 11, color: 'var(--status-rejected)', marginTop: 3 }}>{getFieldError('workOrderNo')}</p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Customer *</label>
              <CustomerCombobox value={customerName} onChange={setCustomerName} hasError={!!getFieldError('customerName')} />
              {getFieldError('customerName') && (
                <p style={{ fontSize: 11, color: 'var(--status-rejected)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <AlertCircle size={11} /> {getFieldError('customerName')}
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Order Date *</label>
              <input className="input font-mono" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Expected Delivery</label>
              <input className="input font-mono" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--slate)', marginBottom: 4 }}>Special Instructions</label>
              <input className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>Part / Product Line Items</h3>
            <button type="button" className="btn btn-secondary" onClick={addLine}>
              <Plus size={16} style={{ marginRight: 6 }} /> Add Part / Product
            </button>
          </div>

          {getFieldError('lineItems') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.2)', marginBottom: 12, fontSize: 13, color: 'var(--status-rejected)' }}>
              <AlertCircle size={14} /> {getFieldError('lineItems')}
            </div>
          )}

          {lines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)', border: '2px dashed var(--silk)', borderRadius: 10 }}>
              <p style={{ fontSize: 14 }}>No line items added yet</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Click "Add Part / Product" to start adding parts / products to this order</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {lines.map((line, i) => {
                const lineErr = getFieldError(`lineItems[${i}]`);
                return (
                  <div key={i} style={{ padding: 16, borderRadius: 10, border: `1px solid ${lineErr ? 'rgba(220,53,69,0.4)' : 'var(--silk)'}`, background: 'var(--bone-white)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--copper-bronze)' }}>Line Item #{i + 1}</span>
                      <button type="button" onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {lineErr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--status-rejected)', marginBottom: 10 }}>
                        <AlertCircle size={12} /> {lineErr}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.6fr 1fr 2fr', gap: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Part / Product Name *</label>
                        <select className="input" value={line.gaugeMasterId} onChange={(e) => updateLine(i, 'gaugeMasterId', e.target.value)} required>
                          <option value="">Select Part / Product name...</option>
                          {gaugeMasters.map((gm: any) => (
                            <option key={gm.id} value={gm.id}>{gm.gaugeTypeName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Nominal Size *</label>
                        <input className="input font-mono" type="number" step="0.001" min="0" value={line.nominalSize}
                          onChange={(e) => updateLine(i, 'nominalSize', e.target.value)} required placeholder="6.500" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Unit</label>
                        <select className="input" value={line.sizeUnit} onChange={(e) => updateLine(i, 'sizeUnit', e.target.value)}>
                          <option value="mm">mm</option>
                          <option value="inch">inch</option>
                          <option value="µm">µm</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Qty *</label>
                        <input className="input font-mono" type="number" min="1" value={line.quantity}
                          onChange={(e) => updateLine(i, 'quantity', e.target.value)} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Material Override</label>
                        <input className="input" value={line.materialGradeOverride}
                          onChange={(e) => updateLine(i, 'materialGradeOverride', e.target.value)}
                          placeholder={gaugeMasters.find((g: any) => g.id === line.gaugeMasterId)?.defaultMaterialGrade || 'Default'} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--ash)', marginBottom: 2 }}>Notes</label>
                        <input className="input" value={line.lineNotes}
                          onChange={(e) => updateLine(i, 'lineNotes', e.target.value)} placeholder="Optional..." />
                      </div>
                    </div>

                    {line.gaugeMasterId && line.nominalSize && (
                      <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 10 }}>
                        ℹ️ This will create <strong>{line.quantity || 0}</strong> job card(s) for{' '}
                        <strong>{line.gaugeTypeName}</strong> at <strong>{line.nominalSize} {line.sizeUnit}</strong>
                      </p>
                    )}

                    {/* ── Operation Sequence ── shown as soon as Part / Product name is picked */}
                    {line.gaugeMasterId && (
                      <GaugeOperationsPreview gaugeMasterId={line.gaugeMasterId} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={createMut.isPending || lines.length === 0}>
            {createMut.isPending ? 'Creating...' : 'Create Draft PO'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/purchase-orders')}>Cancel</button>
          {createMut.isPending && <span style={{ fontSize: 12, color: 'var(--slate)' }}>Saving purchase order…</span>}
        </div>

        {createMut.isError && fieldErrors.length === 0 && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.2)', color: 'var(--status-rejected)', fontSize: 13 }}>
            <AlertCircle size={14} /> Failed to create PO. Please check all fields and try again.
          </div>
        )}
      </form>
    </div>
  );
}