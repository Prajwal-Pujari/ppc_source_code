import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileCheck, Package, ChevronRight, ChevronDown, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { getPurchaseOrders, getPurchaseOrderGauges } from '@/api/purchase-orders.api';
import { reportsApi } from '@/api/reports.api';
import { shiftsApi } from '@/api/shifts.api';
import toast from 'react-hot-toast';

export default function PqcApprovalsDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [selectedGaugeId, setSelectedGaugeId] = useState<string | null>(null);

  // Fetch all POs
  const { data: pos = [], isLoading: posLoading } = useQuery({
    queryKey: ['approval-pos', searchTerm],
    queryFn: async () => {
      const res = await getPurchaseOrders({ page: 0, size: 50, search: searchTerm || undefined });
      return res.data?.content ?? [];
    },
  });

  // Fetch gauges for the expanded PO
  const { data: gauges = [], isLoading: gaugesLoading } = useQuery({
    queryKey: ['approval-gauges', expandedPoId],
    queryFn: async () => {
      const res = await getPurchaseOrderGauges(expandedPoId!);
      return res.data ?? [];
    },
    enabled: !!expandedPoId,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await shiftsApi.get();
      return res.data ?? [];
    }
  });

  // Fetch report data to get operations and approvals
  const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ['pqc-approval-report', selectedGaugeId],
    queryFn: async () => {
      const res = await reportsApi.getReportByGauge(selectedGaugeId!, 'IN_PROCESS');
      return res.data ?? null;
    },
    enabled: !!selectedGaugeId,
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

  const handleTogglePo = (poId: string) => {
    if (expandedPoId === poId) {
      setExpandedPoId(null);
    } else {
      setExpandedPoId(poId);
    }
  };

  const handleApprove = async (date: string, shiftName: string) => {
    try {
      // Find shift ID from shift name
      const shift = shifts.find(s => s.name === shiftName);
      if (!shift) {
        toast.error("Shift not found in system.");
        return;
      }

      await reportsApi.approveShift(selectedGaugeId!, shift.id, date);
      toast.success("Shift approved successfully!");
      refetch();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to approve shift.");
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
            <ShieldCheck size={24} color="var(--copper-bronze)" />
            Shift Approvals
          </h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 4 }}>
            Review and approve production shifts for parts.
          </p>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="mobile-stack" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ─── Left panel: PO list ─── */}
        <div className="hide-on-print mobile-w-full" style={{
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
                <Package size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>No purchase orders found.</p>
              </div>
            )}

            {pos.map((po: any) => {
              const isExpanded = expandedPoId === po.id;
              return (
                <div key={po.id}>
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
                    {isExpanded ? <ChevronDown size={16} color="var(--ash)" /> : <ChevronRight size={16} color="var(--ash)" />}
                  </button>

                  {isExpanded && (
                    <div style={{ border: '1px solid var(--silk)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                      {gaugesLoading ? (
                        <div style={{ padding: 14, fontSize: 12, color: 'var(--ash)' }}>Loading parts…</div>
                      ) : gauges.length === 0 ? (
                        <div style={{ padding: 14, fontSize: 12, color: 'var(--ash)' }}>No parts found.</div>
                      ) : (
                        gauges.map((g: any) => {
                          const isSelected = selectedGaugeId === g.id;
                          return (
                            <button
                              key={g.id}
                              onClick={() => setSelectedGaugeId(g.id)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 14px 12px 16px', cursor: 'pointer',
                                background: isSelected ? 'rgba(139,105,20,0.08)' : '#FAFAF8',
                                border: 'none', borderTop: '1px solid var(--silk)',
                                borderLeft: isSelected ? '3px solid var(--copper-bronze)' : '3px solid transparent',
                                textAlign: 'left',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: 6,
                                  background: isSelected ? 'var(--copper-bronze)' : 'var(--silk)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: isSelected ? 'white' : 'var(--slate)', fontSize: 12, fontWeight: 700,
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

        {/* ─── Right panel: Shifts List ─── */}
        <div className="mobile-p-16 mobile-w-full" style={{ flex: 1, overflowY: 'auto', padding: 28, background: 'var(--bone-white)' }}>
          {!selectedGaugeId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--ash)' }}>
              <FileCheck size={48} style={{ opacity: 0.15, marginBottom: 16 }} />
              <p style={{ fontSize: 16, fontWeight: 500 }}>No item selected.</p>
              <p style={{ fontSize: 13 }}>Expand a Purchase Order on the left, then click on a Part to view shifts.</p>
            </div>
          ) : reportLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--ash)' }}>
              <p>Loading shift data...</p>
            </div>
          ) : subReports.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'var(--ash)' }}>
              <p>No production logs found for this part.</p>
            </div>
          ) : (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--charcoal)' }}>Shift Approvals</h2>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--slate)' }}>
                  Approve inspection logs for individual shifts.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {subReports.map(sub => {
                  const isApproved = reportData?.approvals?.find((a: any) => a.inspectionDate === sub.date && a.shiftName === sub.shiftName);

                  return (
                    <div key={`${sub.date}_${sub.shiftName}`} style={{
                      background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 20,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-card)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: isApproved ? 'var(--status-completed-bg)' : 'var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isApproved ? 'var(--status-completed)' : 'var(--ash)' }}>
                          {isApproved ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--charcoal)' }}>{sub.date}</div>
                          <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 2 }}>{sub.shiftName} Shift</div>
                        </div>
                      </div>

                      <div>
                        {isApproved ? (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-completed)' }}>Approved</div>
                            <div style={{ fontSize: 11, color: 'var(--ash)' }}>By {isApproved.inspectorName}</div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApprove(sub.date, sub.shiftName)}
                            className="btn btn-primary"
                            style={{ padding: '8px 24px', borderRadius: 20, fontWeight: 600 }}
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
