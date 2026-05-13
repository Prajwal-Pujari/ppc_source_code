import React from 'react';
import type { QualityReportDto } from '@/types/domain.types';

// Layout Inspection is similar to PDIR but usually represents a 100% check of all dimensions on a first piece or sample.
export default function LayoutReportView({ data }: { data: QualityReportDto }) {
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
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', textTransform: 'uppercase' }}>Layout Inspection Report</h2>
        <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>Complete Dimensional Verification</p>
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
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'left', width: 120 }}>Operation</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'left', width: 200 }}>Dimension / Characteristic</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 100 }}>Nominal / Spec</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center' }}>Measured Result</th>
              <th style={{ border: '1px solid black', padding: 6, textAlign: 'center', width: 60 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {allMeasurements.map((m, i) => {
              // For a Layout Report, we typically only show the FIRST piece or FIRST batch checked.
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
                  <td style={{ border: '1px solid black', padding: 6 }}>{m.opName}</td>
                  <td style={{ border: '1px solid black', padding: 6 }}>{m.paramName}</td>
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
        <p style={{ margin: 0 }}><strong>Inspector Signature:</strong> ______________________</p>
        <p style={{ margin: 0 }}><strong>Quality Manager:</strong> ______________________</p>
      </div>
    </div>
  );
}
