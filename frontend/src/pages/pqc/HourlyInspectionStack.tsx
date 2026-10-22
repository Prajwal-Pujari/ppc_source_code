import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Clock, ShieldAlert } from 'lucide-react';
import type { CompletionProgress, HourlyInspectionSlot } from '@/types/domain.types';
import { useAuthStore } from '@/store/authStore';

interface Props {
  progress?: CompletionProgress | null;
  selectedSlotIndex?: number;
  onSelectSlot?: (slot: HourlyInspectionSlot) => void;
  isOverrideUnlocked: boolean;
  onToggleOverride: () => void;
  canOverride?: boolean;
  hasAuthority?: boolean;
}

export default function HourlyInspectionStack({
  progress,
  selectedSlotIndex,
  onSelectSlot,
  isOverrideUnlocked,
  onToggleOverride,
  canOverride: canOverrideProp,
  hasAuthority: hasAuthorityProp,
}: Props) {
  const [countdownSeconds, setCountdownSeconds] = useState<number>(progress?.secondsUntilUnlock || 0);

  const currentUser = useAuthStore(s => s.user);
  // Override privileges strictly restricted to SUPER_ADMIN and ADMIN
  const isAdmin = currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.role?.toUpperCase().includes('ADMIN');
  const canOverride = canOverrideProp !== undefined ? canOverrideProp : isAdmin;
  const hasAuthority = hasAuthorityProp !== undefined ? hasAuthorityProp : (isAdmin || Boolean(currentUser?.canBackfillPqc));

  useEffect(() => {
    setCountdownSeconds(progress?.secondsUntilUnlock || 0);
  }, [progress?.secondsUntilUnlock]);

  useEffect(() => {
    if (countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  if (!progress) return null;

  const maxSlots = progress.maxSlots || 8;
  const slots: HourlyInspectionSlot[] = progress.slots || [];
  const isLocked = progress.isLocked && !isOverrideUnlocked;
  const loggedCount = slots.filter(s => s.status === 'LOGGED').length;
  // A slot is strictly accessible only if previous slots are completed (or it is the immediate next open slot)
  const nextAvailableSlot = (progress.totalLoggedSlots || 0) + 1;

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedUnlockTime = progress.unlockTime
    ? new Date(progress.unlockTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const formattedLastLogTime = progress.lastInspectionTime
    ? new Date(progress.lastInspectionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
      {/* Shift Inspection Stack Bar - MES Master Chronometer Light Theme */}
      <div
        style={{
          background: 'var(--bone-white, #FAF8F5)',
          borderRadius: 'var(--radius-sm, 8px)',
          border: '1px solid var(--silk, #E8E2D9)',
          padding: '10px 14px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.04))',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={15} style={{ color: 'var(--copper-bronze, #8B6914)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
              {progress.shiftName ? `${progress.shiftName} Inspection Stack` : 'Shift Inspection Stack'} ({loggedCount}/{maxSlots})
            </span>
          </div>
          {(() => {
            const currentSlot = slots.find(s => s.slotNumber === (selectedSlotIndex || nextAvailableSlot));
            const isSlotLogged = currentSlot?.status === 'LOGGED';
            const timeInfo = isSlotLogged
              ? (currentSlot?.logTime ? new Date(currentSlot.logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isSlotLogged ? 'var(--status-completed, #3A6B4A)' : 'var(--copper-dark, #6F5100)',
                  backgroundColor: isSlotLogged ? 'var(--status-completed-bg, #EBF4EE)' : 'var(--linen, #EEE9E1)',
                  border: isSlotLogged ? '1px solid rgba(58, 107, 74, 0.3)' : '1px solid var(--silk, #E8E2D9)',
                  padding: '3px 8px',
                  borderRadius: 4,
                }}
              >
                Slot #{selectedSlotIndex || nextAvailableSlot} &bull; {isSlotLogged ? `Logged at ${timeInfo}` : `Live from now (${timeInfo})`}
              </span>
            );
          })()}
        </div>

        {/* Continuous Horizontal Segmented Bar (Single Bar, light modern MES theme) */}
        <div
          style={{
            display: 'flex',
            height: 28,
            width: '100%',
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: 'var(--linen, #EEE9E1)',
            border: '1px solid var(--silk, #E8E2D9)',
            gap: 2,
            padding: 2,
          }}
        >
          {slots.map(slot => {
            const isSelected = selectedSlotIndex === slot.slotNumber;
            const isLogged = slot.status === 'LOGGED';
            const isActive = slot.slotNumber === nextAvailableSlot;
            const isMissed = slot.status === 'MISSED';
            const isFailed = slot.isFailed || slot.isEscalated;
            // Any slot is clickable: logged slots display info, pending slots allow logging or skipping ahead
            const isEnabled = true;

            // MES "Master Chronometer" subtle palette tokens
            let segBg = 'var(--warm-white, #F5F2ED)';
            let segColor = 'var(--warm-gray, #B8AFA3)';
            let segBorder = '1px solid var(--silk, #E8E2D9)';

            if (isLogged) {
              if (isFailed) {
                segBg = 'var(--status-rejected-bg, #F8EEEE)';
                segColor = 'var(--status-rejected, #8B3A3A)';
                segBorder = '1px solid rgba(139, 58, 58, 0.28)';
              } else {
                segBg = 'var(--status-completed-bg, #EBF4EE)';
                segColor = 'var(--status-completed, #3A6B4A)';
                segBorder = '1px solid rgba(58, 107, 74, 0.28)';
              }
            } else if (isMissed) {
              segBg = 'var(--status-in-progress-bg, #FBF4E8)';
              segColor = 'var(--status-in-progress, #C68B2F)';
              segBorder = '1px solid rgba(198, 139, 47, 0.35)';
            } else if (isActive) {
              segBg = 'var(--copper-light, #FBF4E8)';
              segColor = 'var(--copper-dark, #6F5100)';
              segBorder = '1.5px solid var(--copper-bronze, #8B6914)';
            } else if (isSelected) {
              segBg = 'var(--linen, #EEE9E1)';
              segColor = 'var(--charcoal, #1C1A18)';
              segBorder = '1.5px solid var(--charcoal, #1C1A18)';
            }

            const slotTimeDisplay = slot.logTime
              ? new Date(slot.logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : (slot.scheduledTime ? new Date(slot.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${slot.targetHour}h`);

            return (
              <button
                key={slot.slotNumber}
                type="button"
                onClick={() => onSelectSlot && onSelectSlot(slot)}
                style={{
                  flex: 1,
                  height: '100%',
                  border: segBorder,
                  borderRadius: 4,
                  backgroundColor: segBg,
                  color: segColor,
                  cursor: 'pointer',
                  opacity: isLogged || isActive || isSelected ? 1 : 0.65,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: maxSlots > 12 ? 10 : 11,
                  fontWeight: isSelected ? 800 : 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: 0,
                  outline: isSelected ? '2px solid var(--charcoal, #1C1A18)' : 'none',
                  outlineOffset: -1,
                  boxShadow: isSelected ? '0 0 0 1px white' : undefined,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                title={isLogged ? `Slot #${slot.slotNumber} (${slotTimeDisplay}) - Logged` : (slot.slotNumber === nextAvailableSlot ? `Slot #${slot.slotNumber} (${slotTimeDisplay}) - Next Active Slot` : `Slot #${slot.slotNumber} (${slotTimeDisplay}) - Click to inspect or skip to Hour ${slot.slotNumber}`)}
              >
                {slot.slotNumber}
              </button>
            );
          })}
        </div>

        {/* Compact Light Legend */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--slate, #4A4540)', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--status-completed-bg, #EBF4EE)', border: '1px solid rgba(58, 107, 74, 0.3)' }} /> Passed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--status-rejected-bg, #F8EEEE)', border: '1px solid rgba(139, 58, 58, 0.3)' }} /> Failed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--copper-light, #FBF4E8)', border: '1px solid var(--copper-bronze, #8B6914)' }} /> Current
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--status-in-progress-bg, #FBF4E8)', border: '1px solid rgba(198, 139, 47, 0.4)' }} /> Missed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'var(--warm-white, #F5F2ED)', border: '1px solid var(--silk, #E8E2D9)', opacity: 0.5 }} /> Pending
            </span>
          </div>
          {hasAuthority ? (
            <span style={{ fontStyle: 'italic', opacity: 0.85 }}>Click any slot to inspect or skip ahead</span>
          ) : (
            <span style={{ opacity: 0.85, color: 'var(--copper-dark, #6F5100)', fontWeight: 600 }}>
              Slot #{nextAvailableSlot} Active (Standard Live Entry)
            </span>
          )}
        </div>
      </div>

      {/* Interval Lock Banner (if next entry locked) */}
      {isLocked && countdownSeconds > 0 && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--copper-light, #FBF4E8)',
            border: '1px solid var(--silk, #E8E2D9)',
            borderLeft: '3px solid var(--copper-bronze, #8B6914)',
            borderRadius: 'var(--radius-sm, 8px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                backgroundColor: 'var(--linen, #EEE9E1)',
                border: '1px solid var(--silk, #E8E2D9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--copper-bronze, #8B6914)',
                flexShrink: 0,
              }}
            >
              <Lock size={15} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                Interval Locked &bull; <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--copper-dark, #6F5100)' }}>Unlocks in {formatCountdown(countdownSeconds)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--slate, #4A4540)', marginTop: 2, lineHeight: 1.3 }}>
                Opens at {formattedUnlockTime || 'next interval'}. Last logged by {progress.lastInspectorName || 'Inspector'} at {formattedLastLogTime}.
              </div>
            </div>
          </div>

          {canOverride ? (
            <button
              type="button"
              onClick={onToggleOverride}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--copper-bronze, #8B6914)',
                backgroundColor: 'var(--bone-white, #FAF8F5)',
                color: 'var(--copper-dark, #6F5100)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              <Unlock size={13} />
              Admin Override
            </button>
          ) : (
            <span
              style={{
                fontSize: 11,
                color: 'var(--ash, #8C857D)',
                fontStyle: 'italic',
                padding: '4px 8px',
                backgroundColor: 'var(--warm-white, #F5F2ED)',
                borderRadius: 4,
                border: '1px solid var(--silk, #E8E2D9)',
              }}
            >
              Admin authorization required to override
            </span>
          )}
        </div>
      )}

      {/* Active Override Notice (if admin unlocked early) */}
      {isOverrideUnlocked && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--copper-light, #FBF4E8)',
            border: '1px solid var(--copper-bronze, #8B6914)',
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'var(--copper-dark, #6F5100)',
          }}
        >
          <span>Admin Override Active: Interval lock temporarily bypassed.</span>
          {canOverride && (
            <button
              type="button"
              onClick={onToggleOverride}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--copper-dark, #6F5100)',
                fontWeight: 700,
                textDecoration: 'underline',
                cursor: 'pointer',
              }}
            >
              Re-lock
            </button>
          )}
        </div>
      )}
    </div>
  );
}
