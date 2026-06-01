import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { getCalibrationObservationsByGauge } from '@/api/calibration.api';
import { CheckCircle, AlertTriangle, Printer, Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export default function BulkCalibrationPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [pageSize, setPageSize] = useState<'a4' | 'a5' | 'letter'>('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: gaugesData, isLoading: gaugesLoading } = useQuery({
    queryKey: ['po-gauges', id],
    queryFn: () => getPurchaseOrderGauges(id!),
    enabled: !!id,
  });

  const gauges = gaugesData?.data || [];

  const calQueries = useQueries({
    queries: gauges.map((g: any) => ({
      queryKey: ['calibration-report', g.id],
      queryFn: () => getCalibrationObservationsByGauge(g.id),
      staleTime: 0,
      enabled: !!g.id,
    })),
  });

  const isLoading = gaugesLoading || calQueries.some(q => q.isLoading);

  const getPageDimensions = () => {
    switch (pageSize) {
      case 'a4': return { w: 210, h: 297 };
      case 'a5': return { w: 148, h: 210 };
      case 'letter': return { w: 215.9, h: 279.4 };
      default: return { w: 210, h: 297 };
    }
  };

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf || gauges.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageSize });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let firstPage = true;

      for (let i = 0; i < gauges.length; i++) {
        const gauge = gauges[i];
        const observations = calQueries[i]?.data?.data || [];
        const ITEMS_PER_PAGE = 4;
        const pageCount = Math.ceil(observations.length / ITEMS_PER_PAGE);

        for (let p = 0; p < pageCount; p++) {
          const el = document.getElementById(`cal-page-${gauge.id}-${p}`);
          if (!el) continue;
          
          if (!firstPage) pdf.addPage();
          firstPage = false;
          
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
      }

      pdf.save(`Bulk_Calibration_PO_${id}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter' }}>Loading calibration reports for printing...</div>;
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
              <option value="a4">A4 (210 x 297 mm)</option>
              <option value="a5">A5 (148 x 210 mm)</option>
              <option value="letter">Letter (8.5 x 11 in)</option>
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
        const observations = calQueries[index]?.data?.data || [];
        const po = gauge.purchaseOrder;

        // Group observations into pages of 4
        const ITEMS_PER_PAGE = 4;
        const pages = [];
        for (let i = 0; i < observations.length; i += ITEMS_PER_PAGE) {
          pages.push(observations.slice(i, i + ITEMS_PER_PAGE));
        }

        if (pages.length === 0) {
          return null; // Skip gauges with no observations
        }

        return pages.map((pageObs, pageIdx) => (
          <div key={`${gauge.id}-page-${pageIdx}`} id={`cal-page-${gauge.id}-${pageIdx}`} className="page-break" style={{ 
            background: '#FFFFFF', border: '2px solid #1C1A18', margin: '0 auto 20px', maxWidth: '190mm', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: "'Inter', sans-serif" 
          }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>CALIBRATION RESULTS</h2>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '4px 0 0' }}>
                  Page {pageIdx + 1} of {pages.length} • Units {pageObs[0]?.unitNumber}–{pageObs[pageObs.length - 1]?.unitNumber} of {observations.length}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{gauge.serialNumber}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: '2px 0 0' }}>{gauge.gaugeTypeName}</p>
              </div>
            </div>

            {/* Gauge Details */}
            <div style={{ padding: '12px 20px', background: '#F5F2ED', borderBottom: '1px solid #D4CCBF', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <MiniField label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
              <MiniField label="PO Number" value={po?.poNumber || '—'} />
              <MiniField label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} />
              <MiniField label="Material" value={gauge.materialGrade || 'Standard'} />
            </div>

            {/* Observations */}
            <div style={{ padding: '16px 20px' }}>
              {pageObs.map((obs: any) => {
                const goOOB = obs.observedGo != null && ((obs.specifiedGoPlus != null && obs.observedGo > obs.specifiedGoPlus) || (obs.specifiedGoMinus != null && obs.observedGo < obs.specifiedGoMinus));
                const nogoOOB = obs.observedNogo != null && ((obs.specifiedNogoPlus != null && obs.observedNogo > obs.specifiedNogoPlus) || (obs.specifiedNogoMinus != null && obs.observedNogo < obs.specifiedNogoMinus));
                const pass = obs.observedGo != null && obs.observedNogo != null && !goOOB && !nogoOOB;

                return (
                  <div key={obs.id} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1E3A8A', fontFamily: "'JetBrains Mono', monospace" }}>
                        Unit {obs.unitNumber} / {observations.length}
                      </span>
                      {obs.observedGo != null && obs.observedNogo != null && (
                        pass ? (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#228B22', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={10} /> PASS
                          </span>
                        ) : (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#BA1A1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={10} /> FAIL
                          </span>
                        )
                      )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, border: '1px solid #D4CCBF' }}>
                      <thead>
                        <tr style={{ background: '#F5F2ED' }}>
                          <th style={rthStyle}></th>
                          <th style={{ ...rthStyle, textAlign: 'center' }}>GO</th>
                          <th style={{ ...rthStyle, textAlign: 'center' }}>NOGO</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                          <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 8, textTransform: 'uppercase' }}>Nominal Size</td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{obs.nominalGo ?? '—'}</td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{obs.nominalNogo ?? '—'}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                          <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 8, textTransform: 'uppercase' }}>Specified Size</td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>
                            {obs.specifiedGoPlus != null ? <>{obs.specifiedGoPlus} / {obs.specifiedGoMinus}</> : '—'}
                          </td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9 }}>
                            {obs.specifiedNogoPlus != null ? <>{obs.specifiedNogoPlus} / {obs.specifiedNogoMinus}</> : '—'}
                          </td>
                        </tr>
                        {obs.wearLimit != null && (
                          <tr style={{ borderBottom: '1px solid #E8E2D9' }}>
                            <td style={{ ...rtdStyle, fontWeight: 700, color: '#8C857D', fontSize: 8, textTransform: 'uppercase' }}>Wear Limit</td>
                            <td colSpan={2} style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>{obs.wearLimit}</td>
                          </tr>
                        )}
                        <tr style={{ background: goOOB || nogoOOB ? '#FFF5F5' : '#EBF4EE' }}>
                          <td style={{ ...rtdStyle, fontWeight: 700, color: goOOB || nogoOOB ? '#BA1A1A' : '#228B22', fontSize: 8, textTransform: 'uppercase' }}>Observed Size</td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: goOOB ? '#BA1A1A' : '#228B22' }}>
                            {obs.observedGo ?? '—'} {goOOB && '⚠'}
                          </td>
                          <td style={{ ...rtdStyle, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: nogoOOB ? '#BA1A1A' : '#228B22' }}>
                            {obs.observedNogo ?? '—'} {nogoOOB && '⚠'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    {obs.remarks && <div style={{ fontSize: 9, color: '#807665', marginTop: 4, fontStyle: 'italic' }}>Note: {obs.remarks}</div>}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 20px', background: '#F5F2ED', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D4CCBF' }}>
              <span style={{ fontSize: 8, color: '#8C857D', fontFamily: "'JetBrains Mono', monospace" }}>
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#1C1A18', fontFamily: "'JetBrains Mono', monospace" }}>
                {gauge.serialNumber} — Page {pageIdx + 1}
              </span>
            </div>
          </div>
        ));
      })}
      </div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: 8, fontWeight: 600, color: '#8C857D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      <div style={{ fontSize: 10, fontWeight: 500, color: '#1B1C1A', marginTop: 1 }}>{value}</div>
    </div>
  );
}

const rthStyle: React.CSSProperties = { padding: '4px 8px', fontSize: 8, fontWeight: 700, color: '#8C857D', textTransform: 'uppercase', borderRight: '1px solid #D4CCBF', borderBottom: '1px solid #D4CCBF' };
const rtdStyle: React.CSSProperties = { padding: '6px 8px', color: '#1C1A18', borderRight: '1px solid #D4CCBF' };
