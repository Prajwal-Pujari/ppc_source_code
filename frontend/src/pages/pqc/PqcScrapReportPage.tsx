import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { pqcApi } from '@/api/pqc.api';
import { Trash2, AlertOctagon, Package, Box, User, Settings2, Crosshair, CalendarClock, MessageSquare, Check, X, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

export default function PqcScrapReportPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remarksValue, setRemarksValue] = useState('');
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedCustomer, setSelectedCustomer] = useState('All Customers');

  const tableRef = useRef<HTMLDivElement>(null);
  const isExporting = useRef(false);

  useEffect(() => {
    setPageTitle('Scrap Analysis & Details');
  }, [setPageTitle]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['pqc-scrap-report'],
    queryFn: () => pqcApi.getScrapReport(),
  });

  const saveRemarksMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) => pqcApi.updateScrapRemarks(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqc-scrap-report'] });
      setEditingId(null);
      toast.success('Reviewer remarks saved successfully');
    },
    onError: () => toast.error('Failed to save remarks')
  });

  const allScrapLogs = response?.data || [];

  // Derived filter options
  const monthOptions = ['All Months', ...Array.from(new Set(allScrapLogs.map((log: any) => {
    const d = new Date(log.logTime);
    return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
  })))];

  const customerOptions = ['All Customers', ...Array.from(new Set(allScrapLogs.map((log: any) => 
    log.gauge?.purchaseOrder?.customer?.name || 'Unknown Customer'
  )))];

  // Applied Filters
  const filteredLogs = allScrapLogs.filter((log: any) => {
    const d = new Date(log.logTime);
    const logMonth = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
    const logCustomer = log.gauge?.purchaseOrder?.customer?.name || 'Unknown Customer';

    const matchMonth = selectedMonth === 'All Months' || logMonth === selectedMonth;
    const matchCustomer = selectedCustomer === 'All Customers' || logCustomer === selectedCustomer;

    return matchMonth && matchCustomer;
  });

  const totalScrapIncidents = filteredLogs.length;
  const totalScrapQty = filteredLogs.reduce((acc: any, log: any) => acc + (log.scrapQty || 0), 0);
  const highestScrapLog = filteredLogs.reduce((prev: any, current: any) => (prev.scrapQty > current.scrapQty) ? prev : current, { scrapQty: 0 });

  const exportPdf = async () => {
    if (!tableRef.current || isExporting.current) return;
    isExporting.current = true;
    const loadingToast = toast.loading('Generating PDF...');
    
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
      pdf.save(`Scrap-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF Exported Successfully', { id: loadingToast });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export PDF', { id: loadingToast });
    } finally {
      isExporting.current = false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40, height: 'calc(100vh - var(--header-height) - 48px)' }}>
      
      {/* ━━━ Header Cards (Grounded & Minimal) ━━━ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
        {/* Incident Card */}
        <div style={{ background: 'var(--bone-white)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(201, 42, 42, 0.08)', color: '#C92A2A', border: '1px solid rgba(201, 42, 42, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertOctagon size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filtered Incidents</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--charcoal)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, marginTop: 4 }}>{totalScrapIncidents}</div>
          </div>
        </div>

        {/* Quantity Card */}
        <div style={{ background: 'var(--bone-white)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', border: '1px solid rgba(255, 59, 48, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filtered Scrapped Parts</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--status-rejected)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, marginTop: 4 }}>
              {totalScrapQty.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ash)', fontFamily: 'Inter, sans-serif' }}>parts</span>
            </div>
          </div>
        </div>

        {/* Max Scrap Card */}
        <div style={{ background: 'var(--bone-white)', borderRadius: 12, padding: '20px 24px', border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(139, 105, 20, 0.08)', color: 'var(--copper-bronze)', border: '1px solid rgba(139, 105, 20, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crosshair size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Largest Filtered Batch</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--charcoal)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, marginTop: 4 }}>{highestScrapLog.scrapQty || 0}</div>
            {highestScrapLog.gauge?.purchaseOrder?.poNumber && (
              <div style={{ fontSize: 11, color: 'var(--copper-bronze)', fontWeight: 600, marginTop: 4 }}>PO: {highestScrapLog.gauge.purchaseOrder.poNumber}</div>
            )}
          </div>
        </div>
      </div>

      {/* ━━━ Data Table & Filters ━━━ */}
      <div style={{ background: 'white', border: '1px solid var(--silk)', borderRadius: 12, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--silk)', background: 'var(--bone-white)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--charcoal)' }}>Detailed Scrap Registry</h2>
          </div>
          
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--silk)', outline: 'none', background: 'white', color: 'var(--charcoal)' }}
            >
              {(monthOptions as string[]).map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select 
              value={selectedCustomer} 
              onChange={e => setSelectedCustomer(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid var(--silk)', outline: 'none', background: 'white', color: 'var(--charcoal)' }}
            >
              {(customerOptions as string[]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={exportPdf} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>
        
        <div ref={tableRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'white' }}>
          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px', borderTopColor: 'var(--copper-bronze)' }}></div>
              <div style={{ color: 'var(--ash)', fontSize: 13, fontWeight: 500 }}>Synchronizing data...</div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--warm-white)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={32} style={{ color: 'var(--silk)' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--charcoal)' }}>No Scrap Recorded</div>
              <div style={{ fontSize: 13, color: 'var(--ash)', marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>No scrapped components match the selected filters.</div>
            </div>
          ) : (
            <div className="pqc-responsive-table-container" style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--cream)', boxShadow: '0 1px 0 var(--silk)' }}>
                  <tr style={{ color: 'var(--dust)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>Record Details</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>Part & Order</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>Operation & Machine</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>Scrap Qty</th>
                    <th style={{ padding: '12px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}>Defect Root Cause & Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log: any) => {
                    const poNumber = log.gauge?.purchaseOrder?.poNumber || 'N/A';
                    const partName = log.gauge?.gaugeTypeName || 'Unknown Part';
                    const customerName = log.gauge?.purchaseOrder?.customer?.name || 'Unknown Customer';
                    const operationName = log.gaugeOperation?.operationName || 'Unknown Operation';
                    const inspectorName = log.inspector?.fullName || 'Unknown';
                    const machineName = log.machine?.name || 'Manual Process';
                    const logDate = new Date(log.logTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
                    const reasons = log.rejectionReasons || [];

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--silk)', background: 'white' }}>
                        {/* Record Details */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }}>{logDate}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ash)' }}><User size={12} /> {inspectorName}</div>
                        </td>

                        {/* Part & Order */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--copper-bronze)', marginBottom: 4 }}>{partName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--charcoal)', fontWeight: 600 }}>{poNumber}</span>
                            <span style={{ fontSize: 10, color: 'var(--slate)', fontFamily: "'JetBrains Mono', monospace", background: 'var(--bone-white)', border: '1px solid var(--silk)', padding: '2px 6px', borderRadius: 4 }}>
                              S/N: {log.gauge?.serialNumber || 'No S/N'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 4 }}>{customerName}</div>
                        </td>

                        {/* Operation & Machine */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal)', marginBottom: 4 }}>{operationName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ash)' }}><Settings2 size={12} /> {machineName}</div>
                        </td>

                        {/* Scrap Qty */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'top', textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', background: 'var(--status-rejected-bg)', color: 'var(--status-rejected)', fontWeight: 700, padding: '4px 10px', borderRadius: 6, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", border: '1px solid rgba(255, 59, 48, 0.15)' }}>
                            {log.scrapQty}
                          </span>
                        </td>

                        {/* Defect Root Cause & Remarks */}
                        <td style={{ padding: '16px 20px', verticalAlign: 'top', width: '35%' }}>
                          {reasons.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {reasons.map((r: any, idx: number) => (
                                <div key={idx} data-html2canvas-ignore="true" style={{ background: 'var(--bone-white)', color: 'var(--charcoal)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-rejected)' }} />
                                  {r.reason} {r.count > 1 ? <span style={{ color: 'var(--ash)' }}>(x{r.count})</span> : ''}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--ash)', fontStyle: 'italic' }}>Unspecified Defect</span>
                          )}
                          
                          {/* Operator Remarks */}
                          {log.remarks && (
                            <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--silk)' }}>
                              <span style={{ fontWeight: 600, color: 'var(--ash)', display: 'block', marginBottom: 2 }}>Operator Note:</span>
                              "{log.remarks}"
                            </div>
                          )}

                          {/* Reviewer Remarks */}
                          <div style={{ marginTop: 12, borderTop: '1px dashed var(--silk)', paddingTop: 12 }}>
                            {editingId === log.id ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <textarea
                                  autoFocus
                                  value={remarksValue}
                                  onChange={(e) => setRemarksValue(e.target.value)}
                                  placeholder="Enter management review remarks..."
                                  style={{ flex: 1, padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid var(--copper-bronze)', outline: 'none', resize: 'vertical', minHeight: 40 }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <button
                                    onClick={() => saveRemarksMutation.mutate({ id: log.id, remarks: remarksValue })}
                                    disabled={saveRemarksMutation.isPending}
                                    style={{ background: 'var(--copper-bronze)', color: 'white', border: 'none', borderRadius: 4, padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    disabled={saveRemarksMutation.isPending}
                                    style={{ background: 'var(--bone-white)', color: 'var(--ash)', border: '1px solid var(--silk)', borderRadius: 4, padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => { setEditingId(log.id); setRemarksValue(log.reviewerRemarks || ''); }}
                                style={{ 
                                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px', 
                                  background: log.reviewerRemarks ? 'rgba(139, 105, 20, 0.05)' : 'var(--bone-white)', 
                                  border: log.reviewerRemarks ? '1px solid rgba(139, 105, 20, 0.2)' : '1px dashed var(--silk)', 
                                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                              >
                                <MessageSquare size={14} style={{ color: log.reviewerRemarks ? 'var(--copper-bronze)' : 'var(--ash)', marginTop: 2, flexShrink: 0 }} />
                                <div style={{ flex: 1, fontSize: 11, color: log.reviewerRemarks ? 'var(--charcoal)' : 'var(--ash)' }}>
                                  {log.reviewerRemarks ? (
                                    <>
                                      <span style={{ fontWeight: 700, color: 'var(--copper-bronze)', display: 'block', marginBottom: 2 }}>Management Review:</span>
                                      {log.reviewerRemarks}
                                    </>
                                  ) : (
                                    'Add Management Review...'
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
