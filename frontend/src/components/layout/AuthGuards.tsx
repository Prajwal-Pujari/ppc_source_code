import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
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
