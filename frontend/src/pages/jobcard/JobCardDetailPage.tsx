import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getGauge, getGaugeOperations, getGaugeNcRecords } from '@/api/gauges.api';
import { ArrowLeft, Download, Printer, CheckCircle, Clock, PlayCircle, Pause, XCircle, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';

/* ────── Status visual config ────── */
const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:     { color: 'var(--status-pending)',     bg: 'var(--status-pending-bg)',     icon: Clock,       label: 'Pending' },
  QUEUED:      { color: 'var(--status-queued)',      bg: 'var(--status-queued-bg)',      icon: Pause,       label: 'Queued' },
  IN_PROGRESS: { color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)', icon: PlayCircle,  label: 'In Progress' },
  COMPLETED:   { color: 'var(--status-completed)',   bg: 'var(--status-completed-bg)',   icon: CheckCircle, label: 'Completed' },
  SKIPPED:     { color: 'var(--ash)',                bg: 'var(--linen)',                 icon: XCircle,     label: 'Skipped' },
  REWORK:      { color: 'var(--status-rework)',      bg: 'var(--status-rework-bg)',      icon: AlertTriangle, label: 'Rework' },
};

const gaugeBadgeMap: Record<string, { color: string; bg: string }> = {
  PENDING:       { color: '#4A6FA5', bg: '#EEF2F8' },
  IN_PRODUCTION: { color: '#C68B2F', bg: '#FBF4E8' },
  ON_HOLD:       { color: '#6B5A8B', bg: '#F2EFF8' },
  COMPLETED:     { color: '#3A6B4A', bg: '#EBF4EE' },
  REJECTED:      { color: '#8B3A3A', bg: '#F8EEEE' },
};

/* ────── Helpers ────── */
const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  MAIN COMPONENT
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function JobCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: gaugeData, isLoading } = useQuery({ queryKey: ['gauge', id], queryFn: () => getGauge(id!) });
  const { data: opsData } = useQuery({ queryKey: ['gauge-ops', id], queryFn: () => getGaugeOperations(id!), enabled: !!gaugeData?.data });
  const { data: ncData } = useQuery({ queryKey: ['gauge-nc', id], queryFn: () => getGaugeNcRecords(id!), enabled: !!gaugeData?.data });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  const ncRecords = ncData?.data || [];

  useEffect(() => { if (gauge) setPageTitle(`Job Card: ${gauge.serialNumber}`); }, [gauge, setPageTitle]);

  /* ── PDF Download ── */
  const handleDownloadPDF = async () => {
    if (!cardRef.current || isGeneratingPdf) return;
    
    try {
      setIsGeneratingPdf(true);
      const el = cardRef.current;
      
      // Wait a tiny bit to ensure any hover states are cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(el, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#FFFFFF',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageH = pdf.internal.pageSize.getHeight();
      let pdfW = pdf.internal.pageSize.getWidth();
      let pdfH = (canvas.height * pdfW) / canvas.width;
      let xOffset = 0;
      
      // Scale down if taller than 1 page to fit completely
      if (pdfH > pageH) {
        const ratio = pageH / pdfH;
        pdfH = pageH;
        const newW = pdfW * ratio;
        xOffset = (pdfW - newW) / 2;
        pdfW = newW;
      }
      
      pdf.addImage(imgData, 'PNG', xOffset, 0, pdfW, pdfH);
      pdf.save(`JobCard_${gauge?.serialNumber || 'unknown'}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /* ── Skeleton ── */
  if (isLoading) return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: '100%', height: 600, borderRadius: 12 }} />
    </div>
  );

  if (!gauge) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>Job card not found</div>;

  const completedOps = ops.filter((o: any) => o.status === 'COMPLETED').length;
  const totalOps = ops.length;
  const progress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;
  const po = gauge.purchaseOrder;
  const badge = gaugeBadgeMap[gauge.status] || gaugeBadgeMap.PENDING;

  const baseUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Top Actions Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ gap: 6, minHeight: 36, fontSize: 12, padding: '0 14px' }}>
            <Printer size={14} /> Print
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPdf}
            className="btn btn-primary" 
            style={{ gap: 6, minHeight: 36, fontSize: 12, padding: '0 14px', opacity: isGeneratingPdf ? 0.7 : 1 }}
          >
            {isGeneratingPdf ? (
              <span className="spinner" style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={14} />
            )}
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       *  PRINTABLE JOB CARD
       * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div ref={cardRef} id="job-card-printable" style={{
        background: '#FFFFFF',
        border: '2px solid #1C1A18',
        borderRadius: 2,
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── HEADER / Letterhead ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1C1A18 0%, #2D2926 50%, #3A3530 100%)',
          padding: '24px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8C668', letterSpacing: '-0.02em', margin: 0 }}>
              JOB CARD
            </h1>
            <p style={{ fontSize: 10, color: 'rgba(232,198,104,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>
              Precision Gauge Manufacturing
            </p>
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
            <Cell label="W.O. No." value={po?.poNumber || '—'} mono />
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
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Work Completed By</th>
                <th style={thStyle}>Start</th>
                <th style={thStyle}>End</th>
              </tr>
            </thead>
            <tbody>
              {ops.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#8C857D', fontSize: 12 }}>No operations assigned yet</td></tr>
              ) : ops.map((op: any, idx: number) => {
                const cfg = statusConfig[op.status] || statusConfig.PENDING;
                return (
                  <tr key={op.id} style={{ borderBottom: '1px solid #E8E2D9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#8C857D', width: 40 }}>
                      {op.sequenceOrder}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {op.operationName}
                      {op.remarks && <div style={{ fontSize: 10, color: '#8C857D', fontStyle: 'italic', fontWeight: 400, marginTop: 2 }}>"{op.remarks}"</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                        background: cfg.bg, color: cfg.color,
                      }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11 }}>
                      {op.completedBy ? `${op.completedBy.fullName}` : op.assignedTo ? `${op.assignedTo.fullName}` : '—'}
                      {(op.completedBy?.employeeCode || op.assignedTo?.employeeCode) && <div style={{ fontSize: 9, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>{op.completedBy?.employeeCode || op.assignedTo?.employeeCode}</div>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {fmtDateTime(op.actualStart)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                      {fmtDateTime(op.actualEnd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── SECTION 4: Progress Summary ── */}
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <SectionTitle text="Progress Summary" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Total Operations" value={`${totalOps}`} mono borderRight />
            <Cell label="Completed" value={`${completedOps}`} mono borderRight />
            <div style={{ padding: '10px 16px' }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Progress</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <div style={{ height: 10, flex: 1, borderRadius: 5, background: '#E8E2D9', overflow: 'hidden', border: '1px solid #D4CCBF' }}>
                  <div style={{
                    height: '100%', borderRadius: 5, transition: 'width 0.4s ease',
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

        {/* ── SECTION 5: NC Records (if any) ── */}
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

        {/* ── FOOTER: Inspection Report & Card No ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #D4CCBF' }}>
          <Cell label="Inspection Report" value="—" borderRight />
          <Cell label="QR Code Path" value={gauge.qrCodePath || '—'} mono />
        </div>
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
    </div>
  );
}

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
  color: '#1C1A18',
  borderRight: '1px solid #E8E2D9',
};
