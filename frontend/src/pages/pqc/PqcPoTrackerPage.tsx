import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPurchaseOrders } from '@/api/purchase-orders.api';
import { machinesApi } from '@/api/machines.api';
import {
  Calendar, Filter, Search, RefreshCw, Download, Printer, Award,
  CheckCircle2, AlertTriangle, Clock, TrendingUp, Layers, Package,
  Factory, ShieldCheck, ArrowUpRight, ChevronRight, Check, X,
  FileText, BarChart3, PieChart, Users, Loader2, Settings, User
} from 'lucide-react';
import toast from 'react-hot-toast';
import './pqc-po-tracker.css';

const getArray = (res: any): any[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  return [];
};

const MONTH_NAMES = [
  'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS_LIST = ['All Years', '2026', '2025', '2024'];

export default function PqcPoTrackerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  // Time & Period Filters (Separated Year and Month. Default to current date)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_NAMES[new Date().getMonth() + 1]);

  // Customer & Active Track Filters
  const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
  const [selectedTrackStatus, setSelectedTrackStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal State
  const [modalOpDetails, setModalOpDetails] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (isSync = false) => {
    if (isSync) setSyncing(true);
    else setLoading(true);

    try {
      // Fetch both POs and machine schedule events
      const [poRes, eventsRes] = await Promise.all([
        getPurchaseOrders({ size: 1000 }),
        machinesApi.getEvents()
      ]);
      
      const apiList = getArray(poRes);
      const eventsList = getArray(eventsRes);

      // Map API POs into standardized tracker structure
      const mappedApi = apiList.map((po: any) => {
        const planned = po.targetQuantity ?? po.totalGauges ?? po.totalQuantity ?? 0;
        const produced = po.producedQuantity ?? po.completedGauges ?? po.completedQuantity ?? 0;
        const rejected = po.rejectedQuantity ?? po.rejectedGauges ?? 0;
        const scrapped = po.scrappedQuantity ?? po.scrappedGauges ?? 0;

        let activeTrack = 'ACTIVE_TRACK';
        if (po.status === 'DRAFT' || po.status === 'PENDING') {
          activeTrack = 'DRAFTED_NOT_STARTED';
        } else if (po.status === 'COMPLETED' || po.status === 'CLOSED') {
          activeTrack = 'COMPLETED';
        } else if (po.status === 'CANCELLED' || po.status === 'ON_HOLD') {
          activeTrack = 'ON_HOLD_CANCELLED';
        }

        const totalProcessed = produced + rejected + scrapped;
        const defectSum = rejected + scrapped;
        const ppm = totalProcessed > 0 ? Math.round((defectSum / totalProcessed) * 1000000) : 0;
        
        // Find all operation events for this PO
        const poEvents = eventsList.filter(e => e.poNumber === po.poNumber);
        
        // Ensure we handle Jackson's serialization of boolean isCompleted -> completed
        const activeEvent = poEvents.find(e => !(e.completed ?? e.isCompleted));
        
        // Mark operations with their specific status
        const enhancedOperations = poEvents.map(e => {
          const isDone = e.completed ?? e.isCompleted;
          
          // Only show as Active if the PO itself is actively being worked on
          let statusText = activeTrack === 'ACTIVE_TRACK' ? '[Active]' : '[Pending]';
          let statusColor = activeTrack === 'ACTIVE_TRACK' ? '#ca8a04' : 'var(--slate)';
          
          if (isDone) {
            statusText = '[Done]';
            statusColor = '#16a34a';
          }
          
          return {
            ...e,
            isDone,
            statusText,
            statusColor,
            displayText: `${e.operationName} (on ${e.machineName || 'Unknown Machine'})`
          };
        });
        
        let currentOp = 'Not started yet';
        let currentMachine = 'No machine setup';
        
        // If there are multiple active operations, show a summary
        const activeEvents = enhancedOperations.filter(e => e.statusText === '[Active]');
        if (activeEvents.length === 1) {
          currentOp = activeEvents[0].operationName || 'Unknown Operation';
          currentMachine = activeEvents[0].machineName || 'Unknown Machine';
        } else if (activeEvents.length > 1) {
          currentOp = 'Multiple Operations Active';
          currentMachine = 'Multiple Machines';
        } else if (activeTrack === 'COMPLETED' || (enhancedOperations.length > 0 && activeEvents.length === 0)) {
          // If no active events and there are operations, it's either all done or all pending
          const allPending = enhancedOperations.every(e => e.statusText === '[Pending]');
          if (!allPending) {
            currentOp = 'All Operations Completed';
            currentMachine = '-';
          }
        }

        return {
          id: po.id,
          poNumber: po.poNumber || `PO-${po.id?.slice(0, 8)}`,
          customerName: po.customerName || po.customer?.name || 'Internal Production',
          partName: po.partName || po.gaugeTypeName || po.productName || 'Standard Assembly Part',
          orderDate: po.orderDate || po.createdAt?.slice(0, 10) || '2026-07-10',
          expectedDeliveryDate: po.expectedDeliveryDate || po.dueDate || '2026-07-30',
          status: po.status || 'IN_PROGRESS',
          priority: po.priority || 'NORMAL',
          totalGauges: planned,
          completedGauges: produced,
          rejectedGauges: rejected,
          scrappedGauges: scrapped,
          ppm,
          currentOperation: currentOp,
          machineName: currentMachine,
          allOperations: enhancedOperations, // include all scheduled operations for the dropdown
          activeTrackStatus: activeTrack,
          remarks: po.specialInstructions || po.remarks || 'Standard PQC quality monitoring active.'
        };
      });

      // Set real API data
      setOrders(mappedApi);

      if (isSync) {
        toast.success('Production & Quality tracker synced with live shop floor records!');
      }
    } catch (err) {
      console.error('Failed to fetch POs:', err);
      setOrders([]);
      if (isSync) toast.error('Failed to sync production orders.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // Dynamic Customer List from loaded orders
  const customersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.customerName) set.add(o.customerName);
    });
    return ['ALL', ...Array.from(set)];
  }, [orders]);

  // Filtered Orders based on Year, Month, Customer, Active Track Status, and Search
  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      // 1. Year Filter
      if (selectedYear !== 'All Years') {
        const poYear = po.orderDate ? po.orderDate.slice(0, 4) : '';
        if (poYear !== selectedYear) return false;
      }

      // 2. Month Filter
      if (selectedMonth !== 'All Months') {
        const monthIndex = MONTH_NAMES.indexOf(selectedMonth); // 1 for Jan, 7 for July...
        const poMonthStr = po.orderDate ? po.orderDate.slice(5, 7) : '';
        const poMonthNum = parseInt(poMonthStr, 10);
        if (poMonthNum !== monthIndex) return false;
      }

      // 3. Customer Filter
      if (selectedCustomer !== 'ALL') {
        if (po.customerName !== selectedCustomer) return false;
      }

      // 4. Active Track Status Filter
      if (selectedTrackStatus !== 'ALL') {
        if (selectedTrackStatus === 'ACTIVE_TRACK') {
          if (po.activeTrackStatus !== 'ACTIVE_TRACK' && po.status !== 'IN_PROGRESS' && po.status !== 'CONFIRMED') return false;
        } else if (selectedTrackStatus === 'DRAFTED_NOT_STARTED') {
          if (po.activeTrackStatus !== 'DRAFTED_NOT_STARTED' && po.status !== 'DRAFT') return false;
        } else if (selectedTrackStatus === 'COMPLETED') {
          if (po.activeTrackStatus !== 'COMPLETED' && po.status !== 'COMPLETED') return false;
        } else if (selectedTrackStatus === 'ON_HOLD_CANCELLED') {
          if (po.status !== 'CANCELLED' && po.status !== 'ON_HOLD') return false;
        }
      }

      // 5. Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchPo = po.poNumber?.toLowerCase().includes(q);
        const matchCust = po.customerName?.toLowerCase().includes(q);
        const matchPart = po.partName?.toLowerCase().includes(q);
        const matchRem = po.remarks?.toLowerCase().includes(q);
        
        // Search by current machine or operation
        const matchMachine = po.machineName?.toLowerCase().includes(q);
        const matchCurrentOp = po.currentOperation?.toLowerCase().includes(q);
        
        // Search inside the allOperations array (operation names and status texts like "[Pending]", "[Active]")
        const matchAnyOp = po.allOperations?.some((op: any) => 
          op.operationName?.toLowerCase().includes(q) || 
          op.statusText?.toLowerCase().includes(q) ||
          op.machineName?.toLowerCase().includes(q)
        );

        if (!matchPo && !matchCust && !matchPart && !matchRem && !matchMachine && !matchCurrentOp && !matchAnyOp) return false;
      }

      return true;
    });
  }, [orders, selectedYear, selectedMonth, selectedCustomer, selectedTrackStatus, searchTerm]);

  // Calculate Monthly Summary Metrics across filtered orders
  const summaryMetrics = useMemo(() => {
    let totalPOs = filteredOrders.length;
    let activePOs = 0;
    let draftedPOs = 0;
    let completedPOs = 0;

    let plannedSum = 0;
    let producedSum = 0;
    let rejectedSum = 0;
    let scrappedSum = 0;

    filteredOrders.forEach(po => {
      plannedSum += po.totalGauges || 0;
      producedSum += po.completedGauges || 0;
      rejectedSum += po.rejectedGauges || 0;
      scrappedSum += po.scrappedGauges || 0;

      if (po.activeTrackStatus === 'ACTIVE_TRACK' || po.status === 'IN_PROGRESS') activePOs++;
      else if (po.activeTrackStatus === 'DRAFTED_NOT_STARTED' || po.status === 'DRAFT') draftedPOs++;
      else if (po.activeTrackStatus === 'COMPLETED' || po.status === 'COMPLETED') completedPOs++;
    });

    const totalProcessed = producedSum + rejectedSum + scrappedSum;
    const defectSum = rejectedSum + scrappedSum;
    const averagePPM = totalProcessed > 0 ? Math.round((defectSum / totalProcessed) * 1000000) : 0;
    
    const overallProgress = plannedSum > 0 ? Math.min(100, Math.round((producedSum / plannedSum) * 100)) : 0;
    const passRate = (producedSum + rejectedSum) > 0 
      ? ((producedSum / (producedSum + rejectedSum)) * 100).toFixed(1)
      : '100.0';

    return {
      totalPOs, activePOs, draftedPOs, completedPOs,
      plannedSum, producedSum, rejectedSum, scrappedSum,
      totalProcessed, overallProgress, passRate, averagePPM
    };
  }, [filteredOrders]);

  const handleExport = () => {
    toast.success(`Exporting ${filteredOrders.length} production orders for ${selectedMonth} ${selectedYear} to Excel/CSV...`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* ── Header Overview & Sync Controls ── */}
      <div className="pqc-po-header-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(184, 115, 51, 0.15)', color: 'var(--copper-bronze)',
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <ShieldCheck size={14} /> Admin & Supervisor Command View
            </span>
            <span style={{ fontSize: 12, color: 'var(--ash)', fontWeight: 600 }}>
              • Real-Time Shop Floor & PQC Synchronization
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 6px 0' }}>
            Monthly PO Production & Quality Tracker
          </h1>
          <p style={{ fontSize: 13, color: 'var(--slate)', margin: 0, maxWidth: 740, lineHeight: 1.5 }}>
            Monitor monthly production order counts, actual vs. planned volume, inspection pass rates, and scrap tallies. 
            Filter by customer and active shop floor status to track order progress from draft to completion.
          </p>
        </div>

        <div className="pqc-header-actions">
          <button
            onClick={() => fetchOrders(true)}
            disabled={syncing}
            style={{
              padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)',
              cursor: syncing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} style={{ color: 'var(--copper-bronze)' }} />
            <span>{syncing ? 'Syncing Shop Floor...' : 'Sync Live Data'}</span>
          </button>

          <button
            onClick={handleExport}
            style={{
              padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
          >
            <Download size={16} /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '12px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
              color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 6px 18px rgba(184,115,51,0.25)', transition: 'all 0.15s'
            }}
          >
            <Printer size={16} /> Print Report
          </button>
        </div>
      </div>

      {/* ── Time & Period Selector (Year & Month Separately) ── */}
      <div style={{
        padding: '20px 24px', borderRadius: 14, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--charcoal)', fontWeight: 700, fontSize: 14 }}>
            <Calendar size={18} style={{ color: 'var(--copper-bronze)' }} />
            <span>Time Period:</span>
          </div>

          {/* Year Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ash)' }}>Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                background: 'var(--cream)', color: 'var(--charcoal)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', outline: 'none'
              }}
            >
              {YEARS_LIST.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Pill Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ash)' }}>Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '2px solid var(--copper-bronze)',
                background: 'rgba(184, 115, 51, 0.08)', color: 'var(--copper-bronze)', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', outline: 'none'
              }}
            >
              {MONTH_NAMES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Month Pills for easy supervisor clicking */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedMonth('All Months')}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: selectedMonth === 'All Months' ? 700 : 500,
              background: selectedMonth === 'All Months' ? 'var(--charcoal)' : 'var(--cream)',
              color: selectedMonth === 'All Months' ? '#fff' : 'var(--slate)',
              border: '1px solid var(--silk)', cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            All Months
          </button>
          
          <div style={{ width: 1, height: 20, background: 'var(--silk)' }} />

          <div style={{ display: 'flex', gap: 6 }}>
            {(() => {
              const currentMonthIdx = new Date().getMonth(); // 0-11
              const prevIdx = currentMonthIdx === 0 ? 11 : currentMonthIdx - 1;
              const nextIdx = currentMonthIdx === 11 ? 0 : currentMonthIdx + 1;
              const quickMonths = [
                MONTH_NAMES[prevIdx + 1],
                MONTH_NAMES[currentMonthIdx + 1],
                MONTH_NAMES[nextIdx + 1]
              ];
              return quickMonths.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: selectedMonth === m ? 700 : 500,
                    background: selectedMonth === m ? 'var(--charcoal)' : 'var(--cream)',
                    color: selectedMonth === m ? '#fff' : 'var(--slate)',
                    border: '1px solid var(--silk)', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                >
                  {m}
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* ── Monthly Summary KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
        
        {/* Total POs Card */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(184, 115, 51, 0.08)', zIndex: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Total POs ({selectedMonth})
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(184, 115, 51, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)' }}>
              <Package size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summaryMetrics.totalPOs} <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ash)' }}>orders</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#16a34a' }}>● {summaryMetrics.activePOs} Active</span>
              <span style={{ color: '#ca8a04' }}>● {summaryMetrics.draftedPOs} Drafted</span>
              <span style={{ color: 'var(--ash)' }}>● {summaryMetrics.completedPOs} Done</span>
            </div>
          </div>
        </div>

        {/* Planned vs Produced Volume */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)', zIndex: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Produced / Planned Volume
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summaryMetrics.producedSum.toLocaleString()} <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ash)' }}>/ {summaryMetrics.plannedSum.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 10, width: '100%', background: 'var(--linen)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ background: '#16a34a', height: '100%', width: `${summaryMetrics.overallProgress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, marginTop: 6 }}>
              {summaryMetrics.overallProgress}% of planned target volume achieved
            </div>
          </div>
        </div>

        {/* Rejected & Scrapped Tally */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: `1px solid ${summaryMetrics.rejectedSum > 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--silk)'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', zIndex: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Rejected & Scrapped Tally
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {summaryMetrics.rejectedSum.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ash)' }}>rej</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#ea580c', letterSpacing: '-0.03em', lineHeight: 1 }}>
                {summaryMetrics.scrappedSum.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ash)' }}>scrap</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Total Processed: {summaryMetrics.totalProcessed.toLocaleString()} pcs</span>
            </div>
          </div>
        </div>

        {/* Quality (Average PPM) */}
        <div style={{
          padding: '22px', borderRadius: 14, background: 'var(--warm-white)',
          border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 80, height: 80, borderRadius: '50%', background: summaryMetrics.averagePPM > 2000 ? 'rgba(239, 68, 68, 0.08)' : (summaryMetrics.averagePPM > 0 ? 'rgba(234, 179, 8, 0.08)' : 'rgba(34, 197, 94, 0.08)'), zIndex: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1, marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--dust)' }}>
              Average Monthly PPM
            </span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: summaryMetrics.averagePPM > 2000 ? 'rgba(239, 68, 68, 0.12)' : (summaryMetrics.averagePPM > 0 ? 'rgba(234, 179, 8, 0.12)' : 'rgba(34, 197, 94, 0.12)'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: summaryMetrics.averagePPM > 2000 ? '#dc2626' : (summaryMetrics.averagePPM > 0 ? '#ca8a04' : '#16a34a') }}>
              <Award size={20} />
            </div>
          </div>
          <div style={{ zIndex: 1 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: summaryMetrics.averagePPM > 2000 ? '#dc2626' : (summaryMetrics.averagePPM > 0 ? '#ca8a04' : '#16a34a'), letterSpacing: '-0.03em', lineHeight: 1 }}>
              {summaryMetrics.averagePPM.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 600 }}>PPM</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={14} style={{ color: summaryMetrics.averagePPM <= 2000 ? '#16a34a' : '#dc2626' }} /> 
              {summaryMetrics.averagePPM === 0 ? 'Zero Defects Recorded' : (summaryMetrics.averagePPM > 2000 ? 'Action Required: High Defect Rate' : 'Within Quality Limits')}
            </div>
          </div>
        </div>
      </div>

      {/* ── Customer & Active Track Filter Bar ── */}
      <div style={{
        padding: '16px 20px', borderRadius: 14, background: 'var(--warm-white)',
        border: '1px solid var(--silk)', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          
          {/* Customer Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={16} style={{ color: 'var(--copper-bronze)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>Customer:</span>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                background: 'var(--cream)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', outline: 'none'
              }}
            >
              {customersList.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Customers' : c}</option>
              ))}
            </select>
          </div>

          {/* Active Track Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>Active Track:</span>
            <select
              value={selectedTrackStatus}
              onChange={(e) => setSelectedTrackStatus(e.target.value)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--silk)',
                background: 'var(--cream)', color: 'var(--charcoal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="ALL">All Track Statuses</option>
              <option value="ACTIVE_TRACK">● Active Track (In Progress)</option>
              <option value="DRAFTED_NOT_STARTED">● Drafted (Not Started)</option>
              <option value="COMPLETED">● Completed & Verified</option>
              <option value="ON_HOLD_CANCELLED">● On Hold / Cancelled</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cream)', padding: '8px 14px', borderRadius: 10, border: '1px solid var(--silk)', flex: '1 1 280px', maxWidth: 400 }}>
          <Search size={16} style={{ color: 'var(--ash)' }} />
          <input
            type="text"
            placeholder="Search PO number, customer, part name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 13, color: 'var(--charcoal)' }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--ash)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Production Orders Table ── */}
      <div style={{
        background: 'var(--warm-white)', borderRadius: 16, border: '1px solid var(--silk)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.02)', overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--silk)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(250,248,245,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-bronze)' }}>
              <Layers size={18} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--charcoal)', margin: 0 }}>
              Monthly Production Orders & Quality Tally
            </h2>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--copper-bronze)', background: 'rgba(184, 115, 51, 0.1)', padding: '4px 12px', borderRadius: 20 }}>
            Showing {filteredOrders.length} orders for {selectedMonth} {selectedYear}
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ash)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--copper-bronze)' }} />
            <div style={{ fontSize: 14, fontWeight: 600 }}>Loading production orders & shop floor inspection tallies...</div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ash)', background: 'var(--cream)', margin: 24, borderRadius: 12 }}>
            <Package size={40} style={{ margin: '0 auto 12px', color: 'var(--copper-bronze)', opacity: 0.5 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>
              No Purchase Orders Found
            </div>
            <div style={{ fontSize: 13, maxWidth: 460, margin: '0 auto' }}>
              No production orders matched your selected filters ({selectedMonth} {selectedYear}, Customer: {selectedCustomer}, Track: {selectedTrackStatus}). Try switching to "All Months" or resetting filters.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--cream)', borderBottom: '2px solid var(--silk)', color: 'var(--dust)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>
                  <th style={{ padding: '14px 20px' }}>Order / PO Details</th>
                  <th style={{ padding: '14px 20px' }}>Customer & Part Name</th>
                  <th style={{ padding: '14px 20px' }}>Active Track Status</th>
                  <th style={{ padding: '14px 20px' }}>Operations Status</th>
                  <th style={{ padding: '14px 20px', minWidth: 160 }}>Volume & Yield</th>
                  <th style={{ padding: '14px 20px' }}>Quality (PPM)</th>
                  <th style={{ padding: '14px 20px', minWidth: 160 }}>Production Progress</th>
                  <th style={{ padding: '14px 20px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((po) => {
                  const planned = po.totalGauges || 0;
                  const produced = po.completedGauges || 0;
                  const rejected = po.rejectedGauges || 0;
                  const scrapped = po.scrappedGauges || 0;
                  const pct = planned > 0 ? Math.min(100, Math.round((produced / planned) * 100)) : 0;

                  // Badge styling based on active track status
                  let badgeBg = 'var(--linen)';
                  let badgeColor = 'var(--copper-bronze)';
                  let badgeLabel = 'In Progress';
                  let badgeDot = '#b87333';

                  if (po.activeTrackStatus === 'ACTIVE_TRACK' || po.status === 'IN_PROGRESS' || po.status === 'CONFIRMED') {
                    badgeBg = 'rgba(34, 197, 94, 0.12)';
                    badgeColor = '#16a34a';
                    badgeLabel = 'Active Track';
                    badgeDot = '#16a34a';
                  } else if (po.activeTrackStatus === 'DRAFTED_NOT_STARTED' || po.status === 'DRAFT') {
                    badgeBg = 'rgba(234, 179, 8, 0.15)';
                    badgeColor = '#ca8a04';
                    badgeLabel = 'Drafted (Not Started)';
                    badgeDot = '#ca8a04';
                  } else if (po.activeTrackStatus === 'COMPLETED' || po.status === 'COMPLETED') {
                    badgeBg = 'rgba(100, 116, 139, 0.15)';
                    badgeColor = '#475569';
                    badgeLabel = 'Completed & Verified';
                    badgeDot = '#475569';
                  } else if (po.status === 'CANCELLED' || po.status === 'ON_HOLD') {
                    badgeBg = 'rgba(239, 68, 68, 0.12)';
                    badgeColor = '#dc2626';
                    badgeLabel = po.status === 'CANCELLED' ? 'Cancelled' : 'On Hold';
                    badgeDot = '#dc2626';
                  }

                  return (
                    <tr
                      key={po.id}
                      style={{ borderBottom: '1px solid var(--silk)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* PO Details */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--charcoal)', fontSize: 14 }}>
                          {po.poNumber}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ash)', marginTop: 2 }}>
                          Order Date: {po.orderDate}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--slate)', fontWeight: 600 }}>
                          Due: {po.expectedDeliveryDate}
                        </div>
                      </td>

                      {/* Customer & Part Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, background: 'var(--linen)', color: 'var(--copper-bronze)', padding: '2px 8px', borderRadius: 6, marginBottom: 4 }}>
                          {po.customerName}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--charcoal)' }}>
                          {po.partName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ash)', fontStyle: 'italic', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {po.remarks}
                        </div>
                      </td>

                      {/* Active Track Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                          background: badgeBg, color: badgeColor
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: badgeDot }} />
                          {badgeLabel}
                        </span>
                      </td>

                      {/* Operations Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {po.allOperations && po.allOperations.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* Desktop View: Expandable List */}
                            <div className="ops-desktop-view">
                              <details style={{ background: 'var(--cream)', border: '1px solid var(--silk)', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
                                <summary style={{ fontWeight: 700, color: 'var(--charcoal)', outline: 'none' }}>
                                  {po.currentOperation}
                                </summary>
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 8, borderLeft: '2px solid var(--silk)' }}>
                                  {po.allOperations.map((op: any, idx: number) => (
                                    <div key={idx} style={{ color: op.statusColor, fontWeight: 600 }}>
                                      {op.statusText} {op.displayText}
                                    </div>
                                  ))}
                                </div>
                              </details>
                              <div style={{ fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Factory size={12} style={{ color: 'var(--copper-bronze)' }} />
                                {po.machineName}
                              </div>
                            </div>
                            
                            {/* Mobile/Tab View: Button + Modal */}
                            <div className="ops-mobile-view" style={{ flexDirection: 'column', gap: 6 }}>
                              <div style={{ fontWeight: 700, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Settings size={14} style={{ color: 'var(--copper-bronze)' }} />
                                {po.currentOperation}
                              </div>
                              <button
                                onClick={() => setModalOpDetails(po)}
                                style={{
                                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  background: 'var(--cream)', border: '1px solid var(--silk)', color: 'var(--copper-bronze)',
                                  cursor: 'pointer', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4
                                }}
                              >
                                <Layers size={12} /> View All Ops
                              </button>
                              <div style={{ fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Factory size={12} style={{ color: 'var(--copper-bronze)' }} />
                                {po.machineName}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontWeight: 700, color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Settings size={14} style={{ color: 'var(--copper-bronze)' }} />
                              {po.currentOperation}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Factory size={12} />
                              {po.machineName}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Volume & Yield (Compact) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--charcoal)' }}>
                            <span style={{ color: 'var(--ash)' }}>Plan:</span> <b>{planned.toLocaleString()}</b>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                            <span style={{ color: 'var(--ash)' }}>Prod:</span> <b>{produced.toLocaleString()}</b>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: rejected > 0 ? '#dc2626' : 'var(--ash)' }}>
                            <span style={{ color: 'var(--ash)' }}>Rej:</span> <b>{rejected.toLocaleString()}</b>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: scrapped > 0 ? '#ea580c' : 'var(--ash)' }}>
                            <span style={{ color: 'var(--ash)' }}>Scrap:</span> <b>{scrapped.toLocaleString()}</b>
                          </div>
                        </div>
                      </td>

                      {/* Quality (PPM) */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          display: 'inline-flex', flexDirection: 'column',
                          background: po.ppm > 2000 ? 'rgba(239, 68, 68, 0.1)' : (po.ppm > 0 ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)'),
                          padding: '6px 12px', borderRadius: 8, border: `1px solid ${po.ppm > 2000 ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}`
                        }}>
                          <div style={{ 
                            fontSize: 14, fontWeight: 800, 
                            color: po.ppm > 2000 ? '#dc2626' : (po.ppm > 0 ? '#ca8a04' : '#16a34a')
                          }}>
                            {po.ppm.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 600 }}>PPM</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--slate)', marginTop: 2 }}>
                            {po.ppm === 0 ? 'Zero Defects' : (po.ppm > 2000 ? 'Action Required' : 'Within Limits')}
                          </div>
                        </div>
                      </td>

                      {/* Progress Bar */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          <span style={{ color: 'var(--slate)' }}>{produced} / {planned} pcs</span>
                          <span style={{ color: pct >= 100 ? '#16a34a' : 'var(--charcoal)' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', background: 'var(--linen)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            background: pct >= 100 ? '#16a34a' : 'linear-gradient(90deg, var(--copper-bronze), var(--golden-brown))',
                            height: '100%', width: `${pct}%`, transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            if (po.id && po.id.startsWith('demo-')) {
                              toast.success(`Viewing inspection details for ${po.poNumber} (${po.customerName})`);
                            } else {
                              navigate(`/pqc/po-tracker/${po.id}`);
                            }
                          }}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            background: 'var(--warm-white)', border: '1px solid var(--silk)', color: 'var(--charcoal)',
                            cursor: 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <span>Track QA</span>
                          <ArrowUpRight size={13} style={{ color: 'var(--copper-bronze)' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Operations Modal ── */}
      {modalOpDetails && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--warm-white)', borderRadius: 16, width: '100%', maxWidth: 'min(500px, 94vw)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--silk)',
            display: 'flex', flexDirection: 'column', maxHeight: '88vh'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--silk)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--charcoal)' }}>Operations Tracking</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--slate)' }}>{modalOpDetails.poNumber} • {modalOpDetails.customerName}</p>
              </div>
              <button onClick={() => setModalOpDetails(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--ash)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {modalOpDetails.allOperations.map((op: any, idx: number) => (
                  <div key={idx} style={{ 
                    padding: '12px 16px', borderRadius: 8, background: 'var(--cream)', 
                    border: '1px solid var(--silk)', display: 'flex', flexDirection: 'column', gap: 4
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--charcoal)', fontSize: 14 }}>{op.operationName}</span>
                      <span style={{ 
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, 
                        background: op.isDone ? 'rgba(22, 163, 74, 0.1)' : 'rgba(202, 138, 4, 0.1)',
                        color: op.isDone ? '#16a34a' : '#ca8a04' 
                      }}>
                        {op.statusText}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Factory size={12} /> {op.machineName || 'Unknown Machine'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--silk)', textAlign: 'right', background: 'rgba(250,248,245,0.5)', borderRadius: '0 0 16px 16px' }}>
              <button onClick={() => setModalOpDetails(null)} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--charcoal)', color: 'white', cursor: 'pointer', border: 'none' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
