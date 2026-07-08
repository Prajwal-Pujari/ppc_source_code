import React, { useState, useEffect } from 'react';
import { factoryApi, type Factory } from '@/api/factory.api';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, CheckCircle2, AlertCircle, Loader2, Save, Layers, SearchCheck } from 'lucide-react';

export function ModuleSettingsPage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [factory, setFactory] = useState<Factory | null>(null);
  const [mesEnabled, setMesEnabled] = useState(true);
  const [pqcEnabled, setPqcEnabled] = useState(true);
  const [lpaEnabled, setLpaEnabled] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFactory();
  }, []);

  const fetchFactory = async () => {
    setLoading(true);
    try {
      const res = await factoryApi.getCurrent();
      if (res && (res as any).success && (res as any).data) {
        const f = (res as any).data;
        setFactory(f);
        setMesEnabled(f.mesEnabled ?? true);
        setPqcEnabled(f.pqcEnabled ?? true);
        setLpaEnabled(f.lpaEnabled ?? true);
      } else if (user) {
        setMesEnabled(user.mesEnabled ?? true);
        setPqcEnabled(user.pqcEnabled ?? true);
        setLpaEnabled(user.lpaEnabled ?? true);
      }
    } catch (err) {
      console.error('Failed to load factory details:', err);
      // Fallback to current user state
      if (user) {
        setMesEnabled(user.mesEnabled ?? true);
        setPqcEnabled(user.pqcEnabled ?? true);
        setLpaEnabled(user.lpaEnabled ?? true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !user.factoryId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await factoryApi.updateModules(user.factoryId, {
        mesEnabled,
        pqcEnabled,
        lpaEnabled,
      });
      if (res && ((res as any).success || (res as any).data)) {
        setMessage({ type: 'success', text: 'Module access settings updated successfully across your facility!' });
        // Update user state in authStore
        if (accessToken && refreshToken) {
          setAuth(
            {
              ...user,
              mesEnabled,
              pqcEnabled,
              lpaEnabled,
            },
            accessToken,
            refreshToken
          );
        }
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update module toggles. Please try again.',
      });
    } finally {
      setSaving(false);
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
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--copper-bronze)',
          }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: 0 }}>
              Factory Module Access Control
            </h1>
            <div style={{ fontSize: 13, color: 'var(--ash)' }}>
              Configure which software suites and audit modules are active for your facility ({factory?.name || factory?.factoryName || 'Current Factory'})
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '14px 18px', borderRadius: 8, marginBottom: 24,
          background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          display: 'flex', alignItems: 'center', gap: 10,
          fontSize: 13, fontWeight: 500,
        }}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Info Banner */}
      <div style={{
        padding: '16px 20px', borderRadius: 10, marginBottom: 24,
        background: 'var(--warm-white)', border: '1px solid var(--silk)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', gap: 16, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: 'var(--linen)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)', flexShrink: 0,
        }}>
          <Layers size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }}>
            Tailored Customer Deployments
          </div>
          <div style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.5 }}>
            Different customers and facilities require specific combinations of P-Track, PQC, and LPA.
            Toggling a module off will instantly hide its navigation menus, dashboards, and tools from all facility personnel,
            streamlining their workspace to only what they need.
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {/* MES Card */}
        <div style={{
          padding: '20px 24px', borderRadius: 12,
          background: 'var(--warm-white)',
          border: `1px solid ${mesEnabled ? 'var(--copper-bronze)' : 'var(--silk)'}`,
          boxShadow: mesEnabled ? '0 8px 24px rgba(184,115,51,0.08)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: mesEnabled ? 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))' : 'var(--linen)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: mesEnabled ? '#fff' : 'var(--ash)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>precision_manufacturing</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Production Tracking System (P-Track)
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                  background: mesEnabled ? 'rgba(34, 197, 94, 0.15)' : 'var(--linen)',
                  color: mesEnabled ? '#15803d' : 'var(--ash)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {mesEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                Core production tracking, job card dispatching, OEE analytics, machine telemetry, and shift logs.
              </div>
            </div>
          </div>
          <div>
            <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mesEnabled}
                onChange={(e) => setMesEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: mesEnabled ? 'var(--copper-bronze)' : '#cbd5e1',
                borderRadius: 28, transition: '0.3s',
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: 20, width: 20,
                  left: mesEnabled ? 28 : 4, bottom: 4, background: '#fff',
                  borderRadius: '50%', transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* PQC Card */}
        <div style={{
          padding: '20px 24px', borderRadius: 12,
          background: 'var(--warm-white)',
          border: `1px solid ${pqcEnabled ? 'var(--copper-bronze)' : 'var(--silk)'}`,
          boxShadow: pqcEnabled ? '0 8px 24px rgba(184,115,51,0.08)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: pqcEnabled ? 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))' : 'var(--linen)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: pqcEnabled ? '#fff' : 'var(--ash)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>content_paste_search</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Process Quality Control (PQC)
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                  background: pqcEnabled ? 'rgba(34, 197, 94, 0.15)' : 'var(--linen)',
                  color: pqcEnabled ? '#15803d' : 'var(--ash)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {pqcEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                Inline quality inspections, check sheets, non-conformance tracking, shift approvals, and PDIR reports.
              </div>
            </div>
          </div>
          <div>
            <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={pqcEnabled}
                onChange={(e) => setPqcEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: pqcEnabled ? 'var(--copper-bronze)' : '#cbd5e1',
                borderRadius: 28, transition: '0.3s',
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: 20, width: 20,
                  left: pqcEnabled ? 28 : 4, bottom: 4, background: '#fff',
                  borderRadius: '50%', transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* LPA Card */}
        <div style={{
          padding: '20px 24px', borderRadius: 12,
          background: 'var(--warm-white)',
          border: `1px solid ${lpaEnabled ? 'var(--copper-bronze)' : 'var(--silk)'}`,
          boxShadow: lpaEnabled ? '0 8px 24px rgba(184,115,51,0.08)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: lpaEnabled ? 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))' : 'var(--linen)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: lpaEnabled ? '#fff' : 'var(--ash)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 26 }}>fact_check</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
                  Layered Process Audit (LPA)
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                  background: lpaEnabled ? 'rgba(34, 197, 94, 0.15)' : 'var(--linen)',
                  color: lpaEnabled ? '#15803d' : 'var(--ash)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {lpaEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--slate)' }}>
                Layered Process Audits, Product Audits, Process Audits, and Poka-Yoke checks with shared master data and recurring schedules.
              </div>
            </div>
          </div>
          <div>
            <label style={{ position: 'relative', display: 'inline-block', width: 52, height: 28, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={lpaEnabled}
                onChange={(e) => setLpaEnabled(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: lpaEnabled ? 'var(--copper-bronze)' : '#cbd5e1',
                borderRadius: 28, transition: '0.3s',
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: 20, width: 20,
                  left: lpaEnabled ? 28 : 4, bottom: 4, background: '#fff',
                  borderRadius: '50%', transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
            color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 14px rgba(184,115,51,0.25)',
            opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>Save Module Configuration</span>
        </button>
      </div>
    </div>
  );
}
