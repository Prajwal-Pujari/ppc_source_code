import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/axios';

interface VisionCheckpoint {
  id: string;
  name: string;
  balloon: string;
  expectedClass: string;
  aiClass: string;
  aiConfidence: number;
  result: 'PASS' | 'FAIL';
  defectType: string | null;
}

interface VisionResult {
  id: string;
  partId: string;
  dataMatrix: string;
  overallResult: 'PASS' | 'FAIL';
  inspectionMethod: string;
  inspectedAt: string;
  defectsFound: number;
  checkpoints: VisionCheckpoint[];
}

export default function VisionInspectionResultsPage() {
  const [results, setResults] = useState<VisionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const response = await api.get('/vision/results');
      setResults(response.data);
    } catch (error) {
      console.error('Failed to fetch vision results', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    // Auto refresh every 5 seconds for live dashboard feel
    const interval = setInterval(fetchResults, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleRow = (id: string) => {
    if (expandedRow === id) setExpandedRow(null);
    else setExpandedRow(id);
  };

  if (loading && results.length === 0) {
    return (
      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <p>Loading inspection results...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, background: 'var(--copper-bronze)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>AI Vision Inspections</h1>
            <p style={{ fontSize: 14, color: 'var(--slate)', margin: '4px 0 0 0' }}>Live stream of computer vision results</p>
          </div>
        </div>
      </div>

      <div className="card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--silk)', textAlign: 'left', fontSize: 14, color: 'var(--slate)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 500 }}>Date/Time</th>
              <th style={{ padding: '16px 24px', fontWeight: 500 }}>Part ID</th>
              <th style={{ padding: '16px 24px', fontWeight: 500 }}>Data Matrix</th>
              <th style={{ padding: '16px 24px', fontWeight: 500 }}>Defects</th>
              <th style={{ padding: '16px 24px', fontWeight: 500 }}>Status</th>
              <th style={{ padding: '16px 24px' }}></th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ash)' }}>
                  No AI inspection records found. Start scanning parts to see results here!
                </td>
              </tr>
            ) : (
              results.map((result) => (
                <React.Fragment key={result.id}>
                  <tr 
                    style={{ borderBottom: '1px solid var(--silk)', cursor: 'pointer', background: expandedRow === result.id ? 'var(--bone-white)' : 'transparent' }}
                    onClick={() => toggleRow(result.id)}
                  >
                    <td style={{ padding: '16px 24px', fontSize: 14 }}>
                      {new Date(result.inspectedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--charcoal)' }}>
                      {result.partId}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--slate)' }}>
                      {result.dataMatrix}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {result.defectsFound > 0 ? (
                        <span style={{ color: 'var(--status-rejected)', fontWeight: 600 }}>{result.defectsFound} Defects</span>
                      ) : (
                        <span style={{ color: 'var(--ash)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {result.overallResult === 'PASS' ? (
                        <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> PASS
                        </span>
                      ) : (
                        <span className="badge badge-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={14} /> FAIL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {expandedRow === result.id ? <ChevronUp size={20} color="var(--ash)" /> : <ChevronDown size={20} color="var(--ash)" />}
                    </td>
                  </tr>
                  
                  {expandedRow === result.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0 }}>
                        <div style={{ padding: '24px 48px', background: 'var(--bone-white)', borderBottom: '1px solid var(--silk)' }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', marginBottom: 16 }}>AI Checkpoint Details</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(result.checkpoints || []).map(cp => (
                              <div key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'white', borderRadius: 8, border: '1px solid var(--silk)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cp.result === 'PASS' ? 'var(--status-approved)' : 'var(--status-rejected)' }} />
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--charcoal)' }}>{cp.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 4 }}>Expected: {cp.expectedClass} | Balloon: {cp.balloon}</div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 14, fontWeight: 500, color: cp.result === 'PASS' ? 'var(--status-approved)' : 'var(--status-rejected)' }}>
                                    AI: {cp.aiClass} ({(cp.aiConfidence * 100).toFixed(0)}%)
                                  </div>
                                  {cp.defectType && (
                                    <div style={{ fontSize: 12, color: 'var(--status-rejected)', marginTop: 4 }}>{cp.defectType}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
