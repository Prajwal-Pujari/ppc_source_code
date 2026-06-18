import React from 'react';
import type { QualityReportDto, PqcMeasurement } from '@/types/domain.types';

export default function InProcessReportView({ data, config }: { data: QualityReportDto, config?: any }) {
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
      uniqueDates.add(new Date(b.logTime).toLocaleDateString());
      if (b.inspectorName) uniqueOperators.add(b.inspectorName);
      if (b.shiftName) uniqueShifts.add(b.shiftName);
      if (b.machineName) uniqueMachines.add(b.machineName);
    });
  });

  const datesArray = Array.from(uniqueDates).sort();
  const dateDisplay = datesArray.length === 0
    ? new Date(data.generatedAt).toLocaleDateString()
    : datesArray.length === 1
      ? datesArray[0]
      : `${datesArray[0]} to ${datesArray[datesArray.length - 1]}`;

  const operatorDisplay = Array.from(uniqueOperators).join(', ') || '-';
  const shiftDisplay = Array.from(uniqueShifts).join(', ') || '-';
  const machineDisplay = Array.from(uniqueMachines).join(', ') || '-';

  // --- 1. Flatten all rows ---
  type RowDef =
    | { type: 'opHeader'; op: any; isContinued?: boolean }
    | { type: 'timeHeader'; op: any; isContinued?: boolean }
    | { type: 'param'; op: any; param: PqcMeasurement }
    | { type: 'empty' };

  const allRows: RowDef[] = [];
  data.operations.forEach(op => {
    const uniqueParamsMap = new Map<string, PqcMeasurement>();
    op.batches.forEach(b => {
      b.measurements?.forEach(m => {
        if (!uniqueParamsMap.has(m.questionId)) {
          uniqueParamsMap.set(m.questionId, m);
        }
      });
    });
    const uniqueParams = Array.from(uniqueParamsMap.values());

    if (uniqueParams.length > 0) {
      allRows.push({ type: 'opHeader', op });
      allRows.push({ type: 'timeHeader', op });
      uniqueParams.forEach(p => {
        allRows.push({ type: 'param', op, param: p });
      });
    }
  });

  // --- 2. Chunk rows into pages for strict A4 printing/PDF generation ---
  const pages: { isFirst: boolean; isLast: boolean; rows: RowDef[] }[] = [];
  let rowsRemaining = [...allRows];
  let isFirst = true;

  while (rowsRemaining.length > 0) {
    // If the next row is a param, it means we are continuing an operation from the previous page.
    // Prepend the operation headers so the user knows what operation these parameters belong to.
    if (!isFirst && rowsRemaining.length > 0) {
      if (rowsRemaining[0].type === 'param') {
        const activeOp = rowsRemaining[0].op;
        rowsRemaining.unshift(
          { type: 'opHeader', op: activeOp, isContinued: true },
          { type: 'timeHeader', op: activeOp, isContinued: true }
        );
      } else if (rowsRemaining[0].type === 'timeHeader') {
        const activeOp = rowsRemaining[0].op;
        rowsRemaining.unshift(
          { type: 'opHeader', op: activeOp, isContinued: true }
        );
      }
    }

    const limit = 8; // strict limit of 8 rows per page, whether it has a footer or not

    let takeCount = limit;
    let isLast = false;

    if (rowsRemaining.length <= limit) {
      takeCount = rowsRemaining.length;
      isLast = true;
    } else {
      takeCount = limit;
      isLast = false;
    }

    const chunk = rowsRemaining.slice(0, takeCount);
    pages.push({ isFirst, isLast, rows: chunk });

    rowsRemaining = rowsRemaining.slice(takeCount);
    isFirst = false;
  }

  // If there are no rows remaining but we haven't placed the footer yet
  if (pages.length === 0 || !pages[pages.length - 1].isLast) {
    pages.push({ isFirst: pages.length === 0, isLast: true, rows: [] });
  }

  // Pad pages with empty rows so the grid covers the whole page uniformly
  pages.forEach(page => {
    const targetRows = 8; // Always pad to exactly 8 rows so all tables are identical in size
    const currentRows = page.rows.length;
    if (currentRows < targetRows) {
      for (let i = 0; i < targetRows - currentRows; i++) {
        page.rows.push({ type: 'empty' });
      }
    }
  });

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

      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className="pdf-page">

          {/* HEADER SECTION (Now on every page) */}
          <table className="cert-table" style={{ borderBottom: 'none' }}>
            <tbody>
              <tr>
                <td rowSpan={2} style={{ width: '10%' }}>
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {(data.customerLogo || config?.customerLogo) ? (
                      <img src={(data.customerLogo || config?.customerLogo) as string} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: '#666' }}>LOGO</span>
                    )}
                  </div>
                </td>
                <td rowSpan={2} colSpan={3} style={{ width: '65%', fontSize: '18px', fontWeight: 'bold' }}>IN-PROCESS INSPECTION REPORT</td>
                <td colSpan={2} className="left-align" style={{ width: '25%', fontSize: '10px', verticalAlign: 'top', padding: '4px' }}>
                  <div><strong>Doc. No:-</strong> {data.docNo || config?.docNo || ''}</div>
                  <div><strong>Rev.No./Date:-</strong> {data.revNo || config?.revNo || ''}</div>
                  <div><strong>Issue Date:-</strong> {data.issueDate || config?.issueDate || ''}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ fontSize: '10px' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ width: '40%' }}><strong>Part No./Name:</strong> {data.partName}</td>
                <td colSpan={2} className="left-align" style={{ width: '30%' }}><strong>Operator Name:</strong> {operatorDisplay}</td>
                <td className="left-align" style={{ width: '20%' }}><strong>Inspection Date(s):</strong> {dateDisplay}</td>
                <td className="left-align" style={{ width: '10%' }}><strong>Shift:</strong> {shiftDisplay}</td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align"><strong>Drg. Reference/Model:</strong> {data.serialNumber || data.gaugeId}</td>
                <td colSpan={2} className="left-align"><strong>Setup/Opr. No.:</strong> Continuous</td>
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
            {page.rows.length > 0 && (
              <>
                <tr style={{ backgroundColor: '#e9e7dfff' }}>
                  <th rowSpan={2} style={{ width: '4%', whiteSpace: 'nowrap' }}>Sl. No</th>
                  <th rowSpan={2} style={{ width: '20%' }}>Parameter</th>
                  <th rowSpan={2} style={{ width: '10%' }}>Specification</th>
                  <th rowSpan={2} style={{ width: '10%' }}>Tolerance</th>
                  <th rowSpan={2} style={{ width: '12%', whiteSpace: 'nowrap' }}>Measuring Instrument/Gauge</th>
                  <th rowSpan={2} style={{ width: '4%' }}>Time</th>
                  <th colSpan={8}>Observations</th>
                </tr>
                <tr style={{ backgroundColor: '#e9e7dfff' }}>
                  {[...Array(8)].map((_, i) => <th key={i} style={{ width: '5%', height: '20px' }}></th>)}
                </tr>
              </>
            )}
              {page.rows.map((row, rIdx) => {
                if (row.type === 'opHeader') {
                  return (
                    <tr key={`op-${rIdx}`} style={{ backgroundColor: '#f5f2edff' }}>
                      <td colSpan={14} className="left-align bold">Operation: {row.op.sequenceOrder} - {row.op.operationName} {row.isContinued ? '(Continued)' : ''}</td>
                    </tr>
                  );
                }
                if (row.type === 'timeHeader') {
                  return (
                    <tr key={`time-${rIdx}`}>
                      <td colSpan={5} className="left-align bold" style={{ textAlign: 'right' }}>Time:</td>
                      <td></td>
                      {[...Array(8)].map((_, i) => (
                        <td key={i} className="bold" style={{ height: '24px' }}>
                          {row.op.batches[i] ? new Date(row.op.batches[i].logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </td>
                      ))}
                    </tr>
                  );
                }
                if (row.type === 'param') {
                  return (
                    <tr key={`param-${rIdx}`}>
                      <td>{globalSlNo++}</td>
                      <td className="left-align">{row.param.parameterName}</td>
                      <td>{getSpecString(row.param)}</td>
                      <td>{getToleranceString(row.param)}</td>
                      <td></td>
                      <td></td>
                      {[...Array(8)].map((_, bIndex) => {
                        const batch = row.op.batches[bIndex];
                        let val = '';
                        if (batch) {
                          const m = batch.measurements?.find((x: any) => x.questionId === row.param.questionId);
                          if (m) {
                            val = formatActualValue(m.actualValue, m.expectedAnswer);
                          } else {
                            val = '-';
                          }
                        }
                        return <td key={bIndex}>{val}</td>;
                      })}
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
                      <td></td>
                      {[...Array(8)].map((_, j) => <td key={`empty-obs-${rIdx}-${j}`} style={{ height: '24px' }}></td>)}
                    </tr>
                  );
                }
                return null;
              })}
            </tbody>
          </table>

          {/* PTO Text for multi-page reports */}
          {!page.isLast && (
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '12px', marginTop: '4px', fontStyle: 'italic', paddingRight: '8px' }}>
              P.T.O.
            </div>
          )}
          {/* FOOTER SECTION (Only on last page) */}
          {page.isLast && (
            <table className="cert-table" style={{ borderTop: 'none', marginTop: page.rows.length === 0 ? 0 : 'auto' }}>
              <tbody>
                <tr>
                  <td colSpan={6} rowSpan={3} className="left-align" style={{ verticalAlign: 'top', width: '60%', borderTop: 'none' }}>
                    <strong>Remarks(Rework/Tool Change/Dimensional Issue/Other):-</strong>
                  </td>
                  <td colSpan={8} className="left-align" style={{ height: '30px', verticalAlign: 'top', width: '40%', borderTop: 'none' }}>
                    <strong>Quality Remarks</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="left-align" style={{ height: '60px', verticalAlign: 'top', padding: '8px' }}>
                    <strong>Operator Sign</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="left-align" style={{ height: '60px', verticalAlign: 'top', padding: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                      <div style={{ width: 120 }}>
                        <strong>Inspector Sign</strong>
                      </div>
                      {config?.activeApproval?.signature && (
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                          <img 
                            src={config.activeApproval.signature} 
                            alt="Signature" 
                            style={{ maxHeight: '44px', maxWidth: '150px', objectFit: 'contain' }} 
                          />
                        </div>
                      )}
                      {config?.activeApproval && (
                        <div style={{ fontSize: 10, color: 'var(--slate)', textAlign: 'right', minWidth: 150 }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{config.activeApproval.inspectorName}</div>
                          <div>{new Date(config.activeApproval.approvedAt).toLocaleDateString()} {new Date(config.activeApproval.approvedAt).toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={14} className="left-align" style={{ height: '60px', verticalAlign: 'bottom', padding: '8px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span><strong>Additional Note:-</strong></span>
                      <span><strong>Approved By: Quality Head</strong></span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}
