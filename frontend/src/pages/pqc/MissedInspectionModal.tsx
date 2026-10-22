import React, { useState } from 'react';
import { AlertTriangle, Clock, Wrench, CheckCircle2, ArrowRight, User, ShieldAlert, X } from 'lucide-react';
import type { HourlyInspectionSlot } from '@/types/domain.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  operationName: string;
  serialNumber?: string;
  missedSlot?: HourlyInspectionSlot;
  lastInspectorName?: string | null;
  lastInspectionTime?: string | null;
  intervalHours?: number;
  onLogIncident: (data: { incidentType: string; incidentDurationMins: number; incidentRemarks: string; slotIndex: number; logTime?: string }) => void;
  onStartBackfill: (slot: HourlyInspectionSlot) => void;
  onInspectLive?: (slot: HourlyInspectionSlot) => void;
}

const INCIDENT_PRESETS = [
  'Machine Breakdown',
  'Tooling Issue / Tool Wear',
  'Power Outage / Line Stop',
  'Material Shortage / Delay',
  'Quality Hold / Setup Adjust',
  'Other Stoppage'
];

export default function MissedInspectionModal({
  isOpen,
  onClose,
  operationName,
  serialNumber,
  missedSlot,
  lastInspectorName,
  lastInspectionTime,
  intervalHours = 1,
  onLogIncident,
  onStartBackfill,
  onInspectLive,
}: Props) {
  const [incidentOccurred, setIncidentOccurred] = useState<boolean | null>(null);
  const [selectedIncidentType, setSelectedIncidentType] = useState<string>('Machine Breakdown');
  const [durationMins, setDurationMins] = useState<number>(Math.round(intervalHours * 60));
  const [remarks, setRemarks] = useState<string>('');

  if (!isOpen || !missedSlot) return null;

  const slotNum = missedSlot.slotNumber;
  const targetHour = missedSlot.targetHour;

  const formattedLastTime = lastInspectionTime
    ? new Date(lastInspectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Earlier';

  const currentTimeDisplay = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogIncident({
      incidentType: selectedIncidentType,
      incidentDurationMins: durationMins,
      incidentRemarks: remarks.trim() || `Stoppage during Hour ${slotNum}`,
      slotIndex: slotNum,
    });
    onClose();
  };

  const handleLiveClick = () => {
    if (onInspectLive) {
      onInspectLive(missedSlot);
    }
    onClose();
  };

  const handleBackfillClick = () => {
    onStartBackfill(missedSlot);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 26, 24, 0.7)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--warm-white, #F5F2ED)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 520,
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-ambient, 0 16px 48px rgba(48, 49, 47, 0.25))',
          border: '1px solid var(--dust, #E2DDD5)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--silk, #E8E2D9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bone-white, #FFFFFF)',
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--status-rejected, #DC2626)',
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', margin: 0 }}>
                Missed Inspection Detected
              </h3>
              <p style={{ fontSize: 11, color: 'var(--ash, #8C857D)', margin: 0, marginTop: 2 }}>
                Shift interval: Every {intervalHours} hr(s) &bull; Hour {slotNum} ({targetHour}h mark)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ash, #8C857D)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {/* Context Banner */}
          <div
            style={{
              backgroundColor: 'var(--silk, #E8E2D9)',
              borderRadius: 8,
              padding: '12px 14px',
              marginBottom: 16,
              border: '1px solid var(--stone, #D1CBC0)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Operation: {operationName}
              </span>
              {serialNumber && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--copper-bronze)' }}>
                  {serialNumber}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--slate, #4A4540)' }}>
              <User size={13} style={{ color: 'var(--ash)' }} />
              <span>
                Previous entry logged by: <strong>{lastInspectorName || 'Inspector'}</strong> at {formattedLastTime}
              </span>
            </div>
          </div>

          {/* Action Choice Selection */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>
              Select how you want to proceed for Hour {slotNum}:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Option 1: Live Entry From Now (Recommended) */}
              <button
                type="button"
                onClick={handleLiveClick}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #228B22',
                  backgroundColor: '#F0FDF4',
                  color: '#15803D',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                <Clock size={20} style={{ color: '#15803D', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Inspect from Now (Live Entry)
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 600 }}>Recommended</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                    Record Hour {slotNum} live with actual current time ({currentTimeDisplay})
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: '#15803D' }} />
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Option 2: Machine Breakdown / Incident */}
                <button
                  type="button"
                  onClick={() => setIncidentOccurred(true)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: incidentOccurred === true ? '2px solid var(--copper-bronze, #8B6914)' : '1px solid var(--dust, #E2DDD5)',
                    backgroundColor: incidentOccurred === true ? 'var(--copper-light, #FBF4E8)' : 'var(--bone-white, #FFFFFF)',
                    color: incidentOccurred === true ? 'var(--copper-dark, #6F5100)' : 'var(--charcoal, #1C1A18)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Wrench size={18} style={{ color: 'var(--copper-bronze)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Record Stoppage</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Breakdown / Stop</div>
                  </div>
                </button>

                {/* Option 3: Historical Backfill */}
                <button
                  type="button"
                  onClick={() => {
                    setIncidentOccurred(false);
                    handleBackfillClick();
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--dust, #E2DDD5)',
                    backgroundColor: 'var(--bone-white, #FFFFFF)',
                    color: 'var(--charcoal, #1C1A18)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ArrowRight size={18} style={{ color: 'var(--slate)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Historical Backfill</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Use scheduled slot time</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Incident Details Form if Yes selected */}
          {incidentOccurred === true && (
            <form onSubmit={handleIncidentSubmit} style={{ borderTop: '1px solid var(--silk)', paddingTop: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4, textTransform: 'uppercase' }}>
                  Incident Type
                </label>
                <select
                  value={selectedIncidentType}
                  onChange={(e) => setSelectedIncidentType(e.target.value)}
                  className="input"
                  style={{ width: '100%', fontSize: 12, minHeight: 34 }}
                >
                  {INCIDENT_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4, textTransform: 'uppercase' }}>
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={durationMins}
                  onChange={(e) => setDurationMins(parseInt(e.target.value, 10) || 0)}
                  className="input"
                  style={{ width: '100%', fontSize: 12, minHeight: 34 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--slate)', marginBottom: 4, textTransform: 'uppercase' }}>
                  Incident Remarks / Root Cause
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Details of the stoppage or machine breakdown..."
                  className="input"
                  style={{ width: '100%', fontSize: 12, padding: '8px 10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ fontSize: 12, minHeight: 34, padding: '0 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    fontSize: 12,
                    minHeight: 34,
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldAlert size={14} />
                  Record Incident for Hour {slotNum}
                </button>
              </div>
            </form>
          )}

          {/* Guidance note */}
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 6,
              background: 'var(--bone-white)',
              border: '1px solid var(--dust)',
              fontSize: 11,
              color: 'var(--ash)',
              lineHeight: 1.4,
            }}
          >
            <strong>MES Policy:</strong> You can stack up to 8 hourly inspection entries before the shift ends. Backfilled entries adjust observation times cleanly in the final report.
          </div>
        </div>
      </div>
    </div>
  );
}
