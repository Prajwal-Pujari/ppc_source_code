import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { getGauge, getGaugeOperations, getGaugeNcRecords } from '@/api/gauges.api';
import { ArrowLeft, Download, Printer, CheckCircle, Clock, PlayCircle, Pause, XCircle, AlertTriangle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import { JobCardPrintableView } from '@/components/ui/JobCardPrintableView';
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
  const { data: machinesData } = useQuery({ queryKey: ['machines-all'], queryFn: () => import('@/api/machines.api').then(m => m.machinesApi.getAll()) });
  const { data: configData } = useQuery({ queryKey: ['report-config'], queryFn: () => import('@/api/reportConfig.api').then(m => m.reportConfigApi.get()) });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  const ncRecords = ncData?.data || [];
  const machines = machinesData?.data || [];
  const reportConfig = configData?.data;

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
      <JobCardPrintableView 
        ref={cardRef} 
        gauge={gauge} 
        ops={ops} 
        ncRecords={ncRecords} 
        baseUrl={baseUrl} 
        machines={machines}
        reportConfig={reportConfig}
      />
    </div>
  );
}

