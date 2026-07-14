import React, { useState } from 'react';
import {
  Upload, FileSpreadsheet, Loader, Check, X, ArrowRight, Settings,
  Layers, Link2, Pencil, Trash2, ShieldAlert, ChevronRight, CornerDownRight,
  Database, PlusCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { pqcApi } from '../../api/pqc.api';
import type { OperationMaster } from '../../types/domain.types';
import toast from 'react-hot-toast';

interface ControlPlanCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
  allOperations: OperationMaster[];
  onSuccess: () => void;
}

export default function ControlPlanCanvasModal({
  isOpen,
  onClose,
  allOperations,
  onSuccess
}: ControlPlanCanvasModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);
  const [selectedOpIndex, setSelectedOpIndex] = useState<number>(0);
  const [commitResult, setCommitResult] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a Control Plan Excel file first');
      return;
    }
    try {
      setAnalyzing(true);
      const res = await pqcApi.analyzeExcelControlPlan(selectedFile);
      setPreviewData(res.data);
      setSelectedPartIndex(0);
      setSelectedOpIndex(0);
      toast.success('Control Plan analyzed successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to analyze Excel file');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    try {
      setCommitting(true);
      const res = await pqcApi.commitExcelControlPlan(previewData);
      setCommitResult(res.data);
      toast.success('Control Plan and Question Sets saved successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save Control Plan');
      console.error(error);
    } finally {
      setCommitting(false);
    }
  };

  // Helper to update operation linkage or parameter fields in previewData
  const updateOperationMasterLink = (partIdx: number, opIdx: number, masterId: string | null) => {
    const newData = { ...previewData };
    newData.parts[partIdx].operations[opIdx].existingOperationMasterId = masterId;
    setPreviewData(newData);
  };

  const updateQuestionField = (partIdx: number, opIdx: number, qIdx: number, field: string, value: any) => {
    const newData = { ...previewData };
    newData.parts[partIdx].operations[opIdx].questions[qIdx][field] = value;
    setPreviewData(newData);
  };

  const deleteQuestion = (partIdx: number, opIdx: number, qIdx: number) => {
    const newData = { ...previewData };
    newData.parts[partIdx].operations[opIdx].questions.splice(qIdx, 1);
    setPreviewData(newData);
  };

  const currentPart = previewData?.parts?.[selectedPartIndex];
  const currentOp = currentPart?.operations?.[selectedOpIndex];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24
    }}>
      <div style={{
        background: 'var(--warm-white)', borderRadius: 16, width: '100%', maxWidth: previewData ? 1340 : 580,
        height: previewData ? '90vh' : 'auto', maxHeight: '92vh',
        boxShadow: '0 24px 48px rgba(0,0,0,0.2)', overflow: 'hidden', border: '1px solid var(--silk)',
        display: 'flex', flexDirection: 'column', transition: 'max-width 0.3s ease'
      }} className="animate-fade-in">

        {/* Header Bar */}
        <div style={{
          padding: '18px 24px', background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'var(--linen)', borderRadius: 8, color: 'var(--copper-bronze)' }}>
              <Layers size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Control Plan Studio & Visual Linker
              </h3>
              <p style={{ fontSize: 12, color: 'var(--ash)', margin: 0, marginTop: 2 }}>
                {previewData ? 'Inspect node hierarchy, map operations, and customize parameters before saving' : 'Upload an Excel workbook (.xlsx) to launch visual hierarchy analysis'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {commitResult ? (
            /* Success Screen (Clean, Professional, No Emojis) */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 20, textAlign: 'center', margin: 'auto' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={36} />
              </div>
              <div>
                <h4 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                  Control Plan Committed Successfully
                </h4>
                <p style={{ fontSize: 13, color: 'var(--ash)', marginTop: 6 }}>
                  All selected operations, tolerances, and gauges have been synchronized with your master database.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', maxWidth: 460, marginTop: 12 }}>
                <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid #bbf7d0', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase' }}>Question Sets</span>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#166534', margin: '4px 0 0 0' }}>{commitResult.questionSetsCreated}</p>
                </div>
                <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid #bbf7d0', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase' }}>Inspection Items</span>
                  <p style={{ fontSize: 24, fontWeight: 800, color: '#166534', margin: '4px 0 0 0' }}>{commitResult.questionsCreated}</p>
                </div>
                <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid var(--silk)', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase' }}>Operations Bound</span>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: '4px 0 0 0' }}>{commitResult.operationsCreated}</p>
                </div>
                <div style={{ padding: 16, background: 'white', borderRadius: 10, border: '1px solid var(--silk)', textAlign: 'left' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ash)', textTransform: 'uppercase' }}>Gauges Registered</span>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: '4px 0 0 0' }}>{commitResult.gaugesCreated}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                style={{
                  marginTop: 20, padding: '10px 28px', background: 'var(--copper-bronze)', color: 'white',
                  borderRadius: 8, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(139,105,20,0.25)'
                }}
              >
                Close & Return to List
              </button>
            </div>
          ) : !previewData ? (
            /* Upload State */
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <label style={{
                border: '2px dashed var(--silk)', borderRadius: 12, padding: '48px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', background: 'white', transition: 'all 0.2s', textAlign: 'center'
              }}>
                <Upload size={40} color="var(--copper-bronze)" style={{ marginBottom: 16 }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)' }}>
                  {selectedFile ? selectedFile.name : 'Click to Browse or Drag Control Plan Workbook'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ash)', marginTop: 6, maxWidth: 380 }}>
                  Supports multi-sheet Customer & Inoxpa Excel specifications (.xlsx, .xls)
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {selectedFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--linen)', borderRadius: 10, border: '1px solid rgba(139,105,20,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileSpreadsheet size={20} color="var(--copper-bronze)" />
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', display: 'block' }}>{selectedFile.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--ash)' }}>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', fontSize: 12, fontWeight: 600 }}
                  >
                    Remove File
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '10px 20px', borderRadius: 8, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAnalyzeFile}
                  disabled={!selectedFile || analyzing}
                  style={{
                    padding: '10px 24px', borderRadius: 8,
                    background: selectedFile && !analyzing ? 'var(--copper-bronze)' : 'var(--ash)',
                    color: 'white', border: 'none', fontWeight: 600, fontSize: 13,
                    cursor: selectedFile && !analyzing ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: selectedFile && !analyzing ? '0 4px 12px rgba(139,105,20,0.25)' : 'none'
                  }}
                >
                  {analyzing && <Loader size={16} className="animate-spin" />}
                  {analyzing ? 'Analyzing Sheets & Structure...' : 'Analyze & Launch Canvas'}
                </button>
              </div>
            </div>
          ) : (
            /* Interactive Node Canvas / Studio */
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Column: Parts Selector */}
              <div style={{ width: 280, background: 'var(--bone-white)', borderRight: '1px solid var(--silk)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--silk)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Parts Detected ({previewData.parts.length})
                  </span>
                </div>

                {previewData.parts.map((part: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => { setSelectedPartIndex(idx); setSelectedOpIndex(0); }}
                    style={{
                      padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                      background: selectedPartIndex === idx ? 'var(--linen)' : 'white',
                      border: selectedPartIndex === idx ? '1.5px solid var(--copper-bronze)' : '1px solid var(--silk)',
                      transition: 'all 0.15s', boxShadow: selectedPartIndex === idx ? '0 4px 10px rgba(139,105,20,0.1)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge font-mono" style={{ background: selectedPartIndex === idx ? 'var(--copper-bronze)' : 'var(--silk)', color: selectedPartIndex === idx ? 'white' : 'var(--charcoal)', fontSize: 10 }}>
                        {part.partNo || `P#${idx + 1}`}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', margin: '6px 0 0 0', lineHeight: '1.3' }}>
                      {part.partName}
                    </p>
                    <span style={{ fontSize: 11, color: 'var(--ash)', display: 'block', marginTop: 6 }}>
                      {part.operations?.length || 0} Operations linked
                    </span>
                  </div>
                ))}
              </div>

              {/* Middle Column: Operation Nodes Flow */}
              <div style={{ width: 340, background: '#f8fafc', borderRight: '1px solid var(--silk)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Operation Flow ({currentPart?.operations?.length || 0})
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Select to edit parameters</span>
                </div>

                {currentPart?.operations?.map((op: any, opIdx: number) => {
                  const isOpSelected = selectedOpIndex === opIdx;
                  const isExisting = Boolean(op.existingOperationMasterId);

                  return (
                    <div
                      key={opIdx}
                      onClick={() => setSelectedOpIndex(opIdx)}
                      style={{
                        position: 'relative', background: 'white', borderRadius: 12, padding: 16,
                        border: isOpSelected ? '2px solid var(--copper-bronze)' : '1px solid #cbd5e1',
                        boxShadow: isOpSelected ? '0 6px 16px rgba(139,105,20,0.15)' : '0 2px 4px rgba(0,0,0,0.03)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                    >
                      {opIdx > 0 && (
                        <div style={{ position: 'absolute', top: -16, left: 24, color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                          <CornerDownRight size={14} />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6 }}>
                          {op.operationCode || `OP${opIdx + 1}`}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: isExisting ? '#166534' : '#b45309', background: isExisting ? '#dcfce7' : '#fef3c7', padding: '2px 8px', borderRadius: 6 }}>
                          {isExisting ? 'Linked to Database' : 'Auto-Create New'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '10px 0 8px 0', lineHeight: '1.3' }}>
                        {op.operationName}
                      </h4>

                      {/* Operation Master Linker Dropdown */}
                      <div style={{ marginTop: 10, background: '#f8fafc', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }} onClick={(e) => e.stopPropagation()}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <Link2 size={12} /> Target Operation Master:
                        </label>
                        <select
                          value={op.existingOperationMasterId || ''}
                          onChange={(e) => updateOperationMasterLink(selectedPartIndex, opIdx, e.target.value || null)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 6, fontSize: 12,
                            border: '1px solid #cbd5e1', background: 'white', color: '#1e293b'
                          }}
                        >
                          <option value="">[ + Auto-Create New Operation Master ]</option>
                          {allOperations.map((master) => (
                            <option key={master.id} value={master.id}>
                              Link to: {master.operationName} ({master.operationCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                          {op.questions?.length || 0} Parameters
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: isOpSelected ? 'var(--copper-bronze)' : '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Edit Specs <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Parameters Editor Studio */}
              <div style={{ flex: 1, background: 'white', overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column' }}>
                {currentOp ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid var(--silk)', marginBottom: 20 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                          {currentOp.operationName} — Inspection Studio
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--ash)', margin: '4px 0 0 0' }}>
                          Modify inspection tolerances, methods, and critical flags before synchronizing with PQC.
                        </p>
                      </div>
                      <span className="badge" style={{ background: 'var(--linen)', color: 'var(--copper-bronze)', fontSize: 12, padding: '4px 12px' }}>
                        {currentOp.questions?.length || 0} Total Checks
                      </span>
                    </div>

                    {currentOp.questions?.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>
                        No inspection parameters extracted for this operation.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {currentOp.questions.map((q: any, qIdx: number) => (
                          <div
                            key={qIdx}
                            style={{
                              border: '1px solid var(--silk)', borderRadius: 10, padding: 14,
                              background: q.isCritical ? '#fffbeb' : 'var(--warm-white)',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bone-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', border: '1px solid var(--silk)' }}>
                                  {q.sequenceOrder}
                                </span>
                                <select
                                  value={q.questionType || 'TEXT'}
                                  onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'questionType', e.target.value)}
                                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid var(--silk)', background: 'white' }}
                                >
                                  <option value="NUMERIC">Numeric Tolerance</option>
                                  <option value="TEXT">Visual / Text Check</option>
                                </select>
                              </div>

                              <div style={{ flex: 1 }}>
                                <input
                                  type="text"
                                  value={q.questionText || ''}
                                  onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'questionText', e.target.value)}
                                  placeholder="Parameter description..."
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', background: 'white' }}
                                />
                              </div>

                              <button
                                onClick={() => deleteQuestion(selectedPartIndex, selectedOpIndex, qIdx)}
                                title="Delete parameter"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* Row 2: Specs & Method */}
                            <div style={{ display: 'grid', gridTemplateColumns: q.questionType === 'NUMERIC' ? '1fr 1fr 1.5fr auto' : '2fr 1.5fr auto', gap: 10, marginTop: 10, alignItems: 'center' }}>
                              {q.questionType === 'NUMERIC' && (
                                <>
                                  <div>
                                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Min Limit</label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={q.minValue !== null && q.minValue !== undefined ? q.minValue : ''}
                                      onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'minValue', e.target.value ? parseFloat(e.target.value) : null)}
                                      style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, background: 'white' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Max Limit</label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={q.maxValue !== null && q.maxValue !== undefined ? q.maxValue : ''}
                                      onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'maxValue', e.target.value ? parseFloat(e.target.value) : null)}
                                      style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, background: 'white' }}
                                    />
                                  </div>
                                </>
                              )}

                              {q.questionType !== 'NUMERIC' && (
                                <div>
                                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Expected Specification</label>
                                  <input
                                    type="text"
                                    value={q.expectedAnswer || ''}
                                    onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'expectedAnswer', e.target.value)}
                                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, background: 'white' }}
                                  />
                                </div>
                              )}

                              <div>
                                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Inspection Method / Gauge</label>
                                <input
                                  type="text"
                                  value={q.checkingMethod || ''}
                                  onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'checkingMethod', e.target.value)}
                                  placeholder="e.g. Vernier Caliper"
                                  style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 12, background: 'white' }}
                                />
                              </div>

                              <div style={{ paddingTop: 14 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: q.isCritical ? '#b45309' : 'var(--charcoal)' }}>
                                  <input
                                    type="checkbox"
                                    checked={Boolean(q.isCritical)}
                                    onChange={(e) => updateQuestionField(selectedPartIndex, selectedOpIndex, qIdx, 'isCritical', e.target.checked)}
                                  />
                                  Critical Item
                                </label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: 48, textAlign: 'center', color: 'var(--ash)' }}>
                    Select an operation node from the middle flow column to inspect and edit its exact parameters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Action Bar for Preview State */}
          {previewData && !commitResult && (
            <div style={{
              padding: '16px 24px', background: 'var(--bone-white)', borderTop: '1px solid var(--silk)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={14} /> Upload Different File
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '9px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--silk)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={committing}
                  style={{
                    padding: '9px 24px', borderRadius: 8, background: 'var(--copper-bronze)', color: 'white',
                    border: 'none', fontWeight: 700, fontSize: 13, cursor: committing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(139,105,20,0.25)'
                  }}
                >
                  {committing && <Loader size={16} className="animate-spin" />}
                  {committing ? 'Synchronizing & Saving...' : 'Commit & Save All Question Sets'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
