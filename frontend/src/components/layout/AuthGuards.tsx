import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ roles, children, redirectTo }: { roles: string[]; children: React.ReactNode; redirectTo?: string }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    if (user?.role === 'WORKER') {
      return <Navigate to="/tasks/my" replace />;
    }
    if (user?.role === 'QUALITY_INSPECTOR') {
      return <Navigate to="/pqc/dashboard" replace />;
    }
    return <Navigate to={redirectTo || '/'} replace />;
  }
  return <>{children}</>;
}

export function RoleGate({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ash)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, color: 'var(--charcoal)', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ fontSize: 14 }}>You don't have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}
