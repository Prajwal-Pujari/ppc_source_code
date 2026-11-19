import React, { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Save, X, Settings, Search, AlertCircle,
  Copy, ShieldCheck, Sparkles, Flag, CheckCircle2,
  Package, Wrench, Layers, RotateCcw
} from 'lucide-react';
import {
  pieceQuestionSetsApi,
  type PieceQuestionSet,
  type PieceQuestion,
  type PieceType,
  type CreatePieceQuestionSetPayload
} from '@/api/pieceQuestionSets.api';
import { pqcApi } from '@/api/pqc.api';
import { getOperationMasters } from '@/api/operation-master.api';
import { getGaugeMasters } from '@/api/gauge-master.api';
import type { OperationMaster, GaugeMaster } from '@/types/domain.types';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

export default function PieceQuestionSetMasterPage() {
  const [questionSets, setQuestionSets] = useState<PieceQuestionSet[]>([]);
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [gaugeMasters, setGaugeMasters] = useState<GaugeMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | PieceType>('ALL');
  const [search, setSearch] = useState('');
  const [expandedOpId, setExpandedOpId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<Partial<PieceQuestionSet> | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [selectedGaugeId, setSelectedGaugeId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // In-process sets for "Copy from In-Process" functionality
  const { data: inProcessSetsData } = useQuery({
    queryKey: ['pqc-in-process-sets'],
    queryFn: () => pqcApi.getAllQuestionSets(),
  });
  const inProcessSets = inProcessSetsData?.data || [];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qsRes, opsRes, gmRes] = await Promise.all([
        pieceQuestionSetsApi.getAll(),
        getOperationMasters({ size: 1000, isActive: true }),
        getGaugeMasters({ size: 1000, isActive: true })
      ]);
      setQuestionSets(qsRes.data || []);
      setOperations(opsRes.data?.content || opsRes.data || []);
      setGaugeMasters(gmRes.data?.content || gmRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load piece question sets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group question sets by Operation Master
  const qsByOp = questionSets.reduce<Record<string, PieceQuestionSet[]>>((acc, qs) => {
    const opId = qs.operationMaster?.id;
    if (opId) {
      if (!acc[opId]) acc[opId] = [];
      acc[opId].push(qs);
    }
    return acc;
  }, {});

  // Open modal to create a new set for an operation
  const handleOpenCreate = (op?: OperationMaster, defaultType: PieceType = 'FIRST_PIECE') => {
    const opId = op ? op.id : (operations[0]?.id || '');
    setSelectedOpId(opId);
    setSelectedGaugeId('');
    setEditingSet({
      name: op ? `${op.operationName} ${defaultType === 'FIRST_PIECE' ? '1st Piece' : 'Last Piece'} Checklist` : '',
      pieceType: defaultType,
      questions: [
        {
          sequenceOrder: 1,
          questionText: '',
          questionType: 'PASS_FAIL',
          isCritical: true,
          checkingMethod: 'Visual / Instrument',
          expectedAnswer: 'PASS'
        }
      ]
    });
    setIsModalOpen(true);
  };

  // Open modal to edit an existing set
  const handleOpenEdit = (set: PieceQuestionSet) => {
    setSelectedOpId(set.operationMaster.id);
    setSelectedGaugeId(set.gaugeMaster?.id || '');
    setEditingSet({
      ...set,
      questions: (set.questions || []).map((q, i) => ({
        ...q,
        sequenceOrder: i + 1,
      }))
    });
    setIsModalOpen(true);
  };

  // Delete question set
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete checklist "${name}"?`)) return;
    try {
      await pieceQuestionSetsApi.delete(id);
      toast.success('Checklist deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete checklist');
    }
  };

  // Add question to active editing set
  const handleAddQuestion = () => {
    if (!editingSet) return;
    const questions = editingSet.questions || [];
    setEditingSet({
      ...editingSet,
      questions: [
        ...questions,
        {
          sequenceOrder: questions.length + 1,
          questionText: '',
          questionType: 'PASS_FAIL',
          isCritical: false,
          checkingMethod: 'Visual / Instrument',
          expectedAnswer: 'PASS'
        }
      ]
    });
  };

  // Update a question field
  const handleUpdateQuestion = (index: number, field: keyof PieceQuestion, value: any) => {
    if (!editingSet) return;
    const questions = [...(editingSet.questions || [])];
    questions[index] = { ...questions[index], [field]: value };
    setEditingSet({ ...editingSet, questions });
  };

  // Remove question
  const handleRemoveQuestion = (index: number) => {
    if (!editingSet) return;
    const questions = (editingSet.questions || []).filter((_, i) => i !== index);
    setEditingSet({
      ...editingSet,
      questions: questions.map((q, i) => ({ ...q, sequenceOrder: i + 1 }))
    });
  };

  // Copy parameters from an existing in-process question set for this operation
  const handleCopyFromInProcess = () => {
    if (!selectedOpId) {
      toast.error('Please select an operation first');
      return;
    }
    const match = inProcessSets.find((s: any) => s.operationMaster?.id === selectedOpId);
    if (!match || !match.questions || match.questions.length === 0) {
      toast.error('No in-process question set found for this operation to copy from.');
      return;
    }

    const copiedQuestions: PieceQuestion[] = match.questions.map((q: any, i: number) => ({
      sequenceOrder: i + 1,
      questionText: q.questionText,
      questionType: q.questionType,
      expectedAnswer: q.expectedAnswer,
      unit: q.unit,
      minValue: q.minValue,
      maxValue: q.maxValue,
      choices: q.choices,
      isCritical: q.isCritical || false,
      checkingMethod: q.checkingMethod || 'Instrument',
    }));

    setEditingSet((prev) => ({
      ...prev,
      questions: copiedQuestions
    }));
    toast.success(`Copied ${copiedQuestions.length} parameters from in-process checklist!`);
  };

  // Save question set
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet?.name?.trim()) {
      toast.error('Please enter a checklist name');
      return;
    }
    if (!selectedOpId) {
      toast.error('Please select an operation');
      return;
    }
    if (!editingSet.questions || editingSet.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const payload: CreatePieceQuestionSetPayload = {
      name: editingSet.name.trim(),
      pieceType: editingSet.pieceType || 'FIRST_PIECE',
      operationMasterId: selectedOpId,
      gaugeMasterId: selectedGaugeId || null,
      questions: editingSet.questions.map((q, i) => ({
        ...q,
        sequenceOrder: i + 1,
      }))
    };

    try {
      setSaving(true);
      if (editingSet.id) {
        await pieceQuestionSetsApi.update(editingSet.id, payload);
        toast.success('Checklist updated successfully');
      } else {
        await pieceQuestionSetsApi.create(payload);
        toast.success('Checklist created successfully');
      }
      setIsModalOpen(false);
      setEditingSet(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save checklist');
    } finally {
      setSaving(false);
    }
  };

  // Filter operations based on search & filter
  const filteredOps = operations.filter((op) => {
    const matchesSearch = op.operationName.toLowerCase().includes(search.toLowerCase()) ||
                          op.operationCode.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'ALL') return true;
    const sets = qsByOp[op.id] || [];
    return sets.some((s) => s.pieceType === filterType || s.pieceType === 'BOTH');
  });

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={22} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', margin: 0 }}>
              1st & Last Piece Checklists
            </h1>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ash, #8C857D)', margin: '4px 0 0' }}>
            Separate, dedicated inspection question sets for First Piece (machine setup) and Last Piece (end-of-shift) audits.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreate(undefined, 'FIRST_PIECE')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: 'var(--copper-bronze, #8B6914)',
            color: '#FFFFFF',
            border: 'none',
            boxShadow: '0 2px 6px rgba(139,105,20,0.25)',
          }}
        >
          <Plus size={16} />
          Create New Checklist
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        border: '1px solid var(--silk, #E8E2D9)',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* Type Toggle Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--linen, #EEE9E1)',
          padding: 3,
          borderRadius: 8,
          border: '1px solid var(--silk, #E8E2D9)',
          gap: 2
        }}>
          {[
            { key: 'ALL', label: 'All Checklists', icon: Layers },
            { key: 'FIRST_PIECE', label: '1st Piece Checklists', icon: Sparkles, color: '#1E40AF' },
            { key: 'LAST_PIECE', label: 'Last Piece Checklists', icon: Flag, color: '#B45309' },
            { key: 'BOTH', label: 'Both (Universal)', icon: CheckCircle2, color: '#047857' }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = filterType === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  color: active ? 'var(--charcoal, #1C1A18)' : 'var(--ash, #8C857D)',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={13} style={{ color: active && tab.color ? tab.color : 'inherit' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone, #C8C2B8)' }} />
          <input
            type="text"
            placeholder="Search operations, codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 30,
              paddingRight: 10,
              height: 34,
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid var(--silk, #E8E2D9)',
              backgroundColor: 'var(--bone-white, #FAF8F5)',
              color: 'var(--charcoal, #1C1A18)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Operations & Question Sets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash, #8C857D)', fontSize: 13 }}>
            Loading piece checklists...
          </div>
        ) : filteredOps.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px dashed var(--silk, #E8E2D9)',
            color: 'var(--ash, #8C857D)'
          }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No operations found matching filter</p>
          </div>
        ) : (
          filteredOps.map((op) => {
            const allOpSets = qsByOp[op.id] || [];
            const displaySets = filterType === 'ALL'
              ? allOpSets
              : allOpSets.filter((s) => s.pieceType === filterType || s.pieceType === 'BOTH');
            const isExpanded = expandedOpId === op.id;

            const fpCount = allOpSets.filter((s) => s.pieceType === 'FIRST_PIECE' || s.pieceType === 'BOTH').length;
            const lpCount = allOpSets.filter((s) => s.pieceType === 'LAST_PIECE' || s.pieceType === 'BOTH').length;

            return (
              <div
                key={op.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 10,
                  border: '1px solid var(--silk, #E8E2D9)',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Operation Row Header */}
                <div style={{
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                  backgroundColor: isExpanded ? 'var(--bone-white, #FAF8F5)' : '#FFFFFF',
                  borderBottom: isExpanded ? '1px solid var(--silk, #E8E2D9)' : 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedOpId(isExpanded ? null : op.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--slate, #4A4540)' }}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--charcoal, #1C1A18)' }}>
                          {op.operationName}
                        </h3>
                        <span style={{
                          fontSize: 11,
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: 'var(--linen, #EEE9E1)',
                          color: 'var(--copper-dark, #6F5100)'
                        }}>
                          {op.operationCode}
                        </span>
                        {op.department && (
                          <span style={{ fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                            ({op.department})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: fpCount > 0 ? '#DBEAFE' : 'var(--linen, #EEE9E1)',
                        color: fpCount > 0 ? '#1E40AF' : 'var(--ash, #8C857D)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Sparkles size={11} />
                        1st Piece: {fpCount}
                      </span>
                      <span style={{
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 6,
                        backgroundColor: lpCount > 0 ? '#FEF3C7' : 'var(--linen, #EEE9E1)',
                        color: lpCount > 0 ? '#92400E' : 'var(--ash, #8C857D)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Flag size={11} />
                        Last Piece: {lpCount}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(op, 'FIRST_PIECE')}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Plus size={12} />
                        + 1st Piece
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenCreate(op, 'LAST_PIECE')}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          backgroundColor: '#FFFBEB',
                          color: '#B45309',
                          border: '1px solid #FDE68A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Plus size={12} />
                        + Last Piece
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Question Sets List */}
                {isExpanded && (
                  <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {displaySets.length === 0 ? (
                      <div style={{
                        padding: 24,
                        textAlign: 'center',
                        color: 'var(--ash, #8C857D)',
                        fontSize: 12,
                        backgroundColor: 'var(--warm-white, #F5F2ED)',
                        borderRadius: 8
                      }}>
                        No piece checklists configured for this operation yet. Click "+ 1st Piece" or "+ Last Piece" to add.
                      </div>
                    ) : (
                      displaySets.map((qs) => {
                        const isFP = qs.pieceType === 'FIRST_PIECE';
                        const isLP = qs.pieceType === 'LAST_PIECE';

                        return (
                          <div
                            key={qs.id}
                            style={{
                              padding: '12px 16px',
                              borderRadius: 8,
                              border: '1px solid var(--silk, #E8E2D9)',
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 12
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 800,
                                fontFamily: "'JetBrains Mono', monospace",
                                backgroundColor: isFP ? '#DBEAFE' : isLP ? '#FEF3C7' : '#D1FAE5',
                                color: isFP ? '#1E40AF' : isLP ? '#92400E' : '#065F46',
                                border: isFP ? '1px solid #93C5FD' : isLP ? '1px solid #FCD34D' : '1px solid #6EE7B7'
                              }}>
                                {isFP ? '1ST PIECE' : isLP ? 'LAST PIECE' : 'UNIVERSAL'}
                              </span>

                              <div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                                  {qs.name}
                                </span>
                                {qs.gaugeMaster && (
                                  <span style={{ fontSize: 11, color: 'var(--copper-bronze, #8B6914)', marginLeft: 8, fontWeight: 600 }}>
                                    &bull; Part: {qs.gaugeMaster.gaugeTypeName} {qs.gaugeMaster.categoryCode ? `(${qs.gaugeMaster.categoryCode})` : ''}
                                  </span>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)', marginTop: 2 }}>
                                  {qs.questions?.length || 0} parameter{(qs.questions?.length || 0) === 1 ? '' : 's'} configured
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(qs)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: '1px solid var(--silk, #E8E2D9)',
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--charcoal, #1C1A18)',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                              >
                                <Pencil size={12} />
                                Edit Parameters
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(qs.id!, qs.name)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 6,
                                  border: '1px solid #FCA5A5',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  fontSize: 11,
                                  cursor: 'pointer'
                                }}
                                title="Delete Checklist"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  CREATE / EDIT MODAL
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isModalOpen && editingSet && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            width: '100%',
            maxWidth: 820,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--silk, #E8E2D9)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--charcoal, #1C1A18)' }}>
                  {editingSet.id ? 'Edit Piece Inspection Checklist' : 'New Piece Inspection Checklist'}
                </h3>
                <p style={{ fontSize: 11, color: 'var(--ash, #8C857D)', margin: '2px 0 0' }}>
                  Independent checklist parameters pulled during 1st Piece or Last Piece inspection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash, #8C857D)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Top Row: Type + Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'block', marginBottom: 4 }}>
                    Checklist Type *
                  </label>
                  <select
                    value={editingSet.pieceType || 'FIRST_PIECE'}
                    onChange={(e) => setEditingSet({ ...editingSet, pieceType: e.target.value as PieceType })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--charcoal, #1C1A18)'
                    }}
                  >
                    <option value="FIRST_PIECE">1st Piece Inspection (Setup)</option>
                    <option value="LAST_PIECE">Last Piece Inspection (End-of-Shift)</option>
                    <option value="BOTH">Both 1st & Last Piece (Universal)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'block', marginBottom: 4 }}>
                    Checklist Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Turning 1st Piece Setup Verification"
                    value={editingSet.name || ''}
                    onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--charcoal, #1C1A18)'
                    }}
                  />
                </div>
              </div>

              {/* Second Row: Operation + Optional Part */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'block', marginBottom: 4 }}>
                    Operation Master *
                  </label>
                  <select
                    value={selectedOpId}
                    onChange={(e) => setSelectedOpId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: 'var(--charcoal, #1C1A18)'
                    }}
                  >
                    <option value="">-- Select Operation --</option>
                    {operations.map((op) => (
                      <option key={op.id} value={op.id}>{op.operationName} ({op.operationCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', display: 'block', marginBottom: 4 }}>
                    Specific Part / Item (Optional)
                  </label>
                  <select
                    value={selectedGaugeId}
                    onChange={(e) => setSelectedGaugeId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: '#FFFFFF',
                      fontSize: 12,
                      color: 'var(--charcoal, #1C1A18)'
                    }}
                  >
                    <option value="">All Parts (Operation Global)</option>
                    {gaugeMasters.map((gm) => (
                      <option key={gm.id} value={gm.id}>{gm.gaugeTypeName} {gm.categoryCode ? `(${gm.categoryCode})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Questions Section Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                borderTop: '1px solid var(--silk, #E8E2D9)'
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                    Checklist Questions / Parameters ({(editingSet.questions || []).length})
                  </span>
                  <p style={{ fontSize: 11, color: 'var(--ash, #8C857D)', margin: '1px 0 0' }}>
                    Define tolerances, checking methods, and critical dimensions.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleCopyFromInProcess}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: 'var(--bone-white, #FAF8F5)',
                      color: 'var(--charcoal, #1C1A18)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="Copy questions from in-process inspection set"
                  >
                    <Copy size={12} />
                    Copy from In-Process
                  </button>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '5px 12px',
                      borderRadius: 6,
                      border: 'none',
                      backgroundColor: 'var(--copper-bronze, #8B6914)',
                      color: '#FFFFFF',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={13} />
                    Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(editingSet.questions || []).map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: 'var(--bone-white, #FAF8F5)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: 'var(--copper-dark, #6F5100)'
                      }}>
                        Q#{idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', padding: 2 }}
                        title="Remove Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Question Text + Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                      <input
                        type="text"
                        placeholder="Question or parameter description..."
                        required
                        value={q.questionText}
                        onChange={(e) => handleUpdateQuestion(idx, 'questionText', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--silk, #E8E2D9)',
                          backgroundColor: '#FFFFFF',
                          fontSize: 12,
                          color: 'var(--charcoal, #1C1A18)'
                        }}
                      />

                      <select
                        value={q.questionType}
                        onChange={(e) => handleUpdateQuestion(idx, 'questionType', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid var(--silk, #E8E2D9)',
                          backgroundColor: '#FFFFFF',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--charcoal, #1C1A18)'
                        }}
                      >
                        <option value="PASS_FAIL">Pass / Fail</option>
                        <option value="NUMERIC">Numeric (Tolerances)</option>
                        <option value="TEXT">Text Observation</option>
                      </select>
                    </div>

                    {/* If Numeric: Min, Max, Unit */}
                    {q.questionType === 'NUMERIC' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <input
                          type="number"
                          step="any"
                          placeholder="Min Spec (e.g. 24.98)"
                          value={q.minValue != null ? q.minValue : ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'minValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: '#FFFFFF',
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}
                        />
                        <input
                          type="number"
                          step="any"
                          placeholder="Max Spec (e.g. 25.02)"
                          value={q.maxValue != null ? q.maxValue : ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'maxValue', e.target.value ? parseFloat(e.target.value) : undefined)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: '#FFFFFF',
                            fontSize: 11,
                            fontFamily: "'JetBrains Mono', monospace"
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Unit (e.g. mm, Ra, deg)"
                          value={q.unit || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'unit', e.target.value)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: '#FFFFFF',
                            fontSize: 11
                          }}
                        />
                      </div>
                    )}

                    {/* Method + Critical Toggle */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Checking Method (e.g. Vernier, Micrometer, Dial Indicator)..."
                        value={q.checkingMethod || ''}
                        onChange={(e) => handleUpdateQuestion(idx, 'checkingMethod', e.target.value)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: 6,
                          border: '1px solid var(--silk, #E8E2D9)',
                          backgroundColor: '#FFFFFF',
                          fontSize: 11
                        }}
                      />

                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--charcoal, #1C1A18)' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(q.isCritical)}
                          onChange={(e) => handleUpdateQuestion(idx, 'isCritical', e.target.checked)}
                          style={{ accentColor: '#DC2626' }}
                        />
                        <span>Critical Parameter</span>
                      </label>
                    </div>
                  </div>
                ))}

                {(editingSet.questions || []).length === 0 && (
                  <div style={{
                    padding: 24,
                    textAlign: 'center',
                    color: 'var(--ash, #8C857D)',
                    fontSize: 12,
                    border: '1px dashed var(--silk, #E8E2D9)',
                    borderRadius: 8
                  }}>
                    No questions added yet. Click "Add Question" or "Copy from In-Process" above.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid var(--silk, #E8E2D9)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid var(--silk, #E8E2D9)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--charcoal, #1C1A18)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: 'var(--copper-bronze, #8B6914)',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(139,105,20,0.2)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
