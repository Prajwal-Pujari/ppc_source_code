import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { reportConfigApi, type ReportConfig } from '@/api/reportConfig.api';

export default function SettingsPage() {
  const [config, setConfig] = useState<ReportConfig>({
    companyName: '',
    companyAddress: '',
    customerLogo: '',
    docNo: '',
    revNo: '',
    issueDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await reportConfigApi.get();
      if (res.data) setConfig(res.data);
    } catch (error) {
      alert('Failed to load report configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);
      await reportConfigApi.save(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig({ ...config, customerLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      
      {/* ─── Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Settings & Configuration</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            System Parameters & Company Layout Preferences
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div style={{
          background: '#ECFDF5',
          border: '1px solid #10B981',
          color: '#065F46',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <CheckCircle2 size={18} color="#10B981" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Settings saved successfully! All PQC and Calibration reports have been updated.</span>
        </div>
      )}

      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Settings size={18} color="var(--copper-bronze)" />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Company Profile & QMS Layout</h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>Loading configuration...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Company Name & Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  <Building2 size={14} color="var(--copper-bronze)" /> Company Name
                </label>
                <input type="text" placeholder="e.g. Aarush Quality Services" value={config.companyName || ''} onChange={e => setConfig({...config, companyName: e.target.value})} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Company Address
                </label>
                <textarea rows={2} placeholder="e.g. B-302, Chanakya Nagari, Kandge Park, Sinhagad Rd, Pune - 411051, Maharashtra" value={config.companyAddress || ''} onChange={e => setConfig({...config, companyAddress: e.target.value})} className="input" style={{ resize: 'vertical', minHeight: 60, padding: '8px 12px' }} />
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--silk)', margin: 0 }} />

            {/* Logo Upload */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 8 }}>
                Company Logo (Report Header)
              </label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ 
                  width: 140, height: 110, borderRadius: 8, border: '1px dashed var(--dust)', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bone-white)', color: 'var(--ash)', overflow: 'hidden', position: 'relative'
                }}>
                  {config.customerLogo ? (
                    <>
                      <img src={config.customerLogo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                      <button onClick={() => setConfig({...config, customerLogo: ''})} style={{
                        position: 'absolute', top: 4, right: 4, background: 'var(--status-rejected)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}>
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                        <Plus size={16} color="var(--copper-bronze)" />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500 }}>Upload Logo</span>
                    </>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', minHeight: 36, fontSize: 13, cursor: 'pointer' }}>
                    Browse Files
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  <p style={{ fontSize: 11, color: 'var(--ash)', marginTop: 8, lineHeight: 1.4 }}>
                    Upload a company logo to appear on all printed PQC and Calibration reports.<br/>
                    <span style={{ color: 'var(--copper-bronze)' }}>Recommended: PNG with transparent background.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Doc Config Fields */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                Doc. No.
              </label>
              <input type="text" placeholder="e.g. QMS/F/01" value={config.docNo || ''} onChange={e => setConfig({...config, docNo: e.target.value})} className="input" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Rev. No. / Date
                </label>
                <input type="text" placeholder="e.g. 00 / 01.01.2024" value={config.revNo || ''} onChange={e => setConfig({...config, revNo: e.target.value})} className="input" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                  Issue Date
                </label>
                <input type="text" placeholder="e.g. 01.01.2024" value={config.issueDate || ''} onChange={e => setConfig({...config, issueDate: e.target.value})} className="input" />
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--silk)' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                QR Code Server Host Override (Optional)
              </label>
              <input 
                type="text" 
                placeholder="Auto-detected dynamic IP (e.g. http://192.168.1.50:5173)" 
                defaultValue={localStorage.getItem('custom_qr_base_url') || ''} 
                onChange={e => {
                  if (e.target.value.trim()) localStorage.setItem('custom_qr_base_url', e.target.value.trim());
                  else localStorage.removeItem('custom_qr_base_url');
                  window.dispatchEvent(new Event('qr_url_updated'));
                }} 
                className="input" 
              />
              <span style={{ fontSize: 10, color: 'var(--ash)', marginTop: 4, display: 'block' }}>
                Leave empty to automatically detect your server IP address or cloud domain name.
              </span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 130, justifyContent: 'center' }}>
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Save Settings
                  </>
                )}
              </button>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
