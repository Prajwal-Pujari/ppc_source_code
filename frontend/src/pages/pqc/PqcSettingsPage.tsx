import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Clock, Check, X } from 'lucide-react';
import { shiftsApi, type FactoryShift } from '../../api/shifts.api';
import toast from 'react-hot-toast';

export default function PqcSettingsPage() {
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ shiftName: '', startTime: '', endTime: '' });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await shiftsApi.getAll();
      setShifts(res.data);
    } catch (error) {
      toast.error('Failed to load shifts');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await shiftsApi.delete(id);
      toast.success('Shift removed');
      fetchShifts();
    } catch (error) {
      toast.error('Failed to remove shift');
    }
  };

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.shiftName || !newShift.startTime || !newShift.endTime) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;
      await shiftsApi.create({
        shiftName: newShift.shiftName,
        startTime: formatTime(newShift.startTime),
        endTime: formatTime(newShift.endTime)
      });
      toast.success('Shift added successfully');
      setNewShift({ shiftName: '', startTime: '', endTime: '' });
      fetchShifts();
    } catch (error) {
      toast.error('Failed to add shift');
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      
      {/* ─── Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>Settings & Configuration</h2>
          <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4 }}>
            System Parameters & Preferences
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        
        {/* ─── Shift Management ─── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} color="var(--copper-bronze)" />
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Shift Management</h3>
            </div>
            <span className="badge badge-queued">{shifts.length} Active</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Shift Name</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Start</th>
                  <th style={{ width: 80, textAlign: 'center' }}>End</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--ash)' }}>Loading shifts...</td></tr>
                ) : shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{shift.shiftName}</td>
                    <td className="font-mono" style={{ textAlign: 'center', color: 'var(--slate)' }}>{shift.startTime.substring(0, 5)}</td>
                    <td className="font-mono" style={{ textAlign: 'center', color: 'var(--slate)' }}>{shift.endTime.substring(0, 5)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDelete(shift.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-rejected)' }} title="Remove Shift">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '8px 12px' }}>
                    <input type="text" placeholder="Shift Name" value={newShift.shiftName} onChange={e => setNewShift({...newShift, shiftName: e.target.value})} className="input" style={{ minHeight: 32, fontSize: 12 }} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input type="time" value={newShift.startTime} onChange={e => setNewShift({...newShift, startTime: e.target.value})} className="input font-mono" style={{ minHeight: 32, fontSize: 12, padding: '0 8px' }} />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <input type="time" value={newShift.endTime} onChange={e => setNewShift({...newShift, endTime: e.target.value})} className="input font-mono" style={{ minHeight: 32, fontSize: 12, padding: '0 8px' }} />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <button onClick={handleAddShift} className="btn btn-primary" style={{ minHeight: 32, padding: '0 12px', fontSize: 12 }} disabled={!newShift.shiftName || !newShift.startTime || !newShift.endTime}>
                      <Plus size={14} /> Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Report Configuration Section ─── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Settings size={18} color="var(--copper-bronze)" />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Report Layout</h3>
          </div>
          
          <ReportConfigEditor />
        </div>

      </div>
    </div>
  );
}

// Subcomponent for Report Config
function ReportConfigEditor() {
  const [config, setConfig] = React.useState<any>({
    customerLogo: '',
    docNo: '',
    revNo: '',
    issueDate: ''
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { reportConfigApi } = await import('../../api/reportConfig.api');
      const res = await reportConfigApi.get();
      if (res.data) setConfig(res.data);
    } catch (error) {
      toast.error('Failed to load report configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { reportConfigApi } = await import('../../api/reportConfig.api');
      await reportConfigApi.save(config);
      toast.success('Report configuration saved');
    } catch (error) {
      toast.error('Failed to save report configuration');
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ash)' }}>Loading configuration...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Logo Upload */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 8 }}>
          Customer Logo (Header)
        </label>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ 
            width: 120, height: 100, borderRadius: 8, border: '1px dashed var(--dust)', 
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
              Upload a logo to appear on all printed PQC reports.<br/>
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
            Rev.No./Date
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

      <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--silk)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>
      
    </div>
  );
}
