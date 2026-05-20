import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getGauge, getGaugeOperations } from '@/api/gauges.api';
import { getCalibrationObservationsByGauge } from '@/api/calibration.api';
import { ArrowLeft, Download, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CalibrationReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const jobCardRef = useRef<HTMLDivElement>(null);
  const calibrationRefs = useRef<HTMLDivElement[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: gaugeData, isLoading } = useQuery({ queryKey: ['gauge', id], queryFn: () => getGauge(id!) });
  const { data: opsData } = useQuery({ queryKey: ['gauge-ops', id], queryFn: () => getGaugeOperations(id!), enabled: !!gaugeData?.data });
  const { data: calData } = useQuery({ queryKey: ['calibration-report', id], queryFn: () => getCalibrationObservationsByGauge(id!), enabled: !!gaugeData?.data });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  const observations = calData?.data || [];

  useEffect(() => { if (gauge) setPageTitle(`Calibration Report: ${gauge.serialNumber}`); }, [gauge, setPageTitle]);

  // Group observations into pages (4 per page for readability)
  const ITEMS_PER_PAGE = 4;
  const observationPages: typeof observations[] = [];
  for (let i = 0; i < observations.length; i += ITEMS_PER_PAGE) {
    observationPages.push(observations.slice(i, i + ITEMS_PER_PAGE));
  }

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Page 1: Job Card
      if (jobCardRef.current) {
        const canvas = await html2canvas(jobCardRef.current, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', logging: false });
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

      // Page 2+: Calibration observations
      for (let i = 0; i < calibrationRefs.current.length; i++) {
        const el = calibrationRefs.current[i];
        if (!el) continue;
        pdf.addPage();
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

      pdf.save(`CalibrationReport_${gauge?.serialNumber || 'unknown'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="skeleton" style={{ width: '100%', height: 600, borderRadius: 12 }} />
    </div>
  );

  if (!gauge) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>Job card not found</div>;

  const po = gauge.purchaseOrder;
  const completedOps = ops.filter((o: any) => o.status === 'COMPLETED').length;
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
          <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-primary" style={{ gap: 6, minHeight: 36, fontSize: 12, padding: '0 14px', opacity: isGeneratingPdf ? 0.7 : 1 }}>
            {isGeneratingPdf ? <span className="spinner" style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ━━━ PAGE 1: JOB CARD ━━━ */}
      <div ref={jobCardRef} style={{ background: '#FFFFFF', border: '2px solid #1C1A18', borderRadius: 2, overflow: 'hidden', fontFamily: "'Inter', sans-serif", marginBottom: 30 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1C1A18 0%, #2D2926 50%, #3A3530 100%)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8C668', letterSpacing: '-0.02em', margin: 0 }}>JOB CARD</h1>
            <p style={{ fontSize: 10, color: 'rgba(232,198,104,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>Precision Gauge Manufacturing</p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '6px 6px 4px', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <QRCodeSVG value={`${baseUrl}/verify/${gauge.id}`} size={54} />
              <span style={{ fontSize: 7, fontWeight: 700, marginTop: 4, color: 'var(--charcoal)', letterSpacing: '0.05em' }}>VERIFY</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{gauge.serialNumber}</p>
              <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#EBF4EE', color: '#3A6B4A', letterSpacing: '0.05em' }}>
                {gauge.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Order Information */}
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <SectionTitle text="Order Information" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Customer" value={po?.customer?.name || po?.customerName || '—'} borderRight />
            <Cell label="PO Number" value={po?.poNumber || '—'} mono />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Order Date" value={fmtDate(po?.orderDate)} borderRight />
            <Cell label="Due Date" value={fmtDate(po?.expectedDeliveryDate)} borderRight />
            <Cell label="Priority" value={po?.priority || 'NORMAL'} />
          </div>
        </div>

        {/* Gauge Specifications */}
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <SectionTitle text="Gauge Specifications" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Gauge Type" value={gauge.gaugeTypeName} bold borderRight />
            <Cell label="Batch Qty" value={`${gauge.batchQuantity || 1}`} mono />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
            <Cell label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} mono borderRight />
            <Cell label="Material Grade" value={gauge.materialGrade || '—'} />
          </div>
        </div>

        {/* Operations Log */}
        <div style={{ borderBottom: '2px solid #1C1A18' }}>
          <SectionTitle text="Operations Log" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F5F2ED', borderTop: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' }}>
                <th style={thStyle}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Operation</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op: any, idx: number) => (
                <tr key={op.id} style={{ borderBottom: '1px solid #E8E2D9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#8C857D', width: 40 }}>{op.sequenceOrder}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{op.operationName}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: op.status === 'COMPLETED' ? '#EBF4EE' : '#FBF4E8', color: op.status === 'COMPLETED' ? '#3A6B4A' : '#C68B2F' }}>
                      {op.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11 }}>{op.assignedTo?.fullName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Progress */}
        <div style={{ padding: '12px 16px', background: '#F5F2ED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>
            Progress: {completedOps}/{ops.length} operations completed
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#1C1A18', fontFamily: "'JetBrains Mono', monospace" }}>
            Card No: {gauge.serialNumber}
          </span>
        </div>
      </div>

      {/* ━━━ PAGE 2+: CALIBRATION OBSERVATIONS ━━━ */}
      {observationPages.map((pageObs, pageIdx) => (
        <div
          key={pageIdx}
          ref={el => { if (el) calibrationRefs.current[pageIdx] = el; }}
          style={{ background: '#FFFFFF', border: '2px solid #1C1A18', borderRadius: 2, overflow: 'hidden', fontFamily: "'Inter', sans-serif", marginBottom: 30 }}
        >
          {/* Calibration Header */}
          <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>CALIBRATION RESULTS</h2>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                Page {pageIdx + 2} of {observationPages.length + 1} • Units {pageObs[0]?.unitNumber}–{pageObs[pageObs.length - 1]?.unitNumber} of {observations.length}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{gauge.serialNumber}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>{gauge.gaugeTypeName}</p>
            </div>
          </div>

          {/* Gauge Details Banner */}
          <div style={{ padding: '12px 28px', background: '#F5F2ED', borderBottom: '1px solid #D4CCBF', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <MiniField label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
            <MiniField label="PO Number" value={po?.poNumber || '—'} />
            <MiniField label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} />
            <MiniField label="Material" value={gauge.materialGrade || 'Standard'} />
          </div>

          {/* Observation Tables */}
          <div style={{ padding: '20px 28px' }}>
            {pageObs.map((obs: any) => {
              const goOOB = obs.observedGo != null && ((obs.specifiedGoPlus != null && obs.observedGo > obs.specifiedGoPlus) || (obs.specifiedGoMinus != null && obs.observedGo < obs.specifiedGoMinus));
              const nogoOOB = obs.observedNogo != null && ((obs.specifiedNogoPlus != null && obs.observedNogo > obs.specifiedNogoPlus) || (obs.specifiedNogoMinus != null && obs.observedNogo < obs.specifiedNogoMinus));
              const pass = obs.observedGo != null && obs.observedNogo != null && !goOOB && !nogoOOB;

              return (
                <div key={obs.id} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1E3A8A', fontFamily: "'JetBrains Mono', monospace" }}>
                      Unit {obs.unitNumber} / {observations.length}
                    </span>
                    {obs.observedGo != null && obs.observedNogo != null && (
                      pass ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#228B22', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={12} /> PASS
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#BA1A1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertTriangle size={12} /> FAIL
                        </span>
                      )
                    )}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #D4CCBF' }}>
                    <thead>
                      <tr style={{ background: '#F5F2ED' }}>
                        <th style={rthStyle}></th>
                        <th style={{ ...rthStyle, textAlign: 'center' }}>GO</th>
                        <th style={{ ...rthStyle, textAlign: 'center' }}>NOGO</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                        <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 9, textTransform: 'uppercase' }}>Nominal Size</td>
                        <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{obs.nominalGo ?? '—'}</td>
                        <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{obs.nominalNogo ?? '—'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                        <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 9, textTransform: 'uppercase' }}>Specified Size</td>
                        <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                          {obs.specifiedGoPlus != null ? <>{obs.specifiedGoPlus} / {obs.specifiedGoMinus}</> : '—'}
                        </td>
                        <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                          {obs.specifiedNogoPlus != null ? <>{obs.specifiedNogoPlus} / {obs.specifiedNogoMinus}</> : '—'}
                        </td>
                      </tr>
                      {obs.wearLimit != null && (
                        <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                          <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 9, textTransform: 'uppercase' }}>Wear Limit</td>
                          <td colSpan={2} style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>{obs.wearLimit}</td>
                        </tr>
                      )}
                      <tr style={{ background: goOOB || nogoOOB ? '#FFF5F5' : '#EBF4EE' }}>
                        <td style={{ ...rtdStyle, fontWeight: 700, color: goOOB || nogoOOB ? '#BA1A1A' : '#228B22', fontSize: 9, textTransform: 'uppercase' }}>Observed Size</td>
                        <td style={{
                          ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                          color: goOOB ? '#BA1A1A' : '#228B22',
                        }}>
                          {obs.observedGo ?? '—'} {goOOB && '⚠'}
                        </td>
                        <td style={{
                          ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                          color: nogoOOB ? '#BA1A1A' : '#228B22',
                        }}>
                          {obs.observedNogo ?? '—'} {nogoOOB && '⚠'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {obs.remarks && (
                    <div style={{ fontSize: 10, color: '#807665', marginTop: 4, fontStyle: 'italic' }}>Note: {obs.remarks}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 28px', background: '#F5F2ED', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D4CCBF' }}>
            <span style={{ fontSize: 9, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>
              Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#1C1A18', fontFamily: "'JetBrains Mono', monospace" }}>
              {gauge.serialNumber} — Page {pageIdx + 2}
            </span>
          </div>
        </div>
      ))}

      {observations.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', background: 'var(--warm-white)', border: '1px dashed var(--silk)', borderRadius: 10 }}>
          <p style={{ fontSize: 16, fontWeight: 500 }}>No calibration observations recorded yet</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Complete the calibration operation to generate the report.</p>
        </div>
      )}
    </div>
  );
}

/* ━━━ Sub-Components ━━━ */

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #F5F2ED 0%, #EEE9E1 100%)', borderBottom: '1px solid #D4CCBF' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#8B6914', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{text}</span>
    </div>
  );
}

function Cell({ label, value, mono, bold, borderRight, highlight }: { label: string; value: string; mono?: boolean; bold?: boolean; borderRight?: boolean; highlight?: string }) {
  return (
    <div style={{ padding: '10px 16px', borderRight: borderRight ? '1px solid #D4CCBF' : undefined }}>
      <span style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: highlight || '#1C1A18', fontFamily: mono ? "'JetBrains Mono', monospace" : undefined }}>{value}</span>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 8, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#1B1C1A', marginTop: 1 }}>{value}</div>
    </div>
  );
}

/* ━━━ Style Constants ━━━ */
const thStyle: React.CSSProperties = { padding: '8px 12px', fontSize: 9, fontWeight: 700, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', borderRight: '1px solid #E8E2D9' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', color: '#1C1A18', borderRight: '1px solid #E8E2D9' };
const rthStyle: React.CSSProperties = { padding: '6px 10px', fontSize: 9, fontWeight: 700, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.08em', borderRight: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' };
const rtdStyle: React.CSSProperties = { padding: '8px 10px', color: '#1C1A18', borderRight: '1px solid #D4CCBF' };
