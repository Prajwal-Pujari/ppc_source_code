import React, { forwardRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

/* ────── Helpers ────── */
const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const gaugeBadgeMap: Record<string, { color: string; bg: string }> = {
  PENDING:       { color: '#4A6FA5', bg: '#EEF2F8' },
  IN_PRODUCTION: { color: '#C68B2F', bg: '#FBF4E8' },
  ON_HOLD:       { color: '#6B5A8B', bg: '#F2EFF8' },
  COMPLETED:     { color: '#3A6B4A', bg: '#EBF4EE' },
  REJECTED:      { color: '#8B3A3A', bg: '#F8EEEE' },
};

/* ━━━ Table Style Constants ━━━ */
const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 9,
  fontWeight: 700,
  color: '#8C857D',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  textAlign: 'center',
  borderRight: '1px solid #E8E2D9',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: 11,
  color: '#1C1A18',
  borderRight: '1px solid #E8E2D9',
  verticalAlign: 'top',
};

export interface JobCardPrintableViewProps {
  gauge: any;
  ops: any[];
  ncRecords: any[];
  baseUrl: string;
  machines?: any[];
  reportConfig?: any;
}

export const JobCardPrintableView = forwardRef<HTMLDivElement, JobCardPrintableViewProps>(({ gauge, ops, ncRecords, baseUrl, machines, reportConfig }, ref) => {
  if (!gauge) return null;

  const completedOps = ops.filter((o: any) => o.status === 'COMPLETED').length;
  const totalOps = ops.length;
  const progress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
  const po = gauge.purchaseOrder;
  const badge = gaugeBadgeMap[gauge.status] || gaugeBadgeMap.PENDING;

  return (
    <div ref={ref} id={`job-card-printable-${gauge.id}`} className="pdf-page-section" style={{
      background: '#FFFFFF',
      minHeight: '297mm',
      boxSizing: 'border-box',
      border: '2px solid #1C1A18',
      borderRadius: 2,
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1 }}>
      {/* ── HEADER / Letterhead ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1C1A18 0%, #2D2926 50%, #3A3530 100%)',
        padding: '24px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {reportConfig?.customerLogo && (
            <div style={{ background: 'white', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              <img src={reportConfig.customerLogo} alt="Logo" style={{ height: 48, objectFit: 'contain' }} />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8C668', letterSpacing: '-0.02em', margin: 0 }}>
              JOB CARD
            </h1>
            <p style={{ fontSize: 10, color: 'rgba(232,198,104,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>
              Precision Gauge Manufacturing
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: 20, alignItems: 'center' }}>
          {/* Verification URL QR Code */}
          <div style={{ background: 'white', padding: '6px 6px 4px', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            <QRCodeCanvas value={`${baseUrl}/verify/${gauge.id}`} size={54} />
            <span style={{ fontSize: 7, fontWeight: 700, marginTop: 4, color: 'var(--charcoal)', letterSpacing: '0.05em' }}>VERIFY</span>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              {gauge.serialNumber}
            </p>
            <span style={{
              display: 'inline-block', marginTop: 6,
              padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700,
              background: badge.bg, color: badge.color, letterSpacing: '0.05em',
            }}>
              {gauge.status?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: Order Information ── */}
      <div style={{ borderBottom: '2px solid #1C1A18' }}>
        <SectionTitle text="Order Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <Cell label="Date" value={fmtDate(gauge.createdAt)} borderRight />
          <Cell label="Due Date" value={fmtDate(po?.expectedDeliveryDate)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <Cell label="Customer Name" value={po?.customer?.name || po?.customerName || '—'} borderRight />
          <Cell label="W.O. No." value={po?.workOrderNo || po?.poNumber || '—'} mono />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <Cell label="P.O. No." value={po?.poNumber || '—'} mono borderRight />
          <Cell label="PO Date" value={fmtDate(po?.orderDate)} borderRight />
          <Cell label="Priority" value={po?.priority || 'NORMAL'} highlight={po?.priority === 'URGENT' ? '#8B3A3A' : po?.priority === 'HIGH' ? '#C68B2F' : undefined} />
        </div>
      </div>

      {/* ── SECTION 2: Part / Product Specifications ── */}
      <div style={{ borderBottom: '2px solid #1C1A18' }}>
        <SectionTitle text="Part / Product Specifications" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <Cell label="Part / Product Name" value={gauge.gaugeTypeName} bold borderRight />
          <Cell label="Qty." value={`${gauge.batchQuantity || 1}`} mono />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <Cell label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} mono borderRight />
          <Cell label="Material Grade" value={gauge.materialGrade || '—'} />
        </div>
        {po?.specialInstructions && (
          <div style={{ borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Special Remarks" value={po.specialInstructions} />
          </div>
        )}
      </div>

      {/* ── SECTION 3: Operations Table ── */}
      <div style={{ borderBottom: '2px solid #1C1A18' }}>
        <SectionTitle text="Operations Log" />
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F5F2ED', borderTop: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' }}>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Operation</th>
              <th style={thStyle}>Machine</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Completed By</th>
              <th style={thStyle}>Setup Time</th>
              <th style={thStyle}>Cycle Time</th>
              <th style={thStyle}>Timing (Start - End)</th>
            </tr>
          </thead>
          <tbody>
            {ops.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: '#8C857D', fontSize: 12 }}>No operations assigned yet</td></tr>
            ) : (
              ops.map((op: any) => {
                const machine = machines?.find((m: any) => m.id === op.machineMasterId);
                const setupMins = op.setupInfo?.setupTimeMins;
                const cycleMins = op.cycleTimeMins;
                
                return (
                  <tr key={op.id} style={{ borderBottom: '1px solid #E8E2D9', background: op.status === 'COMPLETED' ? '#FDFDFC' : 'white' }}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", color: '#8C857D' }}>
                      {op.sequenceOrder}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {op.operationName}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10, color: '#4A6FA5', fontWeight: 600 }}>
                      {machine ? machine.machineName : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                        background: op.status === 'COMPLETED' ? '#EBF4EE' : op.status === 'IN_PROGRESS' ? '#EEF4F8' : '#F5F2ED',
                        color: op.status === 'COMPLETED' ? '#3A6B4A' : op.status === 'IN_PROGRESS' ? '#4A6FA5' : '#8C857D',
                      }}>
                        {op.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10 }}>
                      {op.completedByFullName || (typeof op.completedBy === 'object' ? op.completedBy?.fullName || op.completedBy?.username : op.completedBy) || '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {setupMins ? `${setupMins}m` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {cycleMins ? `${cycleMins}m` : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#8C857D' }}>
                      <div style={{ marginBottom: 2 }}><span style={{color: '#4A6FA5'}}>S:</span> {fmtDateTime(op.actualStart || op.setupInfo?.setupCompletedAt)}</div>
                      <div><span style={{color: '#3A6B4A'}}>E:</span> {fmtDateTime(op.actualEnd)}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── SECTION 4: Inspection Values ── */}
      {ops.some((op: any) => op.qualityParams && Object.keys(op.qualityParams).length > 0) && (
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <SectionTitle text="Inspection Values & Measurements" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8F9FA', borderTop: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' }}>
                <th style={{...thStyle, textAlign: 'left', width: '30%'}}>Operation</th>
                <th style={{...thStyle, textAlign: 'left'}}>Parameter</th>
                <th style={thStyle}>Measured Value</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op: any) => {
                if (!op.qualityParams || Object.keys(op.qualityParams).length === 0) return null;
                const entries = Object.entries(op.qualityParams);
                return entries.map(([key, value]: [string, any], idx: number) => (
                  <tr key={`${op.id}-${key}`} style={{ borderBottom: '1px solid #E8E2D9' }}>
                    {idx === 0 && (
                      <td rowSpan={entries.length} style={{ ...tdStyle, fontWeight: 600, background: '#FAFAFA' }}>
                        OP{op.sequenceOrder}: {op.operationName}
                      </td>
                    )}
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", color: '#4A6FA5' }}>
                      {key}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                      {String(value)}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SECTION 5: Quality & Progress ── */}
      <div style={{ borderBottom: '2px solid #1C1A18' }}>
        <SectionTitle text="Quality & Progress Summary" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
          <div style={{ padding: '12px 16px', borderRight: '1px solid #D4CCBF' }}>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              Total Operations
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1C1A18' }}>
              {completedOps} <span style={{ fontSize: 12, color: '#8C857D', fontWeight: 500 }}>/ {totalOps}</span>
            </span>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Completion Progress
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 6, background: '#E8E2D9', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: progress === 100 ? '#3A6B4A' : progress > 50 ? '#C68B2F' : '#4A6FA5',
                  width: `${progress}%`,
                }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: progress === 100 ? '#3A6B4A' : '#1C1A18' }}>
                {progress}%
              </span>
            </div>
          </div>
        </div>
        {gauge.rejectionCount > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Rejection Count" value={`${gauge.rejectionCount}`} highlight="#8B3A3A" />
          </div>
        )}
      </div>

      {/* ── SECTION 6: NC Records (if any) ── */}
      {ncRecords.length > 0 && (
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <div style={{ background: '#F8EEEE', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #D4CCBF' }}>
            <AlertTriangle size={14} color="#8B3A3A" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8B3A3A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Non-Conformance Records ({ncRecords.length})
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8EEEE', borderBottom: '1px solid #D4CCBF' }}>
                <th style={thStyle}>Category</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Reason</th>
                <th style={thStyle}>Action Taken</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {ncRecords.map((nc: any) => (
                <tr key={nc.id} style={{ borderBottom: '1px solid #E8E2D9' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: '#F8EEEE', color: '#8B3A3A' }}>
                      {nc.rejectionCategory?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {nc.rejectionReason}
                    {nc.deviationNote && <div style={{ fontSize: 10, color: '#8C857D', marginTop: 2 }}>Note: {nc.deviationNote}</div>}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>
                    {nc.actionTaken?.replace(/_/g, ' ')}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                    {fmtDate(nc.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px',
        background: '#F5F2ED',
      }}>
        <span style={{ fontSize: 9, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>
          Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1C1A18', fontFamily: "'JetBrains Mono', monospace" }}>
          Card No: {gauge.serialNumber}
        </span>
      </div>
    </div>
  );
});

/* ━━━ Sub-Components ━━━ */
function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #F5F2ED 0%, #EEE9E1 100%)',
      borderBottom: '1px solid #D4CCBF',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {text}
      </span>
    </div>
  );
}

function Cell({ label, value, mono, bold, borderRight, highlight }: {
  label: string; value: string; mono?: boolean; bold?: boolean; borderRight?: boolean; highlight?: string;
}) {
  return (
    <div style={{
      padding: '10px 16px',
      borderRight: borderRight ? '1px solid #D4CCBF' : undefined,
    }}>
      <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: bold ? 700 : 500,
        color: highlight || '#1C1A18',
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
      }}>
        {value}
      </span>
    </div>
  );
}
