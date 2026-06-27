import React from 'react';
import { type ReportConfig } from '@/api/reportConfig.api';

interface HeaderProps {
  config: ReportConfig;
  reportTitle: string;
  pageInfo?: string;
  serialNumber?: string;
  statusBadge?: string;
  qrCode?: React.ReactNode;
  themeColor?: string;
}

export const CompanyReportHeader: React.FC<HeaderProps> = ({
  config,
  reportTitle,
  pageInfo,
  serialNumber,
  statusBadge,
  qrCode,
  themeColor = '#1C1A18'
}) => {
  const effectiveName = config?.companyName || 'Aarush Quality Services';
  const effectiveAddress = config?.companyAddress || 'B-302, Chanakya Nagari, Kandge Park, Sinhagad Rd, Pune - 411051, Maharashtra';

  return (
    <div style={{ 
      borderBottom: '2px solid #1C1A18', 
      background: '#FFFFFF', 
      padding: '18px 24px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      gap: 20,
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Left: Logo & Company Profile */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1.4 }}>
        {config?.customerLogo ? (
          <img 
            src={config.customerLogo} 
            alt="Company Logo" 
            style={{ maxHeight: 70, maxWidth: 130, objectFit: 'contain' }} 
          />
        ) : (
          <div style={{ 
            width: 50, height: 50, borderRadius: 8, background: '#F5F2ED', border: '1px solid #E8E2D9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: themeColor 
          }}>
            {effectiveName.charAt(0)}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1C1A18', margin: 0, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
            {effectiveName}
          </h1>
          <p style={{ fontSize: 11, color: '#5C554E', margin: '4px 0 0', lineHeight: 1.35, maxWidth: 400 }}>
            {effectiveAddress}
          </p>
        </div>
      </div>

      {/* Center: Report Title & QMS Document Control Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, borderLeft: '1px solid #E8E2D9', borderRight: '1px solid #E8E2D9', padding: '0 16px' }}>
        <div style={{ 
          background: themeColor, 
          color: '#FFFFFF', 
          padding: '6px 14px', 
          borderRadius: 4, 
          fontWeight: 800, 
          fontSize: 14, 
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {reportTitle}
        </div>
        {pageInfo && <div style={{ fontSize: 10, fontWeight: 600, color: '#8C857D', textAlign: 'center' }}>{pageInfo}</div>}
        
        <div style={{ display: 'flex', gap: 12, fontSize: 9, color: '#5C554E', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
          {config?.docNo && <span>Doc: <b style={{ color: '#1C1A18' }}>{config.docNo}</b></span>}
          {config?.revNo && <span>Rev: <b style={{ color: '#1C1A18' }}>{config.revNo}</b></span>}
          {config?.issueDate && <span>Date: <b style={{ color: '#1C1A18' }}>{config.issueDate}</b></span>}
        </div>
      </div>

      {/* Right: QR & Certificate Serial */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'flex-end', flex: 0.8 }}>
        {qrCode && (
          <div style={{ background: 'white', padding: 4, borderRadius: 4, border: '1px solid #E8E2D9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {qrCode}
          </div>
        )}
        {(serialNumber || statusBadge) && (
          <div style={{ textAlign: 'right' }}>
            {serialNumber && (
              <>
                <div style={{ fontSize: 9, color: '#8C857D', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>ID No.</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: '#1C1A18', marginTop: 2 }}>{serialNumber}</div>
              </>
            )}
            {statusBadge && (
              <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 800, background: '#EBF4EE', color: '#3A6B4A', textTransform: 'uppercase' }}>
                {statusBadge.replace('_', ' ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
