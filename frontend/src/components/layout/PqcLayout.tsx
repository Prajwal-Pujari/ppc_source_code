import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWebSocket } from '@/websocket/useWebSocket';
import {
  AlertTriangle, Bell, Menu, LogOut, CheckCircle, CheckCheck,
  FileText, X
} from 'lucide-react';

const pqcNavItems = [
  { label: 'Dashboard', path: '/pqc/dashboard', icon: 'dashboard' },
  { label: 'Inspections', path: '/pqc/inspect', icon: 'content_paste_search' },
  { label: 'Reports', path: '/pqc/reports', icon: 'description' },
  { label: 'Question Sets', path: '/pqc/question-sets', icon: 'checklist' },
  { label: 'Gauge Master', path: '/pqc/gauges', icon: 'straighten' },
  { label: 'Operations', path: '/pqc/operations', icon: 'build' },
  { label: 'Batch Records', path: '/pqc/batch-records', icon: 'layers' },
  { label: 'Personnel', path: '/pqc/personnel', icon: 'badge' },
  { label: 'Analytics', path: '/pqc/analytics', icon: 'bar_chart' },
  { label: 'Settings', path: '/pqc/settings', icon: 'settings' },
];

export default function PqcLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { sidebarOpen, toggleSidebar, currentPageTitle } = useUiStore();
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [isNotifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { connected } = useWebSocket();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FFF8F2' }}>
      {/* ── PQC Sidebar ── */}
      <aside
        style={{
          width: sidebarOpen ? '240px' : '0px',
          minWidth: sidebarOpen ? '240px' : '0px',
          background: '#FAF8F5',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          borderRight: sidebarOpen ? '1px solid var(--silk)' : 'none',
        }}
      >
        {/* PQC Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--silk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--copper-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 13,
            }}>
              P
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--copper-bronze)', letterSpacing: '-0.01em' }}>
                PQC Module
              </div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>Industrial Precision</div>
            </div>
          </div>
        </div>

        {/* PQC Navigation */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '16px 12px' }}>
          {pqcNavItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 6, fontSize: 13,
                  color: isActive ? 'var(--copper-bronze)' : '#6B6560',
                  background: isActive ? '#F5F2ED' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  marginBottom: 2,
                  borderLeft: isActive ? '3px solid var(--copper-bronze)' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--linen)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Module Switcher */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--silk)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dust)', padding: '0 8px', marginBottom: 8 }}>
            Switch Module
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '1px solid var(--silk)',
              color: 'var(--slate)', cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--linen)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>precision_manufacturing</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>MES Module</div>
              <div style={{ fontSize: 10, color: 'var(--ash)' }}>Production Tracking</div>
            </div>
          </button>
        </div>

        {/* User Info */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--silk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--linen)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 13, color: 'var(--copper-bronze)',
            }}>
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ash)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: 'var(--header-height)', minHeight: 'var(--header-height)',
          background: 'rgba(250,248,245,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--silk)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={toggleSidebar}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ash)', padding: 4 }}
            >
              <Menu size={20} />
            </button>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
              PQC Management
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Notification Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(!isNotifOpen)}
                style={{
                  background: isNotifOpen ? 'rgba(139,105,20,0.08)' : 'none',
                  border: 'none', cursor: 'pointer',
                  color: isNotifOpen ? 'var(--copper-bronze)' : 'var(--ash)',
                  position: 'relative', padding: 8, borderRadius: '50%',
                  transition: 'background 0.2s, color 0.2s'
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 2, right: 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--status-rejected)', color: 'white',
                    fontSize: 9, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotifOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 360, background: 'white', borderRadius: 12,
                  boxShadow: '0 12px 40px rgba(48,49,47,0.12), 0 4px 16px rgba(139,105,20,0.08)',
                  border: '1px solid var(--silk)', zIndex: 100, overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--silk)', background: 'var(--bone-white)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--charcoal)', margin: 0 }}>Notifications</h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--copper-bronze)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCheck size={14} /> Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--ash)', cursor: 'pointer', fontWeight: 500 }}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ash)' }}>
                        <Bell size={24} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ fontSize: 13 }}>No new notifications</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} onClick={() => markAsRead(notif.id)} style={{
                          padding: '16px 20px', borderBottom: '1px solid var(--silk)',
                          background: notif.isRead ? 'white' : 'rgba(139,105,20,0.03)',
                          cursor: 'pointer', transition: 'background 0.2s', position: 'relative'
                        }}>
                          {!notif.isRead && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--copper-bronze)' }} />}
                          <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: notif.type === 'error' ? 'var(--status-rejected-bg)' : notif.type === 'success' ? 'var(--status-completed-bg)' : 'rgba(139,105,20,0.08)',
                              color: notif.type === 'error' ? 'var(--status-rejected)' : notif.type === 'success' ? 'var(--status-completed)' : 'var(--copper-bronze)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              {notif.type === 'error' ? <AlertTriangle size={16} /> : notif.type === 'success' ? <CheckCircle size={16} /> : <FileText size={16} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: notif.isRead ? 'var(--slate)' : 'var(--charcoal)', display: 'flex', justifyContent: 'space-between' }}>
                                {notif.title}
                                <span style={{ fontSize: 10, color: 'var(--ash)', fontWeight: 400 }}>
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </h4>
                              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ash)', lineHeight: 1.4 }}>{notif.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="badge" style={{ background: 'rgba(139, 105, 20, 0.08)', color: 'var(--copper-bronze)', fontSize: 10 }}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
