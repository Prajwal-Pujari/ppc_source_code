import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { pqcApi } from '@/api/pqc.api';
import { Loader2, ShieldCheck, Sparkles, Flag, CheckCircle2, XCircle, FileCheck, Award, Check, X } from 'lucide-react';

interface FirstLastPieceReportViewProps {
  gaugeId: string;
  gaugeData?: any;
  hideIfEmpty?: boolean;
  subReportFilter?: 'ALL' | 'FIRST_PIECE' | 'LAST_PIECE';
}

export default function FirstLastPieceReportView({
  gaugeId,
  gaugeData,
  hideIfEmpty = false,
  subReportFilter = 'ALL',
}: FirstLastPieceReportViewProps) {
  // Fetch piece inspection logs for this gauge
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['gauge-piece-inspections', gaugeId],
    queryFn: () => pqcApi.getPieceInspections(undefined, gaugeId),
    enabled: !!gaugeId,
  });

  const rawLogs: any[] = response?.data || [];

  // Filter logs by sub-report if requested
  const logs = React.useMemo(() => {
    if (subReportFilter === 'ALL') return rawLogs;
    return rawLogs.filter((l) => l.inspectionType === subReportFilter);
  }, [rawLogs, subReportFilter]);

  if (isLoading) {
    if (hideIfEmpty) return null;
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--copper-bronze, #8B6914)' }} />
        <p style={{ color: 'var(--ash, #8C857D)', fontWeight: 500, fontSize: 13 }}>
          Generating 1st & Last Piece Quality Report...
        </p>
      </div>
    );
  }

  if (error || logs.length === 0) {
    if (hideIfEmpty) return null;

    return (
      <div style={{ padding: 48, textAlign: 'center', background: '#FFFFFF', borderRadius: 8, border: '1px solid var(--silk, #E8E2D9)' }}>
        <FileCheck size={48} style={{ margin: '0 auto 16px', color: 'var(--silk, #E8E2D9)' }} />
        <h3 style={{ margin: '0 0 8px', color: 'var(--charcoal, #1C1A18)', fontSize: 18, fontWeight: 700 }}>
          No Piece Inspection Records Found
        </h3>
        <p style={{ color: 'var(--ash, #8C857D)', fontSize: 13, maxWidth: 440, margin: '0 auto' }}>
          There are no First Piece (setup) or Last Piece (shift closure) inspection logs recorded for this part yet.
        </p>
      </div>
    );
  }

  // Derive part & PO metadata from the logs or gaugeData
  const sampleLog = logs[0] || {};
  const gauge = sampleLog.gauge || gaugeData || {};
  const po = gauge.purchaseOrder || {};
  const customer = po.customer || {};
  const customerName = customer.name || po.customerName || gauge.customerName || 'Internal / Stock';
  const poNumber = po.orderNumber || po.poNumber || 'N/A';
  const partName = gauge.partName || gauge.gaugeTypeName || 'Manufacturing Part';
  const serialNumber = gauge.serialNumber || 'N/A';
  const batchQuantity = gauge.batchQuantity || po.totalGauges || 1;

  // Stats calculation
  const totalLogs = logs.length;
  const passedLogs = logs.filter((l) => l.passedQty > 0 && l.rejectedQty === 0 && !l.isEscalated).length;
  const failedLogs = totalLogs - passedLogs;
  const overallVerdict = failedLogs === 0 ? 'APPROVED' : 'CONTAINS_REJECTIONS';

  // Group logs by operation
  const opGroups = logs.reduce((acc: Record<string, any[]>, log: any) => {
    const opKey = log.gaugeOperation?.id || log.gaugeOperation?.operationName || 'General';
    if (!acc[opKey]) acc[opKey] = [];
    acc[opKey].push(log);
    return acc;
  }, {});

  return (
    <div
      className="pdf-page print-report"
      style={{
        background: '#FFFFFF',
        width: '100%',
        minHeight: '297mm',
        position: 'relative',
        padding: '36px 40px',
        color: 'var(--charcoal, #1C1A18)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Premium Border (Matching Setup Certificate Vibe) ─── */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          bottom: 14,
          border: '2px solid var(--copper-bronze, #8B6914)',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.15,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          border: '1px solid var(--copper-bronze, #8B6914)',
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.3,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ─── Certificate Header ─── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2.5px solid var(--copper-bronze, #8B6914)',
            paddingBottom: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                height: 58,
                width: 58,
                background: 'var(--bone-white, #FAF8F5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                border: '1.5px solid var(--silk, #E8E2D9)',
              }}
            >
              <ShieldCheck size={32} color="var(--copper-bronze, #8B6914)" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--copper-bronze, #8B6914)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                MES FACTORY &bull; QUALITY ASSURANCE
              </div>
              <h1
                style={{
                  margin: '3px 0 0',
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'var(--charcoal, #1C1A18)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                1st & Last Piece Quality Report
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ash, #8C857D)', fontWeight: 500 }}>
                First-Off Setup Validation &amp; Last-Off Batch Closure Compliance Certificate
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: 160 }}>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Document No.
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--charcoal, #1C1A18)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
              PQC-FL-DOC-001
            </div>

            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Revision No.
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--charcoal, #1C1A18)', fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
              REV-01
            </div>

            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Generated On
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate, #4A4540)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        </div>

        {/* ─── Metadata Cards Grid (Identical to Setup & In-Process) ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
            marginBottom: 28,
            background: 'var(--bone-white, #FAF8F5)',
            padding: '16px 20px',
            borderRadius: 8,
            border: '1px solid var(--silk, #E8E2D9)',
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.04em' }}>
              Customer
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
              {customerName}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.04em' }}>
              Purchase Order
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', fontFamily: "'JetBrains Mono', monospace" }}>
              {poNumber}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.04em' }}>
              Part Name
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)' }}>
              {partName}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3, letterSpacing: '0.04em' }}>
              Serial / Batch Qty
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', fontFamily: "'JetBrains Mono', monospace" }}>
              {serialNumber} &bull; {batchQuantity} Units
            </div>
          </div>
        </div>

        {/* ─── Operations & Inspection Sections ─── */}
        {Object.entries(opGroups).map(([opKey, opLogs]: [string, any[]], groupIdx: number) => {
          const firstOpLog = opLogs[0] || {};
          const opName = firstOpLog.gaugeOperation?.operationName || 'Operation';
          const opSeq = firstOpLog.gaugeOperation?.sequenceOrder != null ? `#${firstOpLog.gaugeOperation.sequenceOrder}` : '';

          return (
            <div key={opKey || groupIdx} style={{ marginBottom: 32 }}>
              {/* Operation Title Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--copper-bronze, #8B6914)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Award size={16} />
                  <span>
                    {opSeq} {opName}
                  </span>
                </h2>
                <div style={{ flex: 1, height: 1, background: 'var(--silk, #E8E2D9)' }} />
              </div>

              {/* Inspection Logs for this Operation */}
              {opLogs.map((log: any, logIdx: number) => {
                const isFp = log.inspectionType === 'FIRST_PIECE';
                const isFailed = log.rejectedQty > 0 || log.isEscalated;
                const machineName = log.machine?.name ? `${log.machine.name} (${log.machine.code || 'M/C'})` : 'Default Workstation';
                const inspectorName = log.inspector?.fullName || 'Quality Inspector';
                const shiftName = log.shift?.name || 'Regular Shift';
                const logTimeStr = new Date(log.logTime).toLocaleString([], {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const answers: any[] = log.questionAnswers || [];

                return (
                  <div
                    key={log.id || logIdx}
                    style={{
                      marginBottom: 20,
                      border: '1px solid var(--silk, #E8E2D9)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {/* Log Session Banner */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 18px',
                        backgroundColor: isFp ? '#F8FAFC' : '#FFFBEB',
                        borderBottom: '1px solid var(--silk, #E8E2D9)',
                        borderLeft: isFailed ? '5px solid #DC2626' : isFp ? '5px solid #2563EB' : '5px solid #D97706',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        {/* Type Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 9px',
                            borderRadius: 6,
                            fontFamily: "'JetBrains Mono', monospace",
                            backgroundColor: isFp ? '#DBEAFE' : '#FEF3C7',
                            color: isFp ? '#1E40AF' : '#92400E',
                            border: isFp ? '1px solid #93C5FD' : '1px solid #FCD34D',
                          }}
                        >
                          {isFp ? <Sparkles size={12} /> : <Flag size={12} />}
                          {isFp ? '1ST PIECE (SETUP VERIFICATION)' : 'LAST PIECE (SHIFT CLOSURE)'}
                        </span>

                        <div style={{ fontSize: 12, color: 'var(--slate, #4A4540)' }}>
                          <strong>M/C:</strong> {machineName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate, #4A4540)' }}>
                          <strong>Inspector:</strong> {inspectorName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--slate, #4A4540)' }}>
                          <strong>Shift:</strong> {shiftName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ash, #8C857D)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {logTimeStr}
                        </div>
                      </div>

                      {/* Status Stamp */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            padding: '4px 12px',
                            borderRadius: 6,
                            color: isFailed ? '#DC2626' : '#16A34A',
                            backgroundColor: isFailed ? '#FEE2E2' : '#DCFCE7',
                            border: isFailed ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {isFailed ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                          {isFailed ? 'FAILED / NC ESCALATED' : 'PASSED / APPROVED'}
                        </span>
                      </div>
                    </div>

                    {/* Parameters Table */}
                    {answers.length > 0 ? (
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 12,
                          textAlign: 'left',
                        }}
                      >
                        <thead>
                          <tr
                            style={{
                              backgroundColor: 'var(--linen, #EEE9E1)',
                              color: 'var(--copper-dark, #6F5100)',
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              borderBottom: '1px solid var(--silk, #E8E2D9)',
                            }}
                          >
                            <th style={{ padding: '8px 14px', width: '38%' }}>Parameter / Characteristic</th>
                            <th style={{ padding: '8px 12px', width: '16%' }}>Checking Tool</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '16%' }}>Standard Spec</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '16%' }}>Measured Value</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', width: '14%' }}>Verdict</th>
                          </tr>
                        </thead>
                        <tbody>
                          {answers.map((ans: any, ansIdx: number) => {
                            const isPass = ans.status === 'PASS';
                            const hasTol = ans.minValue != null || ans.maxValue != null;
                            const specText = hasTol
                              ? `${ans.minValue ?? ''} - ${ans.maxValue ?? ''} ${ans.unit || ''}`.trim()
                              : ans.expectedAnswer || 'Pass';
                            const methodText = ans.checkingMethod || 'Visual / Gauge';
                            const actualVal = ans.actualValue || (isPass ? 'OK' : 'FAIL');

                            return (
                              <tr
                                key={ans.questionId || ansIdx}
                                style={{
                                  borderBottom: '1px solid var(--silk, #E8E2D9)',
                                  backgroundColor: !isPass ? '#FEF2F2' : ansIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                }}
                              >
                                <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--charcoal, #1C1A18)' }}>
                                  {ans.questionText || `Characteristic #${ansIdx + 1}`}
                                  {ans.remarks && (
                                    <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', marginTop: 2 }}>
                                      Note: {ans.remarks}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '9px 12px', color: 'var(--slate, #4A4540)', fontSize: 11 }}>
                                  {methodText}
                                </td>
                                <td
                                  style={{
                                    padding: '9px 12px',
                                    textAlign: 'center',
                                    color: 'var(--ash, #8C857D)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 11,
                                  }}
                                >
                                  {specText}
                                </td>
                                <td
                                  style={{
                                    padding: '9px 12px',
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    color: isPass ? 'var(--charcoal, #1C1A18)' : '#DC2626',
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  {actualVal}
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 3,
                                      fontSize: 10,
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      color: isPass ? '#15803D' : '#DC2626',
                                      backgroundColor: isPass ? '#DCFCE7' : '#FEE2E2',
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                  >
                                    {isPass ? <Check size={11} /> : <X size={11} />}
                                    {isPass ? 'PASS' : 'FAIL'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: 14, textAlign: 'center', color: 'var(--ash, #8C857D)', fontSize: 12 }}>
                        No individual checklist questions logged for this session. Physical sample verified as {log.passedQty > 0 ? 'Passed' : 'Failed'}.
                      </div>
                    )}

                    {/* Remarks Box */}
                    {log.remarks && (
                      <div
                        style={{
                          padding: '10px 16px',
                          background: 'var(--bone-white, #FAF8F5)',
                          borderTop: '1px solid var(--silk, #E8E2D9)',
                          fontSize: 11,
                          color: 'var(--charcoal, #1C1A18)',
                        }}
                      >
                        <strong style={{ color: 'var(--copper-bronze, #8B6914)', marginRight: 6 }}>
                          Inspector Observations:
                        </strong>
                        {log.remarks}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* ─── Batch Reconciliation & Summary Box ─── */}
        <div
          style={{
            marginBottom: 32,
            padding: '14px 20px',
            backgroundColor: 'var(--linen, #EEE9E1)',
            borderRadius: 8,
            border: '1px solid var(--silk, #E8E2D9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Verified Pieces
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--charcoal, #1C1A18)' }}>
                {totalLogs} Physical Samples
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase' }}>
                Setup (1st Piece)
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#1D4ED8' }}>
                {logs.filter((l) => l.inspectionType === 'FIRST_PIECE').length} Logs
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase' }}>
                Shutdown (Last Piece)
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#B45309' }}>
                {logs.filter((l) => l.inspectionType === 'LAST_PIECE').length} Logs
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)', fontWeight: 700, textTransform: 'uppercase' }}>
              Final Inspection Status
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: overallVerdict === 'APPROVED' ? '#15803D' : '#DC2626',
                letterSpacing: '0.04em',
              }}
            >
              {overallVerdict === 'APPROVED' ? 'BATCH COMPLIANT / ZERO DEFECT' : 'DEVIATIONS RECORDED'}
            </div>
          </div>
        </div>

        {/* ─── Official Sign-Off & Approvals Grid (Matching Setup/In-Process Certificate) ─── */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '2px solid var(--copper-bronze, #8B6914)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', textTransform: 'uppercase', marginBottom: 24 }}>
              Quality Inspector
            </div>
            <div style={{ borderBottom: '1px solid var(--stone, #C8C2B8)', marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--slate, #4A4540)', fontWeight: 600 }}>
              {sampleLog.inspector?.fullName || 'Verified Inspector'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)' }}>
              Sign &amp; Date
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', textTransform: 'uppercase', marginBottom: 24 }}>
              Shift Supervisor
            </div>
            <div style={{ borderBottom: '1px solid var(--stone, #C8C2B8)', marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--slate, #4A4540)', fontWeight: 600 }}>
              Production Authority
            </div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)' }}>
              Sign &amp; Date
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', textTransform: 'uppercase', marginBottom: 24 }}>
              Quality Assurance Head
            </div>
            <div style={{ borderBottom: '1px solid var(--stone, #C8C2B8)', marginBottom: 6 }} />
            <div style={{ fontSize: 11, color: 'var(--slate, #4A4540)', fontWeight: 600 }}>
              Official QA Authorization
            </div>
            <div style={{ fontSize: 10, color: 'var(--ash, #8C857D)' }}>
              Stamp &amp; Approval
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

