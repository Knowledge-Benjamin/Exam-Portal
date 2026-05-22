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

  // Pagination & filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const EXAMS_PER_PAGE = 6;

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
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const safeExams = exams || [];
  const activeExams = safeExams.filter((e) => e.status === 'active').length;
  const draftExams = safeExams.filter((e) => e.status === 'draft').length;
  const firstName = user?.fullName?.split(' ')[0] || 'Administrator';

  // Filter exams by status and search
  const filteredExams = safeExams.filter((exam) => {
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    const matchesSearch = !searchQuery || exam.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * EXAMS_PER_PAGE;
  const paginatedExams = filteredExams.slice(startIdx, startIdx + EXAMS_PER_PAGE);

  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  return (
    <div className="dashboard-page fade-in">
      <section className="dashboard-hero dashboard-card">
        <div className="dashboard-hero-content">
          <div>
            <h1 className="dashboard-hero-title">Welcome back, {firstName}</h1>
            <p className="dashboard-hero-text">
              Review your exams, monitor activity, and launch secure assessments from one premium command center.
            </p>
          </div>

          <div className="dashboard-hero-pill">
            <span className="dashboard-pill-dot" />
            Real-time exam management
          </div>
        </div>
      </section>

      <section className="dashboard-panels">
        <div className="dashboard-stats-grid">
          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Total exams</span>
              <span className="dashboard-pill">All time</span>
            </div>
            <div className="dashboard-stat-value">{safeExams.length}</div>
            <p className="dashboard-stat-note">Current number of exams stored in your portal.</p>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Published</span>
              <span className="dashboard-pill">Live</span>
            </div>
            <div className="dashboard-stat-value">{activeExams}</div>
            <p className="dashboard-stat-note">Exams currently available for students.</p>
          </article>

          <article className="dashboard-stat-card">
            <div className="dashboard-stat-meta">
              <span className="dashboard-stat-title">Drafts</span>
              <span className="dashboard-pill">Pending</span>
            </div>
            <div className="dashboard-stat-value">{draftExams}</div>
            <p className="dashboard-stat-note">Exams still in preparation mode.</p>
          </article>
        </div>

        <aside className="dashboard-quick-card dashboard-card">
          <div className="dashboard-quick-header">
            <span className="dashboard-stat-title">Quick action</span>
            <div className="dashboard-quick-badge">+</div>
          </div>

          <div className="dashboard-quick-body">
            <h2 className="dashboard-quick-title">Build a fresh exam in seconds</h2>
            <p className="dashboard-quick-copy">
              Launch secure assessments with a single streamlined workflow and keep your organization moving.
            </p>
          </div>

          <Link to="/dashboard/exams/create" className="button button-primary button-full">
            Create exam
          </Link>
        </aside>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="dashboard-overview">
        <div className="overview-header">
          <div>
            <h2 className="section-title">Exams overview</h2>
            <p className="section-copy">
              A concise summary of the exams available in the portal, with quick access to management actions.
            </p>
          </div>
          <div className="dashboard-pill dashboard-pill-small">
            <span className="dashboard-pill-dot" />
            Exam list
          </div>
        </div>

        {/* Filter & Search bar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.25rem' }}>
            {(['all', 'draft', 'active', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s',
                  background: statusFilter === f ? 'var(--color-action)' : 'transparent',
                  color: statusFilter === f ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {f} ({f === 'all' ? safeExams.length : safeExams.filter(e => e.status === f).length})
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search exams..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                borderRadius: '0.75rem',
                border: '2px solid transparent',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--color-action)')}
              onBlur={(e) => (e.target.style.borderColor = 'transparent')}
            />
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="dashboard-empty-state">
            <p>{searchQuery || statusFilter !== 'all' ? 'No exams match your filter.' : 'No exams available yet.'}</p>
          </div>
        ) : (
          <>
            <div className="exam-list-grid">
              {paginatedExams.map((exam) => {
                const variantClass = exam.status === 'active' ? 'status-active' : exam.status === 'draft' ? 'status-draft' : 'status-closed';
                return (
                  <article key={exam.id} className="exam-card">
                    <div className="exam-card-body">
                      <div className="exam-card-header">
                        <h3 className="exam-card-title">
                          <Link to={`/dashboard/exams/${exam.id}`} className="exam-card-link">
                            {exam.title}
                          </Link>
                        </h3>
                        <span className={`status-pill ${variantClass}`}>{exam.status}</span>
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
                          <strong>{exam.questionSource === 'pdf' ? 'PDF' : 'BUILDER'}</strong>
                        </div>
                      </div>

                      <div className="exam-card-actions">
                        <Link to={`/dashboard/exams/${exam.id}`} className="button button-secondary button-block">
                          Manage
                        </Link>
                        <Link to={`/dashboard/exams/${exam.id}/builder`} className="button button-secondary button-block">
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (exam.status === 'active') {
                              alert('Active exams cannot be deleted');
                              return;
                            }
                            const ok = window.confirm(`Delete exam "${exam.title}"? This cannot be undone.`);
                            if (!ok) return;
                            try {
                              await api.delete(`/exams/${exam.id}`);
                              setExams((prev) => prev.filter((x) => x.id !== exam.id));
                            } catch (err: any) {
                              alert(err?.error || 'Failed to delete exam');
                            }
                          }}
                          className="button button-danger button-block"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '2rem',
                paddingBottom: '1rem',
              }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: safePage <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                    color: safePage <= 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                >
                  &#171;
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: safePage <= 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                    color: safePage <= 1 ? 'rgba(255,255,255,0.2)' : '#fff',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                >
                  &#8249; Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => {
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - safePage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, page, idx, arr) => {
                    if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                      acc.push('ellipsis-' + idx);
                    }
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
                        style={{
                          padding: '0.5rem 0.85rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          transition: 'all 0.2s',
                          background: safePage === item ? 'var(--color-action)' : 'rgba(255,255,255,0.08)',
                          color: safePage === item ? 'var(--color-primary)' : '#fff',
                          transform: safePage === item ? 'scale(1.1)' : 'scale(1)',
                        }}
                      >
                        {item}
                      </button>
                    )
                  )
                }

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: safePage >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                    color: safePage >= totalPages ? 'rgba(255,255,255,0.2)' : '#fff',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                >
                  Next &#8250;
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: safePage >= totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                    color: safePage >= totalPages ? 'rgba(255,255,255,0.2)' : '#fff',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    transition: 'all 0.2s',
                  }}
                >
                  &#187;
                </button>
              </div>
            )}

            {/* Page info */}
            <p style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginTop: '0.5rem',
            }}>
              Showing {startIdx + 1}–{Math.min(startIdx + EXAMS_PER_PAGE, filteredExams.length)} of {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
