import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCalibrationObservations, saveCalibrationObservations, initCalibrationObservations } from '@/api/calibration.api';
import { completeOperation } from '@/api/gauge-operations.api';
import type { CalibrationObservation } from '@/types/domain.types';
import { AlertTriangle, CheckCircle, Save, FileText, Loader, X, ArrowLeft } from 'lucide-react';

interface Props {
  gaugeOperationId: string;
  gauge: any;
  onClose: () => void;
  onCompleted: () => void;
}

const formatReading = (val: any) => {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toFixed(4);
};

const formatTolPlus = (val: any) => {
  if (val == null || val === '') return '—';
  if (val === 0 || val === '0' || Number(val) === 0) return '0.0000';
  const num = Number(val);
  if (!isNaN(num)) return `+${Math.abs(num).toFixed(4)}`;
  const str = String(val).trim();
  return str.startsWith('+') || str.startsWith('-') ? str : `+${str}`;
};

const formatTolMinus = (val: any) => {
  if (val == null || val === '') return '—';
  if (val === 0 || val === '0' || Number(val) === 0) return '0.0000';
  const num = Number(val);
  if (!isNaN(num)) return `-${Math.abs(num).toFixed(4)}`;
  const str = String(val).trim();
  return str.startsWith('+') || str.startsWith('-') ? str : `-${str}`;
};

/* ─── Global styles injected once ─── */
const GLOBAL_STYLES = `
  .calib-form input[type=number]::-webkit-inner-spin-button,
  .calib-form input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .calib-form input[type=number] {
    -moz-appearance: textfield;
  }
  .calib-form .spin {
    animation: calib-spin 1s linear infinite;
  }
  @keyframes calib-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Details grid: 4 cols → 2 cols on tablet → 2 cols on mobile ── */
  .calib-details-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
  @media (max-width: 700px) {
    .calib-details-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  }

  /* ── Header: stack on mobile ── */
  .calib-header {
    background: linear-gradient(135deg, #1C1A18 0%, #2D2926 50%, #3A3530 100%);
    padding: 20px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  @media (max-width: 500px) {
    .calib-header { padding: 16px; }
  }

  /* ── Observation table: scrollable on small screens ── */
  .calib-table-scroll {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .calib-table-scroll table {
    min-width: 560px;
  }

  /* ── Summary bar: stack on mobile ── */
  .calib-summary-bar {
    display: flex;
    gap: 16px;
    padding: 16px 20px;
    background: #F5F2ED;
    border-radius: 10px;
    margin-bottom: 20px;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  /* ── Action buttons: full-width on mobile ── */
  .calib-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  @media (max-width: 500px) {
    .calib-actions { flex-direction: column; }
    .calib-actions button { width: 100%; justify-content: center; }
  }

  /* ── Body padding ── */
  .calib-body {
    padding: 24px 28px;
  }
  @media (max-width: 500px) {
    .calib-body { padding: 16px; }
  }

  /* ── Details section padding ── */
  .calib-details-section {
    padding: 16px 28px;
    background: #F5F2ED;
    border-bottom: 1px solid #D4CCBF;
  }
  @media (max-width: 500px) {
    .calib-details-section { padding: 14px 16px; }
  }
`;

export default function CalibrationObservationForm({ gaugeOperationId, gauge, onClose, onCompleted }: Props) {
  const queryClient = useQueryClient();
  const [localObs, setLocalObs] = useState<CalibrationObservation[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['calibration-observations', gaugeOperationId],
    queryFn: () => getCalibrationObservations(gaugeOperationId),
  });

  const initMut = useMutation({
    mutationFn: () => initCalibrationObservations(gaugeOperationId),
    onSuccess: () => refetch(),
  });

  useEffect(() => {
    const obs = data?.data || [];
    if (obs.length === 0 && !isLoading) {
      initMut.mutate();
    } else {
      setLocalObs(obs);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = localObs.map(o => ({
        id: o.id,
        observedGo: o.observedGo,
        observedNogo: o.observedNogo,
        remarks: o.remarks || '',
      }));
      await saveCalibrationObservations(gaugeOperationId, payload);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const payload = localObs.map(o => ({
        id: o.id,
        observedGo: o.observedGo != null && (o.observedGo as any) !== '' ? Number(o.observedGo) : null,
        observedNogo: o.observedNogo != null && (o.observedNogo as any) !== '' ? Number(o.observedNogo) : null,
        remarks: o.remarks || '',
      }));
      await saveCalibrationObservations(gaugeOperationId, payload);
      await completeOperation(gaugeOperationId, { remarks: 'Calibration observations recorded' });
      queryClient.invalidateQueries({ queryKey: ['calibration-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['calibration-task-summary'] });
      onCompleted();
    } finally {
      setSaving(false);
    }
  };

  const updateObservation = (index: number, field: 'observedGo' | 'observedNogo' | 'remarks', value: any) => {
    setLocalObs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const isOutOfBounds = (obs: CalibrationObservation, field: 'go' | 'nogo') => {
    if (field === 'go') {
      const val = obs.observedGo != null && (obs.observedGo as any) !== '' ? Number(obs.observedGo) : null;
      if (val == null || isNaN(val)) return false;
      if (obs.specifiedGoPlus != null && val > Number(obs.specifiedGoPlus)) return true;
      if (obs.specifiedGoMinus != null && val < Number(obs.specifiedGoMinus)) return true;
      return false;
    } else {
      const val = obs.observedNogo != null && (obs.observedNogo as any) !== '' ? Number(obs.observedNogo) : null;
      if (val == null || isNaN(val)) return false;
      if (obs.specifiedNogoPlus != null && val > Number(obs.specifiedNogoPlus)) return true;
      if (obs.specifiedNogoMinus != null && val < Number(obs.specifiedNogoMinus)) return true;
      return false;
    }
  };

  const allFilled = localObs.every(o => o.observedGo != null && (o.observedGo as any) !== '' && o.observedNogo != null && (o.observedNogo as any) !== '');
  const hasAnyOutOfBounds = localObs.some(o => isOutOfBounds(o, 'go') || isOutOfBounds(o, 'nogo'));
  const po = gauge?.purchaseOrder;

  if (isLoading) {
    return (
      <div className="calib-form" style={{ padding: 40, textAlign: 'center', color: '#807665' }}>
        <style>{GLOBAL_STYLES}</style>
        <Loader size={24} className="spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading calibration observations...</p>
      </div>
    );
  }

  return (
    <div className="calib-form" style={{ background: 'white', borderRadius: 12, border: '1px solid #D1C5B240', overflow: 'hidden' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ─── Header ─── */}
      <div className="calib-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8C668', padding: 0, display: 'flex' }}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#E8C668', margin: 0, letterSpacing: '-0.02em' }}>
              Calibration Results
            </h2>
          </div>
          <p style={{ fontSize: 10, color: 'rgba(232,198,104,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
            Precision Measurement Observations
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
            {gauge?.serialNumber || 'N/A'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            {gauge?.gaugeTypeName || 'Gauge'}
          </div>
        </div>
      </div>

      {/* ─── Gauge & PO Details ─── */}
      <div className="calib-details-section">
        <div className="calib-details-grid">
          <DetailField label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
          <DetailField label="WO Number" value={po?.poNumber || '—'} mono />
          <DetailField label="Cust. Sr. No." value={gauge?.customerSrNumber || po?.customerSrNumber || '—'} mono />
          <DetailField label="Mfg. No." value={gauge?.manufactureNumber || po?.manufactureNumber || '—'} mono />
          <DetailField label="Gauge Type" value={gauge?.gaugeTypeName || '—'} />
          <DetailField label="Nominal Size" value={`${gauge?.nominalSize || '—'} ${gauge?.sizeUnit || 'mm'}`} mono />
        </div>
        <div className="calib-details-grid" style={{ marginTop: 12 }}>
          <DetailField label="Material" value={gauge?.materialGrade || 'Standard'} />
          <DetailField label="Batch Qty" value={`${gauge?.batchQuantity || 1}`} mono />
          <DetailField label="Due Date" value={po?.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
          <DetailField label="Priority" value={po?.priority || 'NORMAL'} />
        </div>
      </div>

      {/* ─── Observation Tables ─── */}
      <div className="calib-body">
        {localObs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#807665' }}>
            <p>No observations to record. Batch quantity may be zero.</p>
          </div>
        ) : (
          localObs.map((obs, idx) => (
            <div key={obs.id} style={{ marginBottom: 24 }}>
              {/* Unit Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderRadius: '8px 8px 0 0',
                background: 'linear-gradient(135deg, #1E3A8A08, #1E3A8A03)',
                border: '1px solid #D1C5B240', borderBottom: 'none',
                flexWrap: 'wrap', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#1E3A8A',
                    background: 'rgba(30,58,138,0.10)', padding: '3px 10px', borderRadius: 6,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    Unit {obs.unitNumber} / {localObs.length}
                  </span>
                  {obs.observedGo != null && obs.observedNogo != null && (
                    isOutOfBounds(obs, 'go') || isOutOfBounds(obs, 'nogo') ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#BA1A1A',
                        background: 'rgba(186,26,26,0.08)', padding: '3px 10px', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <AlertTriangle size={12} /> OUT OF TOLERANCE
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#228B22',
                        background: 'rgba(34,139,34,0.08)', padding: '3px 10px', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <CheckCircle size={12} /> PASS
                      </span>
                    )
                  )}
                </div>
                {obs.wearLimit != null && (
                  <span style={{ fontSize: 11, color: '#807665', fontFamily: "'JetBrains Mono', monospace" }}>
                    W/L: {obs.wearLimit}
                  </span>
                )}
              </div>

              {/* Observation Table — horizontally scrollable on small screens */}
              <div className="calib-table-scroll">
                <table style={{
                  width: '100%', borderCollapse: 'collapse', fontSize: 12,
                  border: '1px solid #D1C5B240', borderRadius: '0 0 8px 8px', overflow: 'hidden',
                }}>
                  <thead>
                    <tr style={{ background: '#F5F2ED' }}>
                      <th style={thStyle}></th>
                      <th colSpan={2} style={{ ...thStyle, textAlign: 'center', background: '#EEF2F8', color: '#1E3A8A' }}>
                        Nominal Size (mm)
                      </th>
                      <th colSpan={2} style={{ ...thStyle, textAlign: 'center', background: '#FBF4E8', color: '#8B6914' }}>
                        Specified Size (mm)
                      </th>
                      <th colSpan={2} style={{ ...thStyle, textAlign: 'center', background: '#EBF4EE', color: '#228B22' }}>
                        Observed Size (mm)
                      </th>
                    </tr>
                    <tr style={{ background: '#FAFAF8', borderBottom: '2px solid #D4CCBF' }}>
                      <th style={{ ...thStyle, width: 40 }}></th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '12%' }}>GO</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '12%' }}>NOGO</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '12%', fontSize: 9 }}>GO (+/-)</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '12%', fontSize: 9 }}>NOGO (+/-)</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '18%' }}>GO</th>
                      <th style={{ ...thStyle, textAlign: 'center', width: '18%' }}>NOGO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#807665', fontSize: 10 }}>
                        VAL
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: '#EEF2F810' }}>
                        {formatReading(obs.higherSize)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: '#EEF2F810' }}>
                        {formatReading(obs.lowerSize)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: '#FBF4E810' }}>
                        {obs.specifiedGoPlus != null || obs.specifiedGoMinus != null
                          ? <><div style={{ color: '#1C1A18', fontWeight: 700 }}>{formatTolPlus(obs.specifiedGoPlus)}</div><div style={{ color: '#1C1A18', fontWeight: 700 }}>{formatTolMinus(obs.specifiedGoMinus)}</div></>
                          : '—'
                        }
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: '#FBF4E810' }}>
                        {obs.specifiedNogoPlus != null || obs.specifiedNogoMinus != null
                          ? <><div style={{ color: '#1C1A18', fontWeight: 700 }}>{formatTolPlus(obs.specifiedNogoPlus)}</div><div style={{ color: '#1C1A18', fontWeight: 700 }}>{formatTolMinus(obs.specifiedNogoMinus)}</div></>
                          : '—'
                        }
                      </td>
                      {/* Observed GO — no spinner arrows */}
                      <td style={{
                        ...tdStyle, padding: '6px 8px',
                        background: isOutOfBounds(obs, 'go') ? 'rgba(186,26,26,0.06)' : undefined,
                      }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={obs.observedGo !== null && obs.observedGo !== undefined ? (typeof obs.observedGo === 'number' ? obs.observedGo.toFixed(4) : obs.observedGo) : ''}
                            onChange={(e) => updateObservation(idx, 'observedGo', e.target.value !== '' ? e.target.value : null)}
                            placeholder="Enter GO"
                            style={{
                              width: '100%', padding: '8px 10px',
                              borderRadius: 6, fontSize: 13,
                              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                              border: isOutOfBounds(obs, 'go') ? '2px solid #BA1A1A' : '1px solid #D1C5B2',
                              background: isOutOfBounds(obs, 'go') ? '#FFF5F5' : 'white',
                              color: isOutOfBounds(obs, 'go') ? '#BA1A1A' : '#1B1C1A',
                              outline: 'none', transition: 'all 0.2s',
                              textAlign: 'center',
                              appearance: 'none' as any,
                              MozAppearance: 'textfield' as any,
                            }}
                          />
                          {isOutOfBounds(obs, 'go') && (
                            <AlertTriangle size={14} color="#BA1A1A" style={{
                              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                            }} />
                          )}
                        </div>
                      </td>
                      {/* Observed NOGO — no spinner arrows */}
                      <td style={{
                        ...tdStyle, padding: '6px 8px',
                        background: isOutOfBounds(obs, 'nogo') ? 'rgba(186,26,26,0.06)' : undefined,
                      }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={obs.observedNogo !== null && obs.observedNogo !== undefined ? (typeof obs.observedNogo === 'number' ? obs.observedNogo.toFixed(4) : obs.observedNogo) : ''}
                            onChange={(e) => updateObservation(idx, 'observedNogo', e.target.value !== '' ? e.target.value : null)}
                            placeholder="Enter NOGO"
                            style={{
                              width: '100%', padding: '8px 10px',
                              borderRadius: 6, fontSize: 13,
                              fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                              border: isOutOfBounds(obs, 'nogo') ? '2px solid #BA1A1A' : '1px solid #D1C5B2',
                              background: isOutOfBounds(obs, 'nogo') ? '#FFF5F5' : 'white',
                              color: isOutOfBounds(obs, 'nogo') ? '#BA1A1A' : '#1B1C1A',
                              outline: 'none', transition: 'all 0.2s',
                              textAlign: 'center',
                              appearance: 'none' as any,
                              MozAppearance: 'textfield' as any,
                            }}
                          />
                          {isOutOfBounds(obs, 'nogo') && (
                            <AlertTriangle size={14} color="#BA1A1A" style={{
                              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                            }} />
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Remarks row */}
                    <tr>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#807665', fontSize: 10 }}>
                        NOTE
                      </td>
                      <td colSpan={6} style={{ ...tdStyle, padding: '6px 8px' }}>
                        <input
                          type="text"
                          value={obs.remarks || ''}
                          onChange={(e) => updateObservation(idx, 'remarks', e.target.value)}
                          placeholder="Add observations or remarks..."
                          style={{
                            width: '100%', padding: '6px 10px',
                            borderRadius: 6, fontSize: 12,
                            border: '1px solid #D1C5B2', background: 'white',
                            color: '#1B1C1A', outline: 'none',
                          }}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* ─── Summary & Actions ─── */}
        {localObs.length > 0 && (
          <>
            <div className="calib-summary-bar">
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <SummaryBadge label="Total Units" value={localObs.length} color="#1E3A8A" />
                <SummaryBadge
                  label="Filled"
                  value={localObs.filter(o => o.observedGo != null && o.observedNogo != null).length}
                  color="#228B22"
                />
                {hasAnyOutOfBounds && (
                  <SummaryBadge
                    label="Out of Tolerance"
                    value={localObs.filter(o => isOutOfBounds(o, 'go') || isOutOfBounds(o, 'nogo')).length}
                    color="#BA1A1A"
                  />
                )}
              </div>
              <div style={{ fontSize: 11, color: '#807665' }}>
                {allFilled ? (
                  hasAnyOutOfBounds
                    ? <span style={{ color: '#BA1A1A', fontWeight: 600 }}>⚠ Some readings are out of tolerance</span>
                    : <span style={{ color: '#228B22', fontWeight: 600 }}>✓ All readings within tolerance</span>
                ) : (
                  <span>Fill all GO & NOGO observations to complete</span>
                )}
              </div>
            </div>

            <div className="calib-actions">
              <button onClick={onClose} style={{
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid #D1C5B2', background: 'white',
                fontSize: 13, cursor: 'pointer', color: '#807665',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <X size={14} /> Close
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid #1E3A8A40', background: 'rgba(30,58,138,0.06)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#1E3A8A',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                Save Draft
              </button>
              <button
                onClick={handleComplete}
                disabled={saving || !allFilled}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: allFilled ? '#228B22' : '#D1C5B2',
                  fontSize: 13, fontWeight: 600, cursor: allFilled ? 'pointer' : 'not-allowed',
                  color: 'white', display: 'flex', alignItems: 'center', gap: 6,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />}
                Complete Calibration
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <div style={{
        fontSize: 13, fontWeight: 500, color: '#1B1C1A', marginTop: 2,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
      }}>
        {value}
      </div>
    </div>
  );
}

function SummaryBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: '#807665', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ─── Table Styles ─── */
const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 10,
  fontWeight: 700,
  color: '#8C857D',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderRight: '1px solid #E8E2D9',
  borderBottom: '1px solid #D4CCBF',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: '#1B1C1A',
  borderRight: '1px solid #E8E2D9',
  borderBottom: '1px solid #E8E2D9',
};