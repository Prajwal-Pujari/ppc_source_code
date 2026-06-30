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
import { CompanyReportHeader } from '@/components/shared/CompanyReportHeader';
import { reportConfigApi, getEffectiveReportConfig } from '@/api/reportConfig.api';
import { useDynamicBaseUrl } from '@/utils/urlUtils';

const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

export default function CalibrationReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  const baseUrl = useDynamicBaseUrl();
  const jobCardRef = useRef<HTMLDivElement>(null);
  const calibrationRefs = useRef<HTMLDivElement[]>([]);
  const [pageSize, setPageSize] = useState<'a1' | 'a2' | 'a3' | 'a4' | 'a5'>('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: configRes } = useQuery({ queryKey: ['report-config'], queryFn: () => reportConfigApi.get() });
  const reportConfig = getEffectiveReportConfig(configRes?.data || { customerLogo: '', docNo: 'QMS/F/01', revNo: '00 / 01.01.2024', issueDate: '01.01.2024' });

  const { data: gaugeData, isLoading } = useQuery({ queryKey: ['gauge', id], queryFn: () => getGauge(id!) });
  const { data: opsData } = useQuery({ queryKey: ['gauge-ops', id], queryFn: () => getGaugeOperations(id!), enabled: !!gaugeData?.data });
  const { data: calData } = useQuery({ queryKey: ['calibration-report', id], queryFn: () => getCalibrationObservationsByGauge(id!), enabled: !!gaugeData?.data });

  const gauge = gaugeData?.data;
  const ops = opsData?.data || [];
  const observations = calData?.data || [];

  useEffect(() => { if (gauge) setPageTitle(`Calibration Report: ${gauge.serialNumber}`); }, [gauge, setPageTitle]);

  // Group observations by unitNumber so each unit gets a separate report page with header and footer
  const unitGroupsMap = new Map<number, typeof observations>();
  observations.forEach((obs: any, idx: number) => {
    const uNum = obs.unitNumber || (idx + 1);
    if (!unitGroupsMap.has(uNum)) unitGroupsMap.set(uNum, []);
    unitGroupsMap.get(uNum)!.push(obs);
  });
  const observationPages = Array.from(unitGroupsMap.values());

  const handleDownloadPDF = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageSize });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Calibration observations pages
      for (let i = 0; i < calibrationRefs.current.length; i++) {
        const el = calibrationRefs.current[i];
        if (!el) continue;
        if (i > 0) {
          pdf.addPage();
        }
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* ── Top Actions Bar ── */}
      <div className="no-print responsive-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--copper-bronze)', fontSize: 13, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', padding: '0 10px', minHeight: 36, borderRadius: 6, border: '1px solid var(--silk)' }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}>Page Size:</label>
            <select value={pageSize} onChange={(e) => setPageSize(e.target.value as any)} style={{ border: 'none', background: 'transparent', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer', color: 'var(--copper-bronze)' }}>
              <option value="a1">A1</option>
              <option value="a2">A2</option>
              <option value="a3">A3</option>
              <option value="a4">A4</option>
              <option value="a5">A5</option>
            </select>
          </div>
          <button onClick={() => window.print()} className="btn btn-secondary" style={{ gap: 6, minHeight: 36, fontSize: 12, padding: '0 14px' }}>
            <Printer size={14} /> Print
          </button>
          <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="btn btn-primary" style={{ gap: 6, minHeight: 36, fontSize: 12, padding: '0 14px', opacity: isGeneratingPdf ? 0.7 : 1 }}>
            {isGeneratingPdf ? <span className="spinner" style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @media print { @page { size: ${pageSize} portrait; margin: 10mm; } }`}</style>

      {/* ━━━ CALIBRATION OBSERVATIONS REPORT ━━━ */}

      {/* ━━━ PAGE 2+: CALIBRATION OBSERVATIONS ━━━ */}
      {observationPages.map((pageObs, pageIdx) => (
        <div
          key={pageIdx}
          ref={el => { if (el) calibrationRefs.current[pageIdx] = el; }}
          style={{ background: '#FFFFFF', border: '2px solid #1C1A18', borderRadius: 2, overflow: 'hidden', fontFamily: "'Inter', sans-serif", marginBottom: 30 }}
        >
          <CompanyReportHeader 
            config={reportConfig}
            reportTitle="Calibration Certificate"
            pageInfo={`Page ${pageIdx + 1} of ${observationPages.length} • Unit #${pageObs[0]?.unitNumber || (pageIdx + 1)}`}
            serialNumber={gauge.serialNumber}
            themeColor="#1E3A8A"
          />

          {/* Gauge Details Banner */}
          <div style={{ padding: '12px 28px', background: '#F5F2ED', borderBottom: '1px solid #D4CCBF', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
            <MiniField label="Customer" value={po?.customer?.name || po?.customerName || '—'} />
            <MiniField label="WO Number" value={po?.poNumber || '—'} />
            <MiniField label="Cust. Sr. No." value={(gauge as any).customerSrNumber || po?.customerSrNumber || '—'} />
            <MiniField label="Mfg. No." value={(gauge as any).manufactureNumber || po?.manufactureNumber || '—'} />
            <MiniField label="Nominal Size" value={`${gauge.nominalSize} ${gauge.sizeUnit}`} />
            <MiniField label="Material" value={gauge.materialGrade || 'Standard'} />
          </div>

          {/* Observation Tables */}
          <div style={{ padding: '20px 28px' }}>
            {pageObs.map((obs: any, idx: number) => {
              const goOOB = obs.observedGo != null && ((obs.specifiedGoPlus != null && obs.observedGo > obs.specifiedGoPlus) || (obs.specifiedGoMinus != null && obs.observedGo < obs.specifiedGoMinus));
              const nogoOOB = obs.observedNogo != null && ((obs.specifiedNogoPlus != null && obs.observedNogo > obs.specifiedNogoPlus) || (obs.specifiedNogoMinus != null && obs.observedNogo < obs.specifiedNogoMinus));
              const pass = obs.observedGo != null && obs.observedNogo != null && !goOOB && !nogoOOB;
              const isLast = idx === pageObs.length - 1;

              return (
                <div key={obs.id || idx} style={{ marginBottom: isLast ? 0 : 24, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1.5px solid #1C1A18' }}>
                    <thead>
                      <tr style={{ background: '#F5F2ED', borderBottom: '1.5px solid #1C1A18' }}>
                        <th colSpan={7} style={{ padding: '10px', textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#1C1A18', letterSpacing: 0.5 }}>
                          Calibration Results in ({gauge.sizeUnit || 'mm'}) {pageObs.length > 1 ? `— Unit #${obs.unitNumber}` : ''}
                        </th>
                      </tr>
                      <tr style={{ background: '#FAFAF8', color: '#1C1A18', fontWeight: 700, fontSize: 10 }}>
                        <th rowSpan={2} style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center', width: '16%', verticalAlign: 'middle' }}>
                          No / Make
                        </th>
                        <th colSpan={2} style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                          Nominal Size
                        </th>
                        <th colSpan={2} style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                          Specified Size
                        </th>
                        <th colSpan={2} style={{ padding: '6px', borderBottom: '1px solid #1C1A18', textAlign: 'center', width: '28%' }}>
                          Observed Size
                        </th>
                      </tr>
                      <tr style={{ background: '#FAFAF8', color: '#1C1A18', fontWeight: 700, fontSize: 10 }}>
                        <th style={{ padding: '6px 4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                        <th style={{ padding: '6px 4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                        <th style={{ padding: '6px 4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                        <th style={{ padding: '6px 4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                        <th style={{ padding: '6px 4px', borderRight: '1px solid #1C1A18', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>GO</th>
                        <th style={{ padding: '6px 4px', borderBottom: '1.5px solid #1C1A18', textAlign: 'center' }}>NOGO</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: pass ? '#FFFFFF' : (goOOB || nogoOOB ? '#FFFBFB' : '#FFFFFF') }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontWeight: 700, fontSize: 11, verticalAlign: 'middle' }}>
                          Unit #{obs.unitNumber}
                        </td>
                        <td style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, verticalAlign: 'middle' }}>
                          {formatReading(obs.nominalGo)}
                        </td>
                        <td style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, verticalAlign: 'middle' }}>
                          {formatReading(obs.nominalNogo)}
                        </td>
                        <td style={{ padding: '4px 6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, verticalAlign: 'middle' }}>
                          {obs.specifiedGoPlus != null ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.3, fontWeight: 700, color: '#1C1A18' }}>
                              <div>{formatTolPlus(obs.specifiedGoPlus)}</div>
                              <div>{formatTolMinus(obs.specifiedGoMinus)}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '4px 6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, verticalAlign: 'middle' }}>
                          {obs.specifiedNogoPlus != null ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.3, fontWeight: 700, color: '#1C1A18' }}>
                              <div>{formatTolPlus(obs.specifiedNogoPlus)}</div>
                              <div>{formatTolMinus(obs.specifiedNogoMinus)}</div>
                            </div>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '6px', borderRight: '1px solid #1C1A18', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: goOOB ? '#BA1A1A' : '#1C1A18', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {formatReading(obs.observedGo)} {goOOB && <AlertTriangle size={12} color="#BA1A1A" />}
                          </div>
                        </td>
                        <td style={{ padding: '6px', borderBottom: '1px dashed #D4CCBF', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: nogoOOB ? '#BA1A1A' : '#1C1A18', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {formatReading(obs.observedNogo)} {nogoOOB && <AlertTriangle size={12} color="#BA1A1A" />}
                          </div>
                        </td>
                      </tr>
                      <tr style={{ background: pass ? '#FAFAF8' : (goOOB || nogoOOB ? '#FFF5F5' : '#FAFAF8'), borderBottom: '1.5px solid #1C1A18' }}>
                        <td style={{ padding: '6px', borderRight: '1px solid #1C1A18', textAlign: 'center', color: '#665E53', fontSize: 10, fontWeight: 600 }}>
                          {gauge.gaugeTypeName || gauge.materialGrade || 'Standard'}
                        </td>
                        <td colSpan={2} style={{ padding: '6px', borderRight: '1px solid #1C1A18', textAlign: 'center', fontSize: 10, color: '#807665', fontStyle: 'italic' }}>
                          {obs.remarks ? `Note: ${obs.remarks}` : ''}
                        </td>
                        <td colSpan={2} style={{ padding: '6px', borderRight: '1px solid #1C1A18', textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 10, color: '#1C1A18' }}>
                          {obs.wearLimit != null ? `W/L : ${formatReading(obs.wearLimit)}` : 'W/L : —'}
                        </td>
                        <td colSpan={2} style={{ padding: '6px', textAlign: 'center' }}>
                          {obs.observedGo != null && obs.observedNogo != null ? (
                            pass ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#228B22', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={12} /> PASS
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#BA1A1A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> FAIL
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: 10, color: '#8C857D' }}>Pending</span>
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
          <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D4CCBF', background: '#FAFAF8' }}>
            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(gauge as any).calibratorSign ? (
                  (gauge as any).calibratorSign.startsWith('data:image') ? (
                    <img src={(gauge as any).calibratorSign} alt="Sign" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontFamily: 'cursive', fontSize: 16, fontWeight: 600, color: '#1C1A18' }}>{(gauge as any).calibratorSign}</span>
                  )
                ) : <span style={{ color: '#8C857D', fontSize: 11, fontStyle: 'italic' }}>Pending Calibrator Sign</span>}
              </div>
              <div style={{ borderTop: '1px solid #1C1A18', paddingTop: 4, fontSize: 10, fontWeight: 700, color: '#1C1A18', textTransform: 'uppercase' }}>
                Calibrated By: {(gauge as any).calibratorName || 'Quality Inspector'}
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 200 }}>
              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(gauge as any).approvedByAdminSign ? (
                  (gauge as any).approvedByAdminSign.startsWith('data:image') ? (
                    <img src={(gauge as any).approvedByAdminSign} alt="Sign" style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontFamily: 'cursive', fontSize: 16, fontWeight: 600, color: '#3A6B4A' }}>{(gauge as any).approvedByAdminSign}</span>
                  )
                ) : <span style={{ color: '#8C857D', fontSize: 11, fontStyle: 'italic' }}>Pending Admin Approval</span>}
              </div>
              <div style={{ borderTop: '1px solid #1C1A18', paddingTop: 4, fontSize: 10, fontWeight: 700, color: '#1C1A18', textTransform: 'uppercase' }}>
                Approved By: {(gauge as any).approvedByAdminName || 'Admin Manager'}
              </div>
            </div>
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
