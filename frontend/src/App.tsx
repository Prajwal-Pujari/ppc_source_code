import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import AppLayout from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/AuthGuards';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MyTasksPage from '@/pages/dashboard/MyTasksPage';
import CalibrationTasksPage from '@/pages/dashboard/CalibrationTasksPage';
import CalibrationReportPage from '@/pages/jobcard/CalibrationReportPage';
import CompletedTasksPage from '@/pages/dashboard/CompletedTasksPage';
import PurchaseOrderListPage from '@/pages/po/PurchaseOrderListPage';
import PurchaseOrderCreatePage from '@/pages/po/PurchaseOrderCreatePage';
import PurchaseOrderDetailPage from '@/pages/po/PurchaseOrderDetailPage';
import JobCardListPage from '@/pages/jobcard/JobCardListPage';
import JobCardDetailPage from '@/pages/jobcard/JobCardDetailPage';
import JobCardVerificationPage from '@/pages/jobcard/JobCardVerificationPage';
import GaugeMasterPage from '@/pages/master/GaugeMasterPage';
import OperationMasterPage from '@/pages/master/OperationMasterPage';
import CustomerMasterPage from '@/pages/master/CustomerMasterPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import OperationsAnalyticsPage from '@/pages/analytics/OperationsAnalyticsPage';
import AssignOperationsPage from '@/pages/operations/AssignOperationsPage';
import NcRecordsPage from '@/pages/nc/NcRecordsPage';
import UserManagementPage from '@/pages/settings/UserManagementPage';
import Is3455MasterPage from '@/pages/settings/Is3455MasterPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import ProductionPlanningPage from '@/pages/reports/ProductionPlanningPage';
import CalibrationApprovalPage from '@/pages/reports/CalibrationApprovalPage';
import BulkJobCardPrintPage from '@/pages/print/BulkJobCardPrintPage';
import BulkCalibrationPrintPage from '@/pages/print/BulkCalibrationPrintPage';
import './index.css';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify/:id" element={<JobCardVerificationPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/print/po/:id/job-cards" element={<BulkJobCardPrintPage />} />
            <Route path="/print/po/:id/calibration" element={<BulkCalibrationPrintPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/calibration-tasks" element={<CalibrationTasksPage />} />
              <Route path="/completed-tasks" element={<CompletedTasksPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderCreatePage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/job-cards" element={<JobCardListPage />} />
              <Route path="/job-cards/:id" element={<JobCardDetailPage />} />
              <Route path="/calibration-report/:id" element={<CalibrationReportPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/operations-tracking" element={<OperationsAnalyticsPage />} />
              <Route path="/assign-operations" element={<AssignOperationsPage />} />
              <Route path="/nc-records" element={<NcRecordsPage />} />
              <Route path="/approvals" element={<CalibrationApprovalPage />} />
              <Route path="/reports" element={<ProductionPlanningPage />} />
              <Route path="/master/gauges" element={<GaugeMasterPage />} />
              <Route path="/master/operations" element={<OperationMasterPage />} />
              <Route path="/master/customers" element={<CustomerMasterPage />} />
              <Route path="/settings/users" element={<UserManagementPage />} />
              <Route path="/settings/is3455" element={<Is3455MasterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--ash)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 8 }}>{title}</h2>
      <p style={{ fontSize: 14 }}>This module will be implemented in Phase 2</p>
    </div>
  );
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'WORKER') return <Navigate to="/my-tasks" replace />;
  return <Navigate to="/dashboard" replace />;
}