import React, { useState, useEffect } from 'react';
import { Wifi, Volume2, Loader2, ServerCog, Router, Mic, Repeat } from 'lucide-react';
import { triggerIotDevice, speakToIotDevice } from '@/api/iot.api';
import toast from 'react-hot-toast';

export default function PqcIotPage() {
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [sound, setSound] = useState('emergency.raw');
  const [textMessage, setTextMessage] = useState('Attention! Machine 5 is down.');
  const [isTriggering, setIsTriggering] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTriggerTime, setLastTriggerTime] = useState<string | null>(null);

  const [autoRepeatEnabled, setAutoRepeatEnabled] = useState(false);
  const [autoRepeatSeconds, setAutoRepeatSeconds] = useState(10);
  const [currentPlayingSound, setCurrentPlayingSound] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (autoRepeatEnabled && currentPlayingSound && autoRepeatSeconds >= 5) {
      interval = setInterval(async () => {
        try {
          await triggerIotDevice(ipAddress, currentPlayingSound);
          setLastTriggerTime(new Date().toLocaleTimeString() + ' (Auto)');
        } catch (err) {
          console.error(err);
        }
      }, autoRepeatSeconds * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRepeatEnabled, autoRepeatSeconds, currentPlayingSound, ipAddress]);

  const handleTrigger = async () => {
    if (!ipAddress) {
      toast.error('Please enter an IP address');
      return;
    }

    setIsTriggering(true);
    try {
      await triggerIotDevice(ipAddress, sound);
      setCurrentPlayingSound(sound);
      toast.success('Trigger signal sent successfully!');
      setLastTriggerTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to trigger device');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSpeak = async () => {
    if (!ipAddress) {
      toast.error('Please enter an IP address');
      return;
    }
    if (!textMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSpeaking(true);
    try {
      await speakToIotDevice(ipAddress, textMessage);
      setCurrentPlayingSound('tts.raw');
      toast.success('Voice message sent successfully!');
      setLastTriggerTime(new Date().toLocaleTimeString());
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send voice message');
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="pqc-page-container">
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
            <Router size={24} color="#f8fafc" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>IoT Device Management</h2>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
              Configure and test factory floor IoT devices such as alarms and talking modules.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 20 }}>
        
        {/* ESP32 Module Card */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Volume2 size={18} color="var(--copper-bronze)" />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>ESP32 Audio Announcer</h3>
            </div>
            <span className="badge" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }}>Online</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>Device IP Address</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Wifi size={16} color="var(--slate)" style={{ position: 'absolute', left: 12 }} />
                <input 
                  type="text" 
                  value={ipAddress} 
                  onChange={(e) => setIpAddress(e.target.value)} 
                  className="input" 
                  style={{ minHeight: 36, fontSize: 14, paddingLeft: 36, width: '100%' }} 
                  placeholder="e.g. 192.168.1.100"
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--ash)', margin: 0 }}>The local network IP address assigned to the ESP32 module (e.g., factory-alarm.local).</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>Sound File</label>
              <select 
                value={sound} 
                onChange={(e) => setSound(e.target.value)}
                className="input"
                style={{ height: 36, fontSize: 14 }}
              >
                <option value="emergency.raw">Emergency Alarm (emergency.raw)</option>
                <option value="finish_him.raw">Finish Him (finish_him.raw)</option>
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
              <button 
                className="btn btn-primary" 
                onClick={handleTrigger} 
                disabled={isTriggering || isSpeaking}
                style={{ width: '100%', minHeight: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 14, backgroundColor: '#dc2626' }}
              >
                {isTriggering ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ServerCog size={18} />
                )}
                {isTriggering ? 'Triggering...' : 'Test Pre-recorded Alarm'}
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-light)', paddingTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>Dynamic Voice Message</label>
              <textarea 
                value={textMessage} 
                onChange={(e) => setTextMessage(e.target.value)}
                className="input"
                rows={2}
                style={{ fontSize: 14, resize: 'none' }}
                placeholder="Type a message to be spoken..."
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSpeak} 
                disabled={isTriggering || isSpeaking}
                style={{ width: '100%', minHeight: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 14, backgroundColor: '#2563eb', marginTop: 8 }}
              >
                {isSpeaking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mic size={18} />
                )}
                {isSpeaking ? 'Generating Audio...' : 'Send Voice Message'}
              </button>
            </div>

            {/* Auto Repeat Settings */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '12px 16px', backgroundColor: 'var(--bg-light)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                  type="checkbox" 
                  checked={autoRepeatEnabled}
                  onChange={(e) => setAutoRepeatEnabled(e.target.checked)}
                  id="auto-repeat"
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="auto-repeat" style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', cursor: 'pointer' }}>
                  Auto-Repeat Last Audio
                </label>
              </div>
              
              {autoRepeatEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--ash)' }}>Every:</span>
                  <input 
                    type="number" 
                    value={autoRepeatSeconds}
                    onChange={(e) => setAutoRepeatSeconds(Number(e.target.value))}
                    className="input"
                    style={{ width: 60, height: 30, fontSize: 13, padding: '0 8px' }}
                    min={5}
                  />
                  <span style={{ fontSize: 12, color: 'var(--ash)' }}>sec</span>
                </div>
              )}
            </div>

            {lastTriggerTime && (
              <p style={{ fontSize: 11, color: 'var(--slate)', textAlign: 'center', margin: 0 }}>
                Last activity at: {lastTriggerTime}
              </p>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="card" style={{ padding: 24, alignSelf: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ServerCog size={18} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>System Integration</h3>
          </div>
          
          <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0 }}>The IoT module acts as an automated <strong>Announcer</strong> for the factory floor.</p>
            
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <li>Automated triggers on Machine Breakdown.</li>
              <li>Alerts for severe Quality Inspection failures.</li>
              <li>Connects directly via Bluetooth A2DP to local speakers.</li>
            </ul>

            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: 12, borderRadius: 8, marginTop: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', margin: '0 0 4px 0' }}>Developer Tip</p>
              <p style={{ fontSize: 12, color: '#1e3a8a', margin: 0 }}>Use mDNS (e.g. factory-alarm.local) in the IP field if configured on the ESP32 to avoid static IP constraints.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
