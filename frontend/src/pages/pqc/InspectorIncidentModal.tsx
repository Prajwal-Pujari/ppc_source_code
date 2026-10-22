import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, Wrench, Clock, Sliders, AlertCircle, X, Check, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialType?: string;
  initialDurationMins?: number;
  initialRemarks?: string;
  onSave: (data: { incidentType: string; incidentDurationMins?: number; incidentRemarks: string }) => void;
  onClear?: () => void;
}

const INCIDENT_PRESETS = [
  { label: 'Machine Breakdown', icon: Wrench },
  { label: 'Power Failure', icon: Zap },
  { label: 'Tooling Issue', icon: Sliders },
  { label: 'Material Delay', icon: Clock },
  { label: 'Other Stoppage', icon: AlertCircle }
];

export default function InspectorIncidentModal({
  isOpen,
  onClose,
  initialType = '',
  initialDurationMins,
  initialRemarks = '',
  onSave,
  onClear
}: Props) {
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [customType, setCustomType] = useState<string>('');
  const [durationMins, setDurationMins] = useState<string>(initialDurationMins ? String(initialDurationMins) : '');
  const [remarks, setRemarks] = useState<string>(initialRemarks);

  useEffect(() => {
    if (isOpen) {
      const isPreset = INCIDENT_PRESETS.some(p => p.label === initialType);
      if (isPreset || !initialType) {
        setSelectedType(initialType);
        setCustomType('');
      } else {
        setSelectedType('Other Stoppage');
        setCustomType(initialType);
      }
      setDurationMins(initialDurationMins ? String(initialDurationMins) : '');
      setRemarks(initialRemarks || '');
    }
  }, [isOpen, initialType, initialDurationMins, initialRemarks]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalType = selectedType === 'Other Stoppage' && customType.trim() ? customType.trim() : selectedType;
    if (!finalType) return;

    onSave({
      incidentType: finalType,
      incidentDurationMins: durationMins ? parseInt(durationMins, 10) : undefined,
      incidentRemarks: remarks.trim()
    });
    onClose();
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    onClose();
  };

  const addMins = (mins: number) => {
    const curr = parseInt(durationMins, 10) || 0;
    setDurationMins(String(curr + mins));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 26, 24, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--warm-white, #F5F2ED)',
          borderRadius: 12,
          width: '100%',
          maxWidth: 480,
          maxHeight: '94vh',
          boxShadow: 'var(--shadow-ambient, 0 12px 40px rgba(48, 49, 47, 0.2))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--stone, #D4CCBF)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        {/* Header - Master Chronometer Dark Precision Style */}
        <div
          style={{
            background: 'var(--charcoal, #1C1A18)',
            borderBottom: '2px solid var(--copper-bronze, #8B6914)',
            padding: '14px 18px',
            color: '#FAF8F5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                backgroundColor: 'rgba(139, 105, 20, 0.2)',
                border: '1px solid var(--copper-bronze, #8B6914)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--copper-bronze, #8B6914)'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--copper-bronze, #8B6914)'
                }}
              >
                PQC Operational Stoppage
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '1.0625rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: '#FAF8F5'
                }}
              >
                Report Incident / Breakdown
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--warm-gray, #B8AFA3)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#FAF8F5')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--warm-gray, #B8AFA3)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {/* Preset Types */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ash, #8C857D)',
                marginBottom: 8
              }}
            >
              Incident Classification
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {INCIDENT_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedType === preset.label;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSelectedType(preset.label);
                      if (preset.label !== 'Other Stoppage') {
                        setCustomType('');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: isSelected
                        ? '1.5px solid var(--copper-bronze, #8B6914)'
                        : '1px solid var(--silk, #E8E2D9)',
                      backgroundColor: isSelected
                        ? 'var(--copper-light, #FBF4E8)'
                        : 'var(--bone-white, #FAF8F5)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 4px rgba(139, 105, 20, 0.1)' : 'none'
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        color: isSelected ? 'var(--copper-dark, #6F5100)' : 'var(--slate, #4A4540)',
                        flexShrink: 0
                      }}
                    />
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? 'var(--copper-dark, #6F5100)' : 'var(--charcoal, #1C1A18)'
                      }}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedType === 'Other Stoppage' && (
              <input
                type="text"
                placeholder="Specify stoppage description..."
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                style={{
                  marginTop: 8,
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--stone, #D4CCBF)',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--charcoal, #1C1A18)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Downtime Duration */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label
                style={{
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--ash, #8C857D)'
                }}
              >
                Downtime Duration (Minutes)
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[15, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => addMins(m)}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '2px 8px',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      borderRadius: 4,
                      border: '1px solid var(--silk, #E8E2D9)',
                      background: 'var(--linen, #EEE9E1)',
                      color: 'var(--charcoal, #1C1A18)',
                      cursor: 'pointer'
                    }}
                  >
                    +{m}m
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              placeholder="0"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              min={0}
              style={{
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: '0.9375rem',
                fontWeight: 600,
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--stone, #D4CCBF)',
                backgroundColor: '#FFFFFF',
                color: 'var(--charcoal, #1C1A18)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Incident Remarks */}
          <div>
            <label
              style={{
                display: 'block',
                fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--ash, #8C857D)',
                marginBottom: 6
              }}
            >
              Incident Remarks / Specific Observations
            </label>
            <textarea
              rows={3}
              placeholder="Enter specific breakdown observations, electrical or mechanical details..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--stone, #D4CCBF)',
                backgroundColor: '#FFFFFF',
                color: 'var(--charcoal, #1C1A18)',
                fontSize: '0.8125rem',
                outline: 'none',
                fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* Zero production hint for stoppage/incident */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--copper-light, #FBF4E8)',
              border: '1px solid var(--copper-bronze, #8B6914)',
              fontSize: '0.75rem',
              color: 'var(--copper-dark, #6F5100)',
              lineHeight: 1.4
            }}
          >
            <strong>Zero Production Notice:</strong> If this stoppage halted production for this hour, you can submit with 0 Actual and 0 Passed quantities.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: 'var(--linen, #EEE9E1)',
            borderTop: '1px solid var(--silk, #E8E2D9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {initialType && onClear && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--status-rejected, #8B3A3A)',
                  backgroundColor: 'transparent',
                  color: 'var(--status-rejected, #8B3A3A)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={13} /> Clear Incident
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                border: '1px solid var(--stone, #D4CCBF)',
                backgroundColor: 'var(--warm-white, #F5F2ED)',
                color: 'var(--slate, #4A4540)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedType}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 20px',
                borderRadius: 6,
                border: 'none',
                background: selectedType
                  ? 'linear-gradient(135deg, var(--copper-bronze, #8B6914), var(--copper-dark, #6F5100))'
                  : 'var(--stone, #D4CCBF)',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: selectedType ? 'pointer' : 'not-allowed',
                boxShadow: selectedType ? '0 2px 6px rgba(139, 105, 20, 0.25)' : 'none'
              }}
            >
              <Check size={15} /> Attach to Batch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
