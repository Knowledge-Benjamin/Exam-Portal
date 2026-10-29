import { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function DashboardLayout() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('examSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('examSidebarCollapsed', String(next));
      } catch {}
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading-page">
        <div className="dashboard-loading-spinner" />
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
          <img
            src="/logo_asset.png"
            alt="Multitech Business School"
            style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 1rem' }}
          />
          <h2 className="dashboard-student-heading">Student Examination Access</h2>
          <p className="dashboard-student-text">
            Online examinations must be opened using your dedicated Safe Exam Browser (.seb) configuration file.
          </p>
          <button onClick={logout} className="dashboard-student-logout-button">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const erpBaseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5173'
    : 'https://portal.multitech.ac.ug';

  const userInitial = user?.fullName?.trim()?.charAt(0)?.toUpperCase() || 'A';
  const userFirstName = user?.fullName?.split(' ')[0] || 'User';
  const roleLabel = user?.role === 'admin' ? 'Administrator' : 'Lecturer';

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? 'sidebar-is-collapsed' : 'sidebar-is-expanded'}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : 'expanded'}`}>
        {/* Border edge toggle handle */}
        <button
          type="button"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebar}
          className="sidebar-toggle-handle"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="sidebar-toggle-svg">
            {isSidebarCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>

        <div className="sidebar-inner">
          {/* Institution Header with official logo */}
          <div className="sidebar-header">
            <Link to="/dashboard" className="sidebar-brand-link">
              <img
                src="/logo_asset.png"
                alt="Multitech Business School Logo"
                className="sidebar-logo-image"
              />
              {!isSidebarCollapsed && (
                <div className="sidebar-brand-text">
                  <span className="sidebar-brand-institution">MULTITECH</span>
                  <span className="sidebar-brand-portal">Exam Portal</span>
                </div>
              )}
            </Link>
          </div>

          <div className="sidebar-divider" />

          {/* Navigation Links (clean, permanent, no broken collapse accordion) */}
          <nav className="sidebar-nav">
            {!isSidebarCollapsed && (
              <div className="sidebar-nav-heading">MENU</div>
            )}

            <div className="sidebar-nav-items">
              <Link
                to="/dashboard"
                className={`sidebar-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                title={isSidebarCollapsed ? 'Dashboard' : undefined}
              >
                <span className="sidebar-nav-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span className="sidebar-nav-label">Dashboard</span>}
              </Link>

              <Link
                to="/dashboard/exams/create"
                className={`sidebar-nav-link ${location.pathname === '/dashboard/exams/create' ? 'active' : ''}`}
                title={isSidebarCollapsed ? 'Create Exam' : undefined}
              >
                <span className="sidebar-nav-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span className="sidebar-nav-label">Create Exam</span>}
              </Link>

              <Link
                to="/dashboard/settings"
                className={`sidebar-nav-link ${location.pathname === '/dashboard/settings' ? 'active' : ''}`}
                title={isSidebarCollapsed ? 'Settings' : undefined}
              >
                <span className="sidebar-nav-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span className="sidebar-nav-label">Settings</span>}
              </Link>

              {user?.role === 'admin' && (
                <Link
                  to="/dashboard/users"
                  className={`sidebar-nav-link ${location.pathname === '/dashboard/users' ? 'active' : ''}`}
                  title={isSidebarCollapsed ? 'User Management' : undefined}
                >
                  <span className="sidebar-nav-icon">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                  {!isSidebarCollapsed && <span className="sidebar-nav-label">User Management</span>}
                </Link>
              )}
            </div>

            <div className="sidebar-divider" style={{ margin: '1rem 0' }} />

            {!isSidebarCollapsed && (
              <div className="sidebar-nav-heading">SYSTEMS</div>
            )}

            {/* Multitech ERP Quick Return Link */}
            <a
              href={`${erpBaseUrl}/lecturer/courses`}
              target="_blank"
              rel="noreferrer"
              className="sidebar-nav-link sidebar-erp-link"
              title={isSidebarCollapsed ? 'Multitech Web System (ERP)' : undefined}
            >
              <span className="sidebar-nav-icon" style={{ color: '#38bdf8' }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span className="sidebar-nav-label" style={{ color: '#38bdf8' }}>Multitech ERP</span>
                  <span className="sidebar-erp-badge">Live</span>
                </div>
              )}
            </a>
          </nav>

          {/* User Profile Footer */}
          <div className="sidebar-footer">
            {!isSidebarCollapsed ? (
              <div className="sidebar-profile-card">
                <div className="sidebar-profile-info">
                  <div className="sidebar-avatar-circle">
                    {userInitial}
                  </div>
                  <div className="sidebar-user-text">
                    <p className="sidebar-user-name" title={user?.fullName}>
                      {user?.fullName || 'Administrator'}
                    </p>
                    <span className="sidebar-user-role">
                      {roleLabel}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="sidebar-logout-btn"
                  title="Sign out"
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="sidebar-collapsed-profile">
                <div className="sidebar-avatar-circle" title={`${user?.fullName} (${roleLabel})`}>
                  {userInitial}
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="sidebar-logout-btn"
                  title="Sign out"
                  style={{ marginTop: '0.75rem' }}
                >
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '1.1rem', height: '1.1rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="content-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-institution-tag">
              Multitech Business School
            </span>
            <span className="topbar-tag-sep">&bull;</span>
            <span className="topbar-system-name">
              Safe Exam Browser Portal
            </span>
          </div>

          <div className="topbar-actions">
            <a
              href={`${erpBaseUrl}/lecturer/courses`}
              target="_blank"
              rel="noreferrer"
              className="topbar-erp-pill"
              title="Open Multitech Web System"
            >
              <span>🏛️ Multitech Web System</span>
              <span style={{ fontSize: '0.85rem' }}>↗</span>
            </a>

            <div className="topbar-user-badge">
              <div className="topbar-avatar-small">
                {userInitial}
              </div>
              <span className="topbar-username">
                {userFirstName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="content-main">
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
