import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, Clock, Check, X, Save, ShieldCheck } from 'lucide-react';
import { shiftsApi, type FactoryShift } from '../../api/shifts.api';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import EmailSettingsPage from '../settings/EmailSettingsPage';
import PqcAuthoritySettings from '../settings/PqcAuthoritySettings';

interface Props {
  initialTab?: 'system' | 'authority';
}

export default function PqcSettingsPage({ initialTab }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as 'system' | 'authority' | null;
  const [currentTab, setCurrentTab] = useState<'system' | 'authority'>(initialTab || urlTab || 'system');

  const currentUser = useAuthStore(s => s.user);
  const isAdmin = currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPERADMIN' ||
    currentUser?.role === 'SUPER_ADMIN';
  const hasAuthorityOrAdmin = isAdmin || Boolean(currentUser?.canBackfillPqc);
  const [shifts, setShifts] = useState<FactoryShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ shiftName: '', startTime: '', endTime: '', breakDurationMins: 0 });

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
        endTime: formatTime(newShift.endTime),
        breakDurationMins: newShift.breakDurationMins
      });
      toast.success('Shift added successfully');
      setNewShift({ shiftName: '', startTime: '', endTime: '', breakDurationMins: 0 });
      fetchShifts();
    } catch (error) {
      toast.error('Failed to add shift');
    }
  };

  return (
    <div className="pqc-page-container">
      
      {/* ─── Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)' }}>
            <Settings size={24} color="#f8fafc" />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>System Settings & Report Layout</h2>
            <p style={{ fontSize: 12, color: 'var(--ash)', marginTop: 4, margin: 0 }}>
              Global Preferences, Shift Timings, PQC Inspection Authority & Report Layout Configuration
            </p>
          </div>
        </div>

        {/* ─── Tab Switcher ─── */}
        <div style={{
          display: 'inline-flex',
          padding: 4,
          borderRadius: 10,
          background: 'var(--linen, #EEE9E1)',
          border: '1px solid var(--silk, #E8E2D9)',
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => {
              setCurrentTab('system');
              setSearchParams(prev => { prev.delete('tab'); return prev; });
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              background: currentTab === 'system' ? '#FFFFFF' : 'transparent',
              color: currentTab === 'system' ? 'var(--charcoal, #1C1A18)' : 'var(--slate, #4A4540)',
              fontWeight: currentTab === 'system' ? 700 : 500,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: currentTab === 'system' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Settings size={14} />
            System & Reports
          </button>

          {/* Authority tab: only visible when user has authority or is admin/superadmin */}
          {hasAuthorityOrAdmin && (
            <button
              type="button"
              onClick={() => {
                setCurrentTab('authority');
                setSearchParams(prev => { prev.set('tab', 'authority'); return prev; });
              }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: currentTab === 'authority' ? 'var(--copper-bronze, #8B6914)' : 'transparent',
                color: currentTab === 'authority' ? '#FFFFFF' : 'var(--slate, #4A4540)',
                fontWeight: currentTab === 'authority' ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: currentTab === 'authority' ? '0 1px 3px rgba(139, 105, 20, 0.25)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={14} />
              Authority Control
            </button>
          )}
        </div>
      </div>

      {currentTab === 'authority' ? (
        <PqcAuthoritySettings />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
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
                  <th style={{ width: 80, textAlign: 'center' }}>Break (mins)</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--ash)' }}>Loading shifts...</td></tr>
                ) : shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td style={{ fontWeight: 500, color: 'var(--charcoal)' }}>{shift.shiftName}</td>
                    <td className="font-mono" style={{ textAlign: 'center', color: 'var(--slate)' }}>{shift.startTime.substring(0, 5)}</td>
                    <td className="font-mono" style={{ textAlign: 'center', color: 'var(--slate)' }}>{shift.endTime.substring(0, 5)}</td>
                    <td className="font-mono" style={{ textAlign: 'center', color: 'var(--slate)' }}>{shift.breakDurationMins || 0}</td>
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
                  <td style={{ padding: '8px 12px' }}>
                    <input type="number" min="0" placeholder="0" value={newShift.breakDurationMins || ''} onChange={e => setNewShift({...newShift, breakDurationMins: parseInt(e.target.value) || 0})} className="input font-mono" style={{ minHeight: 32, fontSize: 12, padding: '0 8px', width: 60 }} />
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
          
          {/* ─── Email Configuration Section ─── */}
          <EmailSettingsPage />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ─── Report Configuration Section ─── */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Settings size={18} color="var(--copper-bronze)" />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Global Report Layout (All Modules)</h3>
              <p style={{ fontSize: 11, color: 'var(--ash)', margin: 0, marginTop: 2 }}>Applies to PQC In-Process reports, PDIRs, and LPA Product Audit reports.</p>
            </div>
          </div>
            
            <ReportConfigEditor />
          </div>
        </div>

      </div>
      )}
    </div>
  );
}

// Subcomponent for Report Config
function ReportConfigEditor() {
  const [config, setConfig] = React.useState<any>({
    customerLogo: '',
    customerName: '',
    docNo: '',
    revNo: '',
    issueDate: '',
    inspectionIntervalHours: 1,
    defaultShiftHours: 8,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savingFrequency, setSavingFrequency] = React.useState(false);

  React.useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const { reportConfigApi } = await import('../../api/reportConfig.api');
      const res = await reportConfigApi.get();
      if (res.data) {
        setConfig({
          ...res.data,
          inspectionIntervalHours: res.data.inspectionIntervalHours ?? 1,
          defaultShiftHours: res.data.defaultShiftHours ?? 8,
        });
      }
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

  const handleSaveFrequency = async (customConfig?: any) => {
    try {
      setSavingFrequency(true);
      const targetConfig = customConfig || config;
      const { reportConfigApi } = await import('../../api/reportConfig.api');
      const res = await reportConfigApi.save(targetConfig);
      if (res.data) {
        setConfig(res.data);
      } else if (customConfig) {
        setConfig(customConfig);
      }
      const interval = Number(targetConfig.inspectionIntervalHours) || 1;
      const shift = Number(targetConfig.defaultShiftHours) || 8;
      const cols = Math.max(1, Math.round(shift / (interval > 0 ? interval : 1)));
      toast.success(`Saved: Inspection frequency set to every ${interval} hr(s) (${cols} observation columns)`);
    } catch (error) {
      toast.error('Failed to save inspection frequency');
    } finally {
      setSavingFrequency(false);
    }
  };

  const handleApplyPreset = (presetInterval: number, presetShift: number) => {
    const updated = {
      ...config,
      inspectionIntervalHours: presetInterval,
      defaultShiftHours: presetShift,
    };
    setConfig(updated);
    handleSaveFrequency(updated);
  };

  const renderDocConfig = (title: string, prefix: string) => {
    const docKey = prefix ? `${prefix}DocNo` : 'docNo';
    const revKey = prefix ? `${prefix}RevNo` : 'revNo';
    const dateKey = prefix ? `${prefix}IssueDate` : 'issueDate';
    
    return (
      <div style={{ marginTop: 8, padding: 16, background: 'var(--bone-white)', borderRadius: 8, border: '1px solid var(--dust)' }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', margin: '0 0 12px 0' }}>{title}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Doc. No.</label>
            <input type="text" placeholder="e.g. QMS/F/01" value={config[docKey] || ''} onChange={e => setConfig({...config, [docKey]: e.target.value})} className="input" style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Rev.No./Date</label>
            <input type="text" placeholder="e.g. 00 / 01.01.2024" value={config[revKey] || ''} onChange={e => setConfig({...config, [revKey]: e.target.value})} className="input" style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>Issue Date</label>
            <input type="text" placeholder="e.g. 01.01.2024" value={config[dateKey] || ''} onChange={e => setConfig({...config, [dateKey]: e.target.value})} className="input" style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }} />
          </div>
        </div>

        {prefix === 'inProcess' && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--dust)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--copper-bronze)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>
                  Shift Inspection Frequency & Observation Columns
                </span>
              </div>
              <span className="badge badge-queued" style={{ fontSize: 11, padding: '3px 8px' }}>
                {Math.max(1, Math.round((Number(config.defaultShiftHours) || 8) / (Number(config.inspectionIntervalHours) || 1)))} Observation Columns
              </span>
            </div>

            <p style={{ fontSize: 11, color: 'var(--ash)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              Configure how often in-process inspections occur during the shift. This dynamically sets the observation columns displayed on the In-Process Inspection Report.
            </p>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {[
                { label: 'Every 1 Hour (8 Columns / 8h Shift)', interval: 1, shift: 8 },
                { label: 'Every 2 Hours (4 Columns / 8h Shift)', interval: 2, shift: 8 },
                { label: 'Every 4 Hours (2 Columns / 8h Shift)', interval: 4, shift: 8 },
                { label: 'Every 30 Mins (16 Columns / 8h Shift)', interval: 0.5, shift: 8 },
              ].map(preset => {
                const isSelected = Number(config.inspectionIntervalHours || 1) === preset.interval && Number(config.defaultShiftHours || 8) === preset.shift;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset.interval, preset.shift)}
                    disabled={saving || savingFrequency}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: (saving || savingFrequency) ? 'not-allowed' : 'pointer',
                      border: isSelected ? '1.5px solid var(--copper-bronze)' : '1px solid var(--dust)',
                      background: isSelected ? 'var(--silk)' : 'white',
                      color: isSelected ? 'var(--copper-dark)' : 'var(--slate)',
                      transition: 'all 0.15s ease',
                      opacity: (saving || savingFrequency) ? 0.7 : 1,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Interval & Shift Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                  Inspection Interval (Hours)
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  placeholder="e.g. 1 or 2"
                  value={config.inspectionIntervalHours ?? 1}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 1;
                    setConfig({ ...config, inspectionIntervalHours: val });
                  }}
                  className="input"
                  style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }}
                />
                <span style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2, display: 'block' }}>
                  Interval between inspection logs (e.g., 1 hr = 8 inspections in 8h shift, 2 hrs = 4 inspections)
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 4 }}>
                  Default Shift Length (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  placeholder="e.g. 8"
                  value={config.defaultShiftHours ?? 8}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 8;
                    setConfig({ ...config, defaultShiftHours: val });
                  }}
                  className="input"
                  style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }}
                />
                <span style={{ fontSize: 10, color: 'var(--ash)', marginTop: 2, display: 'block' }}>
                  Standard shift duration used to calculate observation columns (default: 8 hours)
                </span>
              </div>
            </div>

            {/* Interactive Preview of Columns */}
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'white', borderRadius: 6, border: '1px solid var(--dust)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
                Generated Report Observation Columns Preview:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(() => {
                  const interval = Number(config.inspectionIntervalHours) || 1;
                  const shift = Number(config.defaultShiftHours) || 8;
                  const cols = Math.max(1, Math.round(shift / (interval > 0 ? interval : 1)));
                  return Array.from({ length: cols }, (_, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 4,
                        background: 'var(--bone-white)',
                        border: '1px solid var(--stone)',
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--charcoal)',
                        textAlign: 'center',
                        minWidth: 55,
                      }}
                    >
                      <div>Col {idx + 1}</div>
                      <div style={{ fontSize: 9, color: 'var(--slate)', fontWeight: 'normal' }}>
                        {(idx + 1) * interval}h
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Dedicated Save Action Bar for Inspection Frequency */}
            <div
              style={{
                marginTop: 14,
                padding: '12px 14px',
                background: 'var(--silk)',
                borderRadius: 6,
                border: '1px solid var(--stone)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} color="var(--copper-bronze)" />
                  Frequency: Every {config.inspectionIntervalHours ?? 1} hr(s) &bull; {Math.max(1, Math.round((Number(config.defaultShiftHours) || 8) / (Number(config.inspectionIntervalHours) || 1)))} columns in {config.defaultShiftHours ?? 8}h shift
                </div>
                <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                  Presets save automatically when clicked. You can also edit values and click Save here.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveFrequency()}
                disabled={saving || savingFrequency}
                style={{
                  minHeight: 34,
                  padding: '0 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: (saving || savingFrequency) ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={14} />
                {savingFrequency ? 'Saving...' : 'Save Inspection Frequency'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
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
              Upload a logo to appear on all printed P-Track, PQC & LPA reports.<br/>
              <span style={{ color: 'var(--copper-bronze)' }}>Recommended: PNG with transparent background.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Customer Name */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 6 }}>
          Customer Name (Used in reports)
        </label>
        <input type="text" placeholder="e.g. Aarush Quality Services" value={config.customerName || ''} onChange={e => setConfig({...config, customerName: e.target.value})} className="input" />
      </div>

      {/* Specific Report Configs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {renderDocConfig('In-Process Report Layout', 'inProcess')}
        {renderDocConfig('PDIR Report Layout', 'pdir')}
        {renderDocConfig('Machine Setup Report Layout', 'setup')}
        {renderDocConfig('First Article Inspection (FAI)', 'fai')}
        {renderDocConfig('Layout Inspection', 'layout')}
        
        {/* Legacy fallback */}
        <div style={{ marginTop: 8 }}>
          <details>
            <summary style={{ fontSize: 12, color: 'var(--ash)', cursor: 'pointer', outline: 'none' }}>Show Legacy/Default Document Settings</summary>
            {renderDocConfig('Default Layout (Fallback)', '')}
          </details>
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
