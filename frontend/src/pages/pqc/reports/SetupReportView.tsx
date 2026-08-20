import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports.api';
import { Loader2, FileCheck, ShieldCheck } from 'lucide-react';

interface SetupReportViewProps {
  gaugeId: string;
  hideIfEmpty?: boolean;
}

export default function SetupReportView({ gaugeId, hideIfEmpty = false }: SetupReportViewProps) {
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['setup-report', gaugeId],
    queryFn: () => reportsApi.getSetupReport(gaugeId).then(res => res.data)
  });

  if (isLoading) {
    if (hideIfEmpty) return null;
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', color: 'var(--copper-bronze)' }} />
        <p style={{ color: 'var(--ash)', fontWeight: 500 }}>Generating Certificate of Setup...</p>
      </div>
    );
  }

  if (error || !reportData || !reportData.logs || reportData.logs.length === 0) {
    if (hideIfEmpty) return null;
    
    if (error || !reportData) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#BA1A1A' }}>Failed to load setup report.</p>
        </div>
      );
    }

    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <FileCheck size={48} style={{ margin: '0 auto 16px', color: 'var(--silk)' }} />
        <h3 style={{ margin: '0 0 8px', color: 'var(--charcoal)', fontSize: 18 }}>No Setup Logs</h3>
        <p style={{ color: 'var(--ash)', fontSize: 14 }}>There are no machine setup records logged for this part.</p>
      </div>
    );
  }

  return (
    <div className="pdf-page print-report" style={{ 
      background: 'white', 
      width: '100%', 
      minHeight: '297mm', 
      position: 'relative', 
      padding: '40px',
      color: 'var(--charcoal)',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Premium Border for Certificate Vibe */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
        bottom: 16,
        border: '2px solid var(--copper-bronze)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.15
      }}></div>
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        right: 24,
        bottom: 24,
        border: '1px solid var(--copper-bronze)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.3
      }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Certificate Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--copper-bronze)', paddingBottom: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {reportData.customerLogo ? (
              <img src={reportData.customerLogo} alt="Customer Logo" style={{ height: 60, objectFit: 'contain' }} />
            ) : (
              <div style={{ height: 60, width: 60, background: 'var(--bone-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--silk)' }}>
                <ShieldCheck size={32} color="var(--copper-bronze)" />
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'var(--charcoal)', textTransform: 'uppercase', letterSpacing: '1px' }}>Certificate of Machine Setup</h1>
              <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--ash)', fontWeight: 500 }}>Official Setup Validation & Compliance Record</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase' }}>Document No.</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>{reportData.docNo || 'SETUP-DOC-001'}</div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase' }}>Revision No.</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 8 }}>{reportData.revNo || '0'}</div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase' }}>Generated On</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)' }}>{new Date(reportData.generatedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Certificate Metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40, background: 'var(--bone-white)', padding: 24, borderRadius: 8, border: '1px solid var(--silk)' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{reportData.customerName}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Purchase Order</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{reportData.poNumber}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Part Name</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{reportData.partName}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Gauge / SN</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{reportData.serialNumber}</div>
          </div>
        </div>

        {/* Setup Logs Section */}
        {reportData.logs.map((log: any, idx: number) => (
          <div key={log.logId} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--copper-bronze)' }}>{log.operationName} Setup</h2>
              <div style={{ flex: 1, height: 1, background: 'var(--silk)' }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, background: '#FAFAFA', padding: '16px 24px', borderRadius: 8, borderLeft: log.isPassed ? '4px solid #228B22' : '4px solid #BA1A1A' }}>
              <div style={{ display: 'flex', gap: 32 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Machine</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{log.machineName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Setup By</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{log.workerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Timestamp</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(log.logTime).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: log.isPassed ? '#228B22' : '#BA1A1A', letterSpacing: '1px' }}>
                  {log.isPassed ? 'APPROVED' : 'REJECTED'}
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', background: 'var(--copper-light)', color: 'var(--copper-dark)', fontWeight: 600, border: '1px solid var(--silk)', width: '40%' }}>Verification Parameter</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--copper-light)', color: 'var(--copper-dark)', fontWeight: 600, border: '1px solid var(--silk)', width: '30%' }}>Standard Requirement</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--copper-light)', color: 'var(--copper-dark)', fontWeight: 600, border: '1px solid var(--silk)', width: '30%' }}>Actual Verification</th>
                </tr>
              </thead>
              <tbody>
                {log.answers.map((ans: any, i: number) => {
                  let standardReq = '-';
                  if (ans.questionType === 'PASS_FAIL') {
                    const expected = (ans.expectedAnswer == null || ans.expectedAnswer === '') ? 'true' : String(ans.expectedAnswer).toLowerCase();
                    standardReq = expected === 'true' ? 'PASS' : 'FAIL';
                  } else if (ans.questionType === 'NUMERIC') {
                    standardReq = `${ans.minValue != null ? ans.minValue : ''} - ${ans.maxValue != null ? ans.maxValue : ''} ${ans.unit || ''}`;
                  }

                  let actual = ans.answerValue || '-';
                  if (ans.questionType === 'PASS_FAIL') {
                    actual = String(ans.answerValue).toLowerCase() === 'true' ? 'PASS' : 'FAIL';
                  } else if (ans.questionType === 'NUMERIC' && ans.unit) {
                    actual = `${actual} ${ans.unit}`;
                  }

                  return (
                    <tr key={i}>
                      <td style={{ padding: '10px 16px', border: '1px solid var(--silk)', color: 'var(--charcoal)', fontWeight: 500 }}>{ans.questionText}</td>
                      <td style={{ padding: '10px 16px', border: '1px solid var(--silk)', color: 'var(--ash)', textAlign: 'center' }}>{standardReq}</td>
                      <td style={{ padding: '10px 16px', border: '1px solid var(--silk)', color: 'var(--charcoal)', fontWeight: 600, textAlign: 'center' }}>{actual}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {log.remarks && (
              <div style={{ background: '#FFFDF9', padding: '12px 16px', borderRadius: 6, border: '1px solid var(--silk)', fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--copper-bronze)', marginRight: 8 }}>Setup Remarks:</span>
                <span style={{ color: 'var(--charcoal)' }}>{log.remarks}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
