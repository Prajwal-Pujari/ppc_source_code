import * as XLSX from 'xlsx';

export const COLORS = ['#8B6914','#3A6B4A','#8B3A3A','#4A6FA5','#6B5A8B','#C68B2F','#A05A2C','#2C8BA0','#6B8B3A','#A02C5A'];

export interface CustomerStats {
  name: string; totalPOs: number; completedPOs: number; latePOs: number;
  onTimePOs: number; atRiskPOs: number; totalOps: number; completedOps: number;
  onTimeRate: number;
}

export interface GrowthPoint {
  label: string; actual?: number; predicted?: number;
}

export function buildCustomerStats(tasks: any[]): CustomerStats[] {
  const poMap: Record<string, { customer: string; ops: any[]; expectedDelivery: string|null }> = {};
  tasks.forEach((t: any) => {
    const po = t.gauge?.purchaseOrder;
    const poId = po?.id || 'unknown';
    const cust = po?.customer?.name || po?.customerName || 'Unknown';
    if (!poMap[poId]) poMap[poId] = { customer: cust, ops: [], expectedDelivery: po?.expectedDeliveryDate || null };
    poMap[poId].ops.push(t);
  });

  const custMap: Record<string, CustomerStats> = {};
  Object.values(poMap).forEach(po => {
    const c = po.customer;
    if (!custMap[c]) custMap[c] = { name: c, totalPOs: 0, completedPOs: 0, latePOs: 0, onTimePOs: 0, atRiskPOs: 0, totalOps: 0, completedOps: 0, onTimeRate: 0 };
    const s = custMap[c];
    s.totalPOs++;
    const total = po.ops.length;
    const done = po.ops.filter((o: any) => o.status === 'COMPLETED').length;
    s.totalOps += total;
    s.completedOps += done;
    const pct = total > 0 ? done / total : 0;
    if (pct >= 1) { s.completedPOs++; s.onTimePOs++; }
    else if (po.expectedDelivery) {
      const diff = (new Date(po.expectedDelivery).getTime() - Date.now()) / 864e5;
      if (diff < 0) s.latePOs++;
      else if (diff <= 7 && pct < 0.5) s.atRiskPOs++;
      else s.onTimePOs++;
    } else s.onTimePOs++;
  });

  return Object.values(custMap).map(s => ({ ...s, onTimeRate: s.totalPOs > 0 ? Math.round((s.onTimePOs / s.totalPOs) * 100) : 0 }))
    .sort((a, b) => b.totalPOs - a.totalPOs);
}

export function buildGrowthPrediction(dailyData: any[]): GrowthPoint[] {
  if (!dailyData?.length) return [];
  const sorted = [...dailyData].sort((a, b) => a.summaryDate?.localeCompare(b.summaryDate));
  const actuals: GrowthPoint[] = sorted.slice(-14).map(d => ({
    label: d.summaryDate?.slice(5) || '', actual: d.gaugesCompleted || 0
  }));
  // Simple linear regression for 7-day prediction
  const vals = actuals.map(a => a.actual || 0);
  const n = vals.length;
  if (n < 2) return actuals;
  const xMean = (n - 1) / 2;
  const yMean = vals.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  vals.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  // Add last actual as bridge
  const lastActual = actuals[actuals.length - 1];
  if (lastActual) lastActual.predicted = lastActual.actual;
  // Add 7 predicted days
  const lastDate = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(lastDate); d.setDate(d.getDate() + i);
    const predicted = Math.max(0, Math.round(slope * (n - 1 + i) + intercept));
    actuals.push({ label: `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`, predicted });
  }
  return actuals;
}

export function exportToExcel(customerStats: CustomerStats[], dailyData: any[], tasks: any[]) {
  const wb = XLSX.utils.book_new();
  // Sheet 1: Customer Summary
  const custRows = customerStats.map(c => ({
    'Customer': c.name, 'Total POs': c.totalPOs, 'Completed': c.completedPOs,
    'Late': c.latePOs, 'At Risk': c.atRiskPOs, 'On Time': c.onTimePOs,
    'On-Time Rate': `${c.onTimeRate}%`, 'Total Ops': c.totalOps, 'Completed Ops': c.completedOps
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custRows), 'Customer Summary');
  // Sheet 2: Daily Production
  if (dailyData?.length) {
    const dpRows = dailyData.map((d: any) => ({
      'Date': d.summaryDate, 'Completed': d.gaugesCompleted, 'Rejected': d.gaugesRejected
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dpRows), 'Daily Production');
  }
  // Sheet 3: All Operations
  const opRows = tasks.map((t: any) => ({
    'WO Number': t.gauge?.purchaseOrder?.poNumber || '', 'Customer': t.gauge?.purchaseOrder?.customer?.name || '',
    'Gauge': t.gauge?.serialNumber || '', 'Op Code': t.operationMaster?.operationCode || '',
    'Operation': t.operationName || '', 'Status': t.status || '', 'Worker': t.assignedTo?.fullName || ''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(opRows), 'All Operations');
  XLSX.writeFile(wb, `MES_Analytics_${new Date().toISOString().slice(0,10)}.xlsx`);
}
