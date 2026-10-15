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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSyncingErp, setIsSyncingErp] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showAdvancedSeb, setShowAdvancedSeb] = useState(false);
  const [editingSebKey, setEditingSebKey] = useState(false);
  const [sebKeyInput, setSebKeyInput] = useState('');
  const [editingFileUpload, setEditingFileUpload] = useState(false);
  const [fileUploadInput, setFileUploadInput] = useState(false);
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
      setFileUploadInput(examRes.data.exam.allowFileUpload ?? false);
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
    if (!window.confirm('Are you sure you want to publish this exam? It will be synchronized with the Multitech Student Portal and students will be able to download the Safe Exam Browser file.')) {
      return;
    }
    
    setIsPublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/publish`);
      setExam({ ...data.exam, sebGateUrl: data.sebGateUrl });
      alert(data.message || 'Exam successfully published and synchronized with Multitech ERP!');
    } catch (err: any) {
      alert(err.error || 'Failed to publish exam');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSyncErp = async () => {
    setIsSyncingErp(true);
    setSyncFeedback(null);
    try {
      const res = await api.post(`/exams/${id}/generate-seb`);
      const msg = res.data?.message || 'SEB file successfully generated and pushed to Multitech Web System! Students can now download it from their student portal.';
      setSyncFeedback(msg);
      alert(msg);
    } catch (err: any) {
      alert(err.error || 'Failed to sync with Multitech ERP.');
    } finally {
      setIsSyncingErp(false);
    }
  };

  const handleDownloadSeb = async () => {
    try {
      const { data } = await api.post(`/exams/${id}/generate-seb`);
      if (data.sebFileBase64) {
        const byteCharacters = atob(data.sebFileBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/seb' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = data.filename || `${exam?.title?.replace(/[^a-z0-9]/gi, '_') || 'exam'}.seb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      alert(err.error || 'Failed to download SEB file.');
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

  const handleRegenerateToken = async () => {
    if (!window.confirm('Are you sure you want to regenerate the exam link? The old link will immediately stop working.')) {
      return;
    }
    
    setIsRegenerating(true);
    try {
      const { data } = await api.post(`/exams/${id}/regenerate-token`);
      setExam({ ...data.exam, sebGateUrl: data.sebGateUrl });
      alert('New link generated successfully!');
    } catch (err: any) {
      alert(err.error || 'Failed to regenerate exam link');
    } finally {
      setIsRegenerating(false);
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

      {exam.status === 'active' && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-pill status-pill--info" style={{ background: '#10b981', color: '#fff' }}>LIVE ON STUDENT PORTAL</span>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Course Code: <strong>{exam.erpCourseCode}</strong></span>
              </div>
              <h3 className="panel-heading" style={{ marginTop: '0.5rem' }}>Exam is Active & Ready for Students</h3>
              <p className="panel-subtitle">
                Students registered for <strong>{exam.erpCourseCode}</strong> can log into their Multitech Student Portal &rarr; Online Exams, generate their 6-digit PIN, and download the Safe Exam Browser configuration to begin.
              </p>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                className="button button--highlight"
                onClick={handleSyncErp}
                disabled={isSyncingErp}
              >
                {isSyncingErp ? 'Pushing to Student Portal...' : '⚡ Push / Sync to Student Portal'}
              </button>
              <button
                type="button"
                className="button button--outline"
                onClick={handleDownloadSeb}
              >
                Download .seb File (Test as Student)
              </button>
              <a
                href="https://multitech-bussiness-school.onrender.com/lecturer/courses"
                target="_blank"
                rel="noreferrer"
                className="button button--secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                Return to Multitech ERP ↗
              </a>
            </div>
            {syncFeedback && (
              <p style={{ marginTop: '0.75rem', color: '#10b981', fontSize: '0.9rem', fontWeight: 500 }}>
                ✓ {syncFeedback}
              </p>
            )}
          </div>
        </div>
      )}

      {exam.status === 'draft' && (
        <div className="card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
          <div className="card-header">
            <div>
              <span className="status-pill status-pill--highlight">DRAFT MODE</span>
              <h3 className="panel-heading" style={{ marginTop: '0.5rem' }}>Draft Exam Setup</h3>
              <p className="panel-subtitle">
                Add your exam questions (or upload your PDF exam paper), verify your schedule and duration, then click <strong>"Publish Exam"</strong> above. Publishing will automatically synchronize the exam with the Multitech Student Portal.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ margin: '1rem 0' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedSeb(!showAdvancedSeb)}
          className="button button--ghost"
          style={{ fontSize: '0.85rem', color: '#94a3b8' }}
        >
          {showAdvancedSeb ? '▲ Hide Advanced SEB Security Details' : '▼ Show Advanced SEB Security Details'}
        </button>
      </div>

      {showAdvancedSeb && (
        <div className="card" style={{ opacity: 0.95 }}>
          <div className="card-header">
            <div>
              <h3 className="panel-heading">Advanced: SEB Gateway & Custom Config Key</h3>
              <p className="panel-subtitle">The portal automatically packages and embeds these security parameters into the student's .seb download file. No manual configuration is required.</p>
            </div>
          </div>
          <div className="card-body">
            {sebGateUrl && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="meta-text--small">DIRECT SEB GATEWAY URL</p>
                <code className="code-box">{sebGateUrl}</code>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
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
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleRegenerateToken}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? 'Regenerating...' : 'Regenerate Link'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <p className="meta-text--small">MANUAL SEB CONFIG KEY OVERRIDE</p>
              {!editingSebKey ? (
                <div className="form-group">
                  {exam.sebConfigKey ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="form-input" style={{ flex: 1, padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {exam.sebConfigKey.substring(0, 24)}...
                      </div>
                      <button type="button" className="button button--outline" onClick={() => setEditingSebKey(true)}>
                        Update
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="button button--secondary" onClick={() => setEditingSebKey(true)}>
                      Add Custom Key
                    </button>
                  )}
                </div>
              ) : (
                <div className="form-stack">
                  <div className="form-group">
                    <input
                      id="sebKey"
                      type="text"
                      value={sebKeyInput}
                      onChange={(e) => setSebKeyInput(e.target.value)}
                      placeholder="Paste custom SEB config key here..."
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
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="panel-heading">File Submissions</h3>
            <p className="panel-subtitle">Allow students to submit file attachments with their exam submission.</p>
          </div>
        </div>

        {!editingFileUpload ? (
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
              <div style={{ flex: 1 }}>
                <p className="panel-subtitle">Students can upload files: <strong>{exam.allowFileUpload ? 'Yes' : 'No'}</strong></p>
              </div>
              <button type="button" className="button button--outline" onClick={() => {
                setEditingFileUpload(true);
                setFileUploadInput(exam.allowFileUpload ?? false);
              }}>
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="form-stack">
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '1rem' }}>
              <input
                id="allowFileUpload"
                type="checkbox"
                checked={fileUploadInput}
                onChange={(e) => setFileUploadInput(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <label className="form-label" htmlFor="allowFileUpload" style={{ margin: 0, cursor: 'pointer' }}>
                Allow file submissions
              </label>
            </div>
            <div className="form-actions" style={{ padding: '0 1rem' }}>
              <button type="button" className="button button--secondary" onClick={() => {
                setEditingFileUpload(false);
              }}>
                Cancel
              </button>
              <button type="button" className="button button--highlight" onClick={async () => {
                try {
                  await api.patch(`/exams/${id}`, { allowFileUpload: fileUploadInput });
                  setExam((prev) => (prev ? { ...prev, allowFileUpload: fileUploadInput } : prev));
                  setEditingFileUpload(false);
                  alert('File submission setting updated successfully');
                } catch (err: any) {
                  alert(err.error || 'Failed to update file submission setting');
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
              <div>
                <p className="meta-text">FILE SUBMISSIONS</p>
                <p>{exam.allowFileUpload ? 'Allowed' : 'Not Allowed'}</p>
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


