import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamMonitor } from '../../hooks/useExamMonitor';
import { formatDate } from '../../utils/formatters';

function formatCountdown(totalSec: number | null): string {
  if (totalSec === null || totalSec <= 0) return '00:00:00';
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>Connecting to live exam session...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2rem', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>Failed to Load Exam Monitor</h3>
        <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{error || 'Exam not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="button button--secondary"
          style={{ padding: '0.6rem 1.25rem', borderRadius: '8px' }}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const totalJoined = participants.length;
  const offlineCount = Math.max(0, totalJoined - activeCount);

  // Filtered participant list
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.studentRegNumber.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return p.isConnected;
    if (statusFilter === 'offline') return !p.isConnected;
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', padding: 0, fontWeight: 500 }}
        >
          Dashboard
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => navigate(`/dashboard/exams/${id}`)}
          style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', padding: 0, fontWeight: 500 }}
        >
          {exam.erpCourseCode || 'Exam Details'}
        </button>
        <span>/</span>
        <span style={{ color: '#1e293b', fontWeight: 600 }}>Live Exam Monitor</span>
      </div>

      {/* Main Header Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span style={{
                background: '#e0edff',
                color: '#0052cc',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                {exam.erpCourseCode || 'GENERAL'}
              </span>

              {/* Pulsing Live Pill */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isConnectedToSocket ? '#ecfdf5' : '#fef2f2',
                color: isConnectedToSocket ? '#059669' : '#dc2626',
                border: `1px solid ${isConnectedToSocket ? '#a7f3d0' : '#fecaca'}`,
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnectedToSocket ? '#10b981' : '#ef4444',
                  boxShadow: isConnectedToSocket ? '0 0 0 2px rgba(16, 185, 129, 0.3)' : 'none',
                }} />
                {isConnectedToSocket ? 'LIVE SOCKET CONNECTED' : 'RECONNECTING...'}
              </span>
            </div>

            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
              {exam.title}
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Real-time proctoring and attendance tracking inside Safe Exam Browser
            </p>
          </div>

          {/* Countdown & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {remainingSeconds !== null && (
              <div style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid #334155',
              }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 700 }}>
                  Time Remaining
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: remainingSeconds < 300 ? '#f87171' : '#38bdf8' }}>
                  {formatCountdown(remainingSeconds)}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => refetchStats()}
              className="button button--secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              🔄 Refresh
            </button>

            <button
              type="button"
              onClick={() => navigate(`/dashboard/exams/${id}/submissions`)}
              className="button button--secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              📋 View Submissions
            </button>

            <button
              type="button"
              onClick={() => navigate(`/dashboard/exams/${id}`)}
              className="button button--secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              ⚙️ Exam Details
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Active Students in SEB */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #10b981',
          padding: '1.1rem 1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Online in SEB Now</span>
            <span style={{ fontSize: '1.1rem' }}>🟢</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginTop: '0.2rem' }}>
            Currently interacting in exam room
          </div>
        </div>

        {/* Total Joined */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #0052cc',
          padding: '1.1rem 1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Total Joined</span>
            <span style={{ fontSize: '1.1rem' }}>👥</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {totalJoined}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Unique students admitted
          </div>
        </div>

        {/* Submissions */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #8b5cf6',
          padding: '1.1rem 1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Final Submissions</span>
            <span style={{ fontSize: '1.1rem' }}>📝</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {submittedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600, marginTop: '0.2rem' }}>
            Exams turned in
          </div>
        </div>

        {/* Disconnected / Left */}
        <div style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #f59e0b',
          padding: '1.1rem 1.25rem',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Offline / Left</span>
            <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {offlineCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginTop: '0.2rem' }}>
            Closed SEB or lost connection
          </div>
        </div>
      </div>

      {/* Main Content Grid: Participants (Left 65%) + Real-time Activity Feed (Right 35%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1.2fr)',
        gap: '1.5rem',
        alignItems: 'start',
      }}>
        {/* Left Column: Student Roster Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Card Header & Filters */}
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Students in Exam Room ({filteredParticipants.length})
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Live connectivity status reported directly by Safe Exam Browser
              </p>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search name or reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  minWidth: '180px',
                }}
              />

              <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    background: statusFilter === 'all' ? '#0052cc' : '#f8fafc',
                    color: statusFilter === 'all' ? '#fff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid #cbd5e1',
                    background: statusFilter === 'active' ? '#10b981' : '#f8fafc',
                    color: statusFilter === 'active' ? '#fff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Online ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('offline')}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    borderLeft: '1px solid #cbd5e1',
                    background: statusFilter === 'offline' ? '#f59e0b' : '#f8fafc',
                    color: statusFilter === 'offline' ? '#fff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  Offline ({offlineCount})
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          {filteredParticipants.length === 0 ? (
            <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#334155' }}>
                {participants.length === 0 ? 'No students have joined this exam room yet.' : 'No students match your filter.'}
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                When examinees open the Safe Exam Browser configuration, they will appear here live.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                    <th style={{ padding: '0.75rem 1rem' }}>SEB Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Joined</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Active</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((p, idx) => (
                    <tr
                      key={p.submissionId || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Student Info */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: p.isConnected ? '#dbeafe' : '#f1f5f9',
                            color: p.isConnected ? '#1d4ed8' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0,
                          }}>
                            {p.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.studentName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                              {p.studentRegNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SEB Status Pill */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {p.isConnected ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                            Online ({p.connections} {p.connections > 1 ? 'tabs' : 'tab'})
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#d97706' }} />
                            Disconnected
                          </span>
                        )}
                      </td>

                      {/* Joined Timestamp */}
                      <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                        {formatDate(p.firstJoinedAt)}
                      </td>

                      {/* Last Seen */}
                      <td style={{ padding: '0.85rem 1rem', color: p.isConnected ? '#16a34a' : '#b45309', fontSize: '0.8rem', fontWeight: 500 }}>
                        {p.isConnected ? 'Active now' : timeAgo(p.lastSeenAt)}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/exams/${id}/submissions`)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                          }}
                        >
                          View Answers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Live Event Stream / Audit Log */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                Live Activity Audit Log
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Real-time security events and attendance audit trail
              </p>
            </div>
            <span style={{
              background: '#f1f5f9',
              color: '#475569',
              borderRadius: '999px',
              padding: '0.15rem 0.55rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              {events.length} events
            </span>
          </div>

          <div style={{
            maxHeight: '620px',
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            {events.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📡</div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>Waiting for student room events...</p>
              </div>
            ) : (
              events.map((ev, i) => {
                const isJoin = ev.type === 'joined';
                const isLeave = ev.type === 'left';
                const isSubmit = ev.message?.includes('submitted') || ev.message?.includes('answers');

                let icon = 'ℹ️';
                let borderColor = '#cbd5e1';
                let bgColor = '#f8fafc';

                if (isSubmit) {
                  icon = '📝';
                  borderColor = '#a78bfa';
                  bgColor = '#f5f3ff';
                } else if (isJoin) {
                  icon = '🟢';
                  borderColor = '#86efac';
                  bgColor = '#f0fdf4';
                } else if (isLeave) {
                  icon = '🔴';
                  borderColor = '#fca5a5';
                  bgColor = '#fef2f2';
                } else {
                  icon = '🔄';
                  borderColor = '#93c5fd';
                  bgColor = '#eff6ff';
                }

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      background: bgColor,
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', lineHeight: 1.2 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {ev.message || `${ev.studentName} (${ev.studentRegNumber}) ${ev.type}`}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', color: '#64748b', fontSize: '0.72rem' }}>
                        <span>Reg: {ev.studentRegNumber}</span>
                        <span>{timeAgo(ev.timestamp)} ({formatDate(ev.timestamp)})</span>
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
