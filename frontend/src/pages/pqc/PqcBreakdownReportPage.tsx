import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/store/uiStore';
import { pqcApi } from '@/api/pqc.api';
import {
  AlertTriangle, Wrench, Zap, Sliders, Clock, AlertCircle,
  Calendar, Filter, Search, Download, FileText, Check, X,
  Building, User, Settings, ArrowDownRight, Layers, ShieldAlert,
  BarChart2, RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

const INCIDENT_ICONS: Record<string, any> = {
  'Machine Breakdown': Wrench,
  'Power Failure': Zap,
  'Tooling Issue': Sliders,
  'Material Delay': Clock,
  'Other Stoppage': AlertCircle,
};

export default function PqcBreakdownReportPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPageTitle('Operational Stoppage & Breakdown Ledger');
  }, [setPageTitle]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All Months');
  const [selectedMachine, setSelectedMachine] = useState('All Machines');
  const [selectedIncidentType, setSelectedIncidentType] = useState('All Types');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewerRemarks, setReviewerRemarks] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const isExporting = useRef(false);

  // Fetch incident logs
  const { data: response, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pqc-incident-report'],
    queryFn: () => pqcApi.getIncidentReport(),
  });

  const saveRemarksMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks: string }) =>
      pqcApi.updateIncidentRemarks(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pqc-incident-report'] });
      setEditingId(null);
      toast.success('Reviewer corrective remarks saved');
    },
    onError: () => toast.error('Failed to save remarks'),
  });

  const allLogs: any[] = response?.data || [];

  // Derive unique months for the monthly dropdown
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    allLogs.forEach((l) => {
      if (l.logTime) {
        const d = new Date(l.logTime);
        months.add(
          d.toLocaleString('default', { month: 'long', year: 'numeric' })
        );
      }
    });
    return ['All Months', ...Array.from(months)];
  }, [allLogs]);

  // Derive unique machines
  const machineOptions = useMemo(() => {
    const machines = new Set<string>();
    allLogs.forEach((l) => {
      const name = l.machine?.machineName || l.machine?.name;
      if (name) machines.add(name);
    });
    return ['All Machines', ...Array.from(machines)];
  }, [allLogs]);

  // Derive unique incident types
  const typeOptions = useMemo(() => {
    const types = new Set<string>();
    allLogs.forEach((l) => {
      if (l.incidentType) types.add(l.incidentType.trim());
    });
    return ['All Types', ...Array.from(types)];
  }, [allLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return allLogs.filter((log) => {
      const logDate = new Date(log.logTime);
      const logDateStr = logDate.toISOString().slice(0, 10);
      const logMonth = logDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      });

      // Month filter
      if (selectedMonth !== 'All Months' && logMonth !== selectedMonth) {
        return false;
      }

      // Machine filter
      const mName = log.machine?.machineName || log.machine?.name || 'Unassigned';
      if (selectedMachine !== 'All Machines' && mName !== selectedMachine) {
        return false;
      }

      // Incident Type filter
      if (
        selectedIncidentType !== 'All Types' &&
        log.incidentType !== selectedIncidentType
      ) {
        return false;
      }

      // Preset Date Filter
      if (dateFilterPreset === 'TODAY' && logDateStr !== todayStr) {
        return false;
      }
      if (dateFilterPreset === 'WEEK' && logDate < sevenDaysAgo) {
        return false;
      }
      if (dateFilterPreset === 'CUSTOM') {
        if (customStartDate && logDateStr < customStartDate) return false;
        if (customEndDate && logDateStr > customEndDate) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const partName = (log.gauge?.serialNumber || '').toLowerCase();
        const poNum = (log.gauge?.purchaseOrder?.poNumber || '').toLowerCase();
        const opName = (log.gaugeOperation?.operationName || '').toLowerCase();
        const remarks = (log.incidentRemarks || log.remarks || '').toLowerCase();
        const inspector = (log.inspector?.fullName || '').toLowerCase();
        const incType = (log.incidentType || '').toLowerCase();

        return (
          partName.includes(term) ||
          poNum.includes(term) ||
          opName.includes(term) ||
          remarks.includes(term) ||
          inspector.includes(term) ||
          incType.includes(term)
        );
      }

      return true;
    });
  }, [
    allLogs,
    selectedMonth,
    selectedMachine,
    selectedIncidentType,
    dateFilterPreset,
    customStartDate,
    customEndDate,
    searchTerm,
  ]);

  // Aggregate stats
  const totalIncidents = filteredLogs.length;
  const totalDowntimeMinutes = filteredLogs.reduce(
    (sum, l) => sum + (l.incidentDurationMins || 0),
    0
  );
  const totalDowntimeHours = (totalDowntimeMinutes / 60).toFixed(1);

  const zeroProductionEvents = filteredLogs.filter(
    (l) => (l.actualQty || 0) === 0
  ).length;

  // Breakdown by incident type for distribution cards
  const incidentsByType = useMemo(() => {
    const map: Record<string, { count: number; minutes: number }> = {};
    filteredLogs.forEach((l) => {
      const type = l.incidentType || 'Other Stoppage';
      if (!map[type]) map[type] = { count: 0, minutes: 0 };
      map[type].count += 1;
      map[type].minutes += l.incidentDurationMins || 0;
    });
    return map;
  }, [filteredLogs]);

  // Top impacted machine
  const topMachine = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLogs.forEach((l) => {
      const m = l.machine?.machineName || l.machine?.name || 'Unassigned';
      map[m] = (map[m] || 0) + (l.incidentDurationMins || 0);
    });
    let topName = 'None';
    let topMins = 0;
    Object.entries(map).forEach(([name, mins]) => {
      if (mins > topMins) {
        topMins = mins;
        topName = name;
      }
    });
    return { name: topName, minutes: topMins };
  }, [filteredLogs]);

  // Export to PDF
  const exportPdf = async () => {
    if (!tableRef.current || isExporting.current) return;
    isExporting.current = true;
    const loadingToast = toast.loading('Exporting Breakdown Ledger PDF...');

    try {
      const canvas = await html2canvas(tableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
      pdf.save(`Breakdown-Incidents-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF Exported Successfully', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF', { id: loadingToast });
    } finally {
      isExporting.current = false;
    }
  };

  // Export to CSV
  const exportCsv = () => {
    const headers = [
      'Timestamp',
      'Shift',
      'Hour Slot',
      'Machine',
      'Part Serial',
      'Purchase Order',
      'Operation',
      'Incident Classification',
      'Downtime (Mins)',
      'Actual Inspected',
      'Passed',
      'Inspector',
      'Why Stopped (Observations)',
      'Reviewer Corrective Remarks',
    ];

    const rows = filteredLogs.map((l) => [
      l.logTime ? new Date(l.logTime).toLocaleString('en-IN') : '',
      l.shift?.shiftName || 'Standard',
      l.slotIndex ? `Hour #${l.slotIndex}` : '',
      l.machine?.machineName || l.machine?.name || 'Unassigned',
      l.gauge?.serialNumber || '',
      l.gauge?.purchaseOrder?.poNumber || '',
      l.gaugeOperation?.operationName || '',
      l.incidentType || '',
      l.incidentDurationMins || 0,
      l.actualQty || 0,
      l.passedQty || 0,
      l.inspector?.fullName || '',
      `"${(l.incidentRemarks || l.remarks || '').replace(/"/g, '""')}"`,
      `"${(l.reviewerRemarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `breakdown_ledger_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Downloaded');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* ━━━ Header & Quick Stats ━━━ */}
      <div className="pqc-header-flex">
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.375rem', fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
            Machine Breakdown & Stoppage Ledger
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ash)' }}>
            Track why machines stopped, downtime duration, affected part operations, and corrective reviewer actions.
          </p>
        </div>

        <div className="pqc-header-actions">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--stone)',
              background: 'var(--warm-white)',
              color: 'var(--charcoal)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: '1px solid var(--stone)',
              background: 'var(--warm-white)',
              color: 'var(--charcoal)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--copper-bronze)',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(139, 105, 20, 0.25)',
            }}
          >
            <FileText size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {/* ━━━ Summary Metric Cards ━━━ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        <div style={{ padding: '16px 18px', background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)', borderLeft: '4px solid var(--copper-bronze)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ash)' }}>
              Total Breakdown Events
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--copper-bronze)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--charcoal)', fontFamily: "'JetBrains Mono', monospace" }}>
            {totalIncidents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: 4 }}>
            Recorded in selected timeframe
          </div>
        </div>

        <div style={{ padding: '16px 18px', background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)', borderLeft: '4px solid #BA1A1A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ash)' }}>
              Total Downtime Lost
            </span>
            <Clock size={18} style={{ color: '#BA1A1A' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#BA1A1A', fontFamily: "'JetBrains Mono', monospace" }}>
            {totalDowntimeHours} <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>hrs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: 4 }}>
            {totalDowntimeMinutes} total minutes lost
          </div>
        </div>

        <div style={{ padding: '16px 18px', background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)', borderLeft: '4px solid #b45309' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ash)' }}>
              Zero-Production Hours
            </span>
            <ShieldAlert size={18} style={{ color: '#b45309' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', fontFamily: "'JetBrains Mono', monospace" }}>
            {zeroProductionEvents}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: 4 }}>
            Slots logged with 0 actual parts
          </div>
        </div>

        <div style={{ padding: '16px 18px', background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)', borderLeft: '4px solid var(--slate)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ash)' }}>
              Most Impacted Machine
            </span>
            <Wrench size={18} style={{ color: 'var(--slate)' }} />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--charcoal)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {topMachine.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--warm-gray)', marginTop: 4 }}>
            {topMachine.minutes} mins downtime recorded
          </div>
        </div>
      </div>

      {/* ━━━ Incident Classification Summary Chips ━━━ */}
      {Object.keys(incidentsByType).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 16px', background: 'var(--bone-white)', borderRadius: 8, border: '1px solid var(--silk)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
            <BarChart2 size={14} /> Breakdown Causes:
          </span>
          {Object.entries(incidentsByType).map(([type, stats]) => {
            const Icon = INCIDENT_ICONS[type] || AlertCircle;
            const isFilterActive = selectedIncidentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedIncidentType(isFilterActive ? 'All Types' : type)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: isFilterActive ? '1.5px solid var(--copper-bronze)' : '1px solid var(--stone)',
                  background: isFilterActive ? 'var(--copper-light)' : 'var(--warm-white)',
                  color: isFilterActive ? 'var(--copper-dark)' : 'var(--charcoal)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={12} style={{ color: 'var(--copper-bronze)' }} />
                <span>{type}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", opacity: 0.8 }}>
                  ({stats.count} &bull; {stats.minutes}m)
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ━━━ Filter Bar ━━━ */}
      <div style={{ padding: '16px 18px', background: 'var(--warm-white)', borderRadius: 10, border: '1px solid var(--silk)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ash)' }} />
            <input
              type="text"
              placeholder="Search by part, PO, operation, machine, remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 34px',
                borderRadius: 6,
                border: '1px solid var(--stone)',
                background: '#FFFFFF',
                color: 'var(--charcoal)',
                fontSize: '0.8125rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['ALL', 'TODAY', 'WEEK', 'CUSTOM'] as const).map((preset) => {
              const active = dateFilterPreset === preset;
              const labels = { ALL: 'All Dates', TODAY: 'Today', WEEK: 'Last 7 Days', CUSTOM: 'Date Range' };
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDateFilterPreset(preset)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: active ? '1.5px solid var(--copper-bronze)' : '1px solid var(--silk)',
                    background: active ? 'var(--copper-light)' : 'transparent',
                    color: active ? 'var(--copper-dark)' : 'var(--warm-gray)',
                  }}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropdowns Row: Month, Machine, Incident Type, and optional Custom Dates */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {/* Monthly Filter as requested */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} style={{ color: 'var(--ash)' }} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid var(--stone)',
                background: '#FFFFFF',
                color: 'var(--charcoal)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Machine Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building size={14} style={{ color: 'var(--ash)' }} />
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid var(--stone)',
                background: '#FFFFFF',
                color: 'var(--charcoal)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {machineOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Incident Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: 'var(--ash)' }} />
            <select
              value={selectedIncidentType}
              onChange={(e) => setSelectedIncidentType(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: 6,
                border: '1px solid var(--stone)',
                background: '#FFFFFF',
                color: 'var(--charcoal)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Date Range if selected */}
          {dateFilterPreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFFFF', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--stone)' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--charcoal)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--ash)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.75rem', color: 'var(--charcoal)' }}
              />
            </div>
          )}

          {(selectedMonth !== 'All Months' ||
            selectedMachine !== 'All Machines' ||
            selectedIncidentType !== 'All Types' ||
            searchTerm ||
            dateFilterPreset !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('All Months');
                setSelectedMachine('All Machines');
                setSelectedIncidentType('All Types');
                setSearchTerm('');
                setDateFilterPreset('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: 'none',
                border: 'none',
                color: 'var(--ash)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ━━━ Detailed Ledger Table ━━━ */}
      <div
        ref={tableRef}
        style={{
          background: 'var(--warm-white)',
          borderRadius: 10,
          border: '1px solid var(--silk)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-ambient, 0 2px 8px rgba(0,0,0,0.04))',
        }}
      >
        <div className="pqc-responsive-table-container">
          <table style={{ width: '100%', minWidth: 880, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ background: 'var(--charcoal)', color: '#FAF8F5' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Time & Shift</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Machine</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Part / PO</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Operation</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Incident Classification</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Downtime</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Impact (Qty)</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Why It Stopped</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Reviewer Action / Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--ash)' }}>
                    Loading breakdown logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--ash)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={32} style={{ color: 'var(--stone)' }} />
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--charcoal)' }}>
                        No breakdown or stoppage incidents found
                      </div>
                      <div style={{ fontSize: '0.75rem' }}>
                        No operational stoppage records match the selected date and filter criteria.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const logDate = log.logTime ? new Date(log.logTime) : null;
                  const dateStr = logDate ? logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
                  const timeStr = logDate ? logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-';

                  const Icon = INCIDENT_ICONS[log.incidentType] || AlertCircle;
                  const isZeroProd = (log.actualQty || 0) === 0;
                  const isEditing = editingId === log.id;

                  return (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: '1px solid var(--silk)',
                        background: index % 2 === 0 ? '#FAF8F5' : '#FFFFFF',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Time & Shift */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{dateStr}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ash)', fontFamily: "'JetBrains Mono', monospace" }}>{timeStr}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <span style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: 4, background: 'var(--bone-white)', border: '1px solid var(--silk)', color: 'var(--warm-gray)', fontWeight: 600 }}>
                            {log.shift?.shiftName || 'Standard'}
                          </span>
                          {log.slotIndex && (
                            <span style={{ fontSize: '0.625rem', padding: '1px 6px', borderRadius: 4, background: 'var(--copper-light)', color: 'var(--copper-dark)', fontWeight: 700 }}>
                              Hour #{log.slotIndex}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Machine */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Building size={14} style={{ color: 'var(--copper-bronze)' }} />
                          <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>
                            {log.machine?.machineName || log.machine?.name || 'Unassigned'}
                          </span>
                        </div>
                        {log.machine?.machineCode && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ash)', fontFamily: "'JetBrains Mono', monospace", marginLeft: 20 }}>
                            {log.machine.machineCode}
                          </div>
                        )}
                      </td>

                      {/* Part / PO */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal)' }}>
                          {log.gauge?.serialNumber || 'N/A'}
                        </div>
                        {log.gauge?.purchaseOrder?.poNumber && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ash)' }}>
                            PO: {log.gauge.purchaseOrder.poNumber}
                          </div>
                        )}
                        {log.gauge?.purchaseOrder?.customer?.name && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--warm-gray)' }}>
                            {log.gauge.purchaseOrder.customer.name}
                          </div>
                        )}
                      </td>

                      {/* Operation */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, color: 'var(--charcoal)' }}>
                          {log.gaugeOperation?.operationName || 'Operation'}
                        </div>
                        {log.gaugeOperation?.sequenceOrder != null && (
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ash)' }}>
                            Seq #{log.gaugeOperation.sequenceOrder}
                          </div>
                        )}
                      </td>

                      {/* Incident Classification */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: 'var(--copper-light, #FBF4E8)',
                            border: '1px solid var(--copper-bronze, #8B6914)',
                            color: 'var(--copper-dark, #6F5100)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Icon size={13} style={{ color: 'var(--copper-bronze)' }} />
                          <span>{log.incidentType}</span>
                        </div>
                      </td>

                      {/* Downtime */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: log.incidentDurationMins && log.incidentDurationMins >= 60 ? '#BA1A1A' : 'var(--charcoal)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {log.incidentDurationMins || 0}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--ash)' }}>mins</span>
                        </div>
                        {log.incidentDurationMins && log.incidentDurationMins >= 60 && (
                          <span style={{ fontSize: '0.625rem', color: '#BA1A1A', fontWeight: 700 }}>
                            &ge; 1 hour downtime
                          </span>
                        )}
                      </td>

                      {/* Impact (Qty) */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                        {isZeroProd ? (
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: '#FEE2E2', color: '#BA1A1A', fontWeight: 700, fontSize: '0.6875rem', border: '1px solid rgba(186,26,26,0.3)' }}>
                            0 Actual &bull; Zero Production
                          </span>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--charcoal)' }}>{log.actualQty}</span> inspected
                            <div style={{ fontSize: '0.6875rem', color: '#228B22' }}>{log.passedQty} passed</div>
                          </div>
                        )}
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ash)', marginTop: 4 }}>
                          Inspector: {log.inspector?.fullName || '-'}
                        </div>
                      </td>

                      {/* Why it stopped (Observations) */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', maxWidth: 260 }}>
                        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--charcoal)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {log.incidentRemarks || log.remarks || 'No detailed observation entered.'}
                        </p>
                      </td>

                      {/* Reviewer Action / Corrective Notes */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'top', minWidth: 200 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <textarea
                              rows={2}
                              value={reviewerRemarks}
                              onChange={(e) => setReviewerRemarks(e.target.value)}
                              placeholder="Action taken, maintenance work order #..."
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 4,
                                border: '1.5px solid var(--copper-bronze)',
                                fontSize: '0.75rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                resize: 'none',
                              }}
                            />
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  border: '1px solid var(--stone)',
                                  background: 'none',
                                  fontSize: '0.6875rem',
                                  cursor: 'pointer',
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  saveRemarksMutation.mutate({
                                    id: log.id,
                                    remarks: reviewerRemarks,
                                  })
                                }
                                disabled={saveRemarksMutation.isPending}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 4,
                                  border: 'none',
                                  background: 'var(--copper-bronze)',
                                  color: 'white',
                                  fontSize: '0.6875rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingId(log.id);
                              setReviewerRemarks(log.reviewerRemarks || '');
                            }}
                            style={{
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: 4,
                              background: log.reviewerRemarks ? 'var(--bone-white)' : 'transparent',
                              border: log.reviewerRemarks ? '1px solid var(--silk)' : '1px dashed var(--stone)',
                              fontSize: '0.75rem',
                              color: log.reviewerRemarks ? 'var(--charcoal)' : 'var(--ash)',
                              lineHeight: 1.3,
                            }}
                          >
                            {log.reviewerRemarks ? (
                              <span>{log.reviewerRemarks}</span>
                            ) : (
                              <span style={{ fontStyle: 'italic' }}>+ Add corrective action note</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
