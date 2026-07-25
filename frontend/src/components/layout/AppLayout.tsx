import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWebSocket } from '@/websocket/useWebSocket';
import {
  LayoutDashboard, ClipboardList, Wrench, Package, AlertTriangle,
  BarChart3, Database, FileText, Settings, Bell, Menu, LogOut,
  ChevronRight, Users, Shield, Gauge, CheckCircle, CheckCheck, X, ShieldCheck
} from 'lucide-react';
import { ModuleSwitcher } from './ModuleSwitcher';

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
    ],
  },
  {
    title: 'Work Floor',
    items: [
      { label: 'My Tasks', path: '/tasks/my', icon: ClipboardList, roles: ['WORKER'] },
      { label: 'Completed Work', path: '/tasks/completed', icon: CheckCircle, roles: ['WORKER'] },
      { label: 'Shop Floor Queue', path: '/operations/assign', icon: Users, roles: ['SUPERVISOR', 'ADMIN', 'VIEWER'] },
    ],
  },
  {
    title: 'Orders',
    items: [
      { label: 'Purchase Orders', path: '/po', icon: Package, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
      { label: 'Job Cards', path: '/jobcards', icon: Gauge, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
      { label: 'Shift Approvals', path: '/pqc/approvals', icon: ShieldCheck, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR'] },
    ],
  },
  {
    title: 'Quality',
    items: [
      { label: 'Inspection', path: '/inspection', icon: Shield, roles: ['WORKER', 'QUALITY_INSPECTOR', 'ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'NC Records', path: '/nc-records', icon: AlertTriangle, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'Reports', path: '/reports', icon: FileText, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { label: 'Gauge / Category Master', path: '/master/gauges', icon: Database, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'Operations Library', path: '/master/operations', icon: Wrench, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'Customers', path: '/master/customers', icon: Users, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'Machine Master', path: '/master/machines', icon: Settings, roles: ['ADMIN', 'SUPERVISOR', 'VIEWER'] },
      { label: 'Question Sets', path: '/master/pqc-question-sets', icon: CheckCheck, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR', 'VIEWER'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Report & System Settings', path: '/settings/reports', icon: Settings, roles: ['ADMIN', 'SUPERVISOR', 'QUALITY_INSPECTOR'] },
      { label: 'Users', path: '/settings/users', icon: Settings, roles: ['ADMIN'] },
      { label: 'Module Access Control', path: '/settings/modules', icon: ShieldCheck, roles: ['ADMIN'] },
    ],
  },
];

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { sidebarOpen, toggleSidebar, currentPageTitle } = useUiStore();
  const navigate = useNavigate();
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const [isNotifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
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
  const userRole = user?.role || 'VIEWER';

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bone-white)' }}>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className="responsive-sidebar"
        style={{
          width: sidebarOpen ? 'var(--sidebar-width)' : '0px',
          minWidth: sidebarOpen ? 'var(--sidebar-width)' : '0px',
          transform: `translateX(${sidebarOpen ? '0' : '-100%'})`,
          background: 'var(--warm-white)',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRight: sidebarOpen ? '1px solid var(--silk)' : 'none',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--silk)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, var(--copper-bronze), var(--copper-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 700, fontSize: 14,
            }}>
              PT
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>
                P-Track
              </div>
              <div style={{ fontSize: 11, color: 'var(--ash)' }}>AQS - Products</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflow: 'auto', padding: '12px 12px' }}>
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: 'var(--dust)', padding: '0 8px', marginBottom: 6,
                }}>
                  {section.title}
                </div>
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        // Auto-close sidebar on mobile/tablet after clicking a link
                        if (window.innerWidth <= 1024 && sidebarOpen) {
                          toggleSidebar();
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 10px', borderRadius: 8, fontSize: 13,
                        color: isActive ? 'var(--copper-bronze)' : 'var(--slate)',
                        background: isActive ? 'rgba(139, 105, 20, 0.06)' : 'transparent',
                        fontWeight: isActive ? 600 : 400,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Module Switcher */}
        <ModuleSwitcher currentModule="MES" />

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
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ash)', padding: 4,
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header 
          className="responsive-header"
          style={{
          height: 'var(--header-height)', minHeight: 'var(--header-height)',
          background: 'var(--bone-white)',
          borderBottom: '1px solid rgba(212, 204, 191, 0.3)',
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
            <h1 style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', color: 'var(--charcoal)' }}>
              {currentPageTitle}
            </h1>
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
                          cursor: 'pointer', transition: 'background 0.2s',
                          position: 'relative'
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

            {/* Role Badge */}
            <span className="badge" style={{
              background: 'rgba(139, 105, 20, 0.08)',
              color: 'var(--copper-bronze)',
              fontSize: 10,
            }}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main 
          className="responsive-main"
          style={{
            flex: 1, overflow: 'auto', padding: 24,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
