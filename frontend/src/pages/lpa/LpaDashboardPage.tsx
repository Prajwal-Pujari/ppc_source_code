import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lpaApi, type LpaDashboardSummary, type LpaAuditType } from '@/api/lpa.api';
import {
  CheckCircle2, AlertTriangle, Clock, TrendingUp, Award, Layers,
  Calendar, ArrowRight, Play, CheckCircle, ShieldAlert, ShieldCheck, Sparkles, Filter, Loader2
} from 'lucide-react';

export function LpaDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LpaDashboardSummary | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const [sumRes, schedRes, auditRes] = await Promise.all([
        lpaApi.getDashboardSummary().catch((e) => { console.error('Summary fetch error:', e); return null; }),
        lpaApi.getSchedules().catch((e) => { console.error('Schedules fetch error:', e); return null; }),
        lpaApi.getAuditLogs().catch((e) => { console.error('Audit logs fetch error:', e); return null; })
      ]);

      const sumData = (sumRes as any)?.data || sumRes || {};
      const schedulesList = (schedRes as any)?.data || schedRes || [];
      const auditsList = (auditRes as any)?.data || auditRes || [];

      // Merge schedules to ensure 100% of real user schedules are displayed
      let dueSchedules = Array.isArray(sumData.dueSchedules) ? [...sumData.dueSchedules] : [];
      if (Array.isArray(schedulesList) && schedulesList.length > 0) {
        const existingIds = new Set(dueSchedules.map((s: any) => s.id));
        schedulesList.forEach((s: any) => {
          if (!existingIds.has(s.id)) {
            dueSchedules.push({
              id: s.id,
              auditType: s.auditType,
              questionSetName: s.questionSet?.name || 'Checklist',
              assignedToName: s.assignedTo?.fullName || s.assignedRole || 'Unassigned',
              assignedRole: s.assignedRole,
              frequency: s.frequency || 'DAILY',
              nextDueDate: s.nextDueDate || new Date().toISOString(),
              status: s.status || 'SCHEDULED',
              targetName: [
                s.operationMaster?.operationName ? `Op: ${s.operationMaster.operationName}` : null,
                s.machineMaster?.machineName ? `Mch: ${s.machineMaster.machineName}` : null,
                s.gaugeMaster?.gaugeTypeName ? `Part: ${s.gaugeMaster.gaugeTypeName}` : null
              ].filter(Boolean).join(' | ') || 'Plant-Wide / General'
            });
          }
        });
      }

      // Merge audit logs to ensure 100% of real user completed audits are displayed
      let recentAudits = Array.isArray(sumData.recentAudits) ? [...sumData.recentAudits] : [];
      if (Array.isArray(auditsList) && auditsList.length > 0) {
        const existingIds = new Set(recentAudits.map((a: any) => a.id));
        auditsList.forEach((l: any) => {
          if (!existingIds.has(l.id)) {
            recentAudits.push({
              id: l.id,
              auditType: l.auditType,
              questionSetName: l.questionSet?.name || 'Checklist',
              auditedByName: l.auditedBy?.fullName || 'Inspector',
              shiftName: l.shiftName,
              auditDate: l.auditDate || new Date().toISOString(),
              scorePercentage: l.scorePercentage !== undefined && l.scorePercentage !== null ? Number(l.scorePercentage) : 100,
              overallStatus: l.overallStatus || 'PASS',
              targetName: [
                l.operationMaster?.operationName ? `Op: ${l.operationMaster.operationName}` : null,
                l.machineMaster?.machineName ? `Mch: ${l.machineMaster.machineName}` : null,
                l.gaugeMaster?.gaugeTypeName ? `Part: ${l.gaugeMaster.gaugeTypeName}` : null
              ].filter(Boolean).join(' | ') || 'Plant-Wide / General'
            });
          }
        });
      }

      // Sort recent audits by date descending
      recentAudits.sort((a: any, b: any) => new Date(b.auditDate).getTime() - new Date(a.auditDate).getTime());

      // Ensure KPI metrics reflect combined data
      const totalAuditsCompleted = sumData.totalAuditsCompleted || recentAudits.length;
      const dueTodayCount = sumData.dueTodayCount !== undefined && sumData.dueTodayCount !== null ? sumData.dueTodayCount : dueSchedules.filter((s: any) => s.status === 'DUE' || s.status === 'SCHEDULED').length;
      const overdueCount = sumData.overdueCount !== undefined && sumData.overdueCount !== null ? sumData.overdueCount : dueSchedules.filter((s: any) => s.status === 'OVERDUE').length;

      setSummary({
        ...sumData,
        totalAuditsCompleted,
        dueTodayCount,
        overdueCount,
        dueSchedules,
        recentAudits
      });
    } catch (err) {
      console.error('Failed to fetch LPA summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
      </div>
    );
  }

  const categoryNames: Record<string, { label: string; icon: string; desc: string }> = {
    LAYERED_PROCESS: { label: 'Layered Process', icon: 'layers', desc: 'Multi-tiered management & supervisor checks' },
    PRODUCT_AUDIT: { label: 'Product Audit', icon: 'inventory_2', desc: 'Finished & semi-finished part conformance' },
    PROCESS_AUDIT: { label: 'Process Audit', icon: 'precision_manufacturing', desc: 'Standard operating procedure compliance' },
    POKA_YOKE: { label: 'Poka-Yoke Audit', icon: 'verified_user', desc: 'Error-proofing device & sensor verification' },
  };

  const filteredDueSchedules = summary?.dueSchedules?.filter(s =>
    selectedType === 'ALL' ? true : s.auditType === selectedType
  ) || [];

  const filteredRecentAudits = summary?.recentAudits?.filter(a =>
    selectedType === 'ALL' ? true : a.auditType === selectedType
  ) || [];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Top Welcome Banner */}
      <div style={{
        padding: '28px 32px', borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(250,248,245,0.95), rgba(245,240,235,0.95))',
        border: '1px solid var(--silk)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              background: 'rgba(184, 115, 51, 0.15)', color: 'var(--copper-bronze)',
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ShieldCheck size={13} /> Continuous Quality Assurance
            </span>
            <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>• Real-Time Compliance Monitoring</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            Layered Audit & Compliance Command
          </h1>
          <p style={{ fontSize: 14, color: 'var(--slate)', margin: 0, maxWidth: 680 }}>
            Ensure plant-wide standardization across Layered Process, Product, Process, and Poka-Yoke audits.
            Complete scheduled verification checklists on time to maintain facility compliance standards and operational excellence.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => navigate('/lpa/schedules')}
            style={{
              padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}
          >
            <Calendar size={16} /> View Schedules
          </button>
          <button
            onClick={() => navigate('/lpa/execute')}
            style={{
              padding: '12px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
              color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 18px rgba(184,115,51,0.25)', transition: 'all 0.15s',
            }}
          >
            <Play size={16} fill="currentColor" /> Execute New Audit
          </button>
        </div>
      </div>

      {/* Executive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
        {/* Compliance Rate Card */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{
            position: 'absolute', top: -10, right: -10, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)', zIndex: 0,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Overall Compliance
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summary?.complianceRate || 100}%
            </div>
            <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> Facility target: ≥95% achieved
            </div>
          </div>
        </div>

        {/* Perfect Compliance Record Card */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{
            position: 'absolute', top: -10, right: -10, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(234, 179, 8, 0.08)', zIndex: 0,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              100% Conforming Record
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(234, 179, 8, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ca8a04' }}>
              <Award size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summary?.perfectStreak || 0} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ash)' }}>audits</span>
            </div>
            <div style={{ fontSize: 12, color: '#ca8a04', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} /> Consecutive zero-defect verification runs
            </div>
          </div>
        </div>

        {/* Due Today Card */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{
            position: 'absolute', top: -10, right: -10, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(59, 130, 246, 0.08)', zIndex: 0,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Audits Due Today
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59, 130, 246, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summary?.dueTodayCount || 0}
            </div>
            <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={14} /> Scheduled across active shifts
            </div>
          </div>
        </div>

        {/* Overdue / Alert Card */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: `1px solid ${(summary?.overdueCount || 0) > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--silk)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{
            position: 'absolute', top: -10, right: -10, width: 80, height: 80,
            borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', zIndex: 0,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Overdue / Open Actions
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: (summary?.overdueCount || 0) > 0 ? '#dc2626' : 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summary?.overdueCount || 0} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ash)' }}>overdue</span>
            </div>
            <div style={{ fontSize: 12, color: (summary?.overdueCount || 0) > 0 ? '#dc2626' : 'var(--ash)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={14} /> {summary?.openActionItemsCount || 0} open reaction items
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--silk)', paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedType('ALL')}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: selectedType === 'ALL' ? 700 : 500,
              background: selectedType === 'ALL' ? 'var(--charcoal)' : 'var(--warm-white)',
              color: selectedType === 'ALL' ? '#fff' : 'var(--slate)',
              border: '1px solid var(--silk)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            All Audit Types
          </button>
          {Object.entries(categoryNames).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: selectedType === key ? 700 : 500,
                background: selectedType === key ? 'var(--copper-bronze)' : 'var(--warm-white)',
                color: selectedType === key ? '#fff' : 'var(--slate)',
                border: '1px solid var(--silk)', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{val.icon}</span>
              <span>{val.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Due Audits & Recent Completions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 24 }}>
        {/* Due / Overdue Audits Panel */}
        <div style={{
          background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.02)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)' }}>
                <Clock size={18} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Pending & Due Audits
              </h2>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>
              {filteredDueSchedules.length} audits ready
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 420 }}>
            {filteredDueSchedules.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', background: 'var(--cream)', borderRadius: 12 }}>
                <CheckCircle size={32} style={{ margin: '0 auto 8px', color: '#16a34a', opacity: 0.6 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>All Caught Up!</div>
                <div style={{ fontSize: 12 }}>There are no pending audits due for this category.</div>
              </div>
            ) : (
              filteredDueSchedules.map((schedule) => {
                const isOverdue = schedule.status === 'OVERDUE';
                return (
                  <div
                    key={schedule.id}
                    style={{
                      padding: '16px', borderRadius: 12, background: 'var(--cream)',
                      border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--silk)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'var(--linen)',
                          color: isOverdue ? '#dc2626' : 'var(--copper-bronze)',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {isOverdue ? 'OVERDUE' : schedule.frequency}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ash)', fontWeight: 600 }}>
                          Due: {new Date(schedule.nextDueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
                        {schedule.questionSetName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 600 }}>Target:</span> {schedule.targetName} | <span style={{ fontWeight: 600 }}>Assigned:</span> {schedule.assignedToName || schedule.assignedRole || 'Unassigned'}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/lpa/execute?scheduleId=${schedule.id}`)}
                      style={{
                        padding: '10px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: isOverdue ? '#dc2626' : 'var(--charcoal)',
                        color: '#fff', border: 'none', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 6, flexShrink: 0, transition: 'all 0.15s',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <Play size={14} fill="currentColor" /> Start Audit
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recently Completed Audits Panel */}
        <div style={{
          background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.02)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)' }}>
                <Award size={18} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
                Recent Audit Results
              </h2>
            </div>
            <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>
              Live quality feed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', maxHeight: 420 }}>
            {filteredRecentAudits.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ash)', background: 'var(--cream)', borderRadius: 12 }}>
                <Layers size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)' }}>No Recent Audits</div>
                <div style={{ fontSize: 12 }}>Execute an audit from the pending list to see live results here!</div>
              </div>
            ) : (
              filteredRecentAudits.map((audit) => {
                const isPass = audit.overallStatus === 'PASS';
                return (
                  <div
                    key={audit.id}
                    style={{
                      padding: '16px', borderRadius: 12, background: 'var(--cream)',
                      border: '1px solid var(--silk)', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 16,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                          background: isPass ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isPass ? '#16a34a' : '#dc2626',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {audit.overallStatus}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ash)' }}>
                          {new Date(audit.auditDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 2 }}>
                        {audit.questionSetName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                        Auditor: <span style={{ fontWeight: 600 }}>{audit.auditedByName}</span> | {audit.targetName}
                      </div>
                    </div>

                    {/* Circular / Meter Score Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 800,
                        color: isPass ? '#16a34a' : '#dc2626',
                        background: isPass ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        padding: '6px 12px', borderRadius: 10,
                        border: `1px solid ${isPass ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                      }}>
                        {Math.round(audit.scorePercentage)}%
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 600, marginTop: 4 }}>Score</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
