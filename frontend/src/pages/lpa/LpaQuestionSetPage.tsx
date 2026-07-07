import React, { useState, useEffect } from 'react';
import { lpaApi, type LpaQuestionSet, type LpaQuestionItem, type LpaAuditType } from '@/api/lpa.api';
import { getGaugeMasters, getGaugeMasterOperations } from '@/api/gauge-master.api';
import { getOperationMasters } from '@/api/operation-master.api';
import { machinesApi, type MachineMaster } from '@/api/machines.api';
import type { OperationMaster, GaugeMaster } from '@/types/domain.types';
import {
  CheckSquare, Plus, Trash2, ChevronDown, ChevronRight,
  Check, Save, X, Settings, Search, AlertCircle, ClipboardList, BookOpen,
  Database, Wrench, Loader2, CheckCircle2, ShieldAlert, Layers, Package, Box
} from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export function LpaQuestionSetPage() {
  const [loading, setLoading] = useState(true);
  const [questionSets, setQuestionSets] = useState<LpaQuestionSet[]>([]);
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [gaugeMasters, setGaugeMasters] = useState<GaugeMaster[]>([]);
  const [machineMasters, setMachineMasters] = useState<MachineMaster[]>([]);

  // UI State
  const [viewMode, setViewMode] = useState<'PART' | 'OPERATION'>('PART'); // Default to Part-Wise as requested!
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manageOp, setManageOp] = useState<OperationMaster | null>(null);
  const [managePart, setManagePart] = useState<GaugeMaster | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qsRes, opRes, gmRes, mmRes] = await Promise.all([
        lpaApi.getQuestionSets().catch(() => ({ data: [] })),
        getOperationMasters({ size: 1000, isActive: true }).catch(() => ({ data: [] })),
        getGaugeMasters({ size: 1000 }).catch(() => ({ data: [] })),
        machinesApi.getAll().catch(() => ({ data: [] })),
      ]);

      setQuestionSets(getArray(qsRes));
      setOperations(getArray(opRes));
      setGaugeMasters(getArray(gmRes));
      setMachineMasters(getArray(mmRes));
    } catch (err) {
      console.error('Failed to load LPA checklists or master data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group checklists by Operation Master ID
  const qsByOp = questionSets.reduce<Record<string, LpaQuestionSet[]>>((acc, qs) => {
    const opId = qs.operationMaster?.id;
    if (opId) {
      if (!acc[opId]) acc[opId] = [];
      acc[opId].push(qs);
    }
    return acc;
  }, {});

  // Group checklists by Part / Gauge Master ID
  const qsByPart = questionSets.reduce<Record<string, LpaQuestionSet[]>>((acc, qs) => {
    const gmId = qs.gaugeMaster?.id;
    if (gmId) {
      if (!acc[gmId]) acc[gmId] = [];
      acc[gmId].push(qs);
    }
    return acc;
  }, {});

  // General / Plant-wide sets (not assigned to the primary dimension in view mode)
  const generalSets = viewMode === 'PART'
    ? questionSets.filter(qs => !qs.gaugeMaster)
    : questionSets.filter(qs => !qs.operationMaster);

  // Filtered lists for tables
  const filteredOperations = operations.filter(op =>
    !searchTerm ||
    op.operationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.operationCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (op.department && op.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredParts = gaugeMasters.filter(gm =>
    !searchTerm ||
    gm.gaugeTypeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gm.categoryCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (gm.defaultMaterialGrade && gm.defaultMaterialGrade.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers className="text-[var(--copper-bronze)]" size={24} />
            LPA Checklists & Checkpoints Master
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 4 }}>
            Manage Layered Process Audit (LPA), Poka-Yoke, and Quality check templates by Part or Operation.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
            color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 14px rgba(184,115,51,0.25)', transition: 'all 0.15s',
          }}
        >
          <Plus size={18} /> Create New Checklist
        </button>
      </div>

      {/* View Mode Switcher & Search Bar */}
      <div style={{
        padding: '14px 18px', borderRadius: 12, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cream)', padding: 4, borderRadius: 10, border: '1px solid var(--silk)' }}>
          <button
            onClick={() => { setViewMode('PART'); setExpandedId(null); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none',
              background: viewMode === 'PART' ? 'var(--copper-bronze)' : 'transparent',
              color: viewMode === 'PART' ? '#fff' : 'var(--slate)',
              boxShadow: viewMode === 'PART' ? '0 2px 6px rgba(184,115,51,0.2)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Package size={14} /> View Part-Wise (Gauge Master)
          </button>
          <button
            onClick={() => { setViewMode('OPERATION'); setExpandedId(null); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', border: 'none',
              background: viewMode === 'OPERATION' ? 'var(--copper-bronze)' : 'transparent',
              color: viewMode === 'OPERATION' ? '#fff' : 'var(--slate)',
              boxShadow: viewMode === 'OPERATION' ? '0 2px 6px rgba(184,115,51,0.2)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Settings size={14} /> View Operation-Wise
          </button>
        </div>

        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--ash)' }} />
          <input
            type="text"
            placeholder={viewMode === 'PART' ? "Search parts by name, category..." : "Search operations by name, code..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, fontSize: 13,
              border: '1px solid var(--silk)', background: 'var(--cream)', color: 'var(--charcoal)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* General / Unassigned Checklists Section */}
      {generalSets.length > 0 && !searchTerm && (
        <div style={{ background: 'var(--warm-white)', borderRadius: 12, border: '1px solid var(--silk)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ClipboardList size={18} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
              {viewMode === 'PART' ? 'General Checklists (Not Assigned to a Specific Part)' : 'General Checklists (Not Assigned to a Specific Operation)'} ({generalSets.length})
            </h3>
            <span style={{ fontSize: 11, background: 'var(--cream)', color: 'var(--ash)', padding: '2px 8px', borderRadius: 10 }}>
              Plant-Wide / Shared
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {generalSets.map(qs => (
              <div key={qs.id} style={{
                padding: '12px 16px', background: 'var(--cream)', borderRadius: 10, border: '1px solid var(--silk)',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                    {qs.auditType}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ash)', fontFamily: 'monospace' }}>
                    {qs.defaultFrequency || 'DAILY'}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{qs.name}</div>
                <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{qs.questions?.length || 0} audit check items</span>
                  <button
                    onClick={() => {
                      if (viewMode === 'PART') setManagePart(null);
                      else setManageOp(null);
                      setShowCreateModal(true);
                    }}
                    style={{ fontSize: 11, color: 'var(--copper-bronze)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Edit &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Master Table (PART-WISE or OPERATION-WISE) */}
      <div className="table-container" style={{ background: 'var(--warm-white)', borderRadius: 12, border: '1px solid var(--silk)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)', fontSize: 12, color: 'var(--slate)' }}>
              <th style={{ width: 40, padding: '12px 16px' }}></th>
              <th style={{ padding: '12px 16px' }}>{viewMode === 'PART' ? 'Part / Gauge Master' : 'Operation Name'}</th>
              <th style={{ padding: '12px 16px' }}>{viewMode === 'PART' ? 'Category / Type Code' : 'Operation Code'}</th>
              <th style={{ padding: '12px 16px' }}>{viewMode === 'PART' ? 'Material Grade / UOM' : 'Department'}</th>
              <th style={{ padding: '12px 16px' }}>LPA Checklists</th>
              <th style={{ width: 120, padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--silk)' }}>
                  <td colSpan={6} style={{ padding: 20, textAlign: 'center' }}>
                    <div className="skeleton" style={{ height: 20, width: '80%', margin: '0 auto' }} />
                  </td>
                </tr>
              ))
            ) : viewMode === 'PART' ? (
              /* ── PART-WISE TABLE ROWS ── */
              filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--ash)' }}>
                    No parts / gauge masters found matching your search.
                  </td>
                </tr>
              ) : (
                filteredParts.map((gm) => {
                  const sets = qsByPart[gm.id] || [];
                  const isExpanded = expandedId === gm.id;
                  return (
                    <React.Fragment key={gm.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : gm.id)}
                        style={{
                          borderBottom: '1px solid var(--silk)', cursor: 'pointer',
                          background: isExpanded ? 'var(--cream)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--ash)' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--charcoal)', fontSize: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={16} className="text-[var(--copper-bronze)]" />
                            {gm.gaugeTypeName || 'Unnamed Part Master'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)', fontFamily: 'monospace' }}>
                            {gm.categoryCode || 'STANDARD'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate)' }}>
                          {gm.defaultMaterialGrade ? `${gm.defaultMaterialGrade} (${gm.unitOfMeasurement || 'Pcs'})` : (gm.unitOfMeasurement || '—')}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                            background: sets.length > 0 ? 'rgba(34, 197, 94, 0.1)' : 'var(--cream)',
                            color: sets.length > 0 ? '#16a34a' : 'var(--ash)',
                          }}>
                            {sets.length} Checklists
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManagePart(gm);
                            }}
                            title="Manage LPA Checklists for this Part"
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              background: 'var(--linen)', color: 'var(--copper-bronze)', border: '1px solid var(--copper-bronze)',
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <Settings size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)' }}>
                          <td colSpan={6} style={{ padding: '16px 24px 20px 48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ClipboardList size={16} color="var(--copper-bronze)" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  LPA Checklists Assigned to Part: {gm.gaugeTypeName}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManagePart(gm);
                                }}
                                style={{
                                  fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)',
                                  background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <Plus size={14} /> Add Checklist to Part
                              </button>
                            </div>

                            {sets.length === 0 ? (
                              <div style={{ padding: 24, textAlign: 'center', background: 'var(--warm-white)', borderRadius: 10, border: '1px dashed var(--silk)', color: 'var(--ash)', fontSize: 13 }}>
                                No Layered Process Audit checklists assigned to this part yet. Click "Manage" or "Add Checklist" above.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {sets.map((qs) => (
                                  <div key={qs.id} style={{
                                    display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: 16, padding: '12px 16px',
                                    background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)',
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)' }}>{qs.name}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                                          {qs.auditType}
                                        </span>
                                        {qs.operationMaster ? (
                                          <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Settings size={12} /> Op: {qs.operationMaster.operationName} ({qs.operationMaster.operationCode})
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 11, background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                            All Operations
                                          </span>
                                        )}
                                        {qs.machineMaster && (
                                          <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Wrench size={12} /> Mch: {qs.machineMaster.machineName}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 14 }}>
                                        <span>Freq: <strong style={{ color: 'var(--charcoal)' }}>{qs.defaultFrequency || 'DAILY'}</strong></span>
                                        <span>Checkpoints: <strong style={{ color: 'var(--charcoal)' }}>{qs.questions?.length || 0}</strong> items</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setManagePart(gm)}
                                      style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--cream)', border: '1px solid var(--silk)', color: 'var(--slate)', cursor: 'pointer' }}
                                    >
                                      Edit Checkpoints
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )
            ) : (
              /* ── OPERATION-WISE TABLE ROWS ── */
              filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--ash)' }}>
                    No operations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => {
                  const sets = qsByOp[op.id] || [];
                  const isExpanded = expandedId === op.id;
                  return (
                    <React.Fragment key={op.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : op.id)}
                        style={{
                          borderBottom: '1px solid var(--silk)', cursor: 'pointer',
                          background: isExpanded ? 'var(--cream)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--ash)' }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--charcoal)', fontSize: 14 }}>
                          {op.operationName}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)', fontFamily: 'monospace' }}>
                            {op.operationCode}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--slate)' }}>
                          {op.department || '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                            background: sets.length > 0 ? 'rgba(34, 197, 94, 0.1)' : 'var(--cream)',
                            color: sets.length > 0 ? '#16a34a' : 'var(--ash)',
                          }}>
                            {sets.length} Checklists
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setManageOp(op);
                            }}
                            title="Manage LPA Checklists for this Operation"
                            style={{
                              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                              background: 'var(--linen)', color: 'var(--copper-bronze)', border: '1px solid var(--copper-bronze)',
                              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <Settings size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)' }}>
                          <td colSpan={6} style={{ padding: '16px 24px 20px 48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ClipboardList size={16} color="var(--copper-bronze)" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  Assigned LPA Checklists
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setManageOp(op);
                                }}
                                style={{
                                  fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)',
                                  background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                <Plus size={14} /> Add Checklist to Operation
                              </button>
                            </div>

                            {sets.length === 0 ? (
                              <div style={{ padding: 24, textAlign: 'center', background: 'var(--warm-white)', borderRadius: 10, border: '1px dashed var(--silk)', color: 'var(--ash)', fontSize: 13 }}>
                                No Layered Process Audit checklists assigned to this operation yet. Click "Manage" or "Add Checklist" above.
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {sets.map((qs) => (
                                  <div key={qs.id} style={{
                                    display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: 16, padding: '12px 16px',
                                    background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)',
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal)' }}>{qs.name}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                                          {qs.auditType}
                                        </span>
                                        {qs.gaugeMaster ? (
                                          <span style={{ fontSize: 11, background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: 6, border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Database size={12} /> Part: {qs.gaugeMaster.gaugeTypeName || qs.gaugeMaster.name}
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 11, background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                            All Parts
                                          </span>
                                        )}
                                        {qs.machineMaster && (
                                          <span style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Wrench size={12} /> Mch: {qs.machineMaster.machineName}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 14 }}>
                                        <span>Freq: <strong style={{ color: 'var(--charcoal)' }}>{qs.defaultFrequency || 'DAILY'}</strong></span>
                                        <span>Checkpoints: <strong style={{ color: 'var(--charcoal)' }}>{qs.questions?.length || 0}</strong> items</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setManageOp(op)}
                                      style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: 'var(--cream)', border: '1px solid var(--silk)', color: 'var(--slate)', cursor: 'pointer' }}
                                    >
                                      Edit Checkpoints
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Question Sets Modal (Per Operation) */}
      {manageOp && (
        <ManageLpaChecklistsModal
          operation={manageOp}
          gaugeMaster={null}
          questionSets={qsByOp[manageOp.id] || []}
          allQuestionSets={questionSets}
          allOperations={operations}
          gaugeMasters={gaugeMasters}
          machineMasters={machineMasters}
          onClose={() => {
            setManageOp(null);
            fetchData();
          }}
          onRefresh={fetchData}
        />
      )}

      {/* Manage Question Sets Modal (Per Part / Gauge Master) */}
      {managePart && (
        <ManageLpaChecklistsModal
          operation={null}
          gaugeMaster={managePart}
          questionSets={qsByPart[managePart.id] || []}
          allQuestionSets={questionSets}
          allOperations={operations}
          gaugeMasters={gaugeMasters}
          machineMasters={machineMasters}
          onClose={() => {
            setManagePart(null);
            fetchData();
          }}
          onRefresh={fetchData}
        />
      )}

      {/* Create New Checklist Modal (Global/Any Operation or Part) */}
      {showCreateModal && (
        <ManageLpaChecklistsModal
          operation={null}
          gaugeMaster={null}
          questionSets={[]}
          allQuestionSets={questionSets}
          allOperations={operations}
          gaugeMasters={gaugeMasters}
          machineMasters={machineMasters}
          onClose={() => {
            setShowCreateModal(false);
            fetchData();
          }}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}

// ─── Manage LPA Checklists Modal ───────────────────────────────────────────────

function ManageLpaChecklistsModal({
  operation, gaugeMaster, questionSets, allQuestionSets, allOperations, gaugeMasters, machineMasters, onClose, onRefresh,
}: {
  operation: OperationMaster | null;
  gaugeMaster: GaugeMaster | null;
  questionSets: LpaQuestionSet[];
  allQuestionSets: LpaQuestionSet[];
  allOperations: OperationMaster[];
  gaugeMasters: GaugeMaster[];
  machineMasters: MachineMaster[];
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [sets, setSets] = useState<LpaQuestionSet[]>(questionSets);
  useEffect(() => { setSets(questionSets); }, [questionSets]);

  const [editingSet, setEditingSet] = useState<Partial<LpaQuestionSet> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Question Library State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libSearch, setLibSearch] = useState('');

  // Dynamic Operation Filtering based on selected Part
  const [availableOperations, setAvailableOperations] = useState<OperationMaster[]>(allOperations);
  const [loadingOps, setLoadingOps] = useState(false);

  // When Part / Gauge Master is selected, fetch assigned operations!
  const handlePartChange = async (partId: string) => {
    if (!editingSet) return;
    const selectedPart = gaugeMasters.find(g => g.id === partId);
    setEditingSet(prev => prev ? ({ ...prev, gaugeMaster: selectedPart }) : null);

    if (!partId) {
      setAvailableOperations(allOperations);
      return;
    }

    try {
      setLoadingOps(true);
      const res = await getGaugeMasterOperations(partId);
      const opsList = getArray(res);
      const assignedOps = opsList
        .map((item: any) => item.operationMaster || item)
        .filter((op: any) => op && op.id);

      if (assignedOps.length > 0) {
        setAvailableOperations(assignedOps);
        // Automatically select the first assigned operation if currently selected operation is not in assigned list
        const currentOpId = editingSet.operationMaster?.id;
        if (!currentOpId || !assignedOps.some((o: any) => o.id === currentOpId)) {
          setEditingSet(prev => prev ? ({ ...prev, operationMaster: assignedOps[0] }) : null);
        }
      } else {
        // If no specific operations mapped to this part, fall back to all operations
        setAvailableOperations(allOperations);
      }
    } catch (err) {
      console.error('Failed to fetch operations for part:', err);
      setAvailableOperations(allOperations);
    } finally {
      setLoadingOps(false);
    }
  };

  // Build Question Library from all existing checklists
  const questionLibrary = allQuestionSets.flatMap(qs =>
    (qs.questions || []).map(q => ({ ...q, fromSet: qs.name, fromOp: qs.operationMaster?.operationName || 'General' }))
  ).filter(q => q.questionText && (
    !libSearch || q.questionText.toLowerCase().includes(libSearch.toLowerCase()) ||
    q.fromSet.toLowerCase().includes(libSearch.toLowerCase()) ||
    q.fromOp.toLowerCase().includes(libSearch.toLowerCase())
  ));

  const importQuestion = (q: any) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      const imported: LpaQuestionItem = {
        questionText: q.questionText,
        questionType: q.questionType || 'PASS_FAIL',
        isCritical: q.isCritical || false,
        checkingMethod: q.checkingMethod || 'Visual / Verification',
        reactionPlan: q.reactionPlan || '',
      };
      return { ...prev, questions: [...questions, imported] };
    });
  };

  const handleCreateNew = () => {
    const initialPart = gaugeMaster || (allOperations.length === 0 && gaugeMasters.length > 0 ? gaugeMasters[0] : undefined);
    const initialOp = operation || (allOperations.length > 0 ? allOperations[0] : undefined);

    setEditingSet({
      name: '',
      auditType: 'LAYERED_PROCESS',
      defaultFrequency: 'DAILY',
      gaugeMaster: initialPart,
      operationMaster: initialOp,
      questions: [
        { questionText: '', questionType: 'PASS_FAIL', isCritical: false, checkingMethod: 'Visual verification against standard instruction sheet.' }
      ]
    });

    if (initialPart?.id) {
      handlePartChange(initialPart.id);
    } else {
      setAvailableOperations(allOperations);
    }
  };

  const handleEdit = (set: LpaQuestionSet) => {
    setEditingSet(JSON.parse(JSON.stringify(set)));
    if (set.gaugeMaster?.id) {
      handlePartChange(set.gaugeMaster.id);
    } else {
      setAvailableOperations(allOperations);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet || !editingSet.name?.trim()) {
      setErrorMsg('Please enter a checklist title.');
      return;
    }
    if (!editingSet.questions || editingSet.questions.length === 0 || editingSet.questions.some(q => !q.questionText.trim())) {
      setErrorMsg('All check items must have question text defined.');
      return;
    }

    setErrorMsg('');
    setSaving(true);
    try {
      const payload = {
        auditType: editingSet.auditType || 'LAYERED_PROCESS',
        name: editingSet.name,
        description: editingSet.description || '',
        defaultFrequency: editingSet.defaultFrequency || 'DAILY',
        gaugeMasterId: editingSet.gaugeMaster?.id || null,
        operationMasterId: editingSet.operationMaster?.id || null,
        machineMasterId: editingSet.machineMaster?.id || null,
        questions: editingSet.questions.map((q, idx) => ({
          ...q,
          sequenceOrder: idx + 1,
        })),
      };

      await lpaApi.createQuestionSet(payload);
      setEditingSet(null);
      onRefresh?.();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save checklist.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = () => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      return {
        ...prev,
        questions: [
          ...questions,
          { questionText: '', questionType: 'PASS_FAIL', isCritical: false, checkingMethod: '' }
        ]
      };
    });
  };

  const updateQuestion = (index: number, field: keyof LpaQuestionItem, value: any) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const removeQuestion = (index: number) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      if ((prev.questions?.length || 0) <= 1) return prev;
      return { ...prev, questions: prev.questions?.filter((_, i) => i !== index) || [] };
    });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 24, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 920, maxHeight: '90vh', background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--silk)', background: 'var(--cream)' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 2 }}>
              {editingSet ? (editingSet.id ? 'Edit LPA Checklist' : 'New LPA Checklist') : `Manage Checklists ${gaugeMaster ? `— Part: ${gaugeMaster.gaugeTypeName}` : (operation ? `— Op: ${operation.operationName}` : '')}`}
            </h3>
            {gaugeMaster && !editingSet && (
              <p style={{ fontSize: 12, color: 'var(--slate)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--linen)', color: 'var(--copper-bronze)', marginRight: 6 }}>
                  {gaugeMaster.categoryCode || 'PART'}
                </span>
                {gaugeMaster.defaultMaterialGrade || 'Standard Grade'}
              </p>
            )}
            {operation && !editingSet && (
              <p style={{ fontSize: 12, color: 'var(--slate)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--linen)', color: 'var(--copper-bronze)', marginRight: 6 }}>
                  {operation.operationCode}
                </span>
                {operation.department || 'Production'}
              </p>
            )}
          </div>
          <button onClick={editingSet ? () => setEditingSet(null) : onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {editingSet ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Basic Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Audit Category *
                  </label>
                  <select
                    value={editingSet.auditType || 'LAYERED_PROCESS'}
                    onChange={(e) => setEditingSet({ ...editingSet, auditType: e.target.value as LpaAuditType })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                  >
                    <option value="LAYERED_PROCESS">Layered Process Audit (LPA)</option>
                    <option value="POKA_YOKE">Poka-Yoke / Error Proofing</option>
                    <option value="PRODUCT_AUDIT">Product Audit</option>
                    <option value="PROCESS_AUDIT">Process Audit</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Checklist Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daily Line 1 Quality Verification"
                    value={editingSet.name || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
                    Default Frequency *
                  </label>
                  <select
                    value={editingSet.defaultFrequency || 'DAILY'}
                    onChange={(e) => setEditingSet({ ...editingSet, defaultFrequency: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 13 }}
                  >
                    <option value="SHIFT_WISE">Shift-Wise (Every Shift)</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Shared Master Data Links (Part -> Operation -> Machine) */}
              <div style={{ padding: 18, borderRadius: 12, background: 'var(--cream)', border: '1px solid var(--silk)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={15} color="var(--copper-bronze)" />
                  Link to Part, Operation & Machine (Automatic Mapping)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4 }}>
                      1. Select Part / Gauge Master
                    </label>
                    <select
                      value={editingSet.gaugeMaster?.id || ''}
                      onChange={(e) => handlePartChange(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                    >
                      <option value="">-- All Parts (Plant-Wide) --</option>
                      {gaugeMasters.map(g => (
                        <option key={g.id} value={g.id}>{g.gaugeTypeName || g.name}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2, display: 'block' }}>
                      Selecting a part filters assigned operations below
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4 }}>
                      2. Assigned Operation {loadingOps && <Loader2 size={12} className="animate-spin text-[var(--copper-bronze)]" />}
                    </label>
                    <select
                      value={editingSet.operationMaster?.id || ''}
                      onChange={(e) => {
                        const opId = e.target.value;
                        const op = availableOperations.find(o => o.id === opId);
                        setEditingSet({ ...editingSet, operationMaster: op });
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                    >
                      <option value="">-- All Operations --</option>
                      {availableOperations.map(op => (
                        <option key={op.id} value={op.id}>{op.operationName} ({op.operationCode})</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2, display: 'block' }}>
                      {editingSet.gaugeMaster ? `Showing ${availableOperations.length} operations assigned to selected part` : 'Showing all operations'}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4 }}>
                      3. Machine Master (Optional)
                    </label>
                    <select
                      value={editingSet.machineMaster?.id || ''}
                      onChange={(e) => {
                        const mId = e.target.value;
                        const m = machineMasters.find(x => x.id === mId);
                        setEditingSet({ ...editingSet, machineMaster: m });
                      }}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                    >
                      <option value="">-- All Machines --</option>
                      {machineMasters.map(m => (
                        <option key={m.id} value={m.id}>{m.machineName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Questions Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--silk)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardList size={16} color="var(--copper-bronze)" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal)' }}>
                    Audit Checkpoints & Questions ({editingSet.questions?.length || 0})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowLibrary(!showLibrary)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: showLibrary ? 'var(--copper-bronze)' : 'var(--bone-white)',
                      border: '1px solid var(--copper-bronze)', color: showLibrary ? 'white' : 'var(--copper-bronze)',
                    }}
                  >
                    <BookOpen size={14} /> {showLibrary ? 'Hide Library' : 'Import from Library'}
                  </button>
                  <button
                    type="button"
                    onClick={addQuestion}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', background: 'var(--linen)', border: 'none', color: 'var(--copper-bronze)',
                    }}
                  >
                    <Plus size={14} /> Add Checkpoint
                  </button>
                </div>
              </div>

              {/* Question Library Panel */}
              {showLibrary && (
                <div style={{ padding: 14, background: 'var(--bone-white)', borderRadius: 10, border: '1px solid var(--silk)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <BookOpen size={14} color="var(--copper-bronze)" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)', textTransform: 'uppercase' }}>Question Library</span>
                    <span style={{ fontSize: 11, color: 'var(--ash)' }}>— Click any item to import into this checklist</span>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ash)' }} />
                    <input
                      type="text"
                      placeholder="Search existing questions..."
                      value={libSearch}
                      onChange={e => setLibSearch(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12 }}
                    />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {questionLibrary.length === 0 ? (
                      <div style={{ padding: 16, textAlign: 'center', color: 'var(--ash)', fontSize: 12 }}>No questions found in library</div>
                    ) : (
                      questionLibrary.map((q, idx) => (
                        <div
                          key={idx}
                          onClick={() => importQuestion(q)}
                          style={{
                            padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid var(--silk)',
                            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{q.questionText}</div>
                            <div style={{ fontSize: 11, color: 'var(--ash)' }}>Method: {q.checkingMethod || 'Visual'} | From: {q.fromSet}</div>
                          </div>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--cream)', color: 'var(--copper-bronze)', fontWeight: 700 }}>
                            + Import
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {editingSet.questions?.map((q, idx) => (
                  <div key={idx} style={{
                    padding: 16, borderRadius: 10, background: 'var(--cream)',
                    border: `1px solid ${q.isCritical ? 'rgba(234, 179, 8, 0.4)' : 'var(--silk)'}`,
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--copper-bronze)' }}>
                        Checkpoint #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeQuestion(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12 }}>
                      <input
                        type="text"
                        placeholder="Checkpoint verification question or statement..."
                        value={q.questionText}
                        onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 13 }}
                      />
                      <select
                        value={q.questionType}
                        onChange={(e) => updateQuestion(idx, 'questionType', e.target.value as any)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                      >
                        <option value="PASS_FAIL">Pass / Fail</option>
                        <option value="YES_NO">Yes / No</option>
                        <option value="NUMERIC">Numeric Range</option>
                        <option value="TEXT">Free Text Note</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <input
                        type="text"
                        placeholder="Checking method (e.g. Visual check, Micrometer reading)..."
                        value={q.checkingMethod || ''}
                        onChange={(e) => updateQuestion(idx, 'checkingMethod', e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--silk)', background: 'var(--warm-white)', fontSize: 12 }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 6 }}>
                        <input
                          type="checkbox"
                          id={`crit-${idx}`}
                          checked={q.isCritical || false}
                          onChange={(e) => updateQuestion(idx, 'isCritical', e.target.checked)}
                        />
                        <label htmlFor={`crit-${idx}`} style={{ fontSize: 12, fontWeight: 700, color: q.isCritical ? '#ca8a04' : 'var(--slate)', cursor: 'pointer' }}>
                          Critical Poka-Yoke / Safety Check
                        </label>
                      </div>
                    </div>

                    {q.isCritical && (
                      <input
                        type="text"
                        placeholder="Mandatory Reaction Plan if check fails (e.g. Stop line immediately & notify Quality Supervisor)..."
                        value={q.reactionPlan || ''}
                        onChange={(e) => updateQuestion(idx, 'reactionPlan', e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(234, 179, 8, 0.5)', background: 'rgba(234, 179, 8, 0.05)', fontSize: 12, color: 'var(--charcoal)' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </form>
          ) : (
            /* List Checklists for this Operation or Part */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Assigned Checklists ({sets.length})
                </div>
                <button
                  onClick={handleCreateNew}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'var(--copper-bronze)', color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Plus size={14} /> Add Checklist
                </button>
              </div>

              {sets.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: 'var(--cream)', borderRadius: 12, border: '1px dashed var(--silk)', color: 'var(--ash)', fontSize: 13 }}>
                  No checklists created for this {gaugeMaster ? 'part' : 'operation'} yet. Click "Add Checklist" above.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sets.map(qs => (
                    <div key={qs.id} style={{
                      padding: 16, background: 'var(--cream)', borderRadius: 12, border: '1px solid var(--silk)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--charcoal)' }}>{qs.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                            {qs.auditType}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', gap: 16 }}>
                          {gaugeMaster ? (
                            <span>Op: <strong style={{ color: 'var(--charcoal)' }}>{qs.operationMaster?.operationName || 'All Ops'}</strong></span>
                          ) : (
                            <span>Part: <strong style={{ color: 'var(--charcoal)' }}>{qs.gaugeMaster?.gaugeTypeName || 'All Parts'}</strong></span>
                          )}
                          <span>Freq: <strong style={{ color: 'var(--charcoal)' }}>{qs.defaultFrequency || 'DAILY'}</strong></span>
                          <span>Checkpoints: <strong style={{ color: 'var(--charcoal)' }}>{qs.questions?.length || 0}</strong> items</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEdit(qs)}
                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)', cursor: 'pointer' }}
                      >
                        Edit Checkpoints
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {editingSet && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--silk)', background: 'var(--cream)' }}>
            <button
              type="button"
              onClick={() => setEditingSet(null)}
              style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--slate)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>Save Checklist Template</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
