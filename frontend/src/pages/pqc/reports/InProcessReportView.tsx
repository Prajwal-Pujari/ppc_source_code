import React from 'react';
import type { QualityReportDto } from '@/types/domain.types';

export default function InProcessReportView({ data }: { data: QualityReportDto }) {
  return (
    <div style={{ color: 'black', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid black', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0', textTransform: 'uppercase' }}>In-Process Inspection Report</h2>
          <p style={{ margin: 0, fontSize: 12, color: '#444' }}>Generated: {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13 }}>
          <p style={{ margin: '0 0 4px 0' }}><strong>PO Number:</strong> {data.poNumber}</p>
          <p style={{ margin: '0 0 4px 0' }}><strong>Customer:</strong> {data.customerName}</p>
          <p style={{ margin: '0 0 4px 0' }}><strong>Part Name:</strong> {data.partName}</p>
          <p style={{ margin: '0 0 4px 0' }}><strong>Target Qty:</strong> {data.targetQuantity}</p>
        </div>
      </div>

      {data.operations.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 40 }}>No operations logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {data.operations.map(op => (
            <div key={op.operationId} style={{ border: '1px solid #ccc', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ background: '#f5f5f5', padding: '10px 16px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Operation: {op.sequenceOrder} - {op.operationName}</h3>
                <span style={{ fontSize: 13 }}>{op.batches.length} Batches Inspected</span>
              </div>

              {op.batches.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: '#666', fontStyle: 'italic' }}>No inspections recorded for this operation.</div>
              ) : (
                <div style={{ padding: 0 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '2px solid #ddd' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Time</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Inspector</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Inspected</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Passed</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#8b0000' }}>Rejected</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: '#b8860b' }}>Rework</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Parameters Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {op.batches.map(batch => (
                        <tr key={batch.logId} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>{new Date(batch.logTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>{batch.inspectorName}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'top', fontWeight: 600 }}>{batch.inspectedQty}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'top', color: 'green' }}>{batch.passedQty}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'top', color: batch.rejectedQty > 0 ? 'red' : 'inherit' }}>{batch.rejectedQty}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'top', color: batch.reworkQty > 0 ? '#b8860b' : 'inherit' }}>{batch.reworkQty}</td>
                          <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                            {batch.measurements && batch.measurements.length > 0 ? (
                              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>
                                {batch.measurements.map((m, i) => (
                                  <li key={i} style={{ marginBottom: 4 }}>
                                    <strong>{m.parameterName}:</strong> {m.actualValue !== null && m.actualValue !== undefined ? String(m.actualValue) : 'N/A'} 
                                    {m.minValue !== undefined && m.maxValue !== undefined ? ` (Spec: ${m.minValue} - ${m.maxValue})` : ''}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <span style={{ color: '#999', fontStyle: 'italic' }}>No detailed parameters logged.</span>
                            )}
                            {batch.remarks && <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#d97706' }}><strong>Remark:</strong> {batch.remarks}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: 40, borderTop: '1px solid black', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <p style={{ margin: 0 }}><strong>Authorized Signature:</strong> ______________________</p>
        <p style={{ margin: 0 }}>Page 1 of 1</p>
      </div>
    </div>
  );
}
