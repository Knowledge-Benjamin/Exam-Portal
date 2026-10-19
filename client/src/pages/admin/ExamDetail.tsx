import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl, SebSettings } from '../../types';
import { formatDate, formatDuration, formatDateTimeCompact } from '../../utils/formatters';
import { useExamRoomMonitor } from '../../hooks/useExamRoomMonitor';
import { SebSettingsConfig } from '../../components/admin/SebSettingsConfig';

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
  const [editingSebSettings, setEditingSebSettings] = useState(false);
  const [sebSettingsInput, setSebSettingsInput] = useState<SebSettings>({});
  const [isSavingSebSettings, setIsSavingSebSettings] = useState(false);
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
      setSebSettingsInput(examRes.data.exam.sebSettings ?? {});
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

      {/* ── Safe Exam Browser & Software Environment Card ── */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-pill status-pill--highlight" style={{ fontSize: '0.72rem' }}>
                SAFE EXAM BROWSER
              </span>
              {exam.allowFileUpload && (
                <span className="status-pill status-pill--info" style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem' }}>
                  FILE UPLOADS ENABLED
                </span>
              )}
            </div>
            <h3 className="panel-heading" style={{ marginTop: '0.4rem' }}>
              External Applications & SEB Security Environment
            </h3>
            <p className="panel-subtitle">
              Configure allowed external applications (VS Code, Word, Excel, IDEs), multi-display restrictions, and student file attachment submissions.
            </p>
          </div>
          {!editingSebSettings && exam.status !== 'closed' && (
            <button
              type="button"
              className="button button--outline"
              onClick={() => {
                setEditingSebSettings(true);
                setSebSettingsInput(exam.sebSettings ?? {});
                setFileUploadInput(exam.allowFileUpload ?? false);
              }}
            >
              ⚙️ Configure SEB Settings
            </button>
          )}
        </div>

        {!editingSebSettings ? (
          <div className="card-body">
            <div className="detail-panel detail-panel--split">
              <div>
                <p className="meta-text">PERMITTED EXTERNAL APPLICATIONS</p>
                {exam.sebSettings?.permittedProcesses && exam.sebSettings.permittedProcesses.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.35rem' }}>
                    {exam.sebSettings.permittedProcesses.map((p) => (
                      <span
                        key={p.executable}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.35rem',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.28)',
                          fontSize: '0.8rem',
                          color: '#e0f2fe',
                        }}
                      >
                        <strong>{p.title || p.executable}</strong>
                        <code style={{ fontSize: '0.72rem', color: '#93c5fd' }}>({p.executable})</code>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.88rem' }}>
                    🔒 Standard Lock: No external software permitted (strictly locked to exam window).
                  </p>
                )}
              </div>

              <div>
                <p className="meta-text">DISPLAY ANTI-CHEAT POLICY</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#fff' }}>
                  {(exam.sebSettings?.allowedDisplays ?? 1) === 1 && (exam.sebSettings?.internalDisplayOnly ?? true) ? (
                    <span style={{ color: '#10b981' }}>
                      🔒 Single Internal Screen Only (External & duplicate displays blocked)
                    </span>
                  ) : (
                    <span style={{ color: '#fbbf24' }}>
                      🖥️ Dual / External Displays Permitted
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="meta-text">STUDENT FILE SUBMISSIONS</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#fff' }}>
                  {exam.allowFileUpload ? (
                    <span style={{ color: '#10b981' }}>
                      ✓ Allowed (Students can upload source code, Word/Excel files, or archives)
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      ✕ Disabled (Answers submitted solely via on-screen editor)
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="meta-text">ASSISTANCE & TOOLS</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#fff' }}>
                  {exam.sebSettings?.allowSpellCheck ? '✓ Spell Check On' : '✕ Spell Check Off'} ·{' '}
                  {exam.sebSettings?.allowDictionaryLookup ? '✓ Dictionary On' : '✕ Dictionary Off'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-body" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '0.5rem', padding: '1.25rem' }}>
            <SebSettingsConfig
              sebSettings={sebSettingsInput}
              allowFileUpload={fileUploadInput}
              onChangeSettings={setSebSettingsInput}
              onChangeFileUpload={setFileUploadInput}
              disabled={isSavingSebSettings}
            />

            <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="button button--secondary"
                disabled={isSavingSebSettings}
                onClick={() => {
                  setEditingSebSettings(false);
                  setSebSettingsInput(exam.sebSettings ?? {});
                  setFileUploadInput(exam.allowFileUpload ?? false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--highlight"
                disabled={isSavingSebSettings}
                onClick={async () => {
                  setIsSavingSebSettings(true);
                  try {
                    const payload = {
                      sebSettings: sebSettingsInput,
                      allowFileUpload: fileUploadInput,
                    };
                    const res = await api.patch(`/exams/${id}`, payload);
                    setExam((prev) => (prev ? { ...prev, ...res.data.exam } : prev));
                    setEditingSebSettings(false);

                    if (exam.status === 'active') {
                      if (
                        window.confirm(
                          'SEB configuration updated! Would you like to push and synchronize the updated .seb file to the Multitech Student Portal now?'
                        )
                      ) {
                        handleSyncErp();
                      }
                    } else {
                      alert('Safe Exam Browser settings updated successfully.');
                    }
                  } catch (err: any) {
                    alert(err.error || 'Failed to update SEB settings');
                  } finally {
                    setIsSavingSebSettings(false);
                  }
                }}
              >
                {isSavingSebSettings ? 'Saving...' : 'Save SEB Settings'}
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


