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
import PqcPoTrackerPage from '@/pages/pqc/PqcPoTrackerPage';
import { LpaLayout } from '@/components/layout/LpaLayout';
import { LpaDashboardPage } from '@/pages/lpa/LpaDashboardPage';
import { LpaExecutePage } from '@/pages/lpa/LpaExecutePage';
import { LpaReportsPage } from '@/pages/lpa/LpaReportsPage';
import { LpaSchedulePage } from '@/pages/lpa/LpaSchedulePage';
import { LpaQuestionSetPage } from '@/pages/lpa/LpaQuestionSetPage';
import { ModuleSettingsPage } from '@/pages/settings/ModuleSettingsPage';
import { Toaster } from 'react-hot-toast';
import './index.css';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            {/* ── MES Module (Default / Root) ── */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks/my" element={<MyTasksPage />} />
              <Route path="/tasks/completed" element={<CompletedTasksPage />} />
              <Route path="/po" element={<PurchaseOrderListPage />} />
              <Route path="/po/create" element={<PurchaseOrderCreatePage />} />
              <Route path="/po/:id" element={<PurchaseOrderDetailPage />} />
              <Route path="/jobcards" element={<JobCardListPage />} />
              <Route path="/jobcards/:id" element={<JobCardDetailPage />} />
              <Route path="/jobcards/:id/verify" element={<JobCardVerificationPage />} />
              <Route path="/operations/assign" element={<AssignOperationsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/reports" element={<PqcReportDashboard />} />
              <Route path="/nc-records" element={<NcRecordsPage />} />
              <Route path="/master/gauges" element={<GaugeMasterPage />} />
              <Route path="/master/operations" element={<OperationMasterPage />} />
              <Route path="/master/customers" element={<CustomerMasterPage />} />
              <Route path="/master/machines" element={<MachineMasterPage />} />
              <Route path="/master/pqc-question-sets" element={<PqcQuestionSetMasterPage />} />
              <Route path="/settings/users" element={<UserManagementPage />} />
              <Route path="/settings/modules" element={<ModuleSettingsPage />} />
              <Route path="/settings/reports" element={<PqcSettingsPage />} />
              <Route path="/inspection" element={<InspectorLiveEntryPage />} />
            </Route>

            {/* ── PQC Module (/pqc/*) ── */}
            <Route element={<PqcLayout />}>
              <Route path="/pqc/dashboard" element={<PqcDashboardPage />} />
              <Route path="/pqc/po-tracker" element={<PqcPoTrackerPage />} />
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

            {/* ── LPA Module (/lpa/*) ── */}
            <Route element={<LpaLayout />}>
              <Route path="/lpa/dashboard" element={<LpaDashboardPage />} />
              <Route path="/lpa/execute" element={<LpaExecutePage />} />
              <Route path="/lpa/reports" element={<LpaReportsPage />} />
              <Route path="/lpa/schedules" element={<LpaSchedulePage />} />
              <Route path="/lpa/question-sets" element={<LpaQuestionSetPage />} />
              <Route path="/lpa/gauges" element={<GaugeMasterPage />} />
              <Route path="/lpa/operations" element={<OperationMasterPage />} />
              <Route path="/lpa/machines" element={<MachineMasterPage />} />
              <Route path="/lpa/settings" element={<PqcSettingsPage />} />
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
