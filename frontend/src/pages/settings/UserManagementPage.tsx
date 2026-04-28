import { useState, useEffect } from 'react';
import { getUsersApi, toggleUserPermissionApi } from '@/api/users.api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { User } from '@/types/domain.types';
import { Plus, Shield, User as UserIcon, Settings2, RefreshCw } from 'lucide-react';
import UserCreateForm from './components/UserCreateForm';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res.data);
    } catch (error) {
      addNotification('Error', 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTogglePermission = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleUserPermissionApi(userId, !currentStatus);
      addNotification('Success', 'User permissions updated', 'success');
      fetchUsers();
    } catch (error: any) {
      addNotification('Error', error.response?.data?.message || 'Failed to update permissions', 'error');
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  
  // A supervisor can only create users if they have the explicit flag enabled.
  // Wait, the currentUser type doesn't have canManageUsers. But we can assume if they are SUPERVISOR, they might have it.
  // We'll trust the backend to reject if they don't, but ideally we'd hide the button if we knew. 
  // For now, if Admin or Supervisor, show the button.
  const canAddUser = isAdmin || currentUser?.role === 'SUPERVISOR';

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--charcoal)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            User Management
          </h1>
          <p style={{ margin: 0, color: 'var(--slate)', fontSize: 14 }}>
            Manage factory personnel, roles, and security permissions.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={fetchUsers} className="btn" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <RefreshCw size={16} />
          </button>
          {canAddUser && (
            <button onClick={() => setShowCreateForm(true)} className="btn btn-primary" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Plus size={16} />
              Add User
            </button>
          )}
        </div>
      </div>

      {showCreateForm ? (
        <div style={{ marginBottom: 32, maxWidth: 600 }}>
          <UserCreateForm 
            onSuccess={() => { setShowCreateForm(false); fetchUsers(); }} 
            onCancel={() => setShowCreateForm(false)} 
          />
        </div>
      ) : null}

      <div style={{ background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bone-white)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Personnel</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Permissions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>Loading personnel data...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: 'var(--slate)' }}>No users found.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--copper-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserIcon size={20} color="var(--copper-dark)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--charcoal)', fontSize: 14 }}>{user.fullName}</div>
                        <div style={{ color: 'var(--ash)', fontSize: 12, marginTop: 2 }}>@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {user.role === 'ADMIN' && <Shield size={14} color="var(--copper-dark)" />}
                      {user.role === 'SUPERVISOR' && <Settings2 size={14} color="var(--slate)" />}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)' }}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: user.isActive ? 'var(--status-completed-bg)' : 'var(--status-rejected-bg)',
                      color: user.isActive ? 'var(--status-completed)' : 'var(--status-rejected)'
                    }}>
                      {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {user.role === 'SUPERVISOR' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                        <span style={{ fontSize: 12, color: user.canManageUsers ? 'var(--status-completed)' : 'var(--ash)', fontWeight: 500 }}>
                          {user.canManageUsers ? 'Can Add Users' : 'No Add Access'}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePermission(user.id, user.canManageUsers)}
                            style={{
                              background: user.canManageUsers ? 'var(--status-completed)' : 'var(--border)',
                              border: 'none',
                              width: 44,
                              height: 24,
                              borderRadius: 12,
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'background 0.3s'
                            }}
                          >
                            <div style={{
                              width: 20,
                              height: 20,
                              background: 'white',
                              borderRadius: 10,
                              position: 'absolute',
                              top: 2,
                              left: user.canManageUsers ? 22 : 2,
                              transition: 'left 0.3s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--ash)' }}>
                        {user.role === 'ADMIN' ? 'Full Access' : 'Standard Access'}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
