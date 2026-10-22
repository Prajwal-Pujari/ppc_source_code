import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnlockModalStore } from '@/store/unlockModalStore';
import { Clock, ArrowRight, X } from 'lucide-react';

export function InspectionUnlockModal() {
  const navigate = useNavigate();
  const { modalData, closeModal } = useUnlockModalStore();

  if (!modalData) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: 16
    }}>
      <div style={{
        background: '#FAF8F5',
        border: '2px solid var(--copper-bronze, #8B6914)',
        borderRadius: 12,
        maxWidth: 460,
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--copper-bronze, #8B6914) 0%, var(--copper-dark, #6F5100) 100%)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                Hourly Inspection Ready
              </h3>
              <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                Required 1-Hour Interval Elapsed
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              opacity: 0.8,
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--charcoal, #1C1A18)', lineHeight: 1.5 }}>
            The 1-hour interval for <strong>Hour {modalData.slotNumber}</strong> has completed. You can now perform and submit the inspection for this operation.
          </p>

          <div style={{
            background: 'var(--bone-white, #F4EFEB)',
            border: '1px solid var(--silk, #E8E2D9)',
            borderRadius: 8,
            padding: '12px 14px',
            marginBottom: 20,
            fontSize: '0.8125rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: 'var(--ash, #8C857D)' }}>Operation</span>
              <span style={{ fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>{modalData.opName}</span>
            </div>
            {modalData.serialNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--ash, #8C857D)' }}>Serial Number</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{modalData.serialNumber}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ash, #8C857D)' }}>Inspection Slot</span>
              <span style={{ fontWeight: 700, color: 'var(--copper-dark, #6F5100)' }}>Hour #{modalData.slotNumber}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                closeModal();
                navigate(`/inspection?opId=${modalData.opId}`);
              }}
              style={{
                flex: 2,
                padding: '12px',
                background: 'var(--copper-bronze, #8B6914)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <span>Go to Inspection</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={closeModal}
              style={{
                flex: 1,
                padding: '12px',
                background: 'var(--linen, #EEE9E1)',
                color: 'var(--charcoal, #1C1A18)',
                border: '1px solid var(--silk, #E8E2D9)',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
