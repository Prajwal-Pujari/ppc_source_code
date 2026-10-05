import React from 'react';
import { LpaNcManagement } from './LpaNcManagement';

export function LpaNcManagementPage() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 4px 0' }}>
            Action Items (NC) Management
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ash)', margin: 0 }}>
            Track and manage non-conformances found during audits, assign corrective actions, and track approvals.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.02)', padding: 24,
      }}>
        <LpaNcManagement />
      </div>
    </div>
  );
}
