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
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  const safeExams = exams || [];
  const activeExams = safeExams.filter((e) => e.status === 'active').length;
  const draftExams = safeExams.filter((e) => e.status === 'draft').length;
  const firstName = user?.fullName?.split(' ')[0] || 'Administrator';

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

        {safeExams.length === 0 ? (
          <div className="dashboard-empty-state">
            <p>No exams available yet.</p>
          </div>
        ) : (
          <div className="exam-list-grid">
            {exams.map((exam) => {
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
        )}
      </section>
    </div>
  );
}


