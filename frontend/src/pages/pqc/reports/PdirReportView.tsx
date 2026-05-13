import React from 'react';
import type { QualityReportDto } from '@/types/domain.types';

export default function PdirReportView({ data }: { data: QualityReportDto }) {
  // PDIR usually shows all dimensional parameters as rows, and the inspected parts as columns.
  // Since we inspect in batches, we will show Batches as columns.
  // First, we need to extract all unique parameters across all operations.
  
  const allMeasurements: { opName: string, paramName: string, min?: number, max?: number, expected?: string, batchValues: Record<string, any> }[] = [];
  const batchKeys: { opName: string, logId: string, time: string, qty: number }[] = [];

  data.operations.forEach(op => {
    op.batches.forEach((b, batchIdx) => {
      const batchKey = `${op.operationId}-${b.logId}`;
      batchKeys.push({ opName: op.operationName, logId: batchKey, time: new Date(b.logTime).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }), qty: b.inspectedQty });
      
      b.measurements.forEach(m => {
        let existing = allMeasurements.find(x => x.paramName === m.parameterName && x.opName === op.operationName);
        if (!existing) {
          existing = {
            opName: op.operationName,
            paramName: m.parameterName,
            min: m.minValue,
            max: m.maxValue,
            expected: m.expectedAnswer,
            batchValues: {}
          };
          allMeasurements.push(existing);
        }
        existing.batchValues[batchKey] = m.actualValue;
      });
    });
  });

  return (
    <div style={{ color: 'black', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Part Dimensional Inspection Report (PDIR)</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, border: '1px solid black', padding: 12, marginBottom: 24, fontSize: 12 }}>
        <div><strong>Part Name:</strong> {data.partName}</div>
        <div><strong>PO Number:</strong> {data.poNumber}</div>
        <div><strong>Customer:</strong> {data.customerName}</div>
        <div><strong>Serial/Batch No:</strong> {data.serialNumber}</div>
        <div><strong>Target Qty:</strong> {data.targetQuantity}</div>
        <div><strong>Date:</strong> {new Date(data.generatedAt).toLocaleDateString()}</div>
      </div>

      {allMeasurements.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 40 }}>No dimensional data recorded.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th rowSpan={2} style={{ border: '1px solid black', padding: 6, textAlign: 'left', width: 120 }}>Operation</th>
              <th rowSpan={2} style={{ border: '1px solid black', padding: 6, textAlign: 'left', width: 200 }}>Parameter / Characteristic</th>
              <th rowSpan={2} style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 100 }}>Tolerance / Spec</th>
              <th colSpan={batchKeys.length} style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>Actual Measurements (Batch Wise)</th>
            </tr>
            <tr style={{ background: '#fafafa' }}>
              {batchKeys.map((bk, i) => (
                <th key={bk.logId} style={{ border: '1px solid black', padding: 4, textAlign: 'center', fontWeight: 'normal' }}>
                  B{i+1}<br/><span style={{ fontSize: 9 }}>({bk.qty} pcs)</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allMeasurements.map((m, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid black', padding: 6 }}>{m.opName}</td>
                <td style={{ border: '1px solid black', padding: 6 }}>{m.paramName}</td>
                <td style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>
                  {m.min !== undefined && m.max !== undefined ? `${m.min} ~ ${m.max}` : m.expected || 'N/A'}
                </td>
                {batchKeys.map(bk => {
                  const val = m.batchValues[bk.logId];
                  let isOut = false;
                  if (val !== undefined && val !== null && m.min !== undefined && m.max !== undefined) {
                    const numVal = Number(val);
                    if (!isNaN(numVal) && (numVal < m.min || numVal > m.max)) isOut = true;
                  }
                  if (val !== undefined && val !== null && m.expected && String(val).toUpperCase() !== m.expected.toUpperCase()) {
                     // Very simple string check
                     if (m.expected.toUpperCase() === 'PASS' && String(val).toUpperCase() === 'FAIL') isOut = true;
                  }

                  return (
                    <td key={bk.logId} style={{ border: '1px solid black', padding: 6, textAlign: 'center', color: isOut ? 'red' : 'inherit', fontWeight: isOut ? 'bold' : 'normal' }}>
                      {val !== undefined && val !== null ? String(val) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 40, borderTop: '1px solid black', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <p style={{ margin: 0 }}><strong>Inspector Signature:</strong> ______________________</p>
        <p style={{ margin: 0 }}><strong>QA Manager Approval:</strong> ______________________</p>
      </div>
    </div>
  );
}
