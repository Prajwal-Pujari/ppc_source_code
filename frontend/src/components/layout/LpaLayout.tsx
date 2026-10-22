import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWebSocket } from '@/websocket/useWebSocket';
import {
  AlertTriangle, Bell, Menu, LogOut, CheckCircle, CheckCheck,
  FileText, X
} from 'lucide-react';
import { ModuleSwitcher } from './ModuleSwitcher';

const lpaNavSections = [
  {
    title: 'Dashboard & Execution',
    items: [
      { label: 'Dashboard & Overview', path: '/lpa/dashboard', icon: 'dashboard' },
      { label: 'Action Items (NC)', path: '/lpa/ncs', icon: 'assignment_late' },
      { label: 'Execute Shop Floor Audit', path: '/lpa/execute', icon: 'fact_check' },
      { label: 'Execute System Audit', path: '/lpa/system-execute', icon: 'domain_verification' },
      { label: 'Execute Supplier Audit', path: '/lpa/supplier-execute', icon: 'local_shipping' },
    ]
  },
  {
    title: 'Reports & Logs',
    items: [
      { label: 'Process & LPA Reports', path: '/lpa/reports', icon: 'assessment' },
      { label: 'System Audit Reports', path: '/lpa/system-reports', icon: 'pie_chart' },
      { label: 'Supplier Audit Reports', path: '/lpa/supplier-reports', icon: 'insights' },
    ]
  },
  {
    title: 'Checklists & Questions',
    items: [
      { label: 'Shop Floor Checklists', path: '/lpa/question-sets', icon: 'checklist' },
      { label: 'System Checklists', path: '/lpa/system-checklists', icon: 'rule_folder' },
      { label: 'Supplier Checklists', path: '/lpa/supplier-checklists', icon: 'assignment' },
    ]
  },
  {
    title: 'Master Data & Settings',
    items: [
      { label: 'Audit Schedules', path: '/lpa/schedules', icon: 'calendar_month' },
      { label: 'Part / Product Master', path: '/lpa/gauges', icon: 'straighten' },
      { label: 'Operation Master', path: '/lpa/operations', icon: 'build' },
      { label: 'Machine Master', path: '/lpa/machines', icon: 'precision_manufacturing' },
      { label: 'Report & System Settings', path: '/lpa/settings', icon: 'settings' },
    ]
  }
];

export function LpaLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const closeSidebar = useUiStore((s) => s.closeSidebar);

  // Use WebSocket for real-time LPA notifications
  useWebSocket();

  const { notifications, markAllAsRead, dismissNotification: removeNotification, clearAll } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  // Prevent WORKER role from directly accessing LPA audit modules
  if (user?.role === 'WORKER') {
    return <Navigate to="/tasks/my" replace />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--cream)' }}>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}

      {/* ── LPA Sidebar ── */}
      <aside 
        className={`responsive-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
        width: sidebarOpen ? '240px' : '0px',
        minWidth: sidebarOpen ? '240px' : '0px',
        transform: `translateX(${sidebarOpen ? '0' : '-100%'})`,
        background: 'var(--warm-white)',
        borderRight: sidebarOpen ? '1px solid var(--silk)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
      }}>
        {/* LPA Logo */}
        <div style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          borderBottom: '1px solid var(--silk)',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--copper-bronze), var(--golden-brown))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em',
            boxShadow: '0 2px 8px rgba(184,115,51,0.25)',
          }}>
            L
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--charcoal)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              LPA Suite
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--dust)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Layered Audits
            </div>
          </div>
        </div>

        {/* LPA Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lpaNavSections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dust)', padding: '0 8px', marginBottom: 8, marginTop: idx > 0 ? 8 : 0 }}>
                {section.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (window.innerWidth <= 1024 && sidebarOpen) {
                          closeSidebar();
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 6,
                        fontSize: 13, fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'var(--charcoal)' : 'var(--slate)',
                        background: isActive ? 'var(--linen)' : 'transparent',
                        textDecoration: 'none', transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute', left: 0, top: 6, bottom: 6, width: 3,
                          background: 'var(--copper-bronze)', borderRadius: '0 3px 3px 0',
                        }} />
                      )}
                      <span className="material-symbols-outlined" style={{
                        fontSize: 20,
                        color: isActive ? 'var(--copper-bronze)' : 'var(--ash)',
                        transition: 'color 0.15s',
                      }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Module Switcher */}
        <ModuleSwitcher currentModule="LPA" />

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
        <header 
          className="responsive-header"
          style={{
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
              Layered Process Audits
            </span>
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'var(--warm-white)', border: '1px solid var(--silk)',
                  borderRadius: 8, width: 38, height: 38, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--slate)', position: 'relative', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--dust)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--silk)'; }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: 'var(--terracotta)', color: '#fff',
                    fontSize: 10, fontWeight: 700, borderRadius: '50%',
                    width: 18, height: 18, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    border: '2px solid var(--cream)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {showNotifications && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                  width: 360, maxHeight: 480, background: 'var(--warm-white)',
                  border: '1px solid var(--silk)', borderRadius: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 1000,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--silk)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--cream)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--charcoal)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{
                          background: 'var(--linen)', color: 'var(--copper-bronze)',
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                        }}>
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--copper-bronze)', cursor: 'pointer', fontWeight: 500 }}
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={clearAll}
                          style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--ash)', cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ash)' }}>
                        <Bell size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                        <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications</div>
                        <div style={{ fontSize: 11 }}>You are all caught up!</div>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          style={{
                            padding: '12px 16px', display: 'flex', gap: 12,
                            background: n.isRead ? 'transparent' : 'rgba(184, 115, 51, 0.04)',
                            borderBottom: '1px solid var(--silk)', transition: 'background 0.15s',
                            position: 'relative',
                          }}
                        >
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: n.isRead ? 'transparent' : 'var(--copper-bronze)',
                            marginTop: 6, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: n.isRead ? 500 : 600, color: 'var(--charcoal)' }}>{n.title}</span>
                              <span style={{ fontSize: 10, color: 'var(--ash)', flexShrink: 0, marginLeft: 8 }}>
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--slate)', lineHeight: 1.4, wordBreak: 'break-word' }}>{n.message}</div>
                          </div>
                          <button
                            onClick={() => removeNotification(n.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--ash)', cursor: 'pointer', padding: 2, alignSelf: 'flex-start' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
