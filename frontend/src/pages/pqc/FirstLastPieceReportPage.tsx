import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  FileText,
  Download,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Package,
  Loader2,
  X,
  ShieldCheck,
  Sparkles,
  Flag,
  FileSpreadsheet,
  Layers,
  Eye,
  Award,
  Calendar,
  Building2,
  Table
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { pqcApi } from '@/api/pqc.api';
import { useUiStore } from '@/store/uiStore';
import toast from 'react-hot-toast';
import FirstLastPieceReportView from './reports/FirstLastPieceReportView';

export default function FirstLastPieceReportPage() {
  const setPageTitle = useUiStore((s: any) => s.setPageTitle);
  useEffect(() => {
    setPageTitle('1st & Last Piece Report');
  }, [setPageTitle]);

  // Sidebar & Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sub-report & View Mode
  const [subReportFilter, setSubReportFilter] = useState<'ALL' | 'FIRST_PIECE' | 'LAST_PIECE'>('ALL');
  const [viewMode, setViewMode] = useState<'REPORT' | 'TABLE'>('REPORT');

  // Historical Table Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIRST_PIECE' | 'LAST_PIECE'>('ALL');
  const [tableSearch, setTableSearch] = useState('');

  const [isExporting, setIsExporting] = useState<'view' | 'download' | false>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch all Purchase Orders
  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['report-pos', searchTerm],
    queryFn: async () => {
      const res = await getPurchaseOrders({ page: 0, size: 50, search: searchTerm || undefined });
      return res.data?.content ?? [];
    },
  });

  // Fetch Gauges (Parts) for the expanded PO
  const { data: gauges = [], isLoading: gaugesLoading } = useQuery({
    queryKey: ['report-gauges', expandedPoId],
    queryFn: async () => {
      const res = await getPurchaseOrderGauges(expandedPoId!);
      return res.data ?? [];
    },
    enabled: !!expandedPoId,
  });

  // Fetch all piece inspections for historical table & quick actions
  const { data: allPieceLogsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['all-piece-inspections-raw'],
    queryFn: () => pqcApi.getPieceInspections(),
    refetchInterval: 30000,
  });

  const allLogs: any[] = allPieceLogsRes?.data || [];

  // Auto-expand first PO if only one result
  useEffect(() => {
    if (searchTerm && pos.length === 1 && !expandedPoId) {
      setExpandedPoId(pos[0].id);
    }
  }, [pos, searchTerm, expandedPoId]);

  // If logs exist and no gauge selected, auto-select the latest inspected gauge
  useEffect(() => {
    if (!selectedGaugeId && allLogs.length > 0) {
      const firstValidGaugeId = allLogs[0]?.gauge?.id;
      if (firstValidGaugeId) {
        setSelectedGaugeId(firstValidGaugeId);
        const poId = allLogs[0]?.gauge?.purchaseOrder?.id;
        if (poId && !expandedPoId) {
          setExpandedPoId(poId);
        }
      }
    }
  }, [allLogs, selectedGaugeId, expandedPoId]);

  const handleTogglePo = (poId: string) => {
    setExpandedPoId(expandedPoId === poId ? null : poId);
  };

  // Find currently selected gauge & PO metadata
  const selectedGauge = useMemo(() => {
    if (!selectedGaugeId) return null;
    const fromGauges = gauges.find((g: any) => g.id === selectedGaugeId);
    if (fromGauges) return fromGauges;
    const fromLogs = allLogs.find((l: any) => l.gauge?.id === selectedGaugeId)?.gauge;
    return fromLogs || null;
  }, [selectedGaugeId, gauges, allLogs]);

  const selectedPo = useMemo(() => {
    if (selectedGauge?.purchaseOrder) return selectedGauge.purchaseOrder;
    if (expandedPoId) return pos.find((p: any) => p.id === expandedPoId);
    return null;
  }, [selectedGauge, expandedPoId, pos]);

  // Filtered logs for the historical table view
  const filteredTableLogs = useMemo(() => {
    return allLogs.filter((log: any) => {
      const matchType = typeFilter === 'ALL' || log.inspectionType === typeFilter;
      const isFailed = log.rejectedQty > 0 || log.isEscalated;
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PASSED' && !isFailed) ||
        (statusFilter === 'FAILED' && isFailed);

      if (!matchType || !matchStatus) return false;

      if (!tableSearch) return true;
      const term = tableSearch.toLowerCase();
      const poNum = (log.gauge?.purchaseOrder?.orderNumber || log.gauge?.purchaseOrder?.poNumber || '').toLowerCase();
      const cust = (log.gauge?.purchaseOrder?.customer?.name || log.gauge?.purchaseOrder?.customerName || '').toLowerCase();
      const part = (log.gauge?.partName || log.gauge?.gaugeTypeName || '').toLowerCase();
      const op = (log.gaugeOperation?.operationName || '').toLowerCase();
      const inspector = (log.inspector?.fullName || '').toLowerCase();
      const machine = (log.machine?.name || '').toLowerCase();

      return (
        poNum.includes(term) ||
        cust.includes(term) ||
        part.includes(term) ||
        op.includes(term) ||
        inspector.includes(term) ||
        machine.includes(term)
      );
    });
  }, [allLogs, typeFilter, statusFilter, tableSearch]);

  // Export PDF function (matching SetupReportView & InProcessReportView)
  const exportPdf = async (action: 'view' | 'download') => {
    if (!reportRef.current) return;
    setIsExporting(action);
    const toastId = toast.loading(action === 'download' ? 'Generating PDF for download...' : 'Preparing PDF preview...');

    try {
      const original = reportRef.current;
      const clone = original.cloneNode(true) as HTMLElement;

      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '1123px'; // A4 landscape at standard DPI
      clone.style.maxWidth = 'none';
      clone.style.height = 'auto';
      clone.style.transform = 'none';

      clone.querySelectorAll('*').forEach((el) => {
        const div = el as HTMLElement;
        const style = window.getComputedStyle(div);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll' || style.overflow === 'hidden' || div.style.overflowX === 'auto') {
          div.style.overflowX = 'visible';
          div.style.overflow = 'visible';
        }
      });

      document.body.appendChild(clone);

      const pages = clone.querySelectorAll('.pdf-page');
      const html2canvasFn = typeof html2canvas === 'function' ? html2canvas : (html2canvas as any).default;
      const pdf = new jsPDF('p', 'mm', 'a4'); // Portrait standard certificate
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          pageEl.style.display = 'block';

          const canvas = await html2canvasFn(pageEl, {
            scale: 2,
            useCORS: true,
            windowWidth: 1123,
            scrollX: 0,
            scrollY: 0,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');

          let imgHeight = (canvas.height * pdfWidth) / canvas.width;
          let finalWidth = pdfWidth;
          let xOffset = 0;

          if (imgHeight > pdfHeight) {
            finalWidth = (canvas.width * pdfHeight) / canvas.height;
            imgHeight = pdfHeight;
            xOffset = (pdfWidth - finalWidth) / 2;
          }

          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, imgHeight);
        }
      } else {
        const canvas = await html2canvasFn(clone, { scale: 2, useCORS: true, windowWidth: clone.scrollWidth });
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      }

      const fileName = `Piece_Inspection_Report_${selectedGauge?.partName || 'Part'}_${new Date().toISOString().slice(0, 10)}.pdf`;

      if (action === 'download') {
        pdf.save(fileName);
        toast.success('Report PDF downloaded successfully!', { id: toastId });
      } else {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        toast.success('PDF opened in preview tab!', { id: toastId });
      }

      document.body.removeChild(clone);
    } catch (e) {
      console.error('PDF export error:', e);
      toast.error('Failed to generate PDF: ' + String(e), { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredTableLogs.length === 0) {
      toast.error('No inspection records to export');
      return;
    }

    const headers = [
      'Date & Time',
      'Inspection Type',
      'PO Number',
      'Customer',
      'Part Name',
      'Serial Number',
      'Operation',
      'Machine',
      'Shift',
      'Inspector',
      'Verdict',
      'Remarks'
    ];

    const rows = filteredTableLogs.map((log: any) => {
      const isFailed = log.rejectedQty > 0 || log.isEscalated;
      return [
        `"${new Date(log.logTime).toLocaleString()}"`,
        `"${log.inspectionType}"`,
        `"${log.gauge?.purchaseOrder?.orderNumber || 'N/A'}"`,
        `"${log.gauge?.purchaseOrder?.customer?.name || 'N/A'}"`,
        `"${log.gauge?.partName || 'N/A'}"`,
        `"${log.gauge?.serialNumber || 'N/A'}"`,
        `"${log.gaugeOperation?.operationName || 'N/A'}"`,
        `"${log.machine?.name || 'N/A'}"`,
        `"${log.shift?.name || 'N/A'}"`,
        `"${log.inspector?.fullName || 'N/A'}"`,
        `"${isFailed ? 'FAILED' : 'PASSED'}"`,
        `"${(log.remarks || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `1st_last_piece_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported to CSV successfully');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bone-white, #FAF8F5)' }}>
      {/* ─── Top Control Header ─── */}
      <div
        className="hide-on-print"
        style={{
          padding: '16px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--silk, #E8E2D9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              height: 38,
              width: 38,
              borderRadius: 8,
              backgroundColor: 'var(--linen, #EEE9E1)',
              border: '1px solid var(--silk, #E8E2D9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--copper-bronze, #8B6914)',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--charcoal, #1C1A18)' }}>
              1st &amp; Last Piece Quality Report
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ash, #8C857D)' }}>
              Setup validation &amp; shift-end closure report documents matching standard quality certificates
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--linen, #EEE9E1)',
              padding: 3,
              borderRadius: 6,
              border: '1px solid var(--silk, #E8E2D9)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('REPORT')}
              style={{
                padding: '6px 12px',
                borderRadius: 5,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewMode === 'REPORT' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'REPORT' ? 'var(--charcoal, #1C1A18)' : 'var(--slate, #4A4540)',
                boxShadow: viewMode === 'REPORT' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <FileText size={14} />
              Report View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '6px 12px',
                borderRadius: 5,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: viewMode === 'TABLE' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'TABLE' ? 'var(--charcoal, #1C1A18)' : 'var(--slate, #4A4540)',
                boxShadow: viewMode === 'TABLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Table size={14} />
              All Historical Logs
            </button>
          </div>

          {viewMode === 'REPORT' && selectedGaugeId && (
            <>
              <button
                type="button"
                onClick={() => exportPdf('view')}
                disabled={!!isExporting}
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: '1px solid var(--stone, #C8C2B8)',
                  background: '#FFFFFF',
                  color: 'var(--charcoal, #1C1A18)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isExporting === 'view' ? <Loader2 size={14} className="spin" /> : <Eye size={14} />}
                View PDF
              </button>

              <button
                type="button"
                onClick={() => exportPdf('download')}
                disabled={!!isExporting}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--copper-bronze, #8B6914)',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                {isExporting === 'download' ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                Download PDF
              </button>
            </>
          )}

          {viewMode === 'TABLE' && (
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: '1px solid var(--silk, #E8E2D9)',
                backgroundColor: '#FFFFFF',
                color: 'var(--charcoal, #1C1A18)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FileSpreadsheet size={14} style={{ color: '#2E7D32' }} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Split (PO Sidebar + Report Area) ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ─── Left Sidebar: PO & Parts Hierarchy (Matching Setup Report) ─── */}
        <div
          className="hide-on-print"
          style={{
            width: 330,
            minWidth: 330,
            background: '#FFFFFF',
            borderRight: '1px solid var(--silk, #E8E2D9)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Search Box */}
          <div style={{ padding: '14px 16px 10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ash, #8C857D)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter POs or Customers..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 6,
                  border: '1px solid var(--stone, #C8C2B8)',
                  fontSize: 12,
                  outline: 'none',
                  background: 'var(--bone-white, #FAF8F5)',
                }}
              />
            </div>
          </div>

          {/* PO List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {posLoading && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--ash, #8C857D)', fontSize: 12 }}>
                Loading Purchase Orders...
              </div>
            )}

            {!posLoading && pos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--ash, #8C857D)' }}>
                <Package size={26} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <p style={{ fontSize: 12, margin: 0 }}>No purchase orders found.</p>
              </div>
            )}

            {pos.map((po: any) => {
              const isExpanded = expandedPoId === po.id;

              return (
                <div key={po.id}>
                  {/* PO Row Header */}
                  <button
                    type="button"
                    onClick={() => handleTogglePo(po.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--linen, #EEE9E1)' : '#FFFFFF',
                      border: '1px solid var(--silk, #E8E2D9)',
                      borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                      textAlign: 'left',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                      <Package size={16} color="var(--copper-bronze, #8B6914)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                            {po.poNumber || po.orderNumber}
                          </span>
                          {po.status && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                padding: '2px 5px',
                                borderRadius: 4,
                                background: '#EAE8E1',
                                color: 'var(--charcoal, #1C1A18)',
                              }}
                            >
                              {po.status}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--copper-bronze, #8B6914)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {po.customerName || po.customer?.name || 'Internal / Stock'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--slate, #4A4540)', marginTop: 2 }}>
                          Parts: {po.completedGauges || 0}/{po.totalGauges || 0}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      {isExpanded ? <ChevronDown size={14} color="var(--ash, #8C857D)" /> : <ChevronRight size={14} color="var(--ash, #8C857D)" />}
                    </div>
                  </button>

                  {/* Child Parts / Gauges */}
                  {isExpanded && (
                    <div
                      style={{
                        background: 'var(--warm-white, #F5F2ED)',
                        border: '1px solid var(--silk, #E8E2D9)',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      {gaugesLoading ? (
                        <div style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                          Loading parts...
                        </div>
                      ) : gauges.length === 0 ? (
                        <div style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                          No parts in this PO.
                        </div>
                      ) : (
                        gauges.map((g: any) => {
                          const isSelected = selectedGaugeId === g.id;

                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => {
                                setSelectedGaugeId(g.id);
                                setViewMode('REPORT');
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                borderRadius: 6,
                                border: isSelected ? '1.5px solid var(--copper-bronze, #8B6914)' : '1px solid var(--silk, #E8E2D9)',
                                background: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                gap: 8,
                                boxShadow: isSelected ? '0 1px 4px rgba(139,105,20,0.12)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
                                <Award size={14} color={isSelected ? 'var(--copper-bronze, #8B6914)' : 'var(--ash, #8C857D)'} style={{ flexShrink: 0 }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {g.partName || g.gaugeTypeName || 'Part'}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                                    {g.serialNumber || 'SN N/A'} &bull; {g.batchQuantity || 0} pcs
                                  </div>
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 size={14} color="var(--copper-bronze, #8B6914)" />}
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

        {/* ─── Right Area: Report Document or Historical Table ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {viewMode === 'REPORT' ? (
            selectedGaugeId ? (
              <div style={{ maxWidth: 1050, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Part Header & Sub-Report Switcher */}
                <div
                  className="hide-on-print"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--silk, #E8E2D9)',
                    borderRadius: 8,
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal, #1C1A18)' }}>
                        {selectedGauge?.partName || 'Selected Part'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                        PO: {selectedPo?.poNumber || selectedPo?.orderNumber || 'N/A'} &bull; Customer: {selectedPo?.customerName || selectedPo?.customer?.name || 'Customer'}
                      </div>
                    </div>
                  </div>

                  {/* Sub-report Tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(
                      [
                        { id: 'ALL', label: 'All Sessions' },
                        { id: 'FIRST_PIECE', label: '1st Piece (Setup)' },
                        { id: 'LAST_PIECE', label: 'Last Piece (Closure)' },
                      ] as const
                    ).map((tab) => {
                      const isActive = subReportFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSubReportFilter(tab.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isActive ? '1px solid var(--copper-bronze, #8B6914)' : '1px solid var(--silk, #E8E2D9)',
                            backgroundColor: isActive ? 'var(--copper-light, #FBF4E8)' : '#FFFFFF',
                            color: isActive ? 'var(--copper-dark, #6F5100)' : 'var(--slate, #4A4540)',
                          }}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* The Report Document inside ref for PDF capture */}
                <div ref={reportRef} style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderRadius: 8, overflow: 'hidden' }}>
                  <FirstLastPieceReportView
                    gaugeId={selectedGaugeId}
                    gaugeData={selectedGauge}
                    subReportFilter={subReportFilter}
                  />
                </div>
              </div>
            ) : (
              /* No Part Selected Empty State */
              <div
                style={{
                  maxWidth: 680,
                  margin: '60px auto',
                  padding: 48,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid var(--silk, #E8E2D9)',
                  textAlign: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: 'var(--linen, #EEE9E1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--copper-bronze, #8B6914)',
                  }}
                >
                  <Award size={28} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', margin: '0 0 8px' }}>
                  Select a Part to Generate 1st &amp; Last Piece Quality Report
                </h2>
                <p style={{ fontSize: 13, color: 'var(--ash, #8C857D)', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.5 }}>
                  Select a Purchase Order and Part from the left panel to display the official certificate report with parameter specifications and measurements.
                </p>

                {allLogs.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash, #8C857D)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Recent Inspected Parts Available:
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      {Array.from(new Set(allLogs.map((l) => l.gauge?.id).filter(Boolean)))
                        .slice(0, 4)
                        .map((gId) => {
                          const sample = allLogs.find((l) => l.gauge?.id === gId)?.gauge;
                          if (!sample) return null;
                          return (
                            <button
                              key={gId}
                              type="button"
                              onClick={() => {
                                setSelectedGaugeId(gId);
                                if (sample.purchaseOrder?.id) setExpandedPoId(sample.purchaseOrder.id);
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: '1px solid var(--silk, #E8E2D9)',
                                backgroundColor: 'var(--bone-white, #FAF8F5)',
                                color: 'var(--charcoal, #1C1A18)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <ShieldCheck size={13} color="var(--copper-bronze, #8B6914)" />
                              <span>{sample.partName || sample.gaugeTypeName || 'Part'}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            /* ─── Historical Table Mode ─── */
            <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Filter Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  backgroundColor: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: 8,
                  border: '1px solid var(--silk, #E8E2D9)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'var(--bone-white, #FAF8F5)',
                      borderRadius: 6,
                      padding: '6px 12px',
                      border: '1px solid var(--silk, #E8E2D9)',
                      minWidth: 260,
                    }}
                  >
                    <Search size={14} style={{ color: 'var(--ash, #8C857D)' }} />
                    <input
                      type="text"
                      placeholder="Search PO, Customer, Part, Machine..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, width: '100%' }}
                    />
                  </div>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: 'var(--bone-white, #FAF8F5)',
                    }}
                  >
                    <option value="ALL">All Piece Types</option>
                    <option value="FIRST_PIECE">1st Piece (Setup)</option>
                    <option value="LAST_PIECE">Last Piece (Closure)</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--silk, #E8E2D9)',
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: 'var(--bone-white, #FAF8F5)',
                    }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PASSED">Passed Only</option>
                    <option value="FAILED">Failed / NC Escalated</option>
                  </select>
                </div>

                <span style={{ fontSize: 12, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                  Showing {filteredTableLogs.length} record{filteredTableLogs.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Table Container */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 8,
                  border: '1px solid var(--silk, #E8E2D9)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--linen, #EEE9E1)',
                        borderBottom: '1px solid var(--silk, #E8E2D9)',
                        color: 'var(--charcoal, #1C1A18)',
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <th style={{ padding: '12px 16px' }}>Date &amp; Time</th>
                      <th style={{ padding: '12px 16px' }}>Type</th>
                      <th style={{ padding: '12px 16px' }}>PO &amp; Customer</th>
                      <th style={{ padding: '12px 16px' }}>Part &amp; Serial</th>
                      <th style={{ padding: '12px 16px' }}>Operation</th>
                      <th style={{ padding: '12px 16px' }}>Machine &amp; Shift</th>
                      <th style={{ padding: '12px 16px' }}>Inspector</th>
                      <th style={{ padding: '12px 16px' }}>Verdict</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--ash, #8C857D)' }}>
                          Loading piece inspection logs...
                        </td>
                      </tr>
                    ) : filteredTableLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 32, textAlign: 'center', color: 'var(--ash, #8C857D)' }}>
                          No matching piece inspection logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredTableLogs.map((log: any) => {
                        const isFp = log.inspectionType === 'FIRST_PIECE';
                        const isFailed = log.rejectedQty > 0 || log.isEscalated;
                        const dateStr = new Date(log.logTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr
                            key={log.id}
                            style={{ borderBottom: '1px solid var(--silk, #E8E2D9)', transition: 'background-color 0.15s ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bone-white, #FAF8F5)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--charcoal, #1C1A18)', whiteSpace: 'nowrap' }}>
                              {dateStr}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 5,
                                  backgroundColor: isFp ? '#DBEAFE' : '#FEF3C7',
                                  color: isFp ? '#1E40AF' : '#92400E',
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                {isFp ? <Sparkles size={11} /> : <Flag size={11} />}
                                {isFp ? '1ST PIECE' : 'LAST PIECE'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
                                {log.gauge?.purchaseOrder?.orderNumber || log.gauge?.purchaseOrder?.poNumber || 'N/A'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                                {log.gauge?.purchaseOrder?.customer?.name || 'Customer'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--charcoal, #1C1A18)' }}>
                                {log.gauge?.partName || 'Part'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                                {log.gauge?.serialNumber || 'SN N/A'}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate, #4A4540)' }}>
                              {log.gaugeOperation?.operationName || 'Operation'}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--slate, #4A4540)' }}>
                              <div>{log.machine?.name || 'M/C N/A'}</div>
                              <div style={{ color: 'var(--ash, #8C857D)' }}>{log.shift?.name || 'Shift'}</div>
                            </td>
                            <td style={{ padding: '12px 16px', color: 'var(--slate, #4A4540)' }}>
                              {log.inspector?.fullName || 'Inspector'}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  color: isFailed ? '#DC2626' : '#15803D',
                                  backgroundColor: isFailed ? '#FEE2E2' : '#DCFCE7',
                                  fontFamily: "'JetBrains Mono', monospace",
                                }}
                              >
                                {isFailed ? 'FAILED' : 'PASSED'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (log.gauge?.id) {
                                    setSelectedGaugeId(log.gauge.id);
                                    if (log.gauge?.purchaseOrder?.id) setExpandedPoId(log.gauge.purchaseOrder.id);
                                    setViewMode('REPORT');
                                  }
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--silk, #E8E2D9)',
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--copper-bronze, #8B6914)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Eye size={12} />
                                View Report
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
