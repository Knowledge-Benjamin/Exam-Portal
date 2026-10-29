import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function DashboardLayout() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const location = useLocation();
  const [isPrimaryCollapsed, setIsPrimaryCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="dashboard-loading-page">
        <div className="dashboard-loading-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'student') {
    return (
      <div className="dashboard-student-warning">
        <div className="dashboard-student-card">
          <h2 className="dashboard-student-heading">Student Portal</h2>
          <p className="dashboard-student-text">
            Please open your Safe Exam Browser (.seb) file to access your scheduled exams securely.
          </p>
          <button onClick={logout} className="dashboard-student-logout-button">
            SIGN OUT
          </button>
        </div>
      </div>
    );
  }

  const erpBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5173'
    : 'https://portal.multitech.ac.ug';

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
        <div className="sidebar-inner">
          <div className="sidebar-header">
            {!isSidebarCollapsed && (
              <div className="sidebar-header-content">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🏛️</span>
                  <span className="sidebar-header-label" style={{ margin: 0, color: '#38bdf8', fontWeight: 700, letterSpacing: '0.12em' }}>
                    MULTITECH
                  </span>
                </div>
                <h1 className="sidebar-header-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                  Exam Portal
                </h1>
                <p className="sidebar-header-subtitle" style={{ fontSize: '0.65rem', color: '#94a3b8', margin: '2px 0 0' }}>
                  Safe Exam Browser
                </p>
              </div>
            )}
            <button
              aria-label="Toggle sidebar"
              onClick={() => setIsSidebarCollapsed((s) => !s)}
              className="sidebar-toggle"
            >
              <svg className={`sidebar-toggle-icon ${isSidebarCollapsed ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="sidebar-divider" />

          <nav className="sidebar-nav">
            {!isSidebarCollapsed && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Navigation</div>
                <button
                  onClick={() => setIsPrimaryCollapsed(!isPrimaryCollapsed)}
                  className="sidebar-section-button"
                >
                  <svg className={`sidebar-section-icon ${isPrimaryCollapsed ? 'rotated' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
                  </svg>
                </button>
              </div>
            )}

            <div className={`sidebar-nav-items ${isPrimaryCollapsed ? 'collapsed' : ''}`}>
              <Link
                to="/dashboard"
                className={`sidebar-nav-link ${location.pathname === '/dashboard' ? 'active' : 'inactive'}`}
              >
                <span className="sidebar-nav-icon">
                  <svg className="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span>Dashboard</span>}
              </Link>
              <Link
                to="/dashboard/exams/create"
                className={`sidebar-nav-link ${location.pathname === '/dashboard/exams/create' ? 'active' : 'inactive'}`}
              >
                <span className="sidebar-nav-icon">
                  <svg className="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span>Create Exam</span>}
              </Link>
              <Link
                to="/dashboard/settings"
                className={`sidebar-nav-link ${location.pathname === '/dashboard/settings' ? 'active' : 'inactive'}`}
              >
                <span className="sidebar-nav-icon">
                  <svg className="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span>Settings</span>}
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/dashboard/users"
                  className={`sidebar-nav-link ${location.pathname === '/dashboard/users' ? 'active' : 'inactive'}`}
                >
                  <span className="sidebar-nav-icon">
                    <svg className="icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  {!isSidebarCollapsed && <span>User Management</span>}
                </Link>
              )}

              {/* Multitech ERP Quick Return */}
              <a
                href={erpBaseUrl}
                target="_blank"
                rel="noreferrer"
                className="sidebar-nav-link inactive"
                style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}
                title="Go to Multitech Web System"
              >
                <span className="sidebar-nav-icon" style={{ fontSize: '1rem', color: '#38bdf8' }}>
                  ↗
                </span>
                {!isSidebarCollapsed && <span style={{ color: '#38bdf8' }}>Multitech ERP</span>}
              </a>
            </div>
          </nav>

          <div className="sidebar-footer">
            {!isSidebarCollapsed ? (
              <>
                <div className="sidebar-profile">
                  <div className="sidebar-avatar">
                    {user?.fullName?.charAt(0) ?? 'A'}
                  </div>
                  <div className="sidebar-profile-body">
                    <p className="sidebar-profile-name">{user?.fullName || 'Administrator'}</p>
                    <p className="sidebar-profile-role">{user?.role === 'admin' ? 'System Administrator' : 'Lecturer / Teacher'}</p>
                  </div>
                </div>
                <button onClick={logout} className="sidebar-logout">
                  Log out
                </button>
              </>
            ) : (
              <div className="sidebar-collapsed-avatar">
                <div className="sidebar-collapsed-avatar-circle">
                  {user?.fullName?.charAt(0) ?? 'A'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="content-wrapper">
        {/* Topbar */}
        <header className="topbar">
          {/* Search Bar */}
          <div className="topbar-search">
            <div className="topbar-search-icon">
              <svg className="topbar-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="SEARCH EXAMS OR COURSES..." 
              className="topbar-search-input"
            />
          </div>

          {/* Right Icons */}
          <div className="topbar-actions">
            <a
              href={`${erpBaseUrl}/lecturer/courses`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <span>🏛️ Multitech Web System</span>
              <span>↗</span>
            </a>

            <button className="topbar-action-button topbar-action-notification" aria-label="Notifications">
              <svg className="topbar-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="topbar-notification-dot"></span>
            </button>
            <Link to="/dashboard/settings" className="topbar-action-button" aria-label="Settings">
              <svg className="topbar-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <div className="topbar-user">
              <span className="topbar-username">
                {user?.fullName?.split(' ')[0] || 'ADMIN'}
              </span>
              <div className="topbar-avatar">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="content-main">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
