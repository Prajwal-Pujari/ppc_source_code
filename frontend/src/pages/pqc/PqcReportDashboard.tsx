import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Printer, ChevronRight, ChevronDown, FileCheck, CheckCircle2, Package, Loader2 } from 'lucide-react';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { reportsApi } from '@/api/reports.api';
import type { QualityReportDto } from '@/types/domain.types';
import InProcessReportView from './reports/InProcessReportView';
import PdirReportView from './reports/PdirReportView';
import LayoutReportView from './reports/LayoutReportView';
import FaiReportView from './reports/FaiReportView';

type ReportType = 'IN_PROCESS' | 'PDIR' | 'LAYOUT' | 'FAI' | 'FAR' | 'INCOMING';

const reportTypes: { id: ReportType; label: string }[] = [
  { id: 'IN_PROCESS', label: 'In-Process Report' },
  { id: 'PDIR', label: 'PDIR' },
  { id: 'LAYOUT', label: 'Layout Inspection' },
  { id: 'FAI', label: 'FAI (First Article)' },
  { id: 'FAR', label: 'FAR' },
  { id: 'INCOMING', label: 'Incoming Inspection' },
];

/* ─── Main dashboard ─── */
export default function PqcReportDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('IN_PROCESS');

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

  // Fetch report for the selected gauge
  const { data: reportData, isLoading: reportLoading, error: reportError } = useQuery({
    queryKey: ['pqc-report', selectedGaugeId, selectedReportType],
    queryFn: async () => {
      const res = await reportsApi.getReportByGauge(selectedGaugeId!, selectedReportType);
      return res.data ?? null;
    },
    enabled: !!selectedGaugeId,
    retry: 1,
  });

  // Debug logging
  useEffect(() => {
    if (selectedGaugeId) console.log('[Reports] gauge selected →', selectedGaugeId);
  }, [selectedGaugeId]);
  useEffect(() => {
    if (reportData) console.log('[Reports] report loaded →', reportData);
    if (reportError) console.error('[Reports] report error →', reportError);
  }, [reportData, reportError]);

  const handleTogglePo = (poId: string) => {
    if (expandedPoId === poId) {
      setExpandedPoId(null);
    } else {
      setExpandedPoId(poId);
    }
  };

  const handleSelectGauge = (gaugeId: string) => {
    console.log('[Reports] handleSelectGauge called with:', gaugeId);
    setSelectedGaugeId(gaugeId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bone-white)' }}>

      {/* ─── Header ─── */}
      <div className="hide-on-print" style={{
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
          <button onClick={() => window.print()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={16} /> Print / Export PDF
          </button>
        )}
      </div>

      {/* ─── Body ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ─── Left panel: PO list ─── */}
        <div className="hide-on-print" style={{
          width: 340, minWidth: 340, background: 'white', borderRight: '1px solid var(--silk)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
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
            <div style={{ maxWidth: 920, margin: '0 auto' }}>

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
              <div className="print-document" style={{
                background: 'white', padding: 40, borderRadius: 10,
                boxShadow: '0 6px 24px rgba(28,26,24,0.07)', border: '1px solid var(--silk)',
                minHeight: 800,
              }}>
                {reportLoading ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--slate)' }}>
                    <p>Generating report…</p>
                  </div>
                ) : reportError ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#b91c1c' }}>
                    <p style={{ fontWeight: 600 }}>Error loading report</p>
                    <p style={{ fontSize: 13 }}>{String((reportError as any)?.message || reportError)}</p>
                  </div>
                ) : !reportData ? (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ash)' }}>
                    No report data available.
                  </div>
                ) : (
                  <>
                    {selectedReportType === 'IN_PROCESS' && <InProcessReportView data={reportData} />}
                    {selectedReportType === 'PDIR' && <PdirReportView data={reportData} />}
                    {selectedReportType === 'LAYOUT' && <LayoutReportView data={reportData} />}
                    {selectedReportType === 'FAI' && <FaiReportView data={reportData} />}
                    {(selectedReportType === 'FAR' || selectedReportType === 'INCOMING') && (
                      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ash)' }}>
                        This report template is under construction.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
