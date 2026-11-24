import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamMonitor } from '../../hooks/useExamMonitor';
import { formatDate } from '../../utils/formatters';
import { ExamWorkspaceNav } from '../../components/admin/ExamWorkspaceNav';
import {
  IconActivity,
  IconAlert,
  IconCheck,
  IconClipboard,
  IconRefresh,
  IconUsers,
} from '../../components/ui/Icons';

function formatCountdown(totalSec: number | null): string {
  if (totalSec === null || totalSec <= 0) return '00:00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
    .toString()
    .padStart(2, '0')}`;
}

function timeAgo(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  } catch {
    return dateString;
  }
}

export function ExamMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    exam,
    participants,
    events,
    activeCount,
    submittedCount,
    remainingSeconds,
    isConnectedToSocket,
    isLoading,
    error,
    refetchStats,
  } = useExamMonitor(id);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'offline'>('all');

  if (isLoading) {
    return (
      <div className="dash-loading-container">
        <div className="spinner" />
        <p className="dash-loading-text">Connecting to live exam session...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="settings-page">
        <div className="dash-empty-box">
          <h3 className="dash-empty-title">Failed to Load Live Monitor</h3>
          <p className="dash-empty-desc" style={{ color: 'var(--color-danger)', marginBottom: '1.25rem' }}>
            {error || 'Exam not found'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="button button--secondary"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const totalJoined = participants.length;
  const offlineCount = Math.max(0, totalJoined - activeCount);

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentRegNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return p.isConnected;
    if (statusFilter === 'offline') return !p.isConnected;
    return true;
  });

  const monitorActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
      <span
        className={`dash-status-pill ${isConnectedToSocket ? 'status-live' : 'status-closed'}`}
      >
        {isConnectedToSocket && <span className="status-live-dot" />}
        {isConnectedToSocket ? 'Socket Live' : 'Reconnecting'}
      </span>

      {remainingSeconds !== null && (
        <div className="monitor-timer-pill">
          <span className="monitor-timer-label">Remaining</span>
          <span
            className={`monitor-timer-val ${
              remainingSeconds < 300 ? 'is-urgent' : ''
            }`}
          >
            {formatCountdown(remainingSeconds)}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => refetchStats()}
        className="button button--secondary button--sm"
      >
        <IconRefresh size={14} />
        <span>Refresh</span>
      </button>
    </div>
  );

  return (
    <div className="settings-page">
      <ExamWorkspaceNav
        examId={exam.id}
        title={exam.title}
        courseCode={exam.erpCourseCode || 'General'}
        status={exam.status}
        assessmentType={exam.assessmentType}
        submittedCount={submittedCount}
        activeMonitorCount={activeCount}
        actions={monitorActions}
      />

      {/* Metric Cards Row */}
      <div className="dash-stats-grid">
        <div className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Online in SEB</span>
            <div className="dash-stat-icon-wrap bg-emerald-subtle">
              <span className="pulse-indicator" />
            </div>
          </div>
          <div className="dash-stat-number text-emerald">{activeCount}</div>
          <span className="dash-stat-hint">Currently connected</span>
        </div>

        <div className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Total Joined</span>
            <div className="dash-stat-icon-wrap bg-blue-subtle text-blue">
              <IconUsers size={16} />
            </div>
          </div>
          <div className="dash-stat-number">{totalJoined}</div>
          <span className="dash-stat-hint">Admitted examinees</span>
        </div>

        <div className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Submitted</span>
            <div className="dash-stat-icon-wrap bg-blue-subtle text-blue">
              <IconClipboard size={16} />
            </div>
          </div>
          <div className="dash-stat-number text-blue">{submittedCount}</div>
          <span className="dash-stat-hint">Completed papers</span>
        </div>

        <div className="dash-stat-tile">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Offline / Left</span>
            <div className="dash-stat-icon-wrap bg-amber-subtle text-amber">
              <IconAlert size={16} />
            </div>
          </div>
          <div className="dash-stat-number text-amber">{offlineCount}</div>
          <span className="dash-stat-hint">Closed SEB or disconnected</span>
        </div>
      </div>

      {/* Main Content Grid: Roster + Audit Stream */}
      <div className="monitor-grid">
        {/* Left Column: Roster Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Examinees ({filteredParticipants.length})</h2>
              <p className="panel-subtitle">Real-time connection state from Safe Exam Browser</p>
            </div>

            <div className="monitor-filter-row">
              <input
                type="text"
                placeholder="Search name or reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input monitor-search-input"
              />

              <div className="dash-tabs-group" style={{ padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`dash-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`dash-tab-btn ${statusFilter === 'active' ? 'active' : ''}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                >
                  Online ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('offline')}
                  className={`dash-tab-btn ${statusFilter === 'offline' ? 'active' : ''}`}
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                >
                  Offline ({offlineCount})
                </button>
              </div>
            </div>
          </div>

          {filteredParticipants.length === 0 ? (
            <div className="dash-empty-box" style={{ border: 'none', borderRadius: 0 }}>
              <div className="dash-empty-icon-wrap">
                <IconUsers size={22} className="dash-empty-svg" />
              </div>
              <p className="dash-empty-title">
                {participants.length === 0
                  ? 'No examinees connected yet'
                  : 'No examinees match your filter'}
              </p>
              <p className="dash-empty-desc">
                Students appear here automatically when they verify inside Safe Exam Browser.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Answers</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, idx) => (
                    <tr key={p.submissionId || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className={`monitor-avatar ${p.isConnected ? 'is-online' : ''}`}>
                            {p.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                              {p.studentName}
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                fontFamily: 'var(--mono)',
                              }}
                            >
                              {p.studentRegNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {p.isConnected ? (
                          <span className="dash-status-pill status-live">
                            <span className="status-live-dot" />
                            Online ({p.connections})
                          </span>
                        ) : (
                          <span className="dash-status-pill status-draft">Offline</span>
                        )}
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                        {formatDate(p.firstJoinedAt)}
                      </td>

                      <td
                        style={{
                          color: p.isConnected ? 'var(--color-success)' : 'var(--color-warning)',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                      >
                        {p.isConnected ? 'Active now' : timeAgo(p.lastSeenAt)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/exams/${id}/submissions`)}
                          className="btn-card-secondary"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Activity Audit Log */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Activity Audit</h2>
              <p className="panel-subtitle">Session joins, leaves, and submissions</p>
            </div>
            <span className="dash-assessment-pill">{events.length} events</span>
          </div>

          <div className="monitor-events-feed">
            {events.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <IconActivity size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 500 }}>
                  Waiting for session events...
                </p>
              </div>
            ) : (
              events.map((ev, i) => {
                const isJoin = ev.type === 'joined';
                const isLeave = ev.type === 'left';
                const isSubmit =
                  ev.message?.includes('submitted') || ev.message?.includes('answers');

                const variant = isSubmit
                  ? 'event-submit'
                  : isJoin
                  ? 'event-join'
                  : isLeave
                  ? 'event-leave'
                  : 'event-info';

                return (
                  <div key={i} className={`monitor-event-item ${variant}`}>
                    <span className="monitor-event-icon">
                      {isSubmit ? (
                        <IconCheck size={14} />
                      ) : isLeave ? (
                        <IconAlert size={14} />
                      ) : (
                        <IconActivity size={14} />
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="monitor-event-msg">
                        {ev.message || `${ev.studentName} (${ev.studentRegNumber}) ${ev.type}`}
                      </div>
                      <div className="monitor-event-meta">
                        <span>{ev.studentRegNumber}</span>
                        <span>{timeAgo(ev.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExamMonitor;
