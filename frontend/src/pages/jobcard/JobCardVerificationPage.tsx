import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPublicGauge, getPublicGaugeOperations, getPublicGaugeNcRecords } from '@/api/public.api';
import { CheckCircle, Clock, PlayCircle, ShieldCheck, Download } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';

/* ────── Status config ────── */
const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PENDING:     { color: '#8C857D', bg: '#FAFAF8', icon: Clock,       label: 'Pending' },
  IN_PROGRESS: { color: '#C68B2F', bg: '#FBF4E8', icon: PlayCircle,  label: 'In Progress' },
  COMPLETED:   { color: '#3A6B4A', bg: '#EBF4EE', icon: CheckCircle, label: 'Completed' },
};

export default function JobCardVerificationPage() {
  const { id } = useParams<{ id: string }>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: gaugeData, isLoading, isError } = useQuery({ queryKey: ['public-gauge', id], queryFn: () => getPublicGauge(id!) });
  const { data: opsData } = useQuery({ queryKey: ['public-gauge-ops', id], queryFn: () => getPublicGaugeOperations(id!), enabled: !!gaugeData?.data });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  
  /* ── PDF Download Logic (Identical to internal page) ── */
  const handleDownloadPDF = async () => {
    if (!cardRef.current || isGeneratingPdf) return;
    
    try {
      setIsGeneratingPdf(true);
      const el = cardRef.current;
      await new Promise(resolve => setTimeout(resolve, 100)); // clear states
      
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FFFFFF', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pageH = pdf.internal.pageSize.getHeight();
      let pdfW = pdf.internal.pageSize.getWidth();
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
      pdf.save(`JobCard_${gauge?.serialNumber || 'unknown'}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center', color: '#8C857D', fontFamily: 'Inter' }}>Loading Verification Data...</div>;
  if (isError || !gauge) return <div style={{ padding: 40, textAlign: 'center', color: '#8B3A3A', fontFamily: 'Inter' }}>Invalid or missing Job Card.</div>;

  const po = gauge.purchaseOrder;

  return (
    <div style={{ minHeight: '100vh', background: '#F5F2ED', padding: '20px 0', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── MOBILE / PUBLIC VIEW HEADER ── */}
      <div style={{ maxWidth: 800, margin: '0 auto 20px', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#3A6B4A', color: 'white', padding: '12px 20px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(58,107,74,0.2)' }}>
          <ShieldCheck size={24} />
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Verified Document</h2>
            <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>Issued by MES Factory Precision Manufacturing</p>
          </div>
        </div>
        
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPdf}
          style={{
            width: '100%', padding: 14, borderRadius: 8, border: 'none', background: '#1C1A18', color: '#E8C668',
            fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
            cursor: 'pointer', opacity: isGeneratingPdf ? 0.7 : 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {isGeneratingPdf ? <span className="spinner" style={{ width: 16, height: 16, border: '2px solid #E8C668', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Download size={18} />}
          {isGeneratingPdf ? 'Generating PDF...' : 'Download Original PDF'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── HIDDEN PRINTABLE CARD FOR PDF GENERATION ── */}
      {/* We render it identically to JobCardDetailPage but hidden visually unless printing/generating */}
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'white', padding: 20, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: '#8C857D', borderBottom: '1px solid #E8E2D9', paddingBottom: 8, marginBottom: 16 }}>Card Preview</h3>
        
        <div ref={cardRef} style={{ background: '#FFFFFF', border: '2px solid #1C1A18', borderRadius: 2 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1C1A18 0%, #2D2926 50%, #3A3530 100%)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E8C668', letterSpacing: '-0.02em', margin: 0 }}>JOB CARD</h1>
              <p style={{ fontSize: 10, color: 'rgba(232,198,104,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>Precision Gauge Manufacturing</p>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ background: 'white', padding: '6px 6px 4px', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <QRCodeSVG value={`${window.location.origin}/verify/${gauge.id}`} size={54} />
                <span style={{ fontSize: 7, fontWeight: 700, marginTop: 4, color: '#1C1A18' }}>VERIFY</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{gauge.serialNumber}</p>
                <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#EEF2F8', color: '#4A6FA5' }}>
                  {gauge.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Body Sections */}
          <div style={{ padding: '0', display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
             {/* Order Info */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <div style={{ background: '#F5F2ED', padding: '8px 24px', fontSize: 11, fontWeight: 800, color: '#1C1A18', textTransform: 'uppercase' }}>Order Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Date" value={new Date(gauge.createdAt).toLocaleDateString()} borderRight />
                <Cell label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="W.O. No." value={po?.poNumber || '—'} mono borderRight />
                <Cell label="P.O. No." value={po?.poNumber || '—'} mono borderRight />
                <Cell label="Due Date" value={po?.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '—'} />
              </div>
            </div>

            {/* Specs */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <div style={{ background: '#F5F2ED', padding: '8px 24px', fontSize: 11, fontWeight: 800, color: '#1C1A18', textTransform: 'uppercase' }}>Gauge Specifications</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Gauge Name / Type" value={gauge.gaugeTypeName} borderRight />
                <Cell label="Qty." value={`${gauge.batchQuantity || 1}`} mono />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #D4CCBF' }}>
                <Cell label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} mono borderRight />
                <Cell label="Material Grade" value={gauge.materialGrade || '—'} />
              </div>
            </div>

            {/* Timeline / Ops Log */}
            <div style={{ borderBottom: '2px solid #1C1A18' }}>
              <div style={{ background: '#F5F2ED', padding: '8px 24px', fontSize: 11, fontWeight: 800, color: '#1C1A18', textTransform: 'uppercase' }}>Operations Timeline</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#FFFFFF', borderTop: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8C857D', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Op</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8C857D', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Completed By</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8C857D', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Start</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', color: '#8C857D', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>End</th>
                  </tr>
                </thead>
                <tbody>
                  {ops.map((op: any, idx: number) => (
                    <tr key={op.id} style={{ borderBottom: '1px solid #E8E2D9', background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1C1A18' }}>{op.operationName}</td>
                      <td style={{ padding: '10px 14px', color: '#1C1A18' }}>{op.completedBy?.fullName || op.assignedTo?.fullName || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#8C857D', fontSize: 11 }}>{op.actualStart ? new Date(op.actualStart).toLocaleString() : '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#8C857D', fontSize: 11 }}>{op.actualEnd ? new Date(op.actualEnd).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, mono, borderRight }: { label: string; value: string; mono?: boolean; borderRight?: boolean }) {
  return (
    <div style={{ padding: '12px 24px', borderRight: borderRight ? '1px solid #D4CCBF' : undefined }}>
      <span style={{ display: 'block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#8C857D', marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: mono ? 600 : 500, color: '#1C1A18', fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif" }}>{value}</span>
    </div>
  );
}
