import React from 'react';
import type { QualityReportDto, PqcMeasurement } from '@/types/domain.types';

export default function InProcessReportView({ data, config }: { data: QualityReportDto, config?: any }) {
  const [fetchedConfig, setFetchedConfig] = React.useState<any>(null);

  React.useEffect(() => {
    if (!config?.inspectionIntervalHours && !data?.inspectionIntervalHours) {
      import('@/api/reportConfig.api').then(({ reportConfigApi }) => {
        reportConfigApi.get().then(res => {
          if (res.data) setFetchedConfig(res.data);
        }).catch(() => {});
      });
    }
  }, [config?.inspectionIntervalHours, data?.inspectionIntervalHours]);

  const activeConfig = { ...fetchedConfig, ...config };
  const intervalHours = Number(activeConfig?.inspectionIntervalHours ?? data?.inspectionIntervalHours ?? 1);
  const shiftHours = Number(activeConfig?.defaultShiftHours ?? data?.defaultShiftHours ?? 8);
  const configuredCols = Math.max(1, Math.round(shiftHours / (intervalHours > 0 ? intervalHours : 1)));

  // Helper to format specification
  const getSpecString = (m: PqcMeasurement) => {
    if (m.minValue !== undefined && m.minValue !== null && m.maxValue !== undefined && m.maxValue !== null) {
      const nominal = (m.minValue + m.maxValue) / 2;
      return `${parseFloat(nominal.toFixed(3))}${m.unit ? ' ' + m.unit : ''}`;
    }
    if (m.expectedAnswer && m.expectedAnswer.trim() !== '') {
      return m.expectedAnswer;
    }
    return '';
  };

  // Helper to format tolerance
  const getToleranceString = (m: PqcMeasurement) => {
    if (m.minValue !== undefined && m.minValue !== null && m.maxValue !== undefined && m.maxValue !== null) {
      const diff = (m.maxValue - m.minValue) / 2;
      return `±${parseFloat(diff.toFixed(3))}`;
    }
    return '';
  };

  // Helper to format date as DD-MM-YYYY
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

  // Helper to format actual value
  const formatActualValue = (val: any, expected?: string) => {
    if (val === null || val === undefined || val === '') return '-';
    let displayVal = String(val);
    if (typeof val === 'boolean' || displayVal === 'true' || displayVal === 'false') {
      displayVal = (val === true || displayVal === 'true') ? 'Pass' : 'Fail';
    }
    return displayVal;
  };

  // Gather unique dates, operators, shifts, and machines
  const uniqueDates = new Set<string>();
  const uniqueOperators = new Set<string>();
  const uniqueShifts = new Set<string>();
  const uniqueMachines = new Set<string>();

  data.operations?.forEach(op => {
    op.batches?.forEach(b => {
      uniqueDates.add(formatReportDate(b.logTime));
      if (b.inspectorName) uniqueOperators.add(b.inspectorName);
      if (b.shiftName) uniqueShifts.add(b.shiftName);
      if (b.machineName) uniqueMachines.add(b.machineName);
    });
  });

  const datesArray = Array.from(uniqueDates).sort();
  const dateDisplay = datesArray.length === 0
    ? formatReportDate(data.generatedAt)
    : datesArray.length === 1
      ? datesArray[0]
      : `${datesArray[0]} to ${datesArray[datesArray.length - 1]}`;

  const operatorDisplay = Array.from(uniqueOperators).join(', ') || '-';
  const shiftDisplay = Array.from(uniqueShifts).join(', ') || '-';
  const machineDisplay = Array.from(uniqueMachines).join(', ') || '-';

  // Matched approval fallback if not passed directly in config
  const currentApproval = activeConfig?.activeApproval || (
    data.approvals && data.approvals.length > 0
      ? data.approvals.find((a: any) => {
          const aDate = formatReportDate(a.inspectionDate);
          return datesArray.includes(aDate) && (!a.shiftName || uniqueShifts.has(a.shiftName));
        }) || data.approvals[0]
      : undefined
  );

  // --- 1. Flatten all rows ---
  type RowDef =
    | { type: 'opHeader'; op: any; isContinued?: boolean }
    | { type: 'timeHeader'; op: any; isContinued?: boolean }
    | { type: 'param'; op: any; param: PqcMeasurement }
    | { type: 'qtyRow'; op: any; label: string; field: 'inspectedQty' | 'reworkQty' | 'rejectedQty' | 'scrapQty' }
    | { type: 'incidentRow'; op: any; label: string }
    | { type: 'empty' };

  // --- Chunk rows into pages operation by operation ---
  const pages: { isFirst: boolean; isLast: boolean; rows: RowDef[] }[] = [];
  const limit = 12; // 12 rows fit comfortably on A4 landscape

  data.operations.forEach(op => {
    const uniqueParamsMap = new Map<string, PqcMeasurement>();
    if (op.configuredParameters && op.configuredParameters.length > 0) {
      op.configuredParameters.forEach((cp: any) => {
        if (cp.questionId) {
          uniqueParamsMap.set(cp.questionId, cp);
        }
      });
    }
    op.batches?.forEach(b => {
      b.measurements?.forEach(m => {
        if (!uniqueParamsMap.has(m.questionId)) {
          uniqueParamsMap.set(m.questionId, m);
        }
      });
    });
    const uniqueParams = Array.from(uniqueParamsMap.values());

    if (uniqueParams.length > 0) {
      const opRows: RowDef[] = [
        { type: 'opHeader', op },
        ...uniqueParams.map(p => ({ type: 'param' as const, op, param: p })),
        { type: 'qtyRow', op, label: 'Produced Actual', field: 'inspectedQty' },
        { type: 'qtyRow', op, label: 'Rework', field: 'reworkQty' },
        { type: 'qtyRow', op, label: 'Reject', field: 'rejectedQty' },
        { type: 'qtyRow', op, label: 'Scrap', field: 'scrapQty' },
        { type: 'incidentRow', op, label: 'Breakdown / Incident' }
      ];

      let rowsRemaining = [...opRows];
      let isFirstChunkForOp = true;

      while (rowsRemaining.length > 0) {
        if (!isFirstChunkForOp) {
          rowsRemaining.unshift({ type: 'opHeader', op, isContinued: true });
        }

        let takeCount = limit;
        if (rowsRemaining.length <= limit) {
          takeCount = rowsRemaining.length;
        } else {
          // Prevent leaving just 1 to 5 quantity/incident rows stranded alone on the next page
          if (rowsRemaining.length - limit <= 5 && limit > 6) {
            takeCount = rowsRemaining.length - 5;
          }
        }

        const isLastChunkForOp = rowsRemaining.length <= takeCount;
        const chunk = rowsRemaining.slice(0, takeCount);
        pages.push({
          isFirst: pages.length === 0,
          isLast: isLastChunkForOp,
          rows: chunk
        });

        rowsRemaining = rowsRemaining.slice(takeCount);
        isFirstChunkForOp = false;
      }
    }
  });

  if (pages.length === 0) {
    pages.push({ isFirst: true, isLast: true, rows: [] });
  }

  let globalSlNo = 1;

  return (
    <div className="report-container" style={{ width: '100%', fontFamily: '"Times New Roman", Times, serif', color: '#000', fontSize: '12px' }}>
      <style>
        {`
          @media print {
            @page { 
              size: landscape; 
              margin: 10mm; 
            }
            body { 
              background: #fff; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            .report-container { 
              box-shadow: none !important; 
              border: none !important; 
              padding: 0 !important; 
              width: 100% !important;
            }
            .pdf-page {
              page-break-after: always;
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto !important;
              border: none !important;
            }
            .pdf-page:last-child {
              page-break-after: avoid;
            }
          }
          .pdf-page {
            width: 1123px; /* A4 landscape width at 96dpi */
            min-height: 794px; /* Minimum height for A4 landscape to prevent overflow issues */
            background: white;
            box-sizing: border-box;
            padding: 10px;
            margin-bottom: 20px;
            display: flex;
            flex-direction: column;
          }
          .cert-table {
            width: 100%;
            border-collapse: collapse;
          }
          .cert-table th, .cert-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
          }
          .cert-table td.left-align, .cert-table th.left-align {
            text-align: left;
            padding-left: 8px;
          }
          .cert-table td.bold {
            font-weight: bold;
          }
        `}
      </style>

      {pages.map((page, pageIdx) => {
        const activeOp = (page.rows.find(r => 'op' in r && (r as any).op) as any)?.op;
        const opCodeDisplay = activeOp
          ? (activeOp.operationCode
              ? (activeOp.operationName ? `${activeOp.operationCode} - ${activeOp.operationName}` : activeOp.operationCode)
              : (activeOp.sequenceOrder ? `OP-${activeOp.sequenceOrder}${activeOp.operationName ? ` - ${activeOp.operationName}` : ''}` : (activeOp.operationName || 'Continuous')))
          : (data.operations && data.operations.length > 0
              ? data.operations.map(o => o.operationCode ? `${o.operationCode} - ${o.operationName}` : o.operationName).filter(Boolean).join(', ')
              : 'Continuous');

        return (
          <div key={pageIdx} className="pdf-page">

          {/* HEADER SECTION (Now on every page) */}
          <table className="cert-table" style={{ borderBottom: 'none' }}>
            <tbody>
              <tr>
                <td rowSpan={2} style={{ width: '10%' }}>
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {(data.customerLogo || activeConfig?.customerLogo) ? (
                      <img src={(data.customerLogo || activeConfig?.customerLogo) as string} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: '#666' }}>LOGO</span>
                    )}
                  </div>
                </td>
                <td rowSpan={2} colSpan={3} style={{ width: '65%', fontSize: '18px', fontWeight: 'bold' }}>IN-PROCESS INSPECTION REPORT</td>
                <td colSpan={2} className="left-align" style={{ width: '25%', fontSize: '10px', verticalAlign: 'top', padding: '4px' }}>
                  <div><strong>Doc. No:-</strong> {data.docNo || activeConfig?.inProcessDocNo || activeConfig?.docNo || ''}</div>
                  <div><strong>Rev.No./Date:-</strong> {data.revNo || activeConfig?.inProcessRevNo || activeConfig?.revNo || ''}</div>
                  <div><strong>Issue Date:-</strong> {data.issueDate || activeConfig?.inProcessIssueDate || activeConfig?.issueDate || ''}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ fontSize: '10px' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ width: '40%' }}><strong>Part No./Name:</strong> {data.partName}</td>
                <td colSpan={2} className="left-align" style={{ width: '30%' }}><strong>Operator Name:</strong> {operatorDisplay}</td>
                <td className="left-align" style={{ width: '20%' }}><strong>{datesArray.length <= 1 ? 'Inspection Date:' : 'Inspection Date(s):'}</strong> {dateDisplay}</td>
                <td className="left-align" style={{ width: '10%' }}><strong>Shift:</strong> {shiftDisplay}</td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align"><strong>Drg. Reference/Model:</strong> {data.serialNumber || data.gaugeId}</td>
                <td colSpan={2} className="left-align"><strong>Setup/Opr. No.:</strong> {opCodeDisplay}</td>
                <td colSpan={2} className="left-align"><strong>M/C Name/No.:</strong> {machineDisplay}</td>
              </tr>
            </tbody>
          </table>

          {/* MAIN DATA TABLE */}
          <table className="cert-table" style={{
            borderTop: 'none',
            borderBottom: page.isLast ? 'none' : '1px solid #000'
          }}>
            <tbody>
              {(() => {
                const activeOp = (page.rows.find(r => 'op' in r && (r as any).op) as any)?.op;
                const obsCount = Math.max(configuredCols, activeOp?.batches?.length || 0);
                const totalCols = 6 + obsCount;
                const obsColWidth = `${(37 / obsCount).toFixed(2)}%`;

                return page.rows.map((row, rIdx) => {
                  if (row.type === 'opHeader') {
                    return (
                      <React.Fragment key={`op-${rIdx}`}>
                        <tr style={{ backgroundColor: '#f5f2ed' }}>
                          <td colSpan={totalCols} className="left-align bold" style={{ fontSize: '13px', padding: '6px 8px' }}>
                            Operation: {row.op.sequenceOrder} - {row.op.operationName} {row.isContinued ? '(Continued)' : ''}
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#e9e7df' }}>
                          <th style={{ width: '5%', whiteSpace: 'nowrap', color: '#000', fontSize: '12px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Sl. No</th>
                          <th style={{ width: '22%', color: '#000', fontSize: '12px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Parameter</th>
                          <th style={{ width: '12%', color: '#000', fontSize: '12px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Specification</th>
                          <th style={{ width: '10%', color: '#000', fontSize: '12px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Tolerance</th>
                          <th style={{ width: '8%', color: '#000', fontSize: '11px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Inst/Gauge</th>
                          <th colSpan={obsCount} style={{ color: '#000', fontSize: '12px', fontWeight: 'bold', padding: '4px 0' }}>Observations</th>
                          <th style={{ width: '6%', color: '#000', fontSize: '12px', fontWeight: 'bold', borderBottom: 'none', paddingBottom: 0 }}>Total</th>
                        </tr>
                        <tr style={{ backgroundColor: '#e9e7df' }}>
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                          {[...Array(obsCount)].map((_, i) => {
                            const batch = row.op.batches?.[i];
                            const hasIncident = !!batch?.incidentType;
                            return (
                              <th
                                key={`obs-th-${rIdx}-${i}`}
                                style={{
                                  width: obsColWidth,
                                  height: '24px',
                                  fontSize: batch ? '11px' : '13px',
                                  fontWeight: 'bold',
                                  color: hasIncident ? '#991b1b' : '#000',
                                  backgroundColor: hasIncident ? '#fee2e2' : undefined,
                                  borderLeft: hasIncident ? '1.5px solid #dc2626' : undefined,
                                  borderRight: hasIncident ? '1.5px solid #dc2626' : undefined,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {batch ? new Date(batch.logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : String(i + 1)}
                              </th>
                            );
                          })}
                          <th style={{ borderTop: 'none', paddingTop: 0 }}></th>
                        </tr>
                      </React.Fragment>
                    );
                  }
                  if (row.type === 'param') {
                    return (
                      <tr key={`param-${rIdx}`}>
                        <td>{globalSlNo++}</td>
                        <td className="left-align">{row.param.parameterName}</td>
                        <td>{getSpecString(row.param) || '-'}</td>
                        <td>{getToleranceString(row.param) || '-'}</td>
                        <td>{data.partName || '-'}</td>
                        {[...Array(obsCount)].map((_, bIndex) => {
                          const batch = row.op.batches[bIndex];
                          const hasIncident = !!batch?.incidentType;
                          let val = '';
                          if (batch) {
                            const m = batch.measurements?.find((x: any) => x.questionId === row.param.questionId);
                            if (m) {
                              val = formatActualValue(m.actualValue, m.expectedAnswer);
                            } else {
                              val = '-';
                            }
                          }
                          return (
                            <td
                              key={bIndex}
                              style={{
                                backgroundColor: hasIncident ? '#fef2f2' : undefined,
                                color: hasIncident ? '#991b1b' : undefined,
                                fontWeight: hasIncident ? 'bold' : 'normal',
                                borderLeft: hasIncident ? '1.5px solid #dc2626' : undefined,
                                borderRight: hasIncident ? '1.5px solid #dc2626' : undefined
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td></td>
                      </tr>
                    );
                  }
                  if (row.type === 'qtyRow') {
                    const total = row.op.batches.reduce((sum: number, b: any) => sum + (b[row.field] || 0), 0);
                    return (
                      <tr key={`qty-${rIdx}-${row.label}`} style={{ backgroundColor: '#faf9f6' }}>
                        <td colSpan={5} className="bold" style={{ textAlign: 'right', paddingRight: '12px' }}>
                          {row.label}
                        </td>
                        {[...Array(obsCount)].map((_, bIndex) => {
                          const batch = row.op.batches[bIndex];
                          const hasIncident = !!batch?.incidentType;
                          let val = '';
                          if (batch && batch[row.field] != null) {
                            val = batch[row.field].toString();
                          }
                          const isBad = (row.field === 'rejectedQty' || row.field === 'scrapQty') && val !== '' && val !== '0';
                          return (
                            <td
                              key={`qty-obs-${bIndex}`}
                              className="bold"
                              style={{
                                color: isBad || hasIncident ? '#991b1b' : 'inherit',
                                backgroundColor: hasIncident ? '#fef2f2' : undefined,
                                borderLeft: hasIncident ? '1.5px solid #dc2626' : undefined,
                                borderRight: hasIncident ? '1.5px solid #dc2626' : undefined
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}
                        <td className="bold" style={{ textAlign: 'center', color: 'var(--copper-bronze)' }}>
                          {total > 0 ? total : ''}
                        </td>
                      </tr>
                    );
                  }
                  if (row.type === 'incidentRow') {
                    const incidents = row.op.batches.filter((b: any) => b.incidentType);
                    const totalIncidentCount = incidents.length;
                    return (
                      <tr key={`incident-${rIdx}`} style={{ backgroundColor: totalIncidentCount > 0 ? '#fff5f5' : '#faf9f6' }}>
                        <td colSpan={5} className="bold" style={{ textAlign: 'right', paddingRight: '12px', color: totalIncidentCount > 0 ? '#8b3a3a' : 'inherit' }}>
                          {row.label}
                        </td>
                        {[...Array(obsCount)].map((_, bIndex) => {
                          const batch = row.op.batches[bIndex];
                          if (!batch || !batch.incidentType) {
                            return <td key={`inc-obs-${bIndex}`} style={{ color: '#aaa', fontSize: '11px' }}>-</td>;
                          }
                          return (
                            <td
                              key={`inc-obs-${bIndex}`}
                              className="bold"
                              style={{
                                color: '#7f1d1d',
                                backgroundColor: '#fee2e2',
                                fontSize: '10px',
                                padding: '2px 4px',
                                lineHeight: 1.2,
                                borderLeft: '1.5px solid #dc2626',
                                borderRight: '1.5px solid #dc2626'
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{batch.incidentType}</div>
                              {batch.incidentDurationMins ? <div style={{ fontSize: '9px', color: '#991b1b' }}>({batch.incidentDurationMins}m)</div> : null}
                            </td>
                          );
                        })}
                        <td className="bold" style={{ textAlign: 'center', color: totalIncidentCount > 0 ? '#8b3a3a' : '#888', fontSize: '11px' }}>
                          {totalIncidentCount > 0 ? `${totalIncidentCount}` : '-'}
                        </td>
                      </tr>
                    );
                  }
                  if (row.type === 'empty') {
                    return (
                      <tr key={`empty-${rIdx}`}>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        {[...Array(obsCount)].map((_, j) => {
                          const batch = (page.rows.find(r => r.type === 'opHeader' || r.type === 'qtyRow') as any)?.op?.batches?.[j];
                          const hasIncident = !!batch?.incidentType;
                          return (
                            <td
                              key={`empty-obs-${rIdx}-${j}`}
                              style={{
                                height: '24px',
                                backgroundColor: hasIncident ? '#fef2f2' : undefined,
                                borderLeft: hasIncident ? '1.5px solid #dc2626' : undefined,
                                borderRight: hasIncident ? '1.5px solid #dc2626' : undefined
                              }}
                            ></td>
                          );
                        })}
                        <td></td>
                      </tr>
                    );
                  }
                  return null;
                });
              })()}
            </tbody>
          </table>

          {/* PTO Text for multi-page reports */}
          {!page.isLast && (
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px', marginTop: '4px', fontStyle: 'italic', paddingRight: '8px' }}>
              P.T.O.
            </div>
          )}
          {/* FOOTER SECTION (On last page of every operation) */}
          {page.isLast && (
            <table className="cert-table" style={{ borderTop: 'none', marginTop: 0 }}>
              <tbody>
                <tr>
                  <td colSpan={1} rowSpan={3} className="left-align" style={{ verticalAlign: 'top', width: '60%', borderTop: 'none', padding: '8px' }}>
                    <strong>Remarks(Rework/Tool Change/Dimensional Issue/Other):-</strong>
                    {(() => {
                      const op = (page.rows.find(r => r.type === 'opHeader' || r.type === 'qtyRow' || r.type === 'incidentRow') as any)?.op;
                      const batchesWithIncidents = op?.batches?.filter((b: any) => b.incidentType || b.incidentRemarks) || [];
                      const batchesWithRemarks = op?.batches?.filter((b: any) => b.remarks && !b.incidentType) || [];

                      if (batchesWithIncidents.length === 0 && batchesWithRemarks.length === 0) {
                        return null;
                      }

                      return (
                        <div style={{ marginTop: 6, fontSize: '11px', lineHeight: 1.4 }}>
                          {batchesWithIncidents.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ color: '#8b3a3a', fontWeight: 'bold' }}>Breakdown / Incident Log:</span>
                              <div style={{ marginTop: 2 }}>
                                {batchesWithIncidents.map((b: any, idx: number) => (
                                  <div key={idx} style={{ color: '#8b3a3a', marginBottom: 2 }}>
                                    - <strong>{b.incidentType || 'Incident'}</strong>
                                    {b.incidentDurationMins ? ` [${b.incidentDurationMins} mins downtime]` : ''}
                                    {b.incidentRemarks ? `: "${b.incidentRemarks}"` : ''}
                                    {b.inspectorName ? ` (Reported by: ${b.inspectorName})` : ''}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {batchesWithRemarks.length > 0 && (
                            <div>
                              <span style={{ color: '#4a4540', fontWeight: 'bold' }}>Batch Observations:</span>
                              {batchesWithRemarks.map((b: any, idx: number) => (
                                <div key={idx} style={{ color: '#4a4540', fontStyle: 'italic' }}>
                                  - {b.remarks}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td colSpan={1} className="left-align" style={{ height: '30px', verticalAlign: 'top', width: '40%', borderTop: 'none' }}>
                    <strong>Quality Remarks</strong>
                    {currentApproval?.qualityRemark && (
                      <div style={{ marginTop: 4, fontSize: 11, color: 'var(--charcoal)' }}>{currentApproval.qualityRemark}</div>
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={1} className="left-align" style={{ height: '60px', verticalAlign: 'top', padding: '8px' }}>
                    <strong>Operator Sign</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={1} className="left-align" style={{ height: '60px', verticalAlign: 'top', padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                      <div style={{ width: 120 }}>
                        <strong>Inspector Sign</strong>
                      </div>
                      {currentApproval?.signature && (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                          <img
                            src={currentApproval.signature}
                            alt="Signature"
                            style={{ maxHeight: '44px', maxWidth: '150px', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                      {currentApproval && (
                        <div style={{ fontSize: 10, color: 'var(--slate)', textAlign: 'right', minWidth: 150 }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{currentApproval.inspectorName}</div>
                          <div>{new Date(currentApproval.approvedAt).toLocaleDateString()} {new Date(currentApproval.approvedAt).toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="left-align" style={{ minHeight: '60px', verticalAlign: 'bottom', padding: '8px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1, paddingRight: 20 }}>
                        <span><strong>Additional Note:-</strong></span>
                        {currentApproval?.additionalNote && (
                          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--charcoal)' }}>{currentApproval.additionalNote}</div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {currentApproval && (
                          <span><strong>Approved By: </strong> 
                            {`${currentApproval.inspectorName} (${currentApproval.approverDesignation || 'Quality Head'})`}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
          {/* END OF CERTIFICATE (On the last page of every operation) */}
          {page.isLast && (
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginTop: '20px', paddingBottom: '10px', fontStyle: 'italic', color: '#333', fontFamily: '"Georgia", "Times New Roman", serif', letterSpacing: '1px' }}>
              *** END OF CERTIFICATE ***
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}
