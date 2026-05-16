import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';

export function DashboardHome() {
  const [exams, setExams] = useState<ExamWithGateUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuthStore();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data } = await api.get('/exams');
      setExams(data.exams);
    } catch (err: any) {
      setError(err.error || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  const safeExams = exams || [];
  const activeExams = safeExams.filter(e => e.status === 'active').length;
  const draftExams = safeExams.filter(e => e.status === 'draft').length;
  const firstName = user?.fullName?.split(' ')[0] || 'Administrator';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="dashboard-card bg-[#170C79] p-4 mb-40 w-full md:w-1/2 mt-8 ml-8 h-32">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xs md:text-sm font-semibold text-white">Welcome back, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Review your exams, monitor activity, and launch secure assessments from one premium command center.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-3xl border border-cyan-400/15 bg-white/5 px-3 py-2 text-xs text-cyan-100">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300"></span>
            Real-time exam management
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

          <div className="dashboard-card bg-[#170C79] p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 font-semibold">Total exams</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-300">All time</span>
            </div>
            <div className="text-[44px] font-semibold text-white">{safeExams.length}</div>
            <p className="mt-4 text-sm text-slate-400">Current number of exams stored in your portal.</p>
          </div>

          <div className="dashboard-card bg-[#170C79] p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 font-semibold">Published</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-300">Live</span>
            </div>
            <div className="text-[44px] font-semibold text-white">{activeExams}</div>
            <p className="mt-4 text-sm text-slate-400">Exams currently available for students.</p>
          </div>

          <div className="dashboard-card bg-[#170C79] p-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 font-semibold">Drafts</span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-slate-300">Pending</span>
            </div>
            <div className="text-[44px] font-semibold text-white">{draftExams}</div>
            <p className="mt-4 text-sm text-slate-400">Exams still in preparation mode.</p>
          </div>
        </div>

        <div className="dashboard-card p-8 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <span className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 font-semibold">Quick action</span>
              <div className="h-10 w-10 rounded-3xl bg-white/5 grid place-items-center text-cyan-200">
                <span className="text-lg font-semibold">+</span>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Build a fresh exam in seconds</h2>
            <p className="text-sm leading-6 text-slate-400">
              Launch secure assessments with a single streamlined workflow and keep your organization moving.
            </p>
          </div>
          <Link
            to="/dashboard/exams/create"
            className="mt-8 inline-flex items-center justify-center w-full rounded-2xl border border-cyan-400/15 bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-[#113e74]"
          >
            Create exam
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Exams List Container */}
      <div className="dashboard-card bg-[#FFB33F] p-8" style={{ backgroundColor: '#FFB33F' }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h2 className="text-[14px] uppercase tracking-[0.3em] font-semibold text-white">Exams overview</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xl">
              A concise summary of the exams available in the portal, with quick access to management actions.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-cyan-100">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300"></span>
            Exam list
          </div>
        </div>

        {safeExams.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-[24px] bg-[#102f58]/70">
            <p className="text-sm text-slate-400 tracking-widest uppercase">No exams available yet</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <div key={exam.id} className="group relative overflow-hidden dashboard-card bg-[#170C79] p-6 transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
                <div className="flex items-start justify-between mb-6 gap-4">
                  <h3 className="text-base font-semibold text-white tracking-wide truncate">{exam.title}</h3>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                    exam.status === 'active' ? 'bg-cyan-400/10 text-cyan-200 border border-cyan-400/15' :
                    exam.status === 'draft' ? 'bg-slate-700/70 text-slate-300 border border-slate-600/60' :
                    'bg-rose-500/10 text-rose-200 border border-rose-400/10'
                  }`}>
                    {exam.status}
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="uppercase tracking-[0.18em] text-slate-400">Starts</span>
                    <span>{formatDate(exam.startTime)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="uppercase tracking-[0.18em] text-slate-400">Duration</span>
                    <span>{formatDuration(exam.durationMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="uppercase tracking-[0.18em] text-slate-400">Type</span>
                    <span className="text-cyan-200">{exam.questionSource === 'pdf' ? 'PDF' : 'BUILDER'}</span>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    to={`/dashboard/exams/${exam.id}`}
                    className="block w-full rounded-2xl bg-[#0c3b6c] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-[#0d4a8b]"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


