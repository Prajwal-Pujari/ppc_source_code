import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Printer, ChevronRight, ChevronDown, Package, Loader2, Download, Sparkles, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { reportsApi } from '@/api/reports.api';
import SetupReportView from './reports/SetupReportView';
import InProcessReportView from './reports/InProcessReportView';
import PdirReportView from './reports/PdirReportView';
import { reportConfigApi, type ReportConfiguration } from '@/api/reportConfig.api';

import { JobCardDossierView } from '@/components/ui/JobCardDossierView';

import { Calendar } from 'lucide-react';

const formatReportDate = (dInput: any): string => {
  if (!dInput) return '';
  const str = String(dInput).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
  }
  const d = new Date(dInput);
  if (isNaN(d.getTime())) return str;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

function GaugeDossier({ gaugeId, reportConfig }: { gaugeId: string, reportConfig: any }) {
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('ALL');

  const { data: reportData } = useQuery({
    queryKey: ['pqc-report', gaugeId, 'IN_PROCESS'],
    queryFn: async () => {
      const res = await reportsApi.getReportByGauge(gaugeId, 'IN_PROCESS');
      return res.data ?? null;
    }
  });

  const { data: pdirData } = useQuery({
    queryKey: ['pqc-report', gaugeId, 'PDIR'],
    queryFn: async () => {
      const res = await reportsApi.getReportByGauge(gaugeId, 'PDIR');
      return res.data ?? null;
    }
  });

  // Extract distinct Day + Shift sessions so reports are never clubbed
  const sessions = React.useMemo(() => {
    if (!reportData?.operations) return [];
    const map = new Map<string, {
      key: string;
      dateStr: string;
      shiftName: string;
      firstLogTime: number;
      batchCount: number;
      inspectorNames: Set<string>;
      machineNames: Set<string>;
    }>();

    reportData.operations.forEach((op: any) => {
      op.batches?.forEach((b: any) => {
        const dateStr = formatReportDate(b.logTime);
        const shiftName = b.shiftName || 'Standard Shift';
        const key = `${dateStr}__${shiftName}`;
        const logEpoch = new Date(b.logTime).getTime();

        if (!map.has(key)) {
          map.set(key, {
            key,
            dateStr,
            shiftName,
            firstLogTime: isNaN(logEpoch) ? 0 : logEpoch,
            batchCount: 1,
            inspectorNames: new Set(b.inspectorName ? [b.inspectorName] : []),
            machineNames: new Set(b.machineName ? [b.machineName] : [])
          });
        } else {
          const item = map.get(key)!;
          item.batchCount++;
          if (b.inspectorName) item.inspectorNames.add(b.inspectorName);
          if (b.machineName) item.machineNames.add(b.machineName);
          if (!isNaN(logEpoch) && logEpoch < item.firstLogTime) {
            item.firstLogTime = logEpoch;
          }
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => a.firstLogTime - b.firstLogTime);
  }, [reportData]);

  // Build clean independent report strictly for a specific session
  const getSessionReport = (session: typeof sessions[0]) => {
    const dataClone = JSON.parse(JSON.stringify(reportData)) as any;

    let matchedApproval = undefined;
    if (dataClone.approvals) {
      matchedApproval = dataClone.approvals.find(
        (a: any) =>
          (a.inspectionDate === session.dateStr || formatReportDate(a.inspectionDate) === session.dateStr) &&
          (!a.shiftName || a.shiftName === session.shiftName)
      ) || dataClone.approvals.find(
        (a: any) => a.inspectionDate === session.dateStr || formatReportDate(a.inspectionDate) === session.dateStr
      );
    }

    dataClone.operations = (dataClone.operations || []).map((op: any) => {
      const filteredBatches = (op.batches || []).filter((b: any) => {
        const d = formatReportDate(b.logTime);
        const s = b.shiftName || 'Standard Shift';
        return d === session.dateStr && s === session.shiftName;
      });
      return {
        ...op,
        batches: filteredBatches
      };
    }).filter((op: any) => op.batches && op.batches.length > 0);

    return { sessionReport: dataClone, matchedApproval };
  };

  const hasInProcess = sessions.length > 0 || (reportData && reportData.operations && reportData.operations.length > 0);
  const hasPdir = pdirData && pdirData.operations && pdirData.operations.length > 0;
  const isInspectionDone = reportData?.isInspectionCompleted ?? (
    reportData?.gaugeStatus === 'COMPLETED' ||
    (reportData?.operations && reportData.operations.length > 0 &&
      reportData.operations.every((op: any) => op.operationStatus === 'COMPLETED'))
  );

  const sessionsToRender = selectedSessionKey === 'ALL'
    ? sessions
    : sessions.filter(s => s.key === selectedSessionKey);

  return (
    <div style={{ marginBottom: 60, paddingBottom: 40, borderBottom: '2px dashed var(--stone)' }}>
      <div style={{ marginBottom: 40 }}>
        <JobCardDossierView gaugeId={gaugeId} />
      </div>
      <div style={{ marginBottom: 24 }}>
        <SetupReportView gaugeId={gaugeId} hideIfEmpty={true} />
      </div>

      {/* In-Process Inspection Reports: Day-wise & Shift-wise Separation */}
      {sessions.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          {/* Shift Session Selector Pills (Only shown when multiple sessions exist) */}
          {sessions.length > 1 && (
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
              padding: '12px 16px',
              background: 'white',
              borderRadius: 8,
              border: '1px solid var(--silk)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--midnight)', display: 'flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
                <Calendar size={14} color="var(--copper-bronze)" />
                Shift Reports ({sessions.length}):
              </span>
              <button
                type="button"
                onClick={() => setSelectedSessionKey('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedSessionKey === 'ALL' ? '1.5px solid var(--copper-bronze)' : '1px solid var(--stone)',
                  background: selectedSessionKey === 'ALL' ? 'var(--copper-bronze)' : 'white',
                  color: selectedSessionKey === 'ALL' ? 'white' : 'var(--slate)',
                  transition: 'all 0.15s'
                }}
              >
                All Shifts ({sessions.length} Separate Sheets)
              </button>
              {sessions.map(s => {
                const isSelected = selectedSessionKey === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSelectedSessionKey(s.key)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid var(--copper-bronze)' : '1px solid var(--stone)',
                      background: isSelected ? 'var(--copper-bronze)' : 'white',
                      color: isSelected ? 'white' : 'var(--slate)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {s.dateStr} • {s.shiftName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Render Each Day + Shift As An Independent Certificate */}
          {sessionsToRender.map((session, sIdx) => {
            const { sessionReport, matchedApproval } = getSessionReport(session);
            return (
              <div key={session.key} style={{ marginTop: sIdx > 0 ? 36 : 0, marginBottom: 24 }}>
                {sessions.length > 1 && (
                  <div className="no-print" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'var(--linen)',
                    border: '1px solid var(--sand-dark)',
                    borderRadius: 8,
                    marginBottom: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Calendar size={15} color="var(--copper-bronze)" />
                      <strong style={{ fontSize: 13, color: 'var(--midnight)' }}>
                        Shift Session {sessions.indexOf(session) + 1} of {sessions.length}: {session.dateStr}
                      </strong>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'white',
                        border: '1px solid var(--stone)',
                        fontWeight: 600,
                        color: 'var(--copper-bronze)'
                      }}>
                        {session.shiftName}
                      </span>
                      {session.inspectorNames.size > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--slate)' }}>
                          Inspector: <strong style={{ color: 'var(--charcoal)' }}>{Array.from(session.inspectorNames).join(', ')}</strong>
                        </span>
                      )}
                      {session.machineNames.size > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--slate)' }}>
                          M/C: <strong style={{ color: 'var(--charcoal)' }}>{Array.from(session.machineNames).join(', ')}</strong>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--charcoal)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {session.batchCount} inspection slot{session.batchCount > 1 ? 's' : ''} logged
                    </span>
                  </div>
                )}
                <InProcessReportView
                  data={sessionReport}
                  config={{ ...reportConfig, activeApproval: matchedApproval }}
                />
              </div>
            );
          })}
        </div>
      ) : (hasInProcess && reportData) ? (
        <div style={{ marginTop: 24 }}>
          <InProcessReportView data={reportData} config={reportConfig} />
        </div>
      ) : null}

      {/* PDIR Report */}
      {hasPdir && (
        isInspectionDone ? (
          <div style={{ marginTop: 28 }}>
            <PdirReportView data={pdirData} config={reportConfig} />
          </div>
        ) : (
          <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bone-white)', border: '1px dashed var(--stone)', borderRadius: 8, fontSize: 13, color: 'var(--slate)' }}>
            <strong>PDIR (Pre-Dispatch Inspection Report):</strong> Pending completion of in-process inspections across all operations.
          </div>
        )
      )}

      {!hasInProcess && !hasPdir && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ash)', fontStyle: 'italic', fontSize: 13 }}>
          * No In-Process or PDIR inspection records found for this part.
        </div>
      )}
    </div>
  );
}

export default function PqcMasterDossierPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null);

  useEffect(() => {
    reportConfigApi.get().then(res => setReportConfig(res.data)).catch(console.error);
  }, []);

  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['completed-pos', searchTerm],
    queryFn: async () => {
      const res = await getPurchaseOrders({ page: 0, size: 50, search: searchTerm || undefined });
      return res.data?.content ?? [];
    },
  });

  const { data: aiSummary, isLoading: aiLoading } = useQuery({
    queryKey: ['dossier-summary', selectedPoId],
    queryFn: async () => {
      if (!selectedPoId) return null;
      const res = await reportsApi.getDossierSummary(selectedPoId);
      return res.data ?? null;
    },
    enabled: !!selectedPoId
  });

  const { data: gauges = [], isLoading: gaugesLoading } = useQuery({
    queryKey: ['report-gauges', selectedPoId],
    queryFn: async () => {
      const res = await getPurchaseOrderGauges(selectedPoId!);
      return res.data ?? [];
    },
    enabled: !!selectedPoId,
  });

  const [activeTab, setActiveTab] = useState<'dossier' | 'summary'>('dossier');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const dossierRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setActiveTab('dossier');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    if (!dossierRef.current || isGeneratingPdf || !selectedPoId) return;
    
    try {
      setIsGeneratingPdf(true);
      setActiveTab('dossier');
      
      // Wait a tiny bit to ensure DOM updates and any hover states are cleared
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const el = dossierRef.current;
      
      const sections = Array.from(el.querySelectorAll('.pdf-page-section, .pdf-page')) as HTMLElement[];
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const portraitW = pdf.internal.pageSize.getWidth(); // ~210
      const portraitH = pdf.internal.pageSize.getHeight(); // ~297
      
      let pageAdded = false;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        // Skip empty sections
        if (section.offsetHeight < 10) continue;
        
        const canvas = await html2canvas(section, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#FFFFFF',
          logging: false
        });
        
        const isLandscape = canvas.width > canvas.height * 1.1; // Add 10% tolerance
        const orientation = isLandscape ? 'landscape' : 'portrait';
        const pageW = isLandscape ? portraitH : portraitW;
        const pageH = isLandscape ? portraitW : portraitH;
        
        if (pageAdded) {
          pdf.addPage('a4', orientation);
        }
        
        const imgData = canvas.toDataURL('image/png');
        const imgH = (canvas.height * pageW) / canvas.width;
        
        let heightLeft = imgH;
        let position = 0;

        // Add first page of this section
        pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH);
        heightLeft -= pageH;

        // If the section is taller than one A4 page, slice it into additional pages (maintaining orientation)
        while (heightLeft > 0) {
          position -= pageH; // Shift the image up by one page height
          pdf.addPage('a4', orientation);
          pdf.addImage(imgData, 'PNG', 0, position, pageW, imgH);
          heightLeft -= pageH;
        }
        
        pageAdded = true;
      }
      const poObj = pos.find((p: any) => p.id === selectedPoId);
      pdf.save(`Master_Quality_Dossier_${poObj?.poNumber || selectedPoId}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="module-page" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div className={isMobileDrawerOpen ? "po-drawer-overlay open" : "po-drawer-overlay"} onClick={() => setIsMobileDrawerOpen(false)} />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          body, html { background: white !important; }
          @page { size: auto; margin: 10mm; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="module-header no-print" style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--midnight)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={24} color="var(--copper-bronze)" />
            Master Quality Dossier
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: 13 }}>
            Complete Day-wise and Shift-wise printable quality dossier for completed orders.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="btn btn-secondary mobile-only"
            style={{ padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            Select PO
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={!selectedPoId || isGeneratingPdf}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
              opacity: (!selectedPoId || isGeneratingPdf) ? 0.7 : 1,
              cursor: (!selectedPoId || isGeneratingPdf) ? 'not-allowed' : 'pointer'
            }}
          >
            {isGeneratingPdf ? (
              <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--copper-bronze)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Download size={16} />
            )}
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedPoId}
            style={{
              padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              background: selectedPoId ? 'var(--copper-bronze)' : 'var(--warm-white)', 
              color: selectedPoId ? 'white' : 'var(--ash)', border: 'none', cursor: selectedPoId ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Printer size={16} /> Print Full Dossier
          </button>
        </div>
      </div>

      <div className="mobile-stack" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div className={`no-print po-sidebar-drawer ${isMobileDrawerOpen ? 'open' : ''}`} style={{ width: 320, background: 'white', borderRight: '1px solid var(--silk)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--ash)" style={{ position: 'absolute', left: 12, top: 10 }} />
              <input
                type="text"
                placeholder="Search completed POs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px 8px 36px',
                  borderRadius: 6, border: '1px solid var(--stone)', fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
            {posLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ash)' }}>Loading orders...</div>
            ) : pos.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ash)' }}>No completed orders found.</div>
            ) : (
              pos.map((po: any) => {
                const isSelected = selectedPoId === po.id;
                return (
                  <button
                    key={po.id}
                    onClick={() => { setSelectedPoId(po.id); setIsMobileDrawerOpen(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px', marginBottom: 8,
                      background: isSelected ? 'var(--sand)' : 'white',
                      border: `1px solid ${isSelected ? 'var(--copper-bronze)' : 'var(--stone)'}`,
                      borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--midnight)', fontSize: 13 }}>{po.poNumber}</span>
                      <span style={{ 
                        fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600,
                        background: po.status === 'COMPLETED' ? 'var(--green-light)' : (po.status === 'IN_PROGRESS' ? '#eef4ff' : 'var(--sand)'),
                        color: po.status === 'COMPLETED' ? 'var(--green-dark)' : (po.status === 'IN_PROGRESS' ? '#1864f7' : 'var(--copper-bronze)')
                      }}>
                        {po.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      Customer: {po.customerName || 'Internal'}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Content */}
        <div className="print-full" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', background: '#f8f9fa', padding: '16px 20px' }}>
          {!selectedPoId ? (
            <div className="no-print" style={{ textAlign: 'center', marginTop: 100, color: 'var(--ash)' }}>
              <Package size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--slate)' }}>Select a Purchase Order</h3>
              <p style={{ margin: 0, fontSize: 14 }}>Select a completed PO from the left to view the quality dossier.</p>
            </div>
          ) : (
            <div style={{ maxWidth: '210mm', margin: '0 auto' }}>
              <div className="no-print" style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--stone)' }}>
                <button 
                  onClick={() => setActiveTab('dossier')}
                  style={{ 
                    background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    color: activeTab === 'dossier' ? 'var(--copper-bronze)' : 'var(--slate)',
                    borderBottom: activeTab === 'dossier' ? '2px solid var(--copper-bronze)' : '2px solid transparent'
                  }}
                >
                  Master Quality Dossier
                </button>
                <button 
                  onClick={() => setActiveTab('summary')}
                  style={{ 
                    background: 'none', border: 'none', padding: '0 0 12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    color: activeTab === 'summary' ? 'var(--copper-bronze)' : 'var(--slate)',
                    borderBottom: activeTab === 'summary' ? '2px solid var(--copper-bronze)' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Sparkles size={14} /> AI Summary
                </button>
              </div>

              {activeTab === 'summary' && (
                <div>
                  {aiLoading ? (
                    <div style={{ background: 'white', padding: 24, borderRadius: 12, border: '1px solid var(--silk)', display: 'flex', gap: 16, alignItems: 'center' }}>
                      <Loader2 className="animate-spin" size={24} color="var(--copper-bronze)" />
                      <span style={{ color: 'var(--slate)', fontSize: 14 }}>AI analyzing quality data...</span>
                    </div>
                  ) : aiSummary ? (
                    <div style={{ 
                      background: 'linear-gradient(to right, #fbf8f1, #ffffff)', 
                      padding: 32, borderRadius: 12, border: '1px solid #e5d7ba', 
                      position: 'relative', overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Sparkles size={24} color="#b48c36" />
                        <h3 style={{ margin: 0, fontSize: 18, color: '#8b6914', fontWeight: 600 }}>AI Quality Summary</h3>
                      </div>
                      <p style={{ margin: 0, fontSize: 15, color: 'var(--midnight)', lineHeight: 1.7 }}>
                        {aiSummary.summaryText}
                      </p>
                      <div style={{ display: 'flex', gap: 32, marginTop: 24, paddingTop: 24, borderTop: '1px solid #f0e6d2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckCircle size={20} color={aiSummary.allPassed ? 'var(--green)' : 'var(--orange)'} />
                          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--slate)' }}>
                            Status: <strong style={{ color: aiSummary.allPassed ? 'var(--green-dark)' : 'var(--orange-dark)' }}>
                              {aiSummary.allPassed ? 'APPROVED' : 'REVIEW NEEDED'}
                            </strong>
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--slate)' }}>
                          Parts Tracked: <strong>{aiSummary.totalGauges}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>No summary available.</div>
                  )}
                </div>
              )}

              <div 
                ref={dossierRef} 
                style={{ 
                  display: activeTab === 'dossier' ? 'block' : 'none',
                  background: 'white' 
                }}
              >
                {/* Stacked Gauges */}
                {gaugesLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>Loading dossier data...</div>
                ) : gauges.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>No parts found for this PO.</div>
                ) : (
                  gauges.map((g: any) => (
                    <GaugeDossier key={g.id} gaugeId={g.id} reportConfig={reportConfig} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
