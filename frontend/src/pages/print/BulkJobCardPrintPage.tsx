import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { getGaugeOperations, getGaugeNcRecords } from '@/api/gauges.api';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { useDynamicBaseUrl } from '@/utils/urlUtils';
import { CompanyReportHeader } from '@/components/shared/CompanyReportHeader';
import { reportConfigApi, getEffectiveReportConfig } from '@/api/reportConfig.api';

// Status config
const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  PENDING:     { color: 'var(--status-pending)',     bg: 'var(--status-pending-bg)',     label: 'Pending' },
  QUEUED:      { color: 'var(--status-queued)',      bg: 'var(--status-queued-bg)',      label: 'Queued' },
  IN_PROGRESS: { color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)', label: 'In Progress' },
  COMPLETED:   { color: 'var(--status-completed)',   bg: 'var(--status-completed-bg)',   label: 'Completed' },
  SKIPPED:     { color: 'var(--ash)',                bg: 'var(--linen)',                 label: 'Skipped' },
  REWORK:      { color: 'var(--status-rework)',      bg: 'var(--status-rework-bg)',      label: 'Rework' },
};

const gaugeBadgeMap: Record<string, { color: string; bg: string }> = {
  PENDING:       { color: '#4A6FA5', bg: '#EEF2F8' },
  IN_PRODUCTION: { color: '#C68B2F', bg: '#FBF4E8' },
  ON_HOLD:       { color: '#6B5A8B', bg: '#F2EFF8' },
  COMPLETED:     { color: '#3A6B4A', bg: '#EBF4EE' },
  REJECTED:      { color: '#8B3A3A', bg: '#F8EEEE' },
};

const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export default function BulkJobCardPrintPage() {
  const { id } = useParams<{ id: string }>();
  const baseUrl = useDynamicBaseUrl();
  const [pageSize, setPageSize] = useState<'a1' | 'a2' | 'a3' | 'a4' | 'a5'>('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: configRes } = useQuery({ queryKey: ['report-config'], queryFn: () => reportConfigApi.get() });
  const reportConfig = getEffectiveReportConfig(configRes?.data || { customerLogo: '', docNo: 'QMS/F/01', revNo: '00 / 01.01.2024', issueDate: '01.01.2024' });

  const { data: gaugesData, isLoading: gaugesLoading } = useQuery({
    queryKey: ['po-gauges', id],
    queryFn: () => getPurchaseOrderGauges(id!),
    enabled: !!id,
  });

  const gauges = gaugesData?.data || [];

  const opsQueries = useQueries({
    queries: gauges.map((g: any) => ({
      queryKey: ['gauge-ops', g.id],
      queryFn: () => getGaugeOperations(g.id),
      staleTime: 0,
    })),
  });

  const ncQueries = useQueries({
    queries: gauges.map((g: any) => ({
      queryKey: ['gauge-nc', g.id],
      queryFn: () => getGaugeNcRecords(g.id),
      staleTime: 0,
    })),
  });

  const isLoading = gaugesLoading || opsQueries.some(q => q.isLoading) || ncQueries.some(q => q.isLoading);

  const getPageDimensions = () => {
    switch (pageSize) {
      case 'a1': return { w: 594, h: 841 };
      case 'a2': return { w: 420, h: 594 };
      case 'a3': return { w: 297, h: 420 };
      case 'a4': return { w: 210, h: 297 };
      case 'a5': return { w: 148, h: 210 };
      default: return { w: 210, h: 297 };
    }
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf || gauges.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageSize });
      const dims = getPageDimensions();
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < gauges.length; i++) {
        const el = document.getElementById(`job-card-${gauges[i].id}`);
        if (!el) continue;
        
        if (i > 0) pdf.addPage();
        
        // Let UI settle
        await new Promise(r => setTimeout(r, 50));
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', logging: false });
        const imgData = canvas.toDataURL('image/png');
        
        let pdfW = pageW;
        let pdfH = (canvas.height * pdfW) / canvas.width;
        let xOffset = 0;
        
        if (pdfH > pageH) {
          const ratio = pageH / pdfH;
          pdfH = pageH;
          const newW = pdfW * ratio;
          xOffset = (pdfW - newW) / 2;
          pdfW = newW;
        }
        
        pdf.addImage(imgData, 'PNG', xOffset, 0, pdfW, pdfH);
      }

      pdf.save(`Bulk_JobCards_PO_${id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter' }}>Loading job cards for printing...</div>;
  }

  if (gauges.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter' }}>No gauges found for this PO.</div>;
  }

  const dims = getPageDimensions();

  return (
    <div style={{ background: '#F0F0F0', minHeight: '100vh', paddingBottom: 40 }} className="bulk-print-container">
      {/* Control Bar (Hidden on Print) */}
      <div className="no-print" style={{ background: '#FFFFFF', padding: '16px 24px', borderBottom: '1px solid #D4CCBF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <button onClick={() => window.close()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Close
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>Page Size:</label>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value as any)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13, outline: 'none' }}>
              <option value="a1">A1 (594 x 841 mm)</option>
              <option value="a2">A2 (420 x 594 mm)</option>
              <option value="a3">A3 (297 x 420 mm)</option>
              <option value="a4">A4 (210 x 297 mm)</option>
              <option value="a5">A5 (148 x 210 mm)</option>
            </select>
          </div>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ minHeight: 36, padding: '0 16px', gap: 6 }}>
            <Printer size={16} /> Print via Browser
          </button>
          <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-primary" style={{ minHeight: 36, padding: '0 16px', gap: 6, opacity: isGeneratingPdf ? 0.7 : 1 }}>
            <Download size={16} /> {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; margin: 0; padding: 0; }
          .bulk-print-container { background: white !important; padding: 0 !important; }
          .page-break { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .no-print { display: none !important; }
          body > div > div > div:first-child, header, button, .btn { display: none !important; }
        }
        @page { size: ${pageSize} portrait; margin: 10mm; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      
      <div style={{ padding: '20px 0' }}>
      {gauges.map((gauge: any, index: number) => {
        const ops = opsQueries[index]?.data?.data || [];
        const ncRecords = ncQueries[index]?.data?.data || [];
        const po = gauge.purchaseOrder;
        const badge = gaugeBadgeMap[gauge.status] || gaugeBadgeMap.PENDING;

        const completedOps = ops.filter((o: any) => o.status === 'COMPLETED').length;
        const totalOps = ops.length;
        const progress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0;

        return (
          <div key={gauge.id} id={`job-card-${gauge.id}`} className="page-break" style={{ 
            background: '#FFFFFF',
            border: '2px solid #1C1A18',
            margin: '0 auto 20px',
            maxWidth: '190mm', // Always render at optimal size, PDF will scale it down if A5
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontFamily: "'Inter', sans-serif"
          }}>
            {/* Header */}
            <CompanyReportHeader 
              config={reportConfig}
              reportTitle="Job Card"
              serialNumber={gauge.serialNumber}
              statusBadge={gauge.status}
              qrCode={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <QRCodeSVG value={`${baseUrl}/verify/${gauge.id}`} size={46} />
                  <span style={{ fontSize: 6, fontWeight: 800, marginTop: 2, color: '#1C1A18' }}>VERIFY</span>
                </div>
              }
            />

            {/* Order Info */}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Cust. Sr. No." value={(gauge as any).customerSrNumber || po?.customerSrNumber || '—'} mono borderRight />
                <Cell label="Mfg. No." value={(gauge as any).manufactureNumber || po?.manufactureNumber || '—'} mono />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="W.O. Ref." value={po?.poNumber || '—'} mono borderRight />
                <Cell label="WO Date" value={fmtDate(po?.orderDate)} borderRight />
                <Cell label="Priority" value={po?.priority || 'NORMAL'} />
              </div>
            </div>

            {/* Specs */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <SectionTitle text="Gauge Specifications" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Gauge Name / Type" value={gauge.gaugeTypeName} bold borderRight />
                <Cell label="Qty." value={`${(gauge as any).poLineItem?.quantity || gauge.batchQuantity || 1}`} mono />
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

            {/* Ops Log */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <SectionTitle text="Operations Log" />
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#F5F2ED', borderTop: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' }}>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Operation</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Operator</th>
                    <th style={thStyle}>Start</th>
                    <th style={thStyle}>End</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#8C857D' }}>No operations</td></tr>
                  ) : ops.map((op: any, idx: number) => {
                    const cfg = statusConfig[op.status] || statusConfig.PENDING;
                    return (
                      <tr key={op.id} style={{ borderBottom: '1px solid #E8E2D9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#8C857D' }}>{op.sequenceOrder}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{op.operationName}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 10 }}>
                          {op.status === 'PENDING' || op.status === 'QUEUED' ? (
                            <span style={{ color: '#8C857D' }}>—</span>
                          ) : (
                            <>
                              <div style={{ fontSize: 8, color: '#8C857D', marginBottom: 2 }}>
                                {op.status === 'IN_PROGRESS' ? 'Started by:' : 'Done by:'}
                              </div>
                              {op.assignedTo ? (
                                <div style={{ fontWeight: 600 }}>{op.assignedTo.fullName}</div>
                              ) : (
                                <div style={{ fontSize: 9, color: '#BA1A1A', fontStyle: 'italic' }}>Unknown / Legacy</div>
                              )}
                            </>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{fmtDateTime(op.actualStart)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>{fmtDateTime(op.actualEnd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Progress */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <SectionTitle text="Progress Summary" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Total Ops" value={`${totalOps}`} mono borderRight />
                <Cell label="Completed" value={`${completedOps}`} mono borderRight />
                <div style={{ padding: '8px 12px' }}>
                  <span style={{ fontSize: 8, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase' }}>Progress</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ height: 8, flex: 1, borderRadius: 4, background: '#E8E2D9' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: progress === 100 ? '#3A6B4A' : '#4A6FA5', width: `${progress}%` }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>{progress}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#F5F2ED' }}>
              <span style={{ fontSize: 8, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#1C1A18', fontFamily: "'JetBrains Mono', monospace" }}>
                Card No: {gauge.serialNumber}
              </span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ padding: '6px 16px', background: 'linear-gradient(135deg, #F5F2ED 0%, #EEE9E1 100%)', borderBottom: '1px solid #D4CCBF' }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{text}</span>
    </div>
  );
}

function Cell({ label, value, mono, bold, borderRight }: { label: string; value: string; mono?: boolean; bold?: boolean; borderRight?: boolean }) {
  return (
    <div style={{ padding: '8px 16px', borderRight: borderRight ? '1px solid #D4CCBF' : undefined }}>
      <span style={{ display: 'block', fontSize: 8, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: bold ? 700 : 500, color: '#1C1A18', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 8, fontWeight: 700, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', borderRight: '1px solid #E8E2D9' };
const tdStyle: React.CSSProperties = { padding: '8px 10px', color: '#1C1A18', borderRight: '1px solid #E8E2D9' };
