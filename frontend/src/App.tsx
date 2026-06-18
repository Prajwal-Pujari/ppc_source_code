import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import AppLayout from '@/components/layout/AppLayout';
import PqcLayout from '@/components/layout/PqcLayout';
import { ProtectedRoute } from '@/components/layout/AuthGuards';
import LoginPage from '@/pages/auth/LoginPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import MyTasksPage from '@/pages/dashboard/MyTasksPage';
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
import MachineMasterPage from '@/pages/master/MachineMasterPage';
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';
import AssignOperationsPage from '@/pages/operations/AssignOperationsPage';
import NcRecordsPage from '@/pages/nc/NcRecordsPage';
import UserManagementPage from '@/pages/settings/UserManagementPage';
import { InspectorLiveEntryPage } from '@/pages/pqc/InspectorLiveEntryPage';
import PqcQuestionSetMasterPage from '@/pages/master/PqcQuestionSetMasterPage';
import PqcReportDashboard from './pages/pqc/PqcReportDashboard';
import PqcApprovalsDashboard from './pages/pqc/PqcApprovalsDashboard';
import PqcDashboardPage from '@/pages/pqc/PqcDashboardPage';
import PqcSettingsPage from '@/pages/pqc/PqcSettingsPage';
import { Toaster } from 'react-hot-toast';
import './index.css';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify/:id" element={<JobCardVerificationPage />} />

          <Route element={<ProtectedRoute />}>
            {/* ── MES Module (root paths) ── */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/my-tasks" element={<MyTasksPage />} />
              <Route path="/completed-tasks" element={<CompletedTasksPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrderListPage />} />
              <Route path="/purchase-orders/new" element={<PurchaseOrderCreatePage />} />
              <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/job-cards" element={<JobCardListPage />} />
              <Route path="/job-cards/:id" element={<JobCardDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/assign-operations" element={<AssignOperationsPage />} />
              <Route path="/nc-records" element={<NcRecordsPage />} />
              <Route path="/master/gauges" element={<GaugeMasterPage />} />
              <Route path="/master/operations" element={<OperationMasterPage />} />
              <Route path="/master/customers" element={<CustomerMasterPage />} />
              <Route path="/master/machines" element={<MachineMasterPage />} />
              <Route path="/master/pqc-question-sets" element={<PqcQuestionSetMasterPage />} />
              <Route path="/settings/users" element={<UserManagementPage />} />
              <Route path="/inspection" element={<InspectorLiveEntryPage />} />
            </Route>

            {/* ── PQC Module (/pqc/*) ── */}
            <Route element={<PqcLayout />}>
              <Route path="/pqc/dashboard" element={<PqcDashboardPage />} />
              <Route path="/pqc/inspect" element={<InspectorLiveEntryPage />} />
              <Route path="/pqc/reports" element={<PqcReportDashboard />} />
              <Route path="/pqc/approvals" element={<PqcApprovalsDashboard />} />
              <Route path="/pqc/batch-records" element={<PlaceholderPage title="Batch Records" />} />
              <Route path="/pqc/question-sets" element={<PqcQuestionSetMasterPage />} />
              <Route path="/pqc/gauges" element={<GaugeMasterPage />} />
              <Route path="/pqc/operations" element={<OperationMasterPage />} />
              <Route path="/pqc/machines" element={<MachineMasterPage />} />
              <Route path="/pqc/personnel" element={<PlaceholderPage title="Personnel" />} />
              <Route path="/pqc/analytics" element={<PlaceholderPage title="PQC Analytics" />} />
              <Route path="/pqc/settings" element={<PqcSettingsPage />} />
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
    <div style={{ padding: 24 }}>
      <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--ash)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 8 }}>{title}</h2>
        <p style={{ fontSize: 14 }}>This module will be implemented in Phase 2</p>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  // For now, both MES and PQC are enabled. Redirect based on role.
  // QUALITY_INSPECTOR goes to PQC first; everyone else goes to MES.
  if (user?.role === 'WORKER') return <Navigate to="/my-tasks" replace />;
  if (user?.role === 'QUALITY_INSPECTOR') return <Navigate to="/pqc/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
