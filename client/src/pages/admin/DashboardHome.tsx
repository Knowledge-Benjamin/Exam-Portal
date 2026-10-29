import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';

type FilterTab = 'all' | 'draft' | 'active' | 'closed' | 'archived';

export function DashboardHome() {
  const [exams, setExams] = useState<ExamWithGateUrl[]>([]);
  const [archivedExams, setArchivedExams] = useState<ExamWithGateUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [archiveMsg, setArchiveMsg] = useState('');

  const { user } = useAuthStore();

  // Pagination & filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const EXAMS_PER_PAGE = 6;

  const fetchExams = useCallback(async () => {
    try {
      setIsLoading(true);
      const [activeRes, archiveRes] = await Promise.all([
        api.get('/exams'),
        api.get('/exams?archived=true'),
      ]);
      setExams(activeRes.data.exams ?? []);
      setArchivedExams(archiveRes.data.exams ?? []);
    } catch (err: any) {
      setError(err.error || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const safeExams = exams || [];
  const safeArchived = archivedExams || [];
  const activeExams = safeExams.filter((e) => e.status === 'active').length;
  const draftExams = safeExams.filter((e) => e.status === 'draft').length;
  const firstName = user?.fullName?.split(' ')[0] || 'Administrator';

  // Which pool are we drawing from?
  const pool = statusFilter === 'archived' ? safeArchived : safeExams;

  // Filter by status (skip for archived tab)
  const statusFiltered =
    statusFilter === 'all' || statusFilter === 'archived'
      ? pool
      : pool.filter((exam) => exam.status === statusFilter);

  // Search filter
  const q = searchQuery.toLowerCase();
  const filteredExams = statusFiltered.filter(
    (exam) =>
      !searchQuery ||
      exam.title.toLowerCase().includes(q) ||
      (exam.erpCourseCode && exam.erpCourseCode.toLowerCase().includes(q)),
  );

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * EXAMS_PER_PAGE;
  const paginatedExams = filteredExams.slice(startIdx, startIdx + EXAMS_PER_PAGE);

  const handleFilterChange = (filter: FilterTab) => {
    setStatusFilter(filter);
    setCurrentPage(1);
    setSearchQuery('');
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleArchive = async (examId: string, title: string) => {
    if (!window.confirm(`Archive exam "${title}"? You can restore it later from the Archived tab.`)) return;
    try {
      await api.patch(`/exams/${examId}/archive`);
      setArchiveMsg(`"${title}" archived.`);
      setTimeout(() => setArchiveMsg(''), 3500);
      await fetchExams();
    } catch (err: any) {
      alert(err?.error || 'Failed to archive exam');
    }
  };

  const handleUnarchive = async (examId: string, title: string) => {
    try {
      await api.patch(`/exams/${examId}/unarchive`);
      setArchiveMsg(`"${title}" restored to active exams.`);
      setTimeout(() => setArchiveMsg(''), 3500);
      await fetchExams();
    } catch (err: any) {
      alert(err?.error || 'Failed to restore exam');
    }
  };

  const handleDelete = async (examId: string, title: string, status: string) => {
    if (status === 'active') {
      alert('Active exams cannot be deleted. Close the exam first.');
      return;
    }
    if (!window.confirm(`Delete exam "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/exams/${examId}`);
      setExams((prev) => prev.filter((x) => x.id !== examId));
      setArchivedExams((prev) => prev.filter((x) => x.id !== examId));
    } catch (err: any) {
      alert(err?.error || 'Failed to delete exam');
    }
  };

  const tabCounts: Record<FilterTab, number> = {
    all: safeExams.length,
    draft: safeExams.filter((e) => e.status === 'draft').length,
    active: safeExams.filter((e) => e.status === 'active').length,
    closed: safeExams.filter((e) => e.status === 'closed').length,
    archived: safeArchived.length,
  };

  const TAB_LABELS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'active', label: 'Live' },
    { key: 'closed', label: 'Closed' },
    { key: 'archived', label: '🗄 Archived' },
  ];

  return (
    <div className="dashboard-page fade-in">
      {/* Hero */}
      <section className="dashboard-hero dashboard-card">
        <div className="dashboard-hero-content">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                MULTITECH BUSINESS SCHOOL
              </span>
            </div>
            <h1 className="dashboard-hero-title">Welcome back, {firstName}</h1>
            <p className="dashboard-hero-text">
              Review your course examinations, configure Safe Exam Browser locks, and synchronize results directly with the Multitech Web System.
            </p>
          </div>

          <div className="dashboard-hero-pill">
            <span className="dashboard-pill-dot" />
            Connected to Multitech ERP
          </div>
        </div>
      </section>

      {/* Stats + Quick Action */}
      <section className="dashboard-panels">
        <div className="dashboard-stats-grid">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Total Exams</span>
              <span className="dashboard-pill">All time</span>
            </div>
            <div className="dashboard-stat-value">{safeExams.length}</div>
            <p className="dashboard-stat-note">Assessments configured in your institution portal.</p>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Published</span>
              <span className="dashboard-pill" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}>Live</span>
            </div>
            <div className="dashboard-stat-value">{activeExams}</div>
            <p className="dashboard-stat-note">Active and downloadable by students via .seb.</p>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Drafts</span>
              <span className="dashboard-pill" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' }}>Pending</span>
            </div>
            <div className="dashboard-stat-value">{draftExams}</div>
            <p className="dashboard-stat-note">Exams currently in preparation or staging.</p>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Archived</span>
              <span className="dashboard-pill" style={{ color: '#94a3b8', background: 'rgba(148, 163, 184, 0.12)' }}>Hidden</span>
            </div>
            <div className="dashboard-stat-value">{safeArchived.length}</div>
            <p className="dashboard-stat-note">Closed exams moved to the archive for record-keeping.</p>
          </article>
        </div>

        <aside className="dashboard-quick-card dashboard-card">
          <div className="dashboard-quick-header">
            <span className="dashboard-stat-title">Quick Action</span>
            <div className="dashboard-quick-badge">+</div>
          </div>

          <div className="dashboard-quick-body">
            <h2 className="dashboard-quick-title">Create a new examination</h2>
            <p className="dashboard-quick-copy">
              Link a verified Multitech course unit, configure permitted IDEs/Office tools, and publish securely.
            </p>
          </div>

          <Link to="/dashboard/exams/create" className="button button--primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block', padding: '0.75rem 1rem' }}>
            + Create New Exam
          </Link>
        </aside>
      </section>

      {error && <div className="dashboard-error">{error}</div>}
      {archiveMsg && (
        <div style={{ margin: '0 0 1rem', padding: '0.75rem 1.25rem', borderRadius: '0.75rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: '0.875rem', fontWeight: 600 }}>
          ✓ {archiveMsg}
        </div>
      )}

      {/* Main Exam Table Section */}
      <section className="dashboard-overview">
        <div className="overview-header">
          <div>
            <h2 className="section-title">
              {statusFilter === 'archived' ? 'Archived Examinations' : 'Institutional Examinations'}
            </h2>
            <p className="section-copy">
              {statusFilter === 'archived'
                ? 'These exams are archived. You can restore or permanently delete them.'
                : 'Manage your exams, monitor student submissions, and download Safe Exam Browser configurations.'}
            </p>
          </div>
          <div className="dashboard-pill dashboard-pill-small">
            <span className="dashboard-pill-dot" />
            {filteredExams.length} Exam{filteredExams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filter Tabs + Search */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem', flexWrap: 'wrap' }}>
            {TAB_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  background: statusFilter === key
                    ? key === 'archived' ? '#475569' : '#0052cc'
                    : 'transparent',
                  color: statusFilter === key ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  boxShadow: statusFilter === key
                    ? key === 'archived' ? '0 2px 8px rgba(71,85,105,0.4)' : '0 2px 8px rgba(0,82,204,0.4)'
                    : 'none',
                }}
              >
                {label} ({tabCounts[key]})
              </button>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search by title or course code..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38bdf8')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="dashboard-empty-state">
            {statusFilter === 'archived' ? (
              <p>No archived exams. Archive a closed exam using the button on its card.</p>
            ) : (
              <p>{searchQuery || statusFilter !== 'all' ? 'No exams match your search.' : 'No exams yet — create your first examination above.'}</p>
            )}
          </div>
        ) : (
          <>
            <div className="exam-list-grid">
              {paginatedExams.map((exam) => {
                const isArchived = statusFilter === 'archived';
                const variantClass =
                  isArchived
                    ? 'status-closed'
                    : exam.status === 'active'
                    ? 'status-active'
                    : exam.status === 'draft'
                    ? 'status-draft'
                    : 'status-closed';

                return (
                  <article key={exam.id} className="exam-card" style={isArchived ? { opacity: 0.8 } : {}}>
                    <div className="exam-card-body">
                      {/* Course badge & assessment type */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                          {exam.erpCourseCode ? `Course: ${exam.erpCourseCode}` : 'Institutional Exam'}
                        </span>
                        {isArchived ? (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(148,163,184,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(148,163,184,0.2)' }}>
                            🗄 Archived
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {exam.assessmentType === 'coursework' ? '📝 Coursework' : '🎓 Final Exam'}
                          </span>
                        )}
                      </div>

                      <div className="exam-card-header">
                        <h3 className="exam-card-title">
                          <Link to={`/dashboard/exams/${exam.id}`} className="exam-card-link">
                            {exam.title}
                          </Link>
                        </h3>
                        <span className={`status-pill ${variantClass}`}>
                          {isArchived ? 'archived' : exam.status}
                        </span>
                      </div>

                      <div className="exam-card-details">
                        <div className="exam-card-detail">
                          <span>Starts</span>
                          <strong>{formatDate(exam.startTime)}</strong>
                        </div>
                        <div className="exam-card-detail">
                          <span>Duration</span>
                          <strong>{formatDuration(exam.durationMinutes)}</strong>
                        </div>
                        <div className="exam-card-detail">
                          <span>Type</span>
                          <strong>{exam.questionSource === 'pdf' ? 'PDF Paper' : 'Question Builder'}</strong>
                        </div>
                      </div>

                      <div className="exam-card-actions">
                        {isArchived ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUnarchive(exam.id, exam.title)}
                              className="button button--secondary button-block"
                              style={{ fontSize: '0.8rem' }}
                            >
                              ↩ Restore
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exam.id, exam.title, exam.status)}
                              className="button button--danger button-block"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <Link to={`/dashboard/exams/${exam.id}`} className="button button--secondary button-block" style={{ textAlign: 'center', textDecoration: 'none' }}>
                              Manage
                            </Link>
                            {exam.status !== 'active' && (
                              <Link to={`/dashboard/exams/${exam.id}/builder`} className="button button--secondary button-block" style={{ textAlign: 'center', textDecoration: 'none' }}>
                                Edit
                              </Link>
                            )}
                            {exam.status === 'closed' && (
                              <button
                                type="button"
                                onClick={() => handleArchive(exam.id, exam.title)}
                                className="button button--secondary button-block"
                                style={{ fontSize: '0.8rem', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}
                              >
                                🗄 Archive
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDelete(exam.id, exam.title, exam.status)}
                              className="button button--danger button-block"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem', paddingBottom: '1rem' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: safePage <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: safePage <= 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  &#171;
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: safePage <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: safePage <= 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  &#8249; Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - safePage) <= 1)
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push('…' + idx);
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item) =>
                    typeof item === 'string' ? (
                      <span key={item} style={{ color: 'rgba(255,255,255,0.3)', padding: '0 0.25rem', fontWeight: 700 }}>…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        style={{ padding: '0.5rem 0.85rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: safePage === item ? '#0052cc' : 'rgba(255,255,255,0.08)', color: '#fff', transform: safePage === item ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.2s' }}
                      >
                        {item}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: safePage >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: safePage >= totalPages ? 'rgba(255,255,255,0.2)' : '#fff', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  Next &#8250;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: 'none', background: safePage >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: safePage >= totalPages ? 'rgba(255,255,255,0.2)' : '#fff', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  &#187;
                </button>
              </div>
            )}

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
              Showing {startIdx + 1}–{Math.min(startIdx + EXAMS_PER_PAGE, filteredExams.length)} of {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
