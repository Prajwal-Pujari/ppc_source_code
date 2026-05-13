import React from 'react';
import type { QualityReportDto } from '@/types/domain.types';

// FAI (First Article Inspection) Report, typically formatted similarly to AS9102 Form 3 (Dimensional)
export default function FaiReportView({ data }: { data: QualityReportDto }) {
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
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', textTransform: 'uppercase' }}>First Article Inspection (FAI) Report</h2>
        <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>Dimensional / Characteristic Accountability (AS9102 Format Equivalent)</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, border: '1px solid black', padding: 12, marginBottom: 24, fontSize: 12 }}>
        <div><strong>Part Name:</strong> {data.partName}</div>
        <div><strong>PO Number:</strong> {data.poNumber}</div>
        <div><strong>Customer:</strong> {data.customerName}</div>
        <div><strong>Serial/Batch No:</strong> {data.serialNumber}</div>
        <div><strong>FAI Qty Checked:</strong> 1</div>
        <div><strong>Date:</strong> {new Date(data.generatedAt).toLocaleDateString()}</div>
      </div>

      {allMeasurements.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 40 }}>No dimensional data recorded.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 40 }}>Char No.</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'left', width: 250 }}>Requirement / Spec</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 100 }}>Tolerance</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>Actual Result (First Article)</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 60 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {allMeasurements.map((m, i) => {
              // For FAI, we show only the FIRST piece checked.
              const firstBatch = batchKeys[0];
              const val = firstBatch ? m.batchValues[firstBatch.logId] : null;
              
              let isOut = false;
              if (val !== undefined && val !== null && m.min !== undefined && m.max !== undefined) {
                const numVal = Number(val);
                if (!isNaN(numVal) && (numVal < m.min || numVal > m.max)) isOut = true;
              }
              if (val !== undefined && val !== null && m.expected && String(val).toUpperCase() !== m.expected.toUpperCase()) {
                 if (m.expected.toUpperCase() === 'PASS' && String(val).toUpperCase() === 'FAIL') isOut = true;
              }

              return (
                <tr key={i}>
                  <td style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid black', padding: 6 }}>{m.paramName} <span style={{ fontSize: 9, color: '#666' }}>({m.opName})</span></td>
                  <td style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>
                    {m.min !== undefined && m.max !== undefined ? `${m.min} ~ ${m.max}` : m.expected || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>
                    {val !== undefined && val !== null ? String(val) : '-'}
                  </td>
                  <td style={{ border: '1px solid black', padding: 6, textAlign: 'center', color: isOut ? 'red' : 'green', fontWeight: 'bold' }}>
                    {val === undefined || val === null ? '-' : (isOut ? 'REJECT' : 'ACCEPT')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 40, borderTop: '1px solid black', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <p style={{ margin: 0 }}><strong>Prepared By:</strong> ______________________</p>
        <p style={{ margin: 0 }}><strong>Approved By:</strong> ______________________</p>
      </div>
    </div>
  );
}
