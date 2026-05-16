import { useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function DashboardLayout() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3261]">
        <div className="w-12 h-12 border-4 border-[#00f2fe] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role === 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f3261]">
        <div className="bg-[#1a4478] border border-white/5 p-8 max-w-md text-center rounded-xl shadow-2xl shadow-black/50">
          <h2 className="text-xl font-bold mb-4 text-white">Student Portal</h2>
          <p className="text-gray-400 mb-8">
            Please open your Safe Exam Browser (.seb) file to access your scheduled exams securely.
          </p>
          <button 
            onClick={logout} 
            className="w-full py-3 bg-[#fe0979] hover:bg-[#d60665] text-white rounded-lg font-semibold tracking-wider transition-all"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#081d3b] text-white overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 bg-[#0a2b55] border-r border-white/10 flex flex-col z-20">
        <div className="flex h-full flex-col">
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/10 text-cyan-100 text-lg font-semibold">
                EX
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-200">Secure Portal</p>
                <h1 className="text-2xl font-semibold text-white">Exam Admin</h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Centralized controls for exams, submissions, and system settings.
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.12)]">
              <div className="mb-4 text-[10px] uppercase tracking-[0.35em] text-slate-400">Primary</div>
              <Link
                to="/dashboard"
                className={`flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all ${
                  location.pathname === '/dashboard'
                    ? 'bg-[#0c3c72] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="font-semibold">Dashboard</span>
              </Link>
              <Link
                to="/dashboard/exams/create"
                className={`flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all ${
                  location.pathname === '/dashboard/exams/create'
                    ? 'bg-[#0c3c72] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-semibold">Create exam</span>
              </Link>
              <Link
                to="/dashboard/submissions"
                className={`flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all ${
                  location.pathname === '/dashboard/submissions'
                    ? 'bg-[#0c3c72] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold">Submissions</span>
              </Link>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-4 shadow-[0_20px_45px_rgba(0,0,0,0.12)]">
              <div className="mb-4 text-[10px] uppercase tracking-[0.35em] text-slate-400">Account</div>
              <Link
                to="/dashboard/settings"
                className={`flex items-center gap-4 rounded-3xl px-4 py-3 text-sm transition-all ${
                  location.pathname === '/dashboard/settings'
                    ? 'bg-[#0c3c72] text-cyan-100 shadow-[0_12px_30px_rgba(0,88,179,0.18)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-semibold">Settings</span>
              </Link>
            </div>
          </nav>

          <div className="border-t border-white/10 px-6 py-5">
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
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Topbar */}
<header className="h-[72px] bg-[#0a3159] border-b border-white/10 flex items-center justify-between px-8 shrink-0 z-10 shadow-[0_5px_35px_rgba(0,0,0,0.15)]">
          
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
              className="w-full bg-[#102f55] text-white placeholder-slate-500 text-xs tracking-widest border border-white/10 rounded-full py-3 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            />
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#fe0979] rounded-full border border-[#0c3975]"></span>
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
              <div className="w-8 h-8 rounded-full bg-[#0c3d70] flex items-center justify-center shadow-lg shadow-[#0b3d6f]/20">
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
