import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useAuthStore } from '../../store/authStore';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';

type FilterTab = 'all' | 'active' | 'draft' | 'closed' | 'archived';

export function DashboardHome() {
  const [exams, setExams] = useState<ExamWithGateUrl[]>([]);
  const [archivedExams, setArchivedExams] = useState<ExamWithGateUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { user } = useAuthStore();

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
      setError(err?.error || 'Failed to load examinations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleArchive = async (examId: string, title: string) => {
    if (!window.confirm(`Archive "${title}"? It will be moved to the Archived tab.`)) return;
    try {
      await api.patch(`/exams/${examId}/archive`);
      showFeedback(`"${title}" has been archived.`);
      await fetchExams();
    } catch (err: any) {
      showFeedback(err?.error || 'Failed to archive exam', 'error');
    }
  };

  const handleUnarchive = async (examId: string, title: string) => {
    try {
      await api.patch(`/exams/${examId}/unarchive`);
      showFeedback(`"${title}" restored to active assessments.`);
      await fetchExams();
    } catch (err: any) {
      showFeedback(err?.error || 'Failed to restore exam', 'error');
    }
  };

  const handleDelete = async (examId: string, title: string, status: string) => {
    if (status === 'active') {
      alert('Active exams cannot be deleted while live. Please close the exam first.');
      return;
    }
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/exams/${examId}`);
      showFeedback(`"${title}" has been deleted.`);
      setExams((prev) => prev.filter((x) => x.id !== examId));
      setArchivedExams((prev) => prev.filter((x) => x.id !== examId));
    } catch (err: any) {
      showFeedback(err?.error || 'Failed to delete exam', 'error');
    }
  };

  const safeExams = exams || [];
  const safeArchived = archivedExams || [];
  const activeCount = safeExams.filter((e) => e.status === 'active').length;
  const draftCount = safeExams.filter((e) => e.status === 'draft').length;
  const closedCount = safeExams.filter((e) => e.status === 'closed').length;
  const archivedCount = safeArchived.length;

  const pool = statusFilter === 'archived' ? safeArchived : safeExams;
  const statusFiltered =
    statusFilter === 'all' || statusFilter === 'archived'
      ? pool
      : pool.filter((exam) => exam.status === statusFilter);

  const query = searchQuery.trim().toLowerCase();
  const filteredExams = statusFiltered.filter((exam) => {
    if (!query) return true;
    const matchTitle = exam.title?.toLowerCase().includes(query);
    const matchCourse = exam.erpCourseCode?.toLowerCase().includes(query);
    return matchTitle || matchCourse;
  });

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * EXAMS_PER_PAGE;
  const paginatedExams = filteredExams.slice(startIdx, startIdx + EXAMS_PER_PAGE);

  const handleTabChange = (tab: FilterTab) => {
    setStatusFilter(tab);
    setCurrentPage(1);
  };

  const firstName = user?.fullName?.split(' ')[0] || 'Administrator';

  if (isLoading) {
    return (
      <div className="dash-loading-container">
        <div className="spinner" />
        <p className="dash-loading-text">Loading examinations...</p>
      </div>
    );
  }

  return (
    <div className="dash-container fade-in">
      {/* Sleek, proportional Header Strip */}
      <header className="dash-header-strip">
        <div className="dash-header-left">
          <div className="dash-badge-pill">
            <span className="dash-badge-dot" />
            Institutional Assessments
          </div>
          <h1 className="dash-heading">Examinations Dashboard</h1>
          <p className="dash-subheading">
            Welcome back, {firstName}. Manage secure exam rooms, configure Safe Exam Browser locks, and synchronize grades.
          </p>
        </div>

        <div className="dash-header-right">
          <Link to="/dashboard/exams/create" className="btn-dash-create">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="btn-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Exam</span>
          </Link>
        </div>
      </header>

      {/* Clean 4-card metric grid (fully balanced, no orphan cards) */}
      <section className="dash-stats-grid">
        <article className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Total Exams</span>
            <div className="dash-stat-icon-wrap bg-blue-subtle">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="dash-tile-svg text-blue">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="dash-stat-number">{safeExams.length}</div>
          <span className="dash-stat-hint">Registered assessments</span>
        </article>

        <article className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Live Now</span>
            <div className="dash-stat-icon-wrap bg-emerald-subtle">
              <span className="pulse-indicator" />
            </div>
          </div>
          <div className="dash-stat-number text-emerald">{activeCount}</div>
          <span className="dash-stat-hint">Active in Safe Exam Browser</span>
        </article>

        <article className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Draft Papers</span>
            <div className="dash-stat-icon-wrap bg-amber-subtle">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="dash-tile-svg text-amber">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div className="dash-stat-number text-amber">{draftCount}</div>
          <span className="dash-stat-hint">Pending publication</span>
        </article>

        <article className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Archived</span>
            <div className="dash-stat-icon-wrap bg-slate-subtle">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="dash-tile-svg text-slate">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
          <div className="dash-stat-number text-slate">{archivedCount}</div>
          <span className="dash-stat-hint">Stored historical records</span>
        </article>
      </section>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className={`dash-alert ${feedbackMsg.type === 'error' ? 'dash-alert-error' : 'dash-alert-success'}`}>
          <span>{feedbackMsg.type === 'error' ? '✕' : '✓'}</span>
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {error && (
        <div className="dash-alert dash-alert-error">
          <span>✕</span>
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar: Tabs on Left, Search on Right */}
      <div className="dash-controls-bar">
        <div className="dash-tabs-group">
          {(
            [
              { key: 'all', label: 'All Exams', count: safeExams.length },
              { key: 'active', label: 'Live', count: activeCount },
              { key: 'draft', label: 'Drafts', count: draftCount },
              { key: 'closed', label: 'Closed', count: closedCount },
              { key: 'archived', label: 'Archived', count: archivedCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`dash-tab-btn ${statusFilter === tab.key ? 'active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="dash-tab-pill">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="dash-search-wrap">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="dash-search-icon">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or course code..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="dash-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="dash-search-clear"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Exam Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="dash-empty-box">
          <div className="dash-empty-icon-wrap">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="dash-empty-svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="dash-empty-title">
            {searchQuery
              ? 'No matching examinations'
              : statusFilter === 'archived'
              ? 'No archived examinations'
              : 'No examinations found'}
          </h3>
          <p className="dash-empty-desc">
            {searchQuery
              ? `No exams matched "${searchQuery}". Try searching for another keyword or course code.`
              : statusFilter === 'archived'
              ? 'Closed exams that you archive will appear here for safe keeping.'
              : 'Create your first course assessment to get started with Safe Exam Browser.'}
          </p>
          {!searchQuery && statusFilter !== 'archived' && (
            <Link to="/dashboard/exams/create" className="btn-dash-create" style={{ margin: '1rem auto 0' }}>
              + Create Examination
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="dash-exam-grid">
            {paginatedExams.map((exam) => {
              const isArchived = statusFilter === 'archived';
              const statusClass =
                isArchived
                  ? 'status-archived'
                  : exam.status === 'active'
                  ? 'status-live'
                  : exam.status === 'draft'
                  ? 'status-draft'
                  : 'status-closed';

              const statusText = isArchived ? 'Archived' : exam.status === 'active' ? 'Live' : exam.status === 'draft' ? 'Draft' : 'Closed';

              return (
                <article key={exam.id} className={`dash-exam-card ${isArchived ? 'is-archived' : ''}`}>
                  {/* Card Top: Badges */}
                  <div className="dash-card-header">
                    <div className="dash-card-tags">
                      <span className="dash-course-pill">
                        {exam.erpCourseCode || 'General'}
                      </span>
                      <span className="dash-assessment-pill">
                        {exam.assessmentType === 'coursework' ? 'Coursework' : 'Final Exam'}
                      </span>
                    </div>
                    <span className={`dash-status-pill ${statusClass}`}>
                      {exam.status === 'active' && <span className="status-live-dot" />}
                      {statusText}
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="dash-card-title">
                    <Link to={`/dashboard/exams/${exam.id}`} className="dash-card-title-link">
                      {exam.title}
                    </Link>
                  </h3>

                  {/* Card Meta Grid */}
                  <div className="dash-meta-grid">
                    <div className="dash-meta-item">
                      <span className="dash-meta-key">Starts</span>
                      <span className="dash-meta-val">{formatDate(exam.startTime)}</span>
                    </div>
                    <div className="dash-meta-item">
                      <span className="dash-meta-key">Duration</span>
                      <span className="dash-meta-val">{formatDuration(exam.durationMinutes)}</span>
                    </div>
                    <div className="dash-meta-item">
                      <span className="dash-meta-key">Format</span>
                      <span className="dash-meta-val">
                        {exam.questionSource === 'pdf' ? 'PDF Paper' : 'Questions'}
                      </span>
                    </div>
                    <div className="dash-meta-item">
                      <span className="dash-meta-key">Security</span>
                      <span className="dash-meta-val text-blue">SEB Protected</span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="dash-card-actions">
                    {isArchived ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUnarchive(exam.id, exam.title)}
                          className="btn-card-primary"
                        >
                          ↩ Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exam.id, exam.title, exam.status)}
                          className="btn-card-danger"
                          title="Permanently Delete"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to={`/dashboard/exams/${exam.id}`} className="btn-card-primary">
                          Manage
                        </Link>
                        {exam.status !== 'active' && (
                          <Link to={`/dashboard/exams/${exam.id}/builder`} className="btn-card-secondary">
                            Edit
                          </Link>
                        )}
                        {exam.status === 'closed' && (
                          <button
                            type="button"
                            onClick={() => handleArchive(exam.id, exam.title)}
                            className="btn-card-secondary"
                            title="Move to Archive"
                          >
                            Archive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(exam.id, exam.title, exam.status)}
                          className="btn-card-danger"
                          title="Delete Exam"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="dash-pagination-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                className="btn-page-step"
                title="First Page"
              >
                &#171;
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="btn-page-step"
              >
                Prev
              </button>

              <div className="dash-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push(`ellipsis-${idx}`);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item) =>
                    typeof item === 'string' ? (
                      <span key={item} className="dash-page-ellipsis">
                        &hellip;
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`btn-page-number ${safePage === item ? 'active' : ''}`}
                      >
                        {item}
                      </button>
                    ),
                  )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="btn-page-step"
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                className="btn-page-step"
                title="Last Page"
              >
                &#187;
              </button>
            </div>
          )}

          <div className="dash-results-footer">
            Showing {startIdx + 1}–{Math.min(startIdx + EXAMS_PER_PAGE, filteredExams.length)} of {filteredExams.length} assessment{filteredExams.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}
