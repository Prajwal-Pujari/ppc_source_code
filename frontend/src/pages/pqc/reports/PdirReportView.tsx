import React from 'react';
import type { QualityReportDto } from '@/types/domain.types';

export default function PdirReportView({ data, config }: { data: QualityReportDto, config?: any }) {
  // Extract total inspected quantity across all operations and batches
  let totalInspected = 0;
  const allMeasurements: {
    opName: string;
    paramName: string;
    min?: number;
    max?: number;
    expected?: string;
    unit?: string;
    checkingMethod?: string;
    batchValues: Record<string, any>;
  }[] = [];

  const batchKeys: { logId: string; time: string; qty: number; index: number }[] = [];

  data.operations?.forEach(op => {
    // 1. Register all configured parameters for this operation so they appear even if batches are empty
    op.configuredParameters?.forEach(m => {
      if (m.showInPdir === false) return;
      let existing = allMeasurements.find(x => x.paramName === m.parameterName && x.opName === op.operationName);
      if (!existing) {
        allMeasurements.push({
          opName: op.operationName,
          paramName: m.parameterName,
          min: m.minValue !== undefined && m.minValue !== null ? Number(m.minValue) : undefined,
          max: m.maxValue !== undefined && m.maxValue !== null ? Number(m.maxValue) : undefined,
          expected: m.expectedAnswer,
          unit: m.unit,
          checkingMethod: m.checkingMethod || 'D.V.C',
          batchValues: {}
        });
      }
    });

    // 2. Loop through batch measurements to record values or register any extra parameters
    op.batches?.forEach((b, batchIdx) => {
      const batchKey = `${op.operationId}-${b.logId}`;
      batchKeys.push({
        logId: batchKey,
        time: new Date(b.logTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        qty: b.inspectedQty || 0,
        index: batchKeys.length + 1
      });
      totalInspected += (b.inspectedQty || 0);

      b.measurements?.forEach(m => {
        // Filter out questions explicitly unchecked for PDIR
        if (m.showInPdir === false) return;

        let existing = allMeasurements.find(x => x.paramName === m.parameterName && x.opName === op.operationName);
        if (!existing) {
          existing = {
            opName: op.operationName,
            paramName: m.parameterName,
            min: m.minValue !== undefined && m.minValue !== null ? Number(m.minValue) : undefined,
            max: m.maxValue !== undefined && m.maxValue !== null ? Number(m.maxValue) : undefined,
            expected: m.expectedAnswer,
            unit: m.unit,
            checkingMethod: m.checkingMethod || 'D.V.C',
            batchValues: {}
          };
          allMeasurements.push(existing);
        }
        if (m.actualValue !== undefined && m.actualValue !== null) {
          existing.batchValues[batchKey] = m.actualValue;
        }
      });
    });
  });

  // Ensure we display at least 10 observation columns to match standard PDIR sheet layout
  const maxObsColumns = Math.max(10, batchKeys.length);
  const displayCols = Array.from({ length: maxObsColumns }, (_, i) => {
    return batchKeys[i] || { logId: `empty-${i}`, time: '', qty: 0, index: i + 1 };
  });

  const getSpecString = (m: typeof allMeasurements[0]) => {
    if (m.min !== undefined && m.max !== undefined && !isNaN(m.min) && !isNaN(m.max)) {
      const nominal = (m.min + m.max) / 2;
      const tol = (m.max - m.min) / 2;
      return `${parseFloat(nominal.toFixed(3))} ± ${parseFloat(tol.toFixed(3))}${m.unit ? ' ' + m.unit : ''}`;
    }
    if (m.expected && m.expected.trim() !== '') {
      return m.expected;
    }
    return 'As per Drg.';
  };

  const reportDate = data.generatedAt
    ? new Date(data.generatedAt).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const logoUrl = data.customerLogo || config?.customerLogo;
  const docNo = data.docNo || config?.docNo || 'Format no :- OP/QA-05 C5';

  return (
    <div className="pdf-page pdir-report-container" style={{ color: 'black', fontFamily: 'Arial, sans-serif', fontSize: '11px', background: 'white', padding: '16px' }}>
      <style>
        {`
          @media print {
            @page { size: A4 landscape; margin: 8mm; }
            body { background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .pdir-report-container { padding: 0 !important; width: 100% !important; }
          }
          .pdir-report-container {
            width: 1123px; /* A4 landscape width at 96dpi */
            min-height: 794px; /* Minimum height for A4 landscape */
            box-sizing: border-box;
          }
          .pdir-table {
            width: 100%;
            border-collapse: collapse;
          }
          .pdir-table th, .pdir-table td {
            border: 1px solid #000;
            padding: 5px 6px;
            vertical-align: middle;
          }
          .pdir-header-cell {
            background-color: #fff;
            font-weight: bold;
          }
        `}
      </style>

      {/* TOP TITLE SECTION */}
      <table className="pdir-table" style={{ marginBottom: '-1px' }}>
        <tbody>
          <tr>
            <td style={{ width: '12%', textAlign: 'center', height: '56px' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: '#333' }}>
                  {config?.customerName || ''}
                </span>
              )}
            </td>
            <td style={{ width: '60%', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              PRE- DISPATCH INSPECTION REPORT
            </td>
            <td style={{ width: '28%', fontSize: '11px', paddingLeft: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Date:- {reportDate}</div>
              <div style={{ fontSize: '10px' }}>
                {data.docNo || config?.pdirDocNo || config?.docNo ? <div>Doc. No: {data.docNo || config?.pdirDocNo || config?.docNo}</div> : null}
                {data.revNo || config?.pdirRevNo || config?.revNo ? <div>Rev.No./Date: {data.revNo || config?.pdirRevNo || config?.revNo}</div> : null}
                {data.issueDate || config?.pdirIssueDate || config?.issueDate ? <div>Issue Date: {data.issueDate || config?.pdirIssueDate || config?.issueDate}</div> : null}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* DETAILS GRID */}
      <table className="pdir-table" style={{ marginBottom: '-1px' }}>
        <tbody>
          <tr>
            <td style={{ width: '35%', verticalAlign: 'top' }}>
              <strong>Supplier :-</strong> {config?.customerName || ''}
            </td>
            <td style={{ width: '35%', verticalAlign: 'top' }}>
              <strong>Invoice no :-</strong> {data.poNumber || '—'}
            </td>
            <td style={{ width: '30%', verticalAlign: 'top' }}>
              <strong>Part discription :-</strong> {data.partName || '—'}
            </td>
          </tr>
          <tr>
            <td style={{ verticalAlign: 'top' }}>
              <strong>Customer :-</strong> {data.customerName || 'Sonepar india'}
            </td>
            <td style={{ verticalAlign: 'top' }}>
              <div><strong>Invoice date:</strong> {reportDate}</div>
              <div style={{ marginTop: '4px' }}><strong>Part no :-</strong> {data.serialNumber || '—'}</div>
            </td>
            <td style={{ verticalAlign: 'top' }}>
              <div><strong>Sheet no :-</strong> 01</div>
              <div style={{ marginTop: '3px' }}><strong>Lot size :-</strong> {data.targetQuantity || '—'}</div>
              <div style={{ marginTop: '3px' }}><strong>Inspected qty :-</strong> {totalInspected}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* OBSERVATIONS TABLE */}
      <table className="pdir-table">
        <thead>
          <tr>
            <th rowSpan={2} style={{ width: '35px', textAlign: 'center' }}>S. No.</th>
            <th rowSpan={2} style={{ width: '150px', textAlign: 'left' }}>Parameter</th>
            <th rowSpan={2} style={{ width: '130px', textAlign: 'center' }}>Specification</th>
            <th rowSpan={2} style={{ width: '90px', textAlign: 'center' }}>Checking method</th>
            <th colSpan={displayCols.length} style={{ textAlign: 'center', background: '#fafafa' }}>
              OBSERVATIONS<br />
              <span style={{ fontSize: '10px', fontWeight: 'normal' }}>(All observations are in mm unless otherwise specified.)</span>
            </th>
            <th rowSpan={2} style={{ width: '100px', textAlign: 'center' }}>REMARKS</th>
          </tr>
          <tr>
            {displayCols.map((col, idx) => (
              <th key={idx} style={{ textAlign: 'center', width: '32px', fontSize: '10px' }}>
                {idx + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allMeasurements.length === 0 ? (
            <tr>
              <td colSpan={5 + displayCols.length} style={{ textAlign: 'center', padding: '30px', color: '#666', fontStyle: 'italic' }}>
                No dimensional parameters flagged for PDIR display.
              </td>
            </tr>
          ) : (
            allMeasurements.map((m, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ fontWeight: 'bold' }}>{m.paramName}</td>
                <td style={{ textAlign: 'center' }}>{getSpecString(m)}</td>
                <td style={{ textAlign: 'center' }}>{m.checkingMethod || 'D.V.C'}</td>
                {displayCols.map((col, cIdx) => {
                  const val = col.logId ? m.batchValues[col.logId] : undefined;
                  let isOut = false;
                  if (val !== undefined && val !== null && m.min !== undefined && m.max !== undefined) {
                    const numVal = Number(val);
                    if (!isNaN(numVal) && (numVal < m.min || numVal > m.max)) isOut = true;
                  }
                  if (val !== undefined && val !== null && m.expected && String(val).toUpperCase() !== m.expected.toUpperCase()) {
                    if (m.expected.toUpperCase() === 'PASS' && String(val).toUpperCase() === 'FAIL') isOut = true;
                  }

                  return (
                    <td
                      key={cIdx}
                      style={{
                        textAlign: 'center',
                        color: isOut ? '#d9381e' : 'inherit',
                        fontWeight: isOut ? 'bold' : 'normal'
                      }}
                    >
                      {val !== undefined && val !== null ? String(val) : ''}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center' }}>
                  {displayCols.some(col => {
                    const v = m.batchValues[col.logId];
                    if (v !== undefined && v !== null && m.min !== undefined && m.max !== undefined) {
                      const n = Number(v);
                      return !isNaN(n) && (n < m.min || n > m.max);
                    }
                    return false;
                  }) ? 'OUT OF SPEC' : 'OK'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* FOOTER SECTION */}
      <table className="pdir-table" style={{ marginTop: '-1px' }}>
        <tbody>
          <tr>
            <td style={{ width: '85%', textAlign: 'right', fontWeight: 'bold' }}>Any Other Remarks:</td>
            <td style={{ width: '15%', textAlign: 'center', fontWeight: 'bold' }}>ACCEPTED</td>
          </tr>
          <tr>
            <td style={{ height: '45px', verticalAlign: 'bottom' }}>
              <strong>CHECKED BY :</strong> ___________________________
            </td>
            <td style={{ verticalAlign: 'bottom' }}>
              <strong>APPROVED BY :-</strong> ___________________________
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ fontSize: '10px', fontWeight: 'bold' }}>
              {docNo}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
