import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Printer, Download, ChevronRight, ChevronDown, FileCheck, CheckCircle2, Package, Loader2, X } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { reportsApi } from '@/api/reports.api';
import toast from 'react-hot-toast';
import type { QualityReportDto, GaugeOperation } from '@/types/domain.types';
import InProcessReportView from './reports/InProcessReportView';
import PdirReportView from './reports/PdirReportView';
import LayoutReportView from './reports/LayoutReportView';
import FaiReportView from './reports/FaiReportView';
import { reportConfigApi, type ReportConfiguration } from '@/api/reportConfig.api';
import { shiftsApi, type FactoryShift } from '@/api/shifts.api';
import { getGaugeOperations } from '@/api/gauges.api';

type ReportType = 'IN_PROCESS' | 'PDIR' | 'LAYOUT' | 'FAI' | 'FAR' | 'INCOMING';

const reportTypes: { id: ReportType; label: string }[] = [
  { id: 'IN_PROCESS', label: 'In-Process Report' },
  // { id: 'PDIR', label: 'PDIR' },
  // { id: 'LAYOUT', label: 'Layout Inspection' },
  // { id: 'FAI', label: 'FAI (First Article)' },
  // { id: 'FAR', label: 'FAR' },
  // { id: 'INCOMING', label: 'Incoming Inspection' },
];

/* ─── Main dashboard ─── */
export default function PqcReportDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('IN_PROCESS');
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch report config
  useEffect(() => {
    reportConfigApi.get().then(res => setReportConfig(res.data)).catch(console.error);
  }, []);

  // Fetch all POs
  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['report-pos', searchTerm],
    queryFn: async () => {
      const res = await getPurchaseOrders({ page: 0, size: 50, search: searchTerm || undefined });
      return res.data?.content ?? [];
    },
  });

  // Fetch gauges for the expanded PO
  const { data: gauges = [], isLoading: gaugesLoading } = useQuery({
    queryKey: ['report-gauges', expandedPoId],
    queryFn: async () => {
      const res = await getPurchaseOrderGauges(expandedPoId!);
      return res.data ?? [];
    },
    enabled: !!expandedPoId,
  });

  const [activeSubReport, setActiveSubReport] = useState<string>('ALL');

  useEffect(() => {
    setActiveSubReport('ALL');
  }, [selectedGaugeId]);

  // Fetch report for the selected part / product
  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ['pqc-report', selectedGaugeId, selectedReportType],
    queryFn: async () => {
      const res = await reportsApi.getReportByGauge(selectedGaugeId!, selectedReportType);
      return res.data ?? null;
    },
    enabled: !!selectedGaugeId,
    retry: 1,
  });

  const subReports = React.useMemo(() => {
    if (!reportData?.operations) return [];
    const map = new Map<string, { date: string, shiftName: string }>();
    reportData.operations.forEach(op => {
      op.batches?.forEach(b => {
        if (!b.shiftName) return;
        const dateStr = new Date(b.logTime).toLocaleDateString();
        const key = `${dateStr}_${b.shiftName}`;
        if (!map.has(key)) {
          map.set(key, { date: dateStr, shiftName: b.shiftName });
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [reportData]);

  const filteredReportData = React.useMemo(() => {
    if (!reportData || activeSubReport === 'ALL') return { data: reportData, matchedApproval: undefined };
    const [filterDate, filterShift] = activeSubReport.split('_');
    const dataClone = JSON.parse(JSON.stringify(reportData)) as QualityReportDto;

    let matchedApproval = undefined;

    if (dataClone.approvals) {
      matchedApproval = dataClone.approvals.find((a: any) => a.inspectionDate === filterDate && a.shiftName === filterShift)
        || dataClone.approvals.find((a: any) => a.inspectionDate === filterDate);
    }

    dataClone.operations = dataClone.operations.map(op => {
      op.batches = (op.batches || []).filter(b => {
        const d = new Date(b.logTime).toLocaleDateString();
        return d === filterDate && b.shiftName === filterShift;
      });
      return op;
    }).filter(op => op.batches.length > 0);
    return { data: dataClone, matchedApproval };
  }, [reportData, activeSubReport]);

  const handleTogglePo = (poId: string) => {
    if (expandedPoId === poId) {
      setExpandedPoId(null);
    } else {
      setExpandedPoId(poId);
    }
  };

  const handleSelectGauge = (gaugeId: string) => {
    setSelectedGaugeId(gaugeId);
  };

  const [isExporting, setIsExporting] = useState<false | 'view' | 'download'>(false);

  const exportPdf = async (action: 'view' | 'download') => {
    if (!reportRef.current) return;
    setIsExporting(action);
    const toastId = toast.loading('Generating PDF...');
    try {
      // Clone the report node to avoid messing up the live view
      const clone = reportRef.current.cloneNode(true) as HTMLElement;

      // Temporarily append the clone off-screen to render it
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '-9999px';
      clone.style.width = '1123px';
      clone.style.maxWidth = 'none';
      clone.style.height = 'max-content';

      const signatures = clone.querySelector('.print-signatures') as HTMLElement;
      if (signatures) signatures.style.display = 'flex';

      const scrollableDivs = clone.querySelectorAll('div');
      scrollableDivs.forEach((div) => {
        const style = window.getComputedStyle(div);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'hidden' || div.style.overflowX === 'auto') {
          div.style.overflowX = 'visible';
          div.style.overflow = 'visible';
        }
      });

      document.body.appendChild(clone);

      // Check if the report is chunked into discrete pages
      const pages = clone.querySelectorAll('.pdf-page');

      const html2canvasFn = typeof html2canvas === 'function' ? html2canvas : (html2canvas as any).default;
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          // Temporarily ensure the page is visible for html2canvas
          pageEl.style.display = 'block';

          const canvas = await html2canvasFn(pageEl, { scale: 2, useCORS: true, windowWidth: 1123 }); // 1123px is A4 width at 96dpi
          const imgData = canvas.toDataURL('image/png');

          // Calculate height proportionally to fit width
          let imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let finalWidth = pdfWidth;
          let xOffset = 0;

          // If the rendered page is taller than an A4 page, scale it down to fit the height
          if (imgHeight > pdfHeight) {
            finalWidth = (canvas.width * pdfHeight) / canvas.height;
            imgHeight = pdfHeight;
            // Center it horizontally
            xOffset = (pdfWidth - finalWidth) / 2;
          }

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, imgHeight);
        }
      } else {
        // Fallback for reports that are not explicitly chunked
        const canvas = await html2canvasFn(clone, { scale: 2, useCORS: true, windowWidth: clone.scrollWidth });
        const imgData = canvas.toDataURL('image/png');

        let position = 0;
        const pageHeight = pdf.internal.pageSize.getHeight();
        const totalImgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeight);

        // Handle multi-page export by slicing
        let heightLeft = totalImgHeight - pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - totalImgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalImgHeight);
          heightLeft -= pageHeight;
        }
      }

      if (action === 'download') {
        const filename = `Inspection_Report_${reportData?.poNumber || 'Generated'}.pdf`;
        pdf.save(filename);
        toast.success('PDF downloaded successfully!', { id: toastId });
      } else {
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank');
        toast.success('PDF opened in a new tab!', { id: toastId });
      }

      // Clean up the clone
      document.body.removeChild(clone);
    } catch (e) {
      console.error('Failed to export PDF', e);
      toast.error('Failed to generate PDF: ' + String(e), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bone-white)' }}>

      {/* ─── Header ─── */}
      <div className="hide-on-print mobile-flex-wrap mobile-p-16" style={{
        padding: '20px 28px', background: 'white', borderBottom: '1px solid var(--silk)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <FileCheck size={24} color="var(--copper-bronze)" />
            Quality Control Reports
          </h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 4 }}>
            Select a Purchase Order → Part to generate inspection reports.
          </p>
        </div>
        {selectedGaugeId && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setSelectedGaugeId(null)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--stone)', background: 'white', cursor: 'pointer' }}>
              <X size={16} /> Close
            </button>
            <button onClick={() => exportPdf('view')} disabled={!!isExporting} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--stone)', background: 'white', cursor: isExporting ? 'not-allowed' : 'pointer', opacity: isExporting ? 0.7 : 1 }}>
              {isExporting === 'view' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              View PDF
            </button>
            <button onClick={() => exportPdf('download')} disabled={!!isExporting} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 6, border: 'none', background: isExporting ? 'var(--ash)' : 'var(--copper-bronze)', color: 'white', cursor: isExporting ? 'not-allowed' : 'pointer' }}>
              {isExporting === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download PDF
            </button>
          </div>
        )}
      </div>

      {/* ─── Body ─── */}
      <div className="mobile-stack" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── Left panel: PO list ─── */}
        <div className="hide-on-print mobile-w-full" style={{
          width: 340, minWidth: 340, background: 'white', borderRight: '1px solid var(--silk)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          maxHeight: '100%', /* On mobile this will share height with main if not scrollable, but since flex: 1 is used, it should adapt */
        }}>
          {/* Search */}
          <div style={{ padding: '16px 16px 12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ash)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter POs…"
                style={{
                  width: '100%', padding: '9px 12px 9px 34px', borderRadius: 6,
                  border: '1px solid var(--stone)', fontSize: 13, outline: 'none',
                  background: 'var(--bone-white)',
                }}
              />
            </div>
          </div>

          {/* PO + Gauge flat list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {posLoading && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ash)', fontSize: 13 }}>
                Loading…
              </div>
            )}

            {!posLoading && pos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ash)' }}>
                <FileText size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>No purchase orders found.</p>
              </div>
            )}

            {pos.map((po: any) => {
              const isExpanded = expandedPoId === po.id;
              return (
                <div key={po.id}>
                  {/* PO row - plain button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePo(po.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', cursor: 'pointer',
                      background: isExpanded ? 'var(--linen)' : 'white',
                      border: '1px solid var(--silk)', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Package size={16} color="var(--copper-bronze)" />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{po.poNumber}</div>
                        <div style={{ fontSize: 11, color: 'var(--slate)' }}>{po.customerName || 'Internal'}</div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={16} color="var(--ash)" />
                      : <ChevronRight size={16} color="var(--ash)" />}
                  </button>

                  {/* Gauge rows — completely separate from the PO button above */}
                  {isExpanded && (
                    <div style={{ border: '1px solid var(--silk)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      {gaugesLoading ? (
                        <div style={{ padding: 14, fontSize: 12, color: 'var(--ash)' }}>Loading parts…</div>
                      ) : gauges.length === 0 ? (
                        <div style={{ padding: 14, fontSize: 12, color: 'var(--ash)' }}>No parts found for this PO.</div>
                      ) : (
                        gauges.map((g: any) => {
                          const isSelected = selectedGaugeId === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSelectGauge(g.id);
                              }}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 14px 12px 16px', cursor: 'pointer',
                                background: isSelected ? 'rgba(139,105,20,0.08)' : '#FAFAF8',
                                border: 'none', borderTop: '1px solid var(--silk)',
                                borderLeft: isSelected ? '3px solid var(--copper-bronze)' : '3px solid transparent',
                                textAlign: 'left',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F5F3EE'; }}
                              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#FAFAF8'; }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 6,
                                  background: isSelected ? 'var(--copper-bronze)' : 'var(--silk)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isSelected ? 'white' : 'var(--slate)', fontSize: 12, fontWeight: 700,
                                  flexShrink: 0,
                                }}>
                                  G
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--copper-bronze)' : 'var(--charcoal)' }}>
                                    {g.gaugeTypeName || 'Part'}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--ash)' }}>SN: {g.serialNumber}</div>
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 size={14} color="var(--copper-bronze)" />
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--ash)', fontStyle: 'italic' }}>Click to view report</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Right panel: Report area ─── */}
        <div className="mobile-p-16 mobile-w-full" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: 28, background: 'var(--bone-white)' }}>
          {!selectedGaugeId ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
              flexDirection: 'column', color: 'var(--ash)',
            }}>
              <FileCheck size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>No item selected.</p>
              <p style={{ fontSize: 13 }}>
                Expand a Purchase Order on the left, then click on a specific Part to view its report.
              </p>
            </div>
          ) : (
            <div style={{ maxWidth: 1250, margin: '0 auto' }}>

              {/* Report type tabs */}
              <div className="hide-on-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {reportTypes.map(rt => (
                  <button
                    key={rt.id}
                    type="button"
                    onClick={() => setSelectedReportType(rt.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: selectedReportType === rt.id ? '2px solid var(--copper-bronze)' : '1px solid var(--stone)',
                      background: selectedReportType === rt.id ? 'white' : 'var(--warm-white)',
                      color: selectedReportType === rt.id ? 'var(--copper-bronze)' : 'var(--slate)',
                      boxShadow: selectedReportType === rt.id ? '0 2px 8px rgba(139,105,20,0.12)' : 'none',
                    }}
                  >
                    {rt.label}
                  </button>
                ))}
              </div>

              {/* Report document */}
              <div style={{ background: '#f8f9fa', padding: '24px', width: '100%', overflowX: 'auto' }}>

                {/* Report Tabs / Buttons */}
                {subReports.length > 0 && (
                  <div className="hide-on-print" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, width: '100%', maxWidth: '210mm' }}>
                    <button
                      onClick={() => setActiveSubReport('ALL')}
                      style={{
                        padding: '8px 16px', borderRadius: 20, border: '1px solid var(--copper-bronze)',
                        background: activeSubReport === 'ALL' ? 'var(--copper-bronze)' : 'white',
                        color: activeSubReport === 'ALL' ? 'white' : 'var(--copper-bronze)',
                        cursor: 'pointer', fontWeight: 600, fontSize: 13
                      }}
                    >
                      Consolidated Master Report
                    </button>
                    {subReports.map(sub => {
                      const key = `${sub.date}_${sub.shiftName}`;
                      return (
                        <button
                          key={key}
                          onClick={() => setActiveSubReport(key)}
                          style={{
                            padding: '8px 16px', borderRadius: 20, border: '1px solid var(--copper-bronze)',
                            background: activeSubReport === key ? 'var(--copper-bronze)' : 'white',
                            color: activeSubReport === key ? 'white' : 'var(--copper-bronze)',
                            cursor: 'pointer', fontWeight: 600, fontSize: 13
                          }}
                        >
                          {sub.date} - {sub.shiftName}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div ref={reportRef} className="print-document mobile-p-16" style={{
                  background: 'white', padding: 40, borderRadius: 10,
                  boxShadow: '0 6px 24px rgba(28,26,24,0.07)', border: '1px solid var(--silk)',
                  minHeight: 800, width: 'max-content', minWidth: '100%',
                }}>
                  {reportLoading ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--slate)' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto 16px' }} />
                      <p>Generating report…</p>
                    </div>
                  ) : reportError ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: '#b91c1c' }}>
                      <p style={{ fontWeight: 600 }}>Error loading report</p>
                      <p style={{ fontSize: 13 }}>{String((reportError as any)?.message || reportError)}</p>
                    </div>
                  ) : !filteredReportData?.data ? (
                    <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ash)' }}>
                      <p>No report data available.</p>
                    </div>
                  ) : (
                    <>
                      {selectedReportType === 'IN_PROCESS' && <InProcessReportView data={filteredReportData.data} config={{ ...reportConfig, activeApproval: filteredReportData.matchedApproval }} />}
                      {/* {selectedReportType === 'PDIR' && <PdirReportView data={filteredReportData} />} */}
                      {/* {selectedReportType === 'LAYOUT' && <LayoutReportView data={filteredReportData} />} */}
                      {/* {selectedReportType === 'FAI' && <FaiReportView data={filteredReportData} />} */}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
