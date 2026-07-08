import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ModuleSwitcherProps {
  currentModule: 'MES' | 'PQC' | 'LPA';
}

export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({ currentModule }) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  if (user?.role === 'WORKER') {
    return null;
  }

  const mesEnabled = user?.mesEnabled !== false;
  const pqcEnabled = user?.pqcEnabled !== false;
  const lpaEnabled = user?.lpaEnabled !== false;

  const availableCount = (mesEnabled ? 1 : 0) + (pqcEnabled ? 1 : 0) + (lpaEnabled ? 1 : 0);

  if (availableCount <= 1) {
    return null; // Don't show switcher if only 1 module is enabled for this factory/user
  }

  return (
    <div style={{ padding: '12px 12px', borderTop: '1px solid var(--silk)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dust)', padding: '0 8px', marginBottom: 8 }}>
        Switch Module
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {currentModule !== 'MES' && mesEnabled && (
          <button
            onClick={() => navigate('/dashboard')}
            className="sidebar-nav-link"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '1px solid var(--silk)',
              color: 'var(--slate)', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>precision_manufacturing</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>P-Track Module</div>
              <div style={{ fontSize: 10, color: 'var(--ash)' }}>Production Tracking</div>
            </div>
          </button>
        )}

        {currentModule !== 'PQC' && pqcEnabled && (
          <button
            onClick={() => navigate('/pqc/dashboard')}
            className="sidebar-nav-link"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '1px solid var(--silk)',
              color: 'var(--slate)', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>content_paste_search</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>PQC Module</div>
              <div style={{ fontSize: 10, color: 'var(--ash)' }}>Quality Inspections</div>
            </div>
          </button>
        )}

        {currentModule !== 'LPA' && lpaEnabled && (
          <button
            onClick={() => navigate('/lpa/dashboard')}
            className="sidebar-nav-link"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '1px solid var(--silk)',
              color: 'var(--slate)', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fact_check</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>LPA Module</div>
              <div style={{ fontSize: 10, color: 'var(--ash)' }}>Layered Audits</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
