import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { getCalibrationObservationsByGauge } from '@/api/calibration.api';
import { CheckCircle, AlertTriangle, Printer, Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { CompanyReportHeader } from '@/components/shared/CompanyReportHeader';
import { reportConfigApi, getEffectiveReportConfig } from '@/api/reportConfig.api';

const formatReading = (val: any) => {
  if (val == null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return val;
  return num.toFixed(4);
};

const formatTolPlus = (val: any) => {
  if (val == null || val === '') return '—';
  if (val === 0 || val === '0' || Number(val) === 0) return '0.0000';
  const num = Number(val);
  if (!isNaN(num)) return `+${Math.abs(num).toFixed(4)}`;
  const str = String(val).trim();
  return str.startsWith('+') || str.startsWith('-') ? str : `+${str}`;
};

const formatTolMinus = (val: any) => {
  if (val == null || val === '') return '—';
  if (val === 0 || val === '0' || Number(val) === 0) return '0.0000';
  const num = Number(val);
  if (!isNaN(num)) return `-${Math.abs(num).toFixed(4)}`;
  const str = String(val).trim();
  return str.startsWith('+') || str.startsWith('-') ? str : `-${str}`;
};

export default function BulkCalibrationPrintPage() {
  const { id } = useParams<{ id: string }>();
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
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      let firstPage = true;

      for (let i = 0; i < gauges.length; i++) {
        const gauge = gauges[i];
        const observations = calQueries[i]?.data?.data || [];
        const unitGroupsMap = new Map<number, any[]>();
        observations.forEach((obs: any, idx: number) => {
          const uNum = obs.unitNumber || (idx + 1);
          if (!unitGroupsMap.has(uNum)) unitGroupsMap.set(uNum, []);
          unitGroupsMap.get(uNum)!.push(obs);
        });
        const pageCount = unitGroupsMap.size || (observations.length > 0 ? 1 : 0);

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
      <div className="no-print responsive-flex" style={{ background: '#FFFFFF', padding: '16px 24px', borderBottom: '1px solid #D4CCBF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => window.close()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Close
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
        const observations = calQueries[index]?.data?.data || [];
        const po = gauge.purchaseOrder;

        // Group observations by unitNumber so each unit gets a separate report page
        const unitGroupsMap = new Map<number, any[]>();
        observations.forEach((obs: any, idx: number) => {
          const uNum = obs.unitNumber || (idx + 1);
          if (!unitGroupsMap.has(uNum)) unitGroupsMap.set(uNum, []);
          unitGroupsMap.get(uNum)!.push(obs);
        });
        const pages = Array.from(unitGroupsMap.values());

        if (pages.length === 0) {
          return null; // Skip gauges with no observations
        }

        return pages.map((pageObs, pageIdx) => (
          <div key={`${gauge.id}-page-${pageIdx}`} id={`cal-page-${gauge.id}-${pageIdx}`} className="page-break" style={{ 
            background: '#FFFFFF', border: '2px solid #1C1A18', margin: '0 auto 20px', maxWidth: '190mm', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: "'Inter', sans-serif" 
          }}>
            <CompanyReportHeader 
              config={reportConfig}
              reportTitle="Calibration Certificate"
              pageInfo={`Page ${pageIdx + 1} of ${pages.length} • Unit #${pageObs[0]?.unitNumber || (pageIdx + 1)}`}
              serialNumber={gauge.serialNumber}
              themeColor="#1E3A8A"
            />

            {/* Gauge Details */}
            <div style={{ padding: '12px 20px', background: '#F5F2ED', borderBottom: '1px solid #D4CCBF', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
              <MiniField label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
              <MiniField label="WO Number" value={po?.poNumber || '—'} />
              <MiniField label="Cust. Sr. No." value={(gauge as any).customerSrNumber || po?.customerSrNumber || '—'} />
              <MiniField label="Mfg. No." value={(gauge as any).manufactureNumber || po?.manufactureNumber || '—'} />
              <MiniField label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} />
              <MiniField label="Material" value={gauge.materialGrade || 'Standard'} />
            </div>

            {/* Observations */}
            <div style={{ padding: '16px 20px' }}>
              {pageObs.map((obs: any, idx: number) => {
                const goOOB = obs.observedGo != null && ((obs.specifiedGoPlus != null && obs.observedGo > obs.specifiedGoPlus) || (obs.specifiedGoMinus != null && obs.observedGo < obs.specifiedGoMinus));
                const nogoOOB = obs.observedNogo != null && ((obs.specifiedNogoPlus != null && obs.observedNogo > obs.specifiedNogoPlus) || (obs.specifiedNogoMinus != null && obs.observedNogo < obs.specifiedNogoMinus));
                const pass = obs.observedGo != null && obs.observedNogo != null && !goOOB && !nogoOOB;
                const isLast = idx === pageObs.length - 1;

                return (
                  <div key={obs.id || idx} style={{ marginBottom: isLast ? 0 : 20, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, border: '1.5px solid #1C1A18' }}>
                      <thead>
                        <tr style={{ background: '#F5F2ED', borderBottom: '1.5px solid #1C1A18' }}>
                          <th colSpan={7} style={{ padding: '8px', textAlign: 'center', fontWeight: 800, fontSize: 12, color: '#1C1A18', letterSpacing: 0.5 }}>
                            Calibration Results in ({gauge.sizeUnit || 'mm'}) {pageObs.length > 1 ? `— Unit #${obs.unitNumber}` : ''}
                          </th>
                        </tr>
                        <tr style={{ background: '#FAFAF8', color: '#1C1A18', fontWeight: 700, fontSize: 9 }}>
                          <th rowSpan={2} style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center', width: '16%', verticalAlign: 'middle' }}>
                            No / Make
                          </th>
                          <th colSpan={2} style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                            Nominal Size
                          </th>
                          <th colSpan={2} style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                            Specified Size
                          </th>
                          <th colSpan={2} style={{ padding: '5px', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                            Observed Size
                          </th>
                        </tr>
                        <tr style={{ background: '#FAFAF8', color: '#1C1A18', fontWeight: 700, fontSize: 9 }}>
                          <th style={{ padding: '4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                          <th style={{ padding: '4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                          <th style={{ padding: '4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                          <th style={{ padding: '4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                          <th style={{ padding: '4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                          <th style={{ padding: '4px', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ background: pass ? '#FFFFFF' : (goOOB || nogoOOB ? '#FFFBFB' : '#FFFFFF') }}>
                          <td style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontWeight: 700, fontSize: 10, verticalAlign: 'middle' }}>
                            Unit #{obs.unitNumber}
                          </td>
                          <td style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, verticalAlign: 'middle' }}>
                            {formatReading(obs.nominalGo)}
                          </td>
                          <td style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, verticalAlign: 'middle' }}>
                            {formatReading(obs.nominalNogo)}
                          </td>
                          <td style={{ padding: '3px 5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, verticalAlign: 'middle' }}>
                            {obs.specifiedGoPlus != null ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3, fontWeight: 700, color: '#1C1A18' }}>
                                <div>{formatTolPlus(obs.specifiedGoPlus)}</div>
                                <div>{formatTolMinus(obs.specifiedGoMinus)}</div>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '3px 5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, verticalAlign: 'middle' }}>
                            {obs.specifiedNogoPlus != null ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3, fontWeight: 700, color: '#1C1A18' }}>
                                <div>{formatTolPlus(obs.specifiedNogoPlus)}</div>
                                <div>{formatTolMinus(obs.specifiedNogoMinus)}</div>
                              </div>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '5px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: goOOB ? '#BA1A1A' : '#1C1A18', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              {formatReading(obs.observedGo)} {goOOB && <AlertTriangle size={10} color="#BA1A1A" />}
                            </div>
                          </td>
                          <td style={{ padding: '5px', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: nogoOOB ? '#BA1A1A' : '#1C1A18', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              {formatReading(obs.observedNogo)} {nogoOOB && <AlertTriangle size={10} color="#BA1A1A" />}
                            </div>
                          </td>
                        </tr>
                        <tr style={{ background: pass ? '#FAFAF8' : (goOOB || nogoOOB ? '#FFF5F5' : '#FAFAF8'), borderBottom: '1.5px solid #1C1A18' }}>
                          <td style={{ padding: '5px', borderRight: '1px solid #1C1A18', textAlign: 'center', color: '#665E53', fontSize: 9, fontWeight: 600 }}>
                            {gauge.gaugeTypeName || gauge.materialGrade || 'Standard'}
                          </td>
                          <td colSpan={2} style={{ padding: '5px', borderRight: '1px solid #1C1A18', textAlign: 'center', fontSize: 9, color: '#807665', fontStyle: 'italic' }}>
                            {obs.remarks ? `Note: ${obs.remarks}` : ''}
                          </td>
                          <td colSpan={2} style={{ padding: '5px', borderRight: '1px solid #1C1A18', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 9, color: '#1C1A18' }}>
                            {obs.wearLimit != null ? `W/L : ${formatReading(obs.wearLimit)}` : 'W/L : —'}
                          </td>
                          <td colSpan={2} style={{ padding: '5px', textAlign: 'center' }}>
                            {obs.observedGo != null && obs.observedNogo != null ? (
                              pass ? (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#228B22', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle size={10} /> PASS
                                </span>
                              ) : (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#BA1A1A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <AlertTriangle size={10} /> FAIL
                                </span>
                              )
                            ) : (
                              <span style={{ fontSize: 9, color: '#8C857D' }}>Pending</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Signatures */}
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D4CCBF', background: '#FAFAF8' }}>
              <div style={{ textAlign: 'center', minWidth: 180 }}>
                <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(gauge as any).calibratorSign ? (
                    (gauge as any).calibratorSign.startsWith('data:image') ? (
                      <img src={(gauge as any).calibratorSign} alt="Sign" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontFamily: 'cursive', fontSize: 14, fontWeight: 600, color: '#1C1A18' }}>{(gauge as any).calibratorSign}</span>
                    )
                  ) : <span style={{ color: '#8C857D', fontSize: 10, fontStyle: 'italic' }}>Pending Calibrator Sign</span>}
                </div>
                <div style={{ borderTop: '1px solid #1C1A18', paddingTop: 4, fontSize: 9, fontWeight: 700, color: '#1C1A18', textTransform: 'uppercase' }}>
                  Calibrated By: {(gauge as any).calibratorName || 'Quality Inspector'}
                </div>
              </div>

              <div style={{ textAlign: 'center', minWidth: 180 }}>
                <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(gauge as any).approvedByAdminSign ? (
                    (gauge as any).approvedByAdminSign.startsWith('data:image') ? (
                      <img src={(gauge as any).approvedByAdminSign} alt="Sign" style={{ maxHeight: 52, maxWidth: 180, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontFamily: 'cursive', fontSize: 14, fontWeight: 600, color: '#3A6B4A' }}>{(gauge as any).approvedByAdminSign}</span>
                    )
                  ) : <span style={{ color: '#8C857D', fontSize: 10, fontStyle: 'italic' }}>Pending Admin Approval</span>}
                </div>
                <div style={{ borderTop: '1px solid #1C1A18', paddingTop: 4, fontSize: 9, fontWeight: 700, color: '#1C1A18', textTransform: 'uppercase' }}>
                  Approved By: {(gauge as any).approvedByAdminName || 'Admin Manager'}
                </div>
              </div>
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
