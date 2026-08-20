import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Loader2, Save, Send } from 'lucide-react';
import { emailSettingsApi, type EmailConfiguration } from '@/api/emailSettings.api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function EmailSettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [config, setConfig] = useState<EmailConfiguration>({
    host: '',
    port: 587,
    username: '',
    password: '',
    encryptionType: 'TLS',
    senderEmail: '',
    isActive: true
  });

  useEffect(() => {
    if (user?.factoryId) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await emailSettingsApi.getConfiguration(user!.factoryId);
      if (res?.data) {
        setConfig({
          ...res.data,
          password: '' // Don't show the real password or the masked asterisks by default for editing ease
        });
      }
    } catch (err) {
      console.error('Failed to load email config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.factoryId) return;
    if (!config.host || !config.port || !config.username || !config.senderEmail) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    try {
      const res = await emailSettingsApi.saveConfiguration(user.factoryId, config);
      if (res?.success) {
        setMessage({ type: 'success', text: 'Email configuration saved successfully!' });
        setConfig({ ...res.data, password: '' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user?.factoryId) return;
    setTesting(true);
    toast.loading('Testing SMTP connection...', { id: 'test-conn' });
    try {
      const res = await emailSettingsApi.testConnection(user.factoryId, testEmail);
      toast.success(res.data || 'Connection test successful!', { id: 'test-conn' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Connection test failed.', { id: 'test-conn' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <Mail size={18} color="var(--copper-bronze)" />
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>SMTP Email Configuration</h3>
          <p style={{ fontSize: 11, color: 'var(--ash)', margin: 0, marginTop: 2 }}>
            Setup credentials to allow the system to send automated reports and alerts.
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 24,
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 8,
          color: message.type === 'success' ? '#166534' : '#991b1b',
          fontSize: 14, fontWeight: 500
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              SMTP Host Server *
            </label>
            <input 
              type="text" 
              placeholder="e.g. smtp.gmail.com"
              value={config.host}
              onChange={e => setConfig({...config, host: e.target.value})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              SMTP Port *
            </label>
            <input 
              type="number" 
              placeholder="e.g. 587 or 465"
              value={config.port}
              onChange={e => setConfig({...config, port: parseInt(e.target.value) || 0})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              Username / Email *
            </label>
            <input 
              type="text" 
              placeholder="e.g. your-email@gmail.com"
              value={config.username}
              onChange={e => setConfig({...config, username: e.target.value})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              Password / App Password
            </label>
            <input 
              type="password" 
              placeholder="Leave blank to keep existing password"
              value={config.password}
              onChange={e => setConfig({...config, password: e.target.value})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              Sender Email Address (From) *
            </label>
            <input 
              type="text" 
              placeholder="e.g. no-reply@yourfactory.com"
              value={config.senderEmail}
              onChange={e => setConfig({...config, senderEmail: e.target.value})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
              Encryption Security
            </label>
            <select 
              value={config.encryptionType}
              onChange={e => setConfig({...config, encryptionType: e.target.value})}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                fontSize: 14, outline: 'none', background: 'var(--cream)', color: 'var(--charcoal)'
              }}
            >
              <option value="NONE">None</option>
              <option value="TLS">TLS (Recommended)</option>
              <option value="SSL">SSL</option>
            </select>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid var(--silk)', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input 
              type="email"
              placeholder="Test Recipient Email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, width: 200, outline: 'none' }}
            />
            <button 
              onClick={handleTestConnection}
              disabled={testing || !config.host || !config.username}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'white', color: 'var(--charcoal)', border: '1px solid var(--silk)',
                padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13,
                cursor: (testing || !config.host) ? 'not-allowed' : 'pointer', opacity: (testing || !config.host) ? 0.6 : 1
              }}
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Test Connection
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--copper-bronze)', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1,
              boxShadow: '0 4px 12px rgba(184,115,51,0.2)'
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Configuration
          </button>

        </div>
      </div>
    </div>
  );
}
