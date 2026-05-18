import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration, formatDateTimeCompact } from '../../utils/formatters';
import { useExamRoomMonitor } from '../../hooks/useExamRoomMonitor';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamWithGateUrl | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [editingSebKey, setEditingSebKey] = useState(false);
  const [sebKeyInput, setSebKeyInput] = useState('');
  const [stats, setStats] = useState<{
    totalJoined: number;
    totalSubmitted: number;
    totalForced: number;
    totalNotSubmitted: number;
  } | null>(null);

  const { connectionStatus, roomState, logs, remainingSeconds, error: monitorError } = useExamRoomMonitor(id);

  useEffect(() => {
    fetchExam();
    fetchStats();
  }, [id]);

  const fetchExam = async () => {
    try {
      const examRes = await api.get(`/exams/${id}`);
      setExam(examRes.data.exam);
      setSebKeyInput(examRes.data.exam.sebConfigKey ?? '');
    } catch (err: any) {
      setError(err.error || 'Failed to load exam details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsRes = await api.get(`/exams/${id}/stats`);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this exam? Students will be able to access it via SEB.')) {
      return;
    }
    
    setIsPublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/publish`);
      setExam({ ...data.exam, sebGateUrl: data.sebGateUrl });
    } catch (err: any) {
      alert(err.error || 'Failed to publish exam');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this exam? It will end the session for all active students.')) {
      return;
    }
    
    try {
      const { data } = await api.post(`/exams/${id}/close`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Failed to close exam');
    }
  };

  const handleRepublish = async () => {
    if (!window.confirm('Republish this exam? Students with the existing SEB link will be able to re-enter.')) {
      return;
    }
    setIsRepublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/republish`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Cannot republish: the exam window has already closed.');
    } finally {
      setIsRepublishing(false);
    }
  };

  // Republish is allowed only while the exam window is still open
  const canRepublish = exam
    ? new Date() <= new Date(new Date(exam.endTime).getTime() + exam.windowBufferMinutes * 60 * 1000)
    : false;

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-box">Loading exam details...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="settings-page">
        <div className="loading-box">Exam not found</div>
      </div>
    );
  }

  const examStatusClass =
    exam.status === 'active'
      ? 'status-pill status-pill--danger'
      : exam.status === 'draft'
      ? 'status-pill status-pill--highlight'
      : 'status-pill status-pill--muted';

  const connectionClass =
    connectionStatus === 'connected'
      ? 'status-pill status-pill--info'
      : connectionStatus === 'connecting'
      ? 'status-pill status-pill--highlight'
      : 'status-pill status-pill--danger';

  const connectionLabel =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
      ? 'Connecting'
      : 'Disconnected';

  const backendOrigin = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
    : window.location.origin;

  const sebGateUrl = exam.sebGateUrl ?? (exam.sebExamToken ? `${backendOrigin}/seb/gate/${exam.sebExamToken}` : undefined);

  return (
    <div className="settings-page">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="page-title">{exam.title}</h2>
            <p className="panel-subtitle">{exam.description || 'No description provided'}</p>
          </div>
          <div className="card-actions">
            <span className={examStatusClass}>{exam.status}</span>
            {exam.status === 'draft' && (
              <button type="button" className="button button--danger" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? 'Publishing...' : 'Publish Exam'}
              </button>
            )}
            {exam.status === 'active' && (
              <button type="button" className="button button--outline" onClick={handleClose}>
                Close Exam
              </button>
            )}
            {exam.status === 'closed' && (
              <button type="button" className="button button--highlight" onClick={handleRepublish} disabled={isRepublishing || !canRepublish}>
                {isRepublishing ? 'Republishing...' : 'Republish Exam'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {sebGateUrl && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="panel-heading">Exam is Published</h3>
              <p className="panel-subtitle">Embed this URL in your Safe Exam Browser configuration file. Students must use this exact SEB profile.</p>
            </div>
          </div>
          <div className="card-body">
            <code className="code-box">{sebGateUrl}</code>
            <button
              type="button"
              className="button button--outline"
              onClick={() => {
                navigator.clipboard.writeText(sebGateUrl);
                alert('Copied to clipboard');
              }}
            >
              Copy URL
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="panel-heading">Safe Exam Browser Config Key</h3>
            <p className="panel-subtitle">Generate a config key in SEB and paste it here to enforce strict SEB validation.</p>
          </div>
        </div>

        {!editingSebKey ? (
          <div className="form-group">
            {exam.sebConfigKey ? (
              <div className="card card-compact">
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="form-input" style={{ flex: 1, padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {exam.sebConfigKey.substring(0, 16)}...
                  </div>
                  <button type="button" className="button button--outline" onClick={() => setEditingSebKey(true)}>
                    Update
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="button button--secondary" onClick={() => setEditingSebKey(true)}>
                Add Config Key
              </button>
            )}
          </div>
        ) : (
          <div className="form-stack">
            <div className="form-group">
              <label className="form-label" htmlFor="sebKey">
                SEB Config Key
              </label>
              <input
                id="sebKey"
                type="text"
                value={sebKeyInput}
                onChange={(e) => setSebKeyInput(e.target.value)}
                placeholder="Paste the SEB config key here..."
                className="form-input"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="button button--secondary" onClick={() => {
                setEditingSebKey(false);
                setSebKeyInput(exam.sebConfigKey ?? '');
              }}>
                Cancel
              </button>
              <button type="button" className="button button--highlight" onClick={async () => {
                try {
                  await api.patch(`/exams/${id}`, { sebConfigKey: sebKeyInput });
                  setExam((prev) => (prev ? { ...prev, sebConfigKey: sebKeyInput } : prev));
                  setEditingSebKey(false);
                  alert('SEB Config Key saved successfully');
                } catch (err: any) {
                  alert(err.error || 'Failed to save SEB Config Key');
                }
              }}>
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-grid">
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="panel-heading">Exam Settings</h3>
            </div>
            <div className="detail-panel detail-panel--split">
              <div>
                <p className="meta-text">START TIME</p>
                <p>{formatDate(exam.startTime)}</p>
              </div>
              <div>
                <p className="meta-text">DURATION</p>
                <p>{formatDuration(exam.durationMinutes)}</p>
              </div>
              <div>
                <p className="meta-text">QUESTION SOURCE</p>
                <p>{exam.questionSource === 'pdf' ? 'PDF Upload' : 'Custom Builder'}</p>
              </div>
              <div>
                <p className="meta-text">WINDOW BUFFER</p>
                <p>±{exam.windowBufferMinutes} minutes</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="panel-heading">Exam Content</h3>
              {exam.status !== 'closed' && (
                <button type="button" className="button button--outline" onClick={() => navigate(`/dashboard/exams/${exam.id}/builder`)}>
                  Manage Content
                </button>
              )}
            </div>
            <div className="card-body">
              <p className="meta-text">
                {exam.questionSource === 'pdf'
                  ? exam.pdfPath
                    ? 'PDF Question Paper Uploaded'
                    : 'No PDF Uploaded Yet'
                  : 'Questions are managed directly in the builder.'}
              </p>
            </div>
          </div>
        </div>

        <div>
          {stats && (
            <div className="card">
              <div className="card-header">
                <h3 className="panel-heading">Exam Statistics</h3>
              </div>
              <div className="detail-panel detail-panel--split">
                <div className="card card-compact">
                  <div className="card-body">
                    <p className="meta-text">Took the test</p>
                    <p className="page-title" style={{ fontSize: '2rem' }}>{stats.totalJoined}</p>
                  </div>
                </div>
                <div className="card card-compact">
                  <div className="card-body">
                    <p className="meta-text">Submitted</p>
                    <p className="page-title" style={{ fontSize: '2rem', color: '#fbbf24' }}>{stats.totalSubmitted}</p>
                  </div>
                </div>
                <div className="card card-compact">
                  <div className="card-body">
                    <p className="meta-text">Forced submit</p>
                    <p className="page-title" style={{ fontSize: '2rem', color: '#fca5a5' }}>{stats.totalForced}</p>
                  </div>
                </div>
                <div className="card card-compact">
                  <div className="card-body">
                    <p className="meta-text">Not submitted</p>
                    <p className="page-title" style={{ fontSize: '2rem', color: '#94a3b8' }}>{stats.totalNotSubmitted}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="panel-heading">Submissions</h3>
            </div>
            <div className="card-body">
              <button
                type="button"
                className="button button--highlight button-full"
                disabled={exam.status === 'draft'}
                onClick={() => navigate(`/dashboard/exams/${exam.id}/submissions`)}
              >
                View Submissions
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="panel-heading">Live Exam Room</h3>
                <p className="panel-subtitle">Real-time student presence, joins, exits, and room history.</p>
              </div>
              <span className={connectionClass}>{connectionLabel}</span>
            </div>

            {monitorError && <div className="form-error">{monitorError}</div>}

            <div className="detail-panel detail-panel--split">
              <div className="card card-compact">
                <div className="card-body">
                  <p className="meta-text">Students in room</p>
                  <p className="page-title" style={{ fontSize: '2rem' }}>{roomState.currentCount}</p>
                </div>
              </div>
              <div className="card card-compact">
                <div className="card-body">
                  <p className="meta-text">Timer sync</p>
                  <p className="page-title" style={{ fontSize: '2rem' }}>{remainingSeconds !== null ? `${remainingSeconds}s` : '—'}</p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <p className="meta-text">Connected participants</p>
              {roomState.participants.length === 0 ? (
                <p className="meta-text--small">No students have joined the exam room yet.</p>
              ) : (
                <div className="settings-grid">
                  {roomState.participants.map((participant) => (
                    <div key={participant.submissionId} className="card card-compact">
                      <div className="card-body" style={{ display: 'grid', gap: '0.75rem' }}>
                        <div className="card-actions" style={{ justifyContent: 'space-between' }}>
                          <div>
                            <p className="page-title" style={{ fontSize: '1rem', margin: 0 }}>{participant.studentName}</p>
                            <p className="meta-text--small">{participant.studentRegNumber}</p>
                          </div>
                          <span className={participant.isConnected ? 'status-pill status-pill--info' : 'status-pill status-pill--muted'}>
                            {participant.isConnected ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="detail-panel detail-panel--split">
                          <div>
                            <p className="meta-text--small">Joined</p>
                            <p className="meta-text">{formatDateTimeCompact(participant.firstJoinedAt)}</p>
                          </div>
                          <div>
                            <p className="meta-text--small">Last {participant.isConnected ? 'active' : 'seen'}</p>
                            <p className="meta-text">{formatDateTimeCompact(participant.lastSeenAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <p className="meta-text">Join / Exit log</p>
              {logs.length === 0 ? (
                <p className="meta-text--small">No activity yet. Changes appear here as students join or leave.</p>
              ) : (
                <div className="card card-compact" style={{ overflowY: 'auto', maxHeight: '18rem' }}>
                  <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                    {logs.slice(0, 10).map((event) => (
                      <div key={`${event.submissionId}-${event.timestamp}`}>
                        <div className="card-actions" style={{ justifyContent: 'space-between' }}>
                          <p className="page-title" style={{ fontSize: '0.95rem', margin: 0 }}>{event.studentName}</p>
                          <span className="meta-text--small">{event.type}</span>
                        </div>
                        <p className="meta-text--small">{event.message}</p>
                        <p className="meta-text--small">{formatDateTimeCompact(event.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


