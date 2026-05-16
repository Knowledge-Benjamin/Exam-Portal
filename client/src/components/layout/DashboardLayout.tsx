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
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
        <div className="bg-[var(--color-primary)] border border-white/5 p-8 max-w-md text-center rounded-xl shadow-2xl shadow-black/50">
          <h2 className="text-xl font-bold mb-4 text-white">Student Portal</h2>
          <p className="text-gray-400 mb-8">
            Please open your Safe Exam Browser (.seb) file to access your scheduled exams securely.
          </p>
          <button 
            onClick={logout} 
            className="w-full py-3 bg-[var(--color-danger)] hover:bg-[#d60665] text-white rounded-lg font-semibold tracking-wider transition-all"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout flex h-screen bg-[#081d3b] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-[72px]' : 'w-[220px]'} flex-shrink-0 border-r border-white/10 flex flex-col z-20 transition-width duration-300`} style={{ backgroundColor: 'var(--color-action)' }}>
        <div className="flex h-full flex-col">
          <div className="px-4 pt-6 pb-4 text-center flex items-center justify-between">
            {!isSidebarCollapsed && (
              <div className="flex-1 text-center">
                <h1 className="text-lg font-semibold text-white">Exam Admin</h1>
                <p className="mt-1 text-[10px] uppercase tracking-[0.35em] text-cyan-200">Secure Portal</p>
              </div>
            )}
            <button
              aria-label="Toggle sidebar"
              onClick={() => setIsSidebarCollapsed(s => !s)}
              className="ml-2 text-slate-300 hover:text-white p-2 rounded"
            >
              <svg className={`w-5 h-5 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <nav className="h-4/5 flex flex-col items-center overflow-y-auto px-6 py-6 w-full">
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between w-full mb-4">
                <div className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Primary</div>
                <button
                  onClick={() => setIsPrimaryCollapsed(!isPrimaryCollapsed)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className={`w-4 h-4 transition-transform duration-300 ${isPrimaryCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
                  </svg>
                </button>
              </div>
            )}

            <div className={`flex flex-col ${isPrimaryCollapsed ? 'h-0 overflow-hidden' : 'flex-1 justify-evenly'} items-center w-full transition-all duration-300`}>
              <Link
                to="/dashboard"
                className={`nav-link-animated flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all w-full ${
                  location.pathname === '/dashboard'
                    ? 'bg-[var(--color-primary)] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!isSidebarCollapsed && <span className="font-semibold">Dashboard</span>}
              </Link>
              <Link
                to="/dashboard/exams/create"
                className={`nav-link-animated flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all w-full ${
                  location.pathname === '/dashboard/exams/create'
                    ? 'bg-[var(--color-primary)] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {!isSidebarCollapsed && <span className="font-semibold">Create exam</span>}
              </Link>
              <Link
                to="/dashboard/submissions"
                className={`nav-link-animated flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all w-full ${
                  location.pathname === '/dashboard/submissions'
                    ? 'bg-[var(--color-primary)] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {!isSidebarCollapsed && <span className="font-semibold">Submissions</span>}
              </Link>
              <Link
                to="/dashboard/settings"
                className={`nav-link-animated flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all w-full ${
                  location.pathname === '/dashboard/settings'
                    ? 'bg-[var(--color-primary)] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!isSidebarCollapsed && <span className="font-semibold">Settings</span>}
              </Link>
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200 font-semibold">
                    {user?.fullName?.charAt(0) ?? 'A'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'Administrator'}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-[0.25em]">Admin access</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="mt-4 w-full rounded-3xl border border-transparent bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: 'var(--color-action)' }}>
                  {user?.fullName?.charAt(0) ?? 'A'}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar */}
<header className="h-[72px] border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-10 shadow-[0_5px_35px_rgba(0,0,0,0.15)]" style={{ backgroundColor: 'var(--color-action)' }}>
          
          {/* Search Bar */}
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder="SEARCH" 
              className="w-full text-white placeholder-slate-500 text-xs tracking-widest border border-white/10 rounded-full py-3 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              style={{ backgroundColor: 'var(--color-action)' }}
            />
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-[var(--color-danger)] rounded-full border border-[var(--color-primary)]"></span>
            </button>
            <Link to="/dashboard/settings" className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6 ml-2">
              <span className="text-xs tracking-widest uppercase font-semibold text-gray-300">
                {user?.fullName?.split(' ')[0] || 'ADMIN'}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-[#0b3d6f]/20" style={{ backgroundColor: 'var(--color-action)' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}


