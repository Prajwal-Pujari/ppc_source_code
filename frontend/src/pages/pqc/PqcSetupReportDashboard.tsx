import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Printer, Download, ChevronRight, ChevronDown, FileCheck, CheckCircle2, Package, Loader2, X } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { reportsApi } from '@/api/reports.api';
import toast from 'react-hot-toast';
import type { QualityReportDto, GaugeOperation, ReportType } from '@/types/domain.types';
import SetupReportView from './reports/SetupReportView';

import { reportConfigApi, type ReportConfiguration } from '@/api/reportConfig.api';
import { shiftsApi, type FactoryShift } from '@/api/shifts.api';
import { getGaugeOperations } from '@/api/gauges.api';

const reportTypes: { id: ReportType; label: string }[] = [
  { id: 'IN_PROCESS', label: 'In-Process Report' },
  { id: 'PDIR', label: 'PDIR (Pre-Dispatch)' },
  // { id: 'LAYOUT', label: 'Layout Inspection' },
  // { id: 'FAI', label: 'FAI (First Article)' },
  // { id: 'FAR', label: 'FAR' },
  // { id: 'INCOMING', label: 'Incoming Inspection' },
];

/* ─── Main dashboard ─── */
export default function PqcSetupReportDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);
  const selectedReportType: ReportType = 'SETUP';
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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

  useEffect(() => {
    if (searchTerm && pos.length === 1 && !expandedPoId) {
      setExpandedPoId(pos[0].id);
    }
  }, [pos, searchTerm, expandedPoId]);

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
    setIsMobileDrawerOpen(false);
  };

  const [isExporting, setIsExporting] = useState<false | 'view' | 'download'>(false);

  const exportPdf = async (action: 'view' | 'download') => {
    if (!reportRef.current) return;
    setIsExporting(action);
    const toastId = toast.loading('Generating PDF...');
    try {
      // Clone the report node to avoid messing up the live view
      const clone = reportRef.current.cloneNode(true) as HTMLElement;

      // Temporarily position the clone in the top-left corner behind viewport elements so html2canvas captures exact coordinates without off-screen clipping
      clone.style.position = 'fixed';
      clone.style.top = '0px';
      clone.style.left = '0px';
      clone.style.zIndex = '-9999';
      clone.style.pointerEvents = 'none';
      clone.style.width = '1123px';
      clone.style.maxWidth = 'none';
      clone.style.height = 'max-content';
      clone.style.background = '#ffffff';

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
          // Preserve flexbox layout on the page so header/footer and table spacing match screen exactly
          pageEl.style.display = 'flex';

          const canvas = await html2canvasFn(pageEl, {
            scale: 2,
            useCORS: true,
            windowWidth: 1123,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff'
          });
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
      <div className={isMobileDrawerOpen ? "po-drawer-overlay open" : "po-drawer-overlay"} onClick={() => setIsMobileDrawerOpen(false)} />

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
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="btn btn-secondary mobile-only"
            style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Package size={16} /> Select PO
          </button>
          {selectedGaugeId && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="mobile-stack" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── Left panel: PO list ─── */}
        <div className={`hide-on-print po-sidebar-drawer ${isMobileDrawerOpen ? 'open' : ''}`} style={{
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
                      width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      padding: '12px 14px', cursor: 'pointer',
                      background: isExpanded ? 'var(--linen)' : 'white',
                      border: '1px solid var(--silk)', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                      textAlign: 'left', gap: 8
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                      <Package size={18} color="var(--copper-bronze)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>{po.poNumber}</span>
                          {po.status && (
                            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: '#EAE8E1', color: 'var(--charcoal)' }}>
                              {po.status}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--copper-bronze)', marginTop: 2 }}>
                          Customer: {po.customerName || 'Internal / Stock'}
                        </div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--slate)', marginTop: 4, flexWrap: 'wrap' }}>
                          <span>Parts: {po.completedGauges || 0}/{po.totalGauges || 0}</span>
                          {po.orderDate && <span>Date: {new Date(po.orderDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {isExpanded
                        ? <ChevronDown size={16} color="var(--ash)" />
                        : <ChevronRight size={16} color="var(--ash)" />}
                    </div>
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
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 6,
                                  background: isSelected ? 'var(--copper-bronze)' : 'var(--silk)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isSelected ? 'white' : 'var(--slate)', fontSize: 12, fontWeight: 700,
                                  flexShrink: 0, marginTop: 2
                                }}>
                                  G
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--copper-bronze)' : 'var(--charcoal)', wordBreak: 'break-all' }}>
                                    {g.serialNumber || g.gaugeId || 'SN N/A'}
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--charcoal)', marginTop: 2 }}>
                                    Part: {g.gaugeTypeName || g.partName || 'Part'}
                                  </div>
                                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--slate)', marginTop: 3, flexWrap: 'wrap' }}>
                                    {g.batchQuantity && <span>Qty: {g.batchQuantity}</span>}
                                    {g.status && <span>Status: {g.status}</span>}
                                    {g.currentLocation && <span>Loc: {g.currentLocation}</span>}
                                  </div>
                                </div>
                              </div>
                              <div style={{ flexShrink: 0, marginLeft: 8 }}>
                                {isSelected ? (
                                  <CheckCircle2 size={16} color="var(--copper-bronze)" />
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--ash)', fontStyle: 'italic' }}>View</span>
                                )}
                              </div>
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
              {(() => {
                const selG = gauges.find((g: any) => g.id === selectedGaugeId);
                const selPo = pos.find((p: any) => p.id === expandedPoId);
                if (!selG && !selPo) return null;
                return (
                  <div className="hide-on-print" style={{
                    background: 'white', border: '1px solid var(--silk)', borderRadius: 10, padding: '16px 20px',
                    marginBottom: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--silk)', paddingBottom: 12, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)' }}>
                          {selG?.serialNumber || selG?.gaugeId || 'SN N/A'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, background: 'var(--linen)', color: 'var(--copper-bronze)' }}>
                          {selG?.gaugeTypeName || selG?.partName || 'Part'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--charcoal)', background: '#F5F3EE', padding: '4px 12px', borderRadius: 6 }}>
                        Customer: {selPo?.customerName || 'Internal / Stock'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 12, color: 'var(--slate)' }}>
                      <span><strong style={{ color: 'var(--charcoal)' }}>PO Number:</strong> {selPo?.poNumber || 'N/A'}</span>
                      {selPo?.status && <span><strong style={{ color: 'var(--charcoal)' }}>PO Status:</strong> {selPo.status}</span>}
                      {selG?.batchQuantity && <span><strong style={{ color: 'var(--charcoal)' }}>Batch Qty:</strong> {selG.batchQuantity} units</span>}
                      {selG?.currentLocation && <span><strong style={{ color: 'var(--charcoal)' }}>Location:</strong> {selG.currentLocation}</span>}
                      {selPo?.orderDate && <span><strong style={{ color: 'var(--charcoal)' }}>Order Date:</strong> {new Date(selPo.orderDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                );
              })()}

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
                      All Shifts ({subReports.length} Separate Sheets)
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
                  <SetupReportView gaugeId={selectedGaugeId!} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

