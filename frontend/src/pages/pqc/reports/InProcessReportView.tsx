import React from 'react';
import type { QualityReportDto, PqcMeasurement } from '@/types/domain.types';

export default function InProcessReportView({ data }: { data: QualityReportDto }) {
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

  // Determine Operator from the first batch of the first operation, if any
  let operatorName = '';
  if (data.operations && data.operations.length > 0) {
    const firstOpWithBatches = data.operations.find(op => op.batches && op.batches.length > 0);
    if (firstOpWithBatches) {
      operatorName = firstOpWithBatches.batches[0].inspectorName;
    }
  }

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
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#666' }}>
                    LOGO
                  </div>
                </td>
                <td rowSpan={2} colSpan={3} style={{ width: '65%', fontSize: '18px', fontWeight: 'bold' }}>IN-PROCESS INSPECTION REPORT</td>
                <td colSpan={2} className="left-align" style={{ width: '25%', fontSize: '10px', verticalAlign: 'top', padding: '4px' }}>
                  <div><strong>Doc. No:-</strong></div>
                  <div><strong>Rev.No./Date:-</strong></div>
                  <div><strong>Issue Date:-</strong></div>
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ fontSize: '10px' }}>&nbsp;</td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align" style={{ width: '40%' }}><strong>Part No./Name:</strong> {data.partName}</td>
                <td colSpan={2} className="left-align" style={{ width: '30%' }}><strong>Operator Name:</strong> {operatorName}</td>
                <td className="left-align" style={{ width: '20%' }}><strong>Inspection Date:</strong> {new Date(data.generatedAt).toLocaleDateString()}</td>
                <td className="left-align" style={{ width: '10%' }}><strong>Shift:</strong> </td>
              </tr>
              <tr>
                <td colSpan={2} className="left-align"><strong>Drg. Reference/Model:</strong> {data.serialNumber || data.gaugeId}</td>
                <td colSpan={2} className="left-align"><strong>Setup/Opr. No.:</strong> Continuous</td>
                <td colSpan={2} className="left-align"><strong>M/C Name/No.:</strong> </td>
              </tr>
            </tbody>
          </table>

          {/* MAIN DATA TABLE */}
          <table className="cert-table" style={{
            borderTop: 'none',
            borderBottom: page.isLast ? 'none' : '1px solid #000'
          }}>
            {page.rows.length > 0 && (
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: '4%' }}>Sl. No</th>
                  <th rowSpan={2} style={{ width: '20%' }}>Parameter</th>
                  <th rowSpan={2} style={{ width: '10%' }}>Specification</th>
                  <th rowSpan={2} style={{ width: '10%' }}>Tolerance</th>
                  <th rowSpan={2} style={{ width: '12%' }}>Measuring Instrument/Gauge</th>
                  <th rowSpan={2} style={{ width: '4%' }}>Time</th>
                  <th colSpan={8}>Observations</th>
                </tr>
                <tr>
                  {[...Array(8)].map((_, i) => <th key={i} style={{ width: '5%', height: '20px' }}></th>)}
                </tr>
              </thead>
            )}
            <tbody>
              {page.rows.map((row, rIdx) => {
                if (row.type === 'opHeader') {
                  return (
                    <tr key={`op-${rIdx}`} style={{ backgroundColor: '#f9fafb' }}>
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
                  <td colSpan={8} className="left-align" style={{ height: '40px', verticalAlign: 'top' }}>
                    <strong>Operator Sign</strong>
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="left-align" style={{ height: '40px', verticalAlign: 'top' }}>
                    <strong>Inspector Sign</strong>
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
