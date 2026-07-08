import React, { useState, useEffect } from 'react';
import { lpaApi } from '@/api/lpa.api';
import { reportConfigApi, type ReportConfiguration } from '@/api/reportConfig.api';
import {
  FileText, Search, Filter, Download, Printer, Award, CheckCircle2,
  AlertTriangle, ShieldAlert, X, Eye, Calendar, User, Layers, Wrench,
  Cpu, Ruler, Sparkles, Loader2, RefreshCw,
  Check, AlertCircle, ArrowUpRight
} from 'lucide-react';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

export function LpaReportsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [reportConfig, setReportConfig] = useState<ReportConfiguration | null>(null);

  useEffect(() => {
    fetchLogs();
    reportConfigApi.get().then(res => setReportConfig(res.data)).catch(console.error);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await lpaApi.getAuditLogs();
      setLogs(getArray(res));
    } catch (err) {
      console.error('Failed to load LPA audit reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredLogs = logs.filter(log => {
    if (selectedType !== 'ALL' && log.auditType !== selectedType) return false;
    if (selectedStatus !== 'ALL' && log.overallStatus !== selectedStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const qsName = log.questionSet?.name?.toLowerCase() || '';
      const auditor = log.auditedBy?.fullName?.toLowerCase() || '';
      const part = log.gaugeMaster?.gaugeTypeName?.toLowerCase() || log.gaugeMaster?.name?.toLowerCase() || '';
      const op = log.operationMaster?.operationName?.toLowerCase() || '';
      const machine = log.machineMaster?.machineName?.toLowerCase() || '';
      if (!qsName.includes(q) && !auditor.includes(q) && !part.includes(q) && !op.includes(q) && !machine.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Calculate top summary stats
  const totalCompleted = logs.length;
  const avgScore = totalCompleted > 0
    ? Math.round(logs.reduce((acc, l) => acc + (l.scorePercentage || 0), 0) / totalCompleted)
    : 0;
  const totalNonConforming = logs.reduce((acc, l) => acc + (l.nonConformingCount || 0), 0);
  const openActions = logs.reduce((acc, l) => {
    const ansList = l.answers || [];
    return acc + ansList.filter((a: any) => a.status === 'NON_CONFORMING' && a.actionStatus === 'OPEN').length;
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: 'var(--copper-bronze)', background: 'var(--linen)', padding: '4px 10px', borderRadius: 6
            }}>
              Compliance Verification
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)', margin: '4px 0', letterSpacing: '-0.02em' }}>
            LPA Audit Reports & Logs
          </h1>
          <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0 }}>
            Review completed verification audits, analyze compliance scores, and track corrective action plans.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={fetchLogs}
            disabled={loading}
            style={{
              padding: '10px 16px', borderRadius: 10, border: '1px solid var(--silk)',
              background: 'var(--warm-white)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ padding: '20px', borderRadius: 16, background: 'var(--warm-white)', border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={16} style={{ color: 'var(--copper-bronze)' }} />
            <span>Total Audits Logged</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--charcoal)' }}>
            {totalCompleted}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 16, background: 'var(--warm-white)', border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Award size={16} style={{ color: '#16a34a' }} />
            <span>Avg Compliance Score</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: avgScore >= 90 ? '#16a34a' : avgScore >= 80 ? '#ca8a04' : '#dc2626' }}>
            {avgScore}%
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 16, background: 'var(--warm-white)', border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} style={{ color: '#ca8a04' }} />
            <span>Non-Conformities Found</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: totalNonConforming > 0 ? '#dc2626' : '#16a34a' }}>
            {totalNonConforming}
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 16, background: 'var(--warm-white)', border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={16} style={{ color: '#dc2626' }} />
            <span>Open Action Plans</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: openActions > 0 ? '#dc2626' : 'var(--charcoal)' }}>
            {openActions}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        padding: '16px 20px', borderRadius: 14, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
      }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--cream)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--silk)', flex: '1 1 280px' }}>
          <Search size={18} style={{ color: 'var(--ash)' }} />
          <input
            type="text"
            placeholder="Search by checklist, auditor, part, operation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--charcoal)', fontWeight: 500 }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 0 }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={15} style={{ color: 'var(--ash)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}
            >
              <option value="ALL">All Audit Types</option>
              <option value="LAYERED_PROCESS">Layered Process (LPA)</option>
              <option value="POKA_YOKE">Poka-Yoke / Error Proofing</option>
              <option value="PRODUCT_AUDIT">Product Audit</option>
              <option value="PROCESS_AUDIT">Process Audit</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--slate)' }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--silk)', background: 'var(--cream)', fontSize: 12, fontWeight: 600, color: 'var(--charcoal)' }}
            >
              <option value="ALL">All Outcomes</option>
              <option value="PASS">PASS (Conforming)</option>
              <option value="FAIL">FAIL (Non-Conforming)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs List / Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)' }}>
          <FileText size={48} style={{ margin: '0 auto 16px', color: 'var(--copper-bronze)', opacity: 0.4 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 6 }}>No Audit Reports Found</h3>
          <p style={{ fontSize: 13, color: 'var(--slate)', maxWidth: 400, margin: '0 auto' }}>
            No completed audits match your current filter criteria. Execute an audit or adjust your search filters above.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredLogs.map((log) => {
            const isPassed = log.overallStatus === 'PASS';
            const score = log.scorePercentage !== undefined ? log.scorePercentage : 100;
            const dateStr = log.auditDate ? new Date(log.auditDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent';

            return (
              <div
                key={log.id}
                style={{
                  padding: '20px 24px', borderRadius: 16, background: 'var(--warm-white)',
                  border: `1px solid ${isPassed ? 'var(--silk)' : '#fca5a5'}`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: '1 1 400px' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 12,
                    background: isPassed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPassed ? '#16a34a' : '#dc2626', flexShrink: 0
                  }}>
                    {isPassed ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--charcoal)' }}>
                        {log.questionSet?.name || 'LPA Checklist'}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'var(--linen)', color: 'var(--copper-bronze)'
                      }}>
                        {log.auditType?.replace('_', ' ')}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: isPassed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isPassed ? '#16a34a' : '#dc2626'
                      }}>
                        {log.overallStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--slate)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={14} style={{ color: 'var(--ash)' }} />
                        <span>{dateStr}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <User size={14} style={{ color: 'var(--ash)' }} />
                        <span>{log.auditedBy?.fullName || 'Auditor'} ({log.auditedBy?.role || 'Staff'})</span>
                      </span>
                    </div>

                    {/* Linked Target Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {log.gaugeMaster && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--cream)', color: 'var(--slate)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Ruler size={12} style={{ color: 'var(--copper-bronze)' }} />
                          <span>Part: {log.gaugeMaster.gaugeTypeName || log.gaugeMaster.name}</span>
                        </span>
                      )}
                      {log.operationMaster && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--cream)', color: 'var(--slate)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Wrench size={12} style={{ color: 'var(--copper-bronze)' }} />
                          <span>Op: {log.operationMaster.operationName}</span>
                        </span>
                      )}
                      {log.machineMaster && (
                        <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--cream)', color: 'var(--slate)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--silk)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Cpu size={12} style={{ color: 'var(--copper-bronze)' }} />
                          <span>Machine: {log.machineMaster.machineName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase' }}>Score</div>
                    <div style={{
                      fontSize: 22, fontWeight: 800,
                      color: score === 100 ? '#16a34a' : score >= 80 ? '#ca8a04' : '#dc2626'
                    }}>
                      {score}%
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedLog(log)}
                    style={{
                      padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13,
                      background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
                      color: '#fff', border: 'none', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(184,115,51,0.2)'
                    }}
                  >
                    <Eye size={16} />
                    <span>View Report</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full Verification Report Modal ── */}
      {selectedLog && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24
        }}>
          <div style={{
            background: 'var(--warm-white)', borderRadius: 20, border: '1px solid var(--silk)',
            width: '100%', maxWidth: 900, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', animation: 'fadeIn 0.2s'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 28px', background: 'var(--cream)', borderBottom: '1px solid var(--silk)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'var(--copper-bronze)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--charcoal)', margin: 0 }}>
                    Official Audit Verification Report
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--dust)', fontWeight: 600 }}>
                    ID: {selectedLog.id?.substring(0, 8).toUpperCase()} • {selectedLog.auditDate ? new Date(selectedLog.auditDate).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                    background: 'var(--warm-white)', color: 'var(--charcoal)', fontWeight: 700, fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                  }}
                >
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body - Exact Replica of product_audit.png */}
            <div style={{ padding: '32px', overflowY: 'auto', background: '#e5e7eb', display: 'flex', justifyContent: 'center' }}>
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-audit-report, #printable-audit-report * {
                    visibility: visible !important;
                  }
                  #printable-audit-report {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 15px !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: #fff !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              `}</style>

              {/* White Sheet / ISO Sheet Container */}
              <div
                id="printable-audit-report"
                style={{
                  background: '#fff', color: '#000', width: '100%', maxWidth: '960px',
                  border: '2px solid #000', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '12px', boxSizing: 'border-box'
                }}
              >
                {/* Top Header Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '22%', borderRight: '2px solid #000', padding: '12px 10px', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#111', verticalAlign: 'middle' }}>
                        {reportConfig?.customerLogo ? (
                          <img src={reportConfig.customerLogo} alt="Customer Logo" style={{ maxHeight: '48px', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          'PRECISION FORGE P-TRACK'
                        )}
                      </td>
                      <td style={{ width: '53%', borderRight: '2px solid #000', padding: '16px 10px', textAlign: 'center', fontWeight: 900, fontSize: '20px', letterSpacing: '1px', textTransform: 'uppercase', color: '#000', verticalAlign: 'middle' }}>
                        {selectedLog.auditType === 'PRODUCT_AUDIT' ? 'PRODUCT AUDIT REPORT' : `${(selectedLog.auditType || 'PRODUCT_AUDIT').replace('_', ' ')} REPORT`}
                      </td>
                      <td style={{ width: '25%', padding: 0, verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                          <div style={{ width: '45%', borderRight: '1px solid #000', padding: '5px 8px', fontWeight: 700, fontSize: '11px' }}>Doc. No</div>
                          <div style={{ width: '55%', padding: '5px 8px', fontWeight: 600, fontSize: '11px' }}>{reportConfig?.docNo || `LPA-DOC-${selectedLog.id?.substring(0, 6).toUpperCase() || '001'}`}</div>
                        </div>
                        <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
                          <div style={{ width: '45%', borderRight: '1px solid #000', padding: '5px 8px', fontWeight: 700, fontSize: '11px' }}>Rev. No</div>
                          <div style={{ width: '55%', padding: '5px 8px', fontWeight: 600, fontSize: '11px' }}>{reportConfig?.revNo || '01'}</div>
                        </div>
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '45%', borderRight: '1px solid #000', padding: '5px 8px', fontWeight: 700, fontSize: '11px' }}>Rev. Date</div>
                          <div style={{ width: '55%', padding: '5px 8px', fontWeight: 600, fontSize: '11px' }}>{reportConfig?.issueDate || new Date().toLocaleDateString()}</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Conditional Layout: Product Audit vs Layered Process Audit */}
                {(selectedLog.auditType === 'PRODUCT_AUDIT' || selectedLog.questionSet?.auditType === 'PRODUCT_AUDIT' || selectedLog.auditType === 'PRODUCT') ? (
                  <>
                    {/* Metadata Grid Table - Product Audit */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>CUSTOMER : </span>
                            <span>{selectedLog.gaugeMaster?.customerName || selectedLog.customerName || 'Internal / OEM'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>SUPPLIER : </span>
                            <span>{selectedLog.supplierName || 'Precision Forge Mfg'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>DATE : </span>
                            <span>{selectedLog.auditDate ? new Date(selectedLog.auditDate).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>PART NO: </span>
                            <span>{selectedLog.gaugeMaster?.gaugeId || selectedLog.gaugeMaster?.partNo || selectedLog.partNo || 'PART-001'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>PART NAME : </span>
                            <span>{selectedLog.gaugeMaster?.gaugeTypeName || selectedLog.gaugeMaster?.name || selectedLog.partName || 'Standard Component'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDIT SECTION: </span>
                            <span>{selectedLog.operationMaster?.operationName || selectedLog.auditSection || 'Quality Inspection'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDITOR NAME : </span>
                            <span>{selectedLog.auditedBy?.fullName || selectedLog.auditorName || 'Quality Inspector'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDITEE NAME : </span>
                            <span>{selectedLog.schedule?.assignedRole || selectedLog.auditeeName || 'Shift Supervisor'}</span>
                          </td>
                          <td style={{ width: '33.33%', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>SAMPLE SIZE : </span>
                            <span>{selectedLog.sampleSize || '05 samples'}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Main Observations Table - Product Audit */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 4px', textAlign: 'center', width: '5%', fontWeight: 800, fontSize: '11px' }}>Sr.No</th>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', width: '25%', fontWeight: 800, fontSize: '11px' }}>PRODUCT PARAMETERS</th>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', width: '18%', fontWeight: 800, fontSize: '11px' }}>SPECIFICATIONS</th>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', width: '14%', fontWeight: 800, fontSize: '11px' }}>INSPECTION METHOD.</th>
                          <th colSpan={5} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', background: '#f8f9fa', fontWeight: 800, fontSize: '11px' }}>ACTUAL OBSERVATIONS (05 samples)</th>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 4px', textAlign: 'center', width: '8%', fontWeight: 800, fontSize: '11px' }}>SCORING POINTS</th>
                          <th rowSpan={2} style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'center', width: '14%', fontWeight: 800, fontSize: '11px' }}>REMARK</th>
                        </tr>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '3.2%', fontWeight: 800, fontSize: '11px' }}>1</th>
                          <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '3.2%', fontWeight: 800, fontSize: '11px' }}>2</th>
                          <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '3.2%', fontWeight: 800, fontSize: '11px' }}>3</th>
                          <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '3.2%', fontWeight: 800, fontSize: '11px' }}>4</th>
                          <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '3.2%', fontWeight: 800, fontSize: '11px' }}>5</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedLog.answers || []).length === 0 ? (
                          <tr>
                            <td colSpan={11} style={{ border: '1px solid #000', padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                              No checkpoint observations recorded for this audit.
                            </td>
                          </tr>
                        ) : (
                          (selectedLog.answers || []).map((ans: any, i: number) => {
                            const rawVal = ans.actualValue || '';
                            const parts = rawVal.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean);
                            const isPass = ans.status === 'CONFORMING';
                            const s1 = parts[0] || (isPass ? 'OK' : rawVal || '—');
                            const s2 = parts[1] || (isPass ? 'OK' : '—');
                            const s3 = parts[2] || (isPass ? 'OK' : '—');
                            const s4 = parts[3] || (isPass ? 'OK' : '—');
                            const s5 = parts[4] || (isPass ? 'OK' : '—');

                            return (
                              <tr key={ans.id || i} style={{ background: !isPass && ans.status !== 'NA' ? '#fef2f2' : 'transparent' }}>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>{ans.sequenceOrder || i + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px', fontWeight: 600 }}>
                                  <div>{ans.questionText}</div>
                                  {ans.isCritical && <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>[CRITICAL]</span>}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px' }}>{ans.specification || (ans.isCritical ? 'Critical Spec / Drawing' : 'Standard Spec')}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center' }}>{ans.inspectionMethod || 'Visual / Gauge'}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{s1}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{s2}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{s3}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{s4}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{s5}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>{isPass ? '10' : ans.status === 'NA' ? '—' : '0'}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px' }}>{ans.remarks || ans.correctiveAction || (isPass ? 'OK' : 'Defect noted')}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <>
                    {/* Metadata Grid Table - Layered Process Audit */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #000' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>PLANT / FACILITY : </span>
                            <span>{selectedLog.schedule?.plant || 'Precision Forge - Plant 1'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDIT LAYER : </span>
                            <span>{selectedLog.schedule?.layer || 'Layer 1 (Shift Supervisor)'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>DATE & SHIFT : </span>
                            <span>{selectedLog.auditDate ? new Date(selectedLog.auditDate).toLocaleDateString() : new Date().toLocaleDateString()} ({selectedLog.schedule?.shift?.shiftName || 'General'})</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AREA / DEPT : </span>
                            <span>{selectedLog.schedule?.area || selectedLog.operationMaster?.operationName || 'Assembly / Press Shop'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>OPERATION / MACHINE : </span>
                            <span>{selectedLog.operationMaster?.operationName || 'All Operations'} / {selectedLog.machineMaster?.machineName || 'N/A'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderBottom: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDIT CHECKLIST : </span>
                            <span>{selectedLog.questionSet?.name || 'Standard LPA Checklist'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDITOR NAME : </span>
                            <span>{selectedLog.auditedBy?.fullName || selectedLog.auditorName || 'Quality Inspector'}</span>
                          </td>
                          <td style={{ width: '33.33%', borderRight: '1px solid #000', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>AUDITEE / SUPERVISOR : </span>
                            <span>{selectedLog.auditeeName || selectedLog.schedule?.assignedRole || 'Shift Supervisor'}</span>
                          </td>
                          <td style={{ width: '33.33%', padding: '8px 10px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800 }}>OVERALL STATUS : </span>
                            <span style={{ fontWeight: 800, color: selectedLog.overallStatus === 'PASS' || selectedLog.overallStatus === 'CONFORMING' ? '#16a34a' : '#dc2626' }}>
                              {selectedLog.overallStatus || 'PASS'} ({selectedLog.score || 100}%)
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Main Observations Table - Layered Process Audit (NO 5 sample columns!) */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ border: '1px solid #000', padding: '10px 4px', textAlign: 'center', width: '6%', fontWeight: 800, fontSize: '11px' }}>Sr.No</th>
                          <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', width: '34%', fontWeight: 800, fontSize: '11px' }}>CHECKLIST QUESTION / AUDIT CHECK ITEM</th>
                          <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', width: '16%', fontWeight: 800, fontSize: '11px' }}>VERIFICATION METHOD</th>
                          <th style={{ border: '1px solid #000', padding: '10px 6px', textAlign: 'center', width: '12%', fontWeight: 800, fontSize: '11px' }}>RESULT / STATUS</th>
                          <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', width: '16%', fontWeight: 800, fontSize: '11px' }}>OBSERVATION / READING</th>
                          <th style={{ border: '1px solid #000', padding: '10px 8px', textAlign: 'left', width: '16%', fontWeight: 800, fontSize: '11px' }}>REMARKS / ACTION TAKEN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedLog.answers || []).length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ border: '1px solid #000', padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                              No checkpoint observations recorded for this audit.
                            </td>
                          </tr>
                        ) : (
                          (selectedLog.answers || []).map((ans: any, i: number) => {
                            const isPass = ans.status === 'CONFORMING';
                            const isNA = ans.status === 'NA';
                            return (
                              <tr key={ans.id || i} style={{ background: !isPass && !isNA ? '#fef2f2' : 'transparent' }}>
                                <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>{ans.sequenceOrder || i + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px', fontWeight: 600 }}>
                                  <div>{ans.questionText}</div>
                                  {ans.isCritical && <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 700 }}>[CRITICAL POKA-YOKE]</span>}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px', color: '#374151' }}>{ans.inspectionMethod || ans.checkingMethod || 'Visual / Verification'}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: 800, color: isPass ? '#16a34a' : isNA ? '#6b7280' : '#dc2626' }}>
                                  {isPass ? 'PASS' : isNA ? 'N/A' : 'FAIL'}
                                </td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px' }}>{ans.actualValue || (isPass ? 'Conforming' : isNA ? 'Not Applicable' : 'Non-Conforming Observed')}</td>
                                <td style={{ border: '1px solid #000', padding: '8px 8px' }}>
                                  {ans.remarks || ans.correctiveAction || (isPass ? 'OK' : 'Action required')}
                                  {ans.assignedActionOwner && <div style={{ fontSize: '10px', color: '#4b5563', fontStyle: 'italic', marginTop: 2 }}>[Owner: {ans.assignedActionOwner}]</div>}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {/* Corrective Action Footer if any non-conformity */}
                {(selectedLog.answers || []).some((a: any) => a.status === 'NON_CONFORMING') && (
                  <div style={{ borderTop: 'none', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: '12px 16px', background: '#fff5f5' }}>
                    <div style={{ fontWeight: 800, fontSize: '12px', color: '#b91c1c', marginBottom: 6 }}>CORRECTIVE ACTION TAKEN / REACTION PLAN:</div>
                    {(selectedLog.answers || []).filter((a: any) => a.status === 'NON_CONFORMING').map((a: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '12px', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700 }}>Check #{a.sequenceOrder || idx + 1} ({a.questionText}): </span>
                        <span>{a.correctiveAction || 'No corrective action recorded.'} {a.assignedActionOwner ? `(Owner: ${a.assignedActionOwner})` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer Signatures */}
                <div style={{ borderTop: 'none', borderLeft: '2px solid #000', borderRight: '2px solid #000', borderBottom: '2px solid #000', padding: '24px 20px 16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: '#fff' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '12px', marginBottom: 24 }}>AUDITOR SIGNATURE : </div>
                    <div style={{ borderBottom: '1px solid #000', width: '220px', paddingBottom: '2px', fontWeight: 600 }}>{selectedLog.auditedBy?.fullName || '___________________________'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '12px', marginBottom: 24 }}>REVIEWED BY (SUPERVISOR) : </div>
                    <div style={{ borderBottom: '1px solid #000', width: '220px', paddingBottom: '2px', fontWeight: 600 }}>___________________________</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 28px', background: 'var(--cream)', borderTop: '1px solid var(--silk)',
              display: 'flex', justifyContent: 'flex-end', gap: 12
            }}>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  padding: '10px 20px', borderRadius: 10, background: 'var(--charcoal)',
                  color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer'
                }}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
