import { useState, useEffect, useMemo } from 'react';
import { getUsersApi, togglePqcAuthorityApi } from '@/api/users.api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { User, UserRole } from '@/types/domain.types';
import { ShieldCheck, Search, Filter, RefreshCw, User as UserIcon, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

export default function PqcAuthoritySettings() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const currentUser = useAuthStore((s) => s.user);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res.data);
    } catch {
      addNotification('Error', 'Failed to load user authority directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggle = async (user: User) => {
    if (!isAdmin) {
      addNotification('Access Denied', 'Only administrators can modify inspection authority', 'error');
      return;
    }
    const newStatus = !user.canBackfillPqc;
    setUpdatingId(user.id);
    try {
      await togglePqcAuthorityApi(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, canBackfillPqc: newStatus } : u))
      );
      addNotification(
        'Authority Updated',
        `${user.fullName} has been ${newStatus ? 'granted' : 'revoked'} Previous Entry & Stack Control authority.`,
        'success'
      );
    } catch (err: any) {
      addNotification(
        'Update Failed',
        err.response?.data?.message || 'Could not update user authority',
        'error'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.employeeCode && u.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => {
    const total = users.length;
    const authorized = users.filter((u) => u.role === 'ADMIN' || u.canBackfillPqc).length;
    return { total, authorized, standard: total - authorized };
  }, [users]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header Card ── */}
      <div
        className="card"
        style={{
          padding: 24,
          background: 'linear-gradient(135deg, #FAF8F5 0%, #FFFFFF 100%)',
          border: '1px solid var(--silk, #E8E2D9)',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #1C1A18 0%, #3B3835 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(28, 26, 24, 0.15)',
              }}
            >
              <ShieldCheck size={24} color="#F3EFEA" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--charcoal, #1C1A18)', margin: 0 }}>
                PQC Stack & Previous Entry Authority
              </h2>
              <p style={{ fontSize: 12, color: 'var(--slate, #4A4540)', marginTop: 4, margin: 0, maxWidth: 680 }}>
                Control which personnel have explicit permission to use <strong>Previous Entry mode</strong>, select past shifts/dates,
                and manually select or backfill inspection stack slots in the Live Inspector. Unauthorised personnel only record real-time live inspections for the active slot.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ padding: '6px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>{stats.authorized}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#15803D', textTransform: 'uppercase' }}>Authorized</div>
              </div>
              <div style={{ padding: '6px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>{stats.standard}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Standard Live</div>
              </div>
            </div>

            <button
              onClick={fetchUsers}
              className="btn"
              style={{ background: '#FFFFFF', border: '1px solid var(--silk, #E8E2D9)', padding: '8px 12px', borderRadius: 8 }}
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ash, #8C857D)' }} />
            <input
              type="text"
              placeholder="Search by name, username or employee code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 32, fontSize: 12, height: 36, width: '100%', borderRadius: 8 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: 'var(--ash, #8C857D)' }} />
          <span style={{ fontSize: 12, color: 'var(--slate, #4A4540)', fontWeight: 600 }}>Filter Role:</span>
          {(['ALL', 'QUALITY_INSPECTOR', 'WORKER', 'SUPERVISOR', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: roleFilter === r ? '1px solid var(--copper-bronze, #8B6914)' : '1px solid var(--silk, #E8E2D9)',
                background: roleFilter === r ? 'var(--copper-bronze, #8B6914)' : '#FFFFFF',
                color: roleFilter === r ? '#FFFFFF' : 'var(--slate, #4A4540)',
                fontSize: 11,
                fontWeight: roleFilter === r ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Personnel Authority Table ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 10, border: '1px solid var(--silk, #E8E2D9)' }}>
        <div className="table-container" style={{ margin: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bone-white, #FAF8F5)', borderBottom: '1px solid var(--silk, #E8E2D9)' }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate, #4A4540)', textTransform: 'uppercase' }}>
                  Personnel
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate, #4A4540)', textTransform: 'uppercase', width: 140 }}>
                  Role
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--slate, #4A4540)', textTransform: 'uppercase', width: 130 }}>
                  Employee Code
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--slate, #4A4540)', textTransform: 'uppercase', width: 180 }}>
                  Access Level
                </th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--slate, #4A4540)', textTransform: 'uppercase', width: 220 }}>
                  Previous Entry Authority
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--ash, #8C857D)', fontSize: 13 }}>
                    Loading personnel authority records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--ash, #8C857D)', fontSize: 13 }}>
                    No personnel found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const hasFullAdmin = u.role === 'ADMIN';
                  const isAuthorized = hasFullAdmin || Boolean(u.canBackfillPqc);
                  const isUpdating = updatingId === u.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--linen, #EEE9E1)',
                        backgroundColor: isAuthorized ? 'rgba(240, 253, 244, 0.25)' : '#FFFFFF',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td style={{ padding: '12px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 17,
                              background: isAuthorized ? '#DCFCE7' : 'var(--linen, #EEE9E1)',
                              color: isAuthorized ? '#15803D' : 'var(--slate, #4A4540)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {u.fullName ? u.fullName.charAt(0).toUpperCase() : <UserIcon size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal, #1C1A18)' }}>
                              {u.fullName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ash, #8C857D)' }}>
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            background:
                              u.role === 'ADMIN'
                                ? '#FEF3C7'
                                : u.role === 'QUALITY_INSPECTOR'
                                ? '#E0E7FF'
                                : u.role === 'SUPERVISOR'
                                ? '#F1F5F9'
                                : '#F3F4F6',
                            color:
                              u.role === 'ADMIN'
                                ? '#92400E'
                                : u.role === 'QUALITY_INSPECTOR'
                                ? '#3730A3'
                                : u.role === 'SUPERVISOR'
                                ? '#334155'
                                : '#4B5563',
                          }}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 18px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--slate, #4A4540)' }}>
                        {u.employeeCode || '—'}
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
                        {isAuthorized ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600,
                              background: '#DCFCE7',
                              color: '#15803D',
                            }}
                          >
                            <CheckCircle2 size={13} />
                            Full Stack Access
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 10px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 500,
                              background: '#F1F5F9',
                              color: '#64748B',
                            }}
                          >
                            <XCircle size={13} />
                            Standard (Live Only)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                        {hasFullAdmin ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#B45309', fontSize: 11, fontWeight: 600 }}>
                            <ShieldAlert size={14} />
                            Admin (Always Granted)
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: u.canBackfillPqc ? '#15803D' : 'var(--ash, #8C857D)' }}>
                              {u.canBackfillPqc ? 'Access Granted' : 'Restricted'}
                            </span>
                            <button
                              type="button"
                              disabled={!isAdmin || isUpdating}
                              onClick={() => handleToggle(u)}
                              style={{
                                width: 44,
                                height: 24,
                                borderRadius: 12,
                                border: 'none',
                                background: u.canBackfillPqc ? '#16A34A' : '#D1D5DB',
                                position: 'relative',
                                cursor: isAdmin && !isUpdating ? 'pointer' : 'not-allowed',
                                transition: 'background-color 0.2s',
                                opacity: isUpdating ? 0.6 : 1,
                              }}
                              title={
                                !isAdmin
                                  ? 'Only Admins can toggle this authority'
                                  : u.canBackfillPqc
                                  ? 'Revoke Previous Entry & Stack Control'
                                  : 'Grant Previous Entry & Stack Control'
                              }
                            >
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: '#FFFFFF',
                                  position: 'absolute',
                                  top: 3,
                                  left: u.canBackfillPqc ? 23 : 3,
                                  transition: 'left 0.2s',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                }}
                              />
                            </button>
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
