import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Volume2,
  Loader2,
  Mic,
  Cpu,
  Cable,
  BellRing,
  CheckCircle2,
  Radio,
  Zap,
} from 'lucide-react';
import { triggerIotDevice, speakToIotDevice } from '@/api/iot.api';
import toast from 'react-hot-toast';

const QUICK_PRESETS = [
  { label: 'Machine Breakdown', text: 'Attention! Machine 5 breakdown reported. Maintenance team please respond immediately.' },
  { label: 'Quality Rejection Alert', text: 'Quality alert on Line 2. Please stop production and verify the latest inspection report.' },
  { label: 'Supervisor Required', text: 'Attention! Shift supervisor is requested at the PQC inspection station.' },
  { label: 'Test Audio Check', text: 'A Q S wired speaker system is online and ready for factory announcements.' },
];

const JUMPER_WIRING = [
  { espPin: 'D25 (GPIO 25)', ampPin: 'LRC / WS', role: 'Left / Right Word Clock', color: '#2563eb' },
  { espPin: 'D26 (GPIO 26)', ampPin: 'BCLK', role: 'I2S Bit Clock Signal', color: '#9333ea' },
  { espPin: 'D27 (GPIO 27)', ampPin: 'DIN', role: 'Digital PCM Audio Data', color: '#ea580c' },
  { espPin: 'VIN / 5V', ampPin: 'VIN', role: '5V Amplifier Power', color: '#dc2626' },
  { espPin: 'GND', ampPin: 'GND', role: 'Common Ground', color: '#334155' },
];

export default function PqcWiredSpeakerPage() {
  const [ipAddress, setIpAddress] = useState('192.168.1.108');
  const [textMessage, setTextMessage] = useState('Attention! Machine 5 is down. Please check immediately.');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [autoRepeatEnabled, setAutoRepeatEnabled] = useState(false);
  const [autoRepeatSeconds, setAutoRepeatSeconds] = useState(15);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRepeatEnabled && textMessage.trim() && autoRepeatSeconds >= 5) {
      interval = setInterval(async () => {
        try {
          await speakToIotDevice(ipAddress, textMessage);
          setLastActivity(`${new Date().toLocaleTimeString()} (Auto-Repeat)`);
        } catch (err) {
          console.error('Auto-repeat error:', err);
        }
      }, autoRepeatSeconds * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRepeatEnabled, autoRepeatSeconds, ipAddress, textMessage]);

  const handleSpeak = async () => {
    if (!ipAddress.trim()) {
      toast.error('Please enter the ESP32 Wi-Fi IP address');
      return;
    }
    if (!textMessage.trim()) {
      toast.error('Please enter a voice message');
      return;
    }

    setIsSpeaking(true);
    try {
      await speakToIotDevice(ipAddress.trim(), textMessage.trim());
      toast.success('44.1 kHz HD voice streamed to wired ESP32 speaker!');
      setLastActivity(`${new Date().toLocaleTimeString()} — Voice Sent`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reach wired ESP32 over Wi-Fi');
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleTriggerAlarm = async (soundType: string) => {
    if (!ipAddress.trim()) {
      toast.error('Please enter the ESP32 Wi-Fi IP address');
      return;
    }

    setIsTriggering(true);
    try {
      await triggerIotDevice(ipAddress.trim(), soundType);
      toast.success(soundType === 'chime' ? 'Chime played on wired speaker!' : 'Emergency siren triggered on wired speaker!');
      setLastActivity(`${new Date().toLocaleTimeString()} — ${soundType === 'chime' ? 'Chime' : 'Emergency Siren'}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger wired ESP32 speaker');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="pqc-page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--copper-bronze) 0%, #7c4a1d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(184, 115, 51, 0.25)',
            }}
          >
            <Cable size={24} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
              ESP32 Wired I2S Speaker (D25 / D26 / D27)
            </h2>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
              Direct Wi-Fi to I2S Amplifier (MAX98357A) audio broadcaster — 44.1 kHz studio-clear voice with zero Bluetooth dropouts.
            </p>
          </div>
        </div>
        <span
          className="badge"
          style={{
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            color: '#15803d',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            fontSize: 12,
          }}
        >
          <Zap size={14} /> Direct I2S Wired Audio · 44.1 kHz PCM
        </span>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 20 }}>
        {/* Left Card: Wi-Fi Audio Broadcaster */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={18} color="var(--copper-bronze)" />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>
                Wi-Fi Voice &amp; Alarm Broadcaster
              </h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--slate)', fontFamily: 'monospace' }}>
              POST /upload_tts
            </span>
          </div>

          {/* ESP32 Wi-Fi IP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
              Wired ESP32 Wi-Fi IP Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Wifi size={16} color="var(--slate)" style={{ position: 'absolute', left: 12 }} />
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className="input"
                style={{ minHeight: 38, fontSize: 14, paddingLeft: 36, width: '100%' }}
                placeholder="e.g. 192.168.1.108"
              />
            </div>
            <p style={{ fontSize: 11, color: 'var(--ash)', margin: 0 }}>
              Enter the IP printed in Arduino Serial Monitor after the ESP32 connects to your shop-floor Wi-Fi.
            </p>
          </div>

          {/* Quick Factory Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Quick Factory Announcements
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setTextMessage(preset.text)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    border: '1px solid var(--silk)',
                    background: '#FAF8F5',
                    color: 'var(--charcoal)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Message Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
              Voice Message to Play Over Wi-Fi
            </label>
            <textarea
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              className="input"
              rows={3}
              style={{ fontSize: 14, resize: 'vertical' }}
              placeholder="Type any factory announcement to stream cleanly to the wired speaker..."
            />
            <button
              className="btn btn-primary"
              onClick={handleSpeak}
              disabled={isSpeaking || isTriggering}
              style={{
                width: '100%',
                minHeight: 42,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                fontSize: 14,
                backgroundColor: 'var(--copper-bronze)',
                border: 'none',
                marginTop: 4,
              }}
            >
              {isSpeaking ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
              {isSpeaking ? 'Streaming 44.1 kHz Audio Over Wi-Fi...' : 'Play Voice on Wired Speaker'}
            </button>
          </div>

          {/* Emergency Siren & Chime Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: '1px solid var(--silk)', paddingTop: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() => handleTriggerAlarm('emergency')}
              disabled={isSpeaking || isTriggering}
              style={{
                minHeight: 40,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                backgroundColor: '#dc2626',
                border: 'none',
              }}
            >
              {isTriggering ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
              Test Emergency Siren
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleTriggerAlarm('chime')}
              disabled={isSpeaking || isTriggering}
              style={{
                minHeight: 40,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <Radio size={16} />
              Test Speaker Chime
            </button>
          </div>

          {/* Auto-Repeat Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: '#FAF8F5',
              borderRadius: 8,
              border: '1px solid var(--silk)',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRepeatEnabled}
                onChange={(e) => setAutoRepeatEnabled(e.target.checked)}
                style={{ width: 15, height: 15, cursor: 'pointer' }}
              />
              Auto-Repeat Announcement
            </label>
            {autoRepeatEnabled && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--ash)' }}>Every</span>
                <input
                  type="number"
                  min={5}
                  value={autoRepeatSeconds}
                  onChange={(e) => setAutoRepeatSeconds(Number(e.target.value))}
                  className="input"
                  style={{ width: 62, height: 28, fontSize: 12, padding: '0 8px' }}
                />
                <span style={{ fontSize: 12, color: 'var(--ash)' }}>sec</span>
              </div>
            )}
          </div>

          {lastActivity && (
            <p style={{ fontSize: 12, color: '#15803d', textAlign: 'center', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> Last broadcast: {lastActivity}
            </p>
          )}
        </div>

        {/* Right Card: Jumper Wiring Diagram (D25, D26, D27) & Signal Flow */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={18} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>
              Jumper Wiring &amp; Wi-Fi Audio Path
            </h3>
          </div>

          {/* Signal Flow Strip */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              background: '#FAF8F5',
              border: '1px solid var(--silk)',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--slate)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>
              How Sound Travels Over Wi-Fi (Zero Bluetooth!)
            </div>
            <div>
              <strong>1. PQC Server</strong> converts text to uncompressed <strong>44.1 kHz 16-bit PCM</strong> audio.
            </div>
            <div>
              <strong>2. Wi-Fi HTTP Stream</strong> sends raw audio packets to <code>http://{ipAddress}/upload_tts</code>.
            </div>
            <div>
              <strong>3. ESP32 I2S DMA</strong> pushes audio directly out of pins <strong>D25, D26, D27</strong> to the amplifier.
            </div>
            <div>
              <strong>4. MAX98357A Amplifier</strong> drives your wired speaker cleanly with zero compression or first-word cutoff.
            </div>
          </div>

          {/* Pinout Table */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ESP32 → MAX98357A I2S Amplifier Pinout
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--silk)', textAlign: 'left', color: 'var(--ash)', fontSize: 11 }}>
                  <th style={{ padding: '8px 6px' }}>ESP32 Pin</th>
                  <th style={{ padding: '8px 6px' }}>Amplifier Pin</th>
                  <th style={{ padding: '8px 6px' }}>Function</th>
                </tr>
              </thead>
              <tbody>
                {JUMPER_WIRING.map((row) => (
                  <tr key={row.espPin} style={{ borderBottom: '1px solid #f1ede6' }}>
                    <td style={{ padding: '9px 6px', fontWeight: 700, fontFamily: 'monospace', color: row.color }}>
                      {row.espPin}
                    </td>
                    <td style={{ padding: '9px 6px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--charcoal)' }}>
                      {row.ampPin}
                    </td>
                    <td style={{ padding: '9px 6px', color: 'var(--slate)', fontSize: 12 }}>
                      {row.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Speaker Output Note */}
          <div
            style={{
              backgroundColor: 'rgba(184, 115, 51, 0.08)',
              border: '1px solid rgba(184, 115, 51, 0.25)',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--charcoal)',
              lineHeight: 1.5,
            }}
          >
            <strong>Speaker Connection:</strong> Connect your 4Ω or 8Ω wired speaker directly to the green screw terminal (<code>+</code> / <code>-</code>) on the MAX98357A amplifier board. Flash <code>firmware/esp32_wired_i2s_announcer/esp32_wired_i2s_announcer.ino</code> onto the ESP32.
          </div>
        </div>
      </div>
    </div>
  );
}
