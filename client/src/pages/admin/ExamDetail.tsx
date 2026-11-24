import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl, SebSettings } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';
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
  const [showAdvancedSeb, setShowAdvancedSeb] = useState(false);
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

  useEffect(() => {
    fetchExam();
    fetchStats();
  }, [id]);

  const fetchExam = async () => {
    try {
      const examRes = await api.get(`/exams/${id}`);
      setExam(examRes.data.exam);
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
    if (!window.confirm('Publish this exam to the Multitech Student Portal?')) {
      return;
    }
    
    setIsPublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/publish`);
      setExam({ ...data.exam, sebGateUrl: data.sebGateUrl });
      alert(data.message || 'Exam successfully published!');
    } catch (err: any) {
      alert(err.error || 'Failed to publish exam');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSyncErp = async () => {
    setIsSyncingErp(true);
    try {
      const res = await api.post(`/exams/${id}/generate-seb`);
      const msg = res.data?.message || 'SEB configuration pushed to Multitech Student Portal!';
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
        const blob = new Blob([byteArray], { type: 'application/x-safeexambrowser' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${exam?.erpCourseCode || 'Exam'}_Assessment.seb`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert('Failed to download .seb file');
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this exam?')) return;
    try {
      const { data } = await api.patch(`/exams/${id}/close`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Failed to close exam');
    }
  };

  const handleRepublish = async () => {
    if (!window.confirm('Republish this exam?')) return;
    setIsRepublishing(true);
    try {
      const { data } = await api.patch(`/exams/${id}/republish`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Failed to republish exam');
    } finally {
      setIsRepublishing(false);
    }
  };

  const handleRegenerateToken = async () => {
    if (!window.confirm('Regenerate SEB security token? Students must re-download their .seb configuration file.')) return;
    setIsRegenerating(true);
    try {
      const { data } = await api.post(`/exams/${id}/regenerate-token`);
      setExam((prev) => (prev ? { ...prev, sebGateUrl: data.sebGateUrl, sebExamToken: data.sebExamToken } : prev));
      alert('Token regenerated successfully.');
    } catch (err: any) {
      alert(err.error || 'Failed to regenerate token');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveSebSettings = async () => {
    setIsSavingSebSettings(true);
    try {
      const res = await api.patch(`/exams/${id}`, {
        sebSettings: sebSettingsInput,
        allowFileUpload: fileUploadInput,
      });
      setExam((prev) => (prev ? { ...prev, ...res.data.exam } : prev));
      setEditingSebSettings(false);
      alert('SEB settings saved successfully.');
    } catch (err: any) {
      alert(err.error || 'Failed to save SEB settings');
    } finally {
      setIsSavingSebSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="dash-loading-container">
        <div className="spinner" />
        <p className="dash-loading-text">Loading examination details...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="settings-page">
        <div className="dash-empty-box">
          <h3 className="dash-empty-title">Exam Not Found</h3>
          <button type="button" className="button button--secondary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const examStatusClass =
    exam.status === 'active'
      ? 'dash-status-pill status-live'
      : exam.status === 'draft'
      ? 'dash-status-pill status-draft'
      : 'dash-status-pill status-closed';

  const canRepublish = exam.status === 'closed' && ((exam as any).remainingRepublishes ?? 1) > 0;

  const backendOrigin = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
    : window.location.origin;

  const sebGateUrl = exam.sebGateUrl ?? (exam.sebExamToken ? `${backendOrigin}/seb/gate/${exam.sebExamToken}` : undefined);

  return (
    <div className="settings-page">
      {/* Breadcrumb & Navigation */}
      <div className="breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
        <span>/</span>
        <span style={{ color: 'var(--color-blue)', fontWeight: 600 }}>{exam.erpCourseCode || 'Exam'}</span>
      </div>

      {/* Main Header Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span className="dash-course-pill">{exam.erpCourseCode || 'General'}</span>
              <span className="dash-assessment-pill">
                {exam.assessmentType === 'coursework' ? 'Continuous Assessment (CAT)' : 'Final Exam'}
              </span>
              <span className={examStatusClass}>
                {exam.status === 'active' && <span className="status-live-dot" />}
                {exam.status}
              </span>
            </div>
            <h1 className="page-title" style={{ marginTop: '0.25rem' }}>{exam.title}</h1>
            {exam.description && <p className="panel-subtitle" style={{ marginTop: '0.25rem' }}>{exam.description}</p>}
          </div>

          <div className="card-actions">
            {exam.status !== 'active' && (
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigate(`/dashboard/exams/${id}/builder`)}
              >
                ✏ Edit Questions
              </button>
            )}

            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigate(`/dashboard/exams/${id}/monitor`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
            >
              🔴 Live Monitor
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigate(`/dashboard/exams/${id}/submissions`)}
            >
              📋 Submissions {stats ? `(${stats.totalSubmitted})` : ''}
            </button>

            {exam.status === 'draft' && (
              <button
                type="button"
                className="button button--primary"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? 'Publishing...' : '🚀 Publish Exam'}
              </button>
            )}

            {exam.status === 'active' && (
              <button type="button" className="button button--danger" onClick={handleClose}>
                Close Exam
              </button>
            )}

            {exam.status === 'closed' && (
              <button
                type="button"
                className="button button--primary"
                onClick={handleRepublish}
                disabled={isRepublishing || !canRepublish}
              >
                {isRepublishing ? 'Republishing...' : 'Republish'}
              </button>
            )}
          </div>
        </div>

        {/* Live Status Banner */}
        {exam.status === 'active' && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="status-live-dot" />
                <strong style={{ color: 'var(--color-success)', fontSize: '0.88rem' }}>Live on Multitech Student Portal</strong>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Registered students can generate their 6-digit PIN and join via Safe Exam Browser.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="button button--primary"
                onClick={() => navigate(`/dashboard/exams/${id}/monitor`)}
                style={{
                  background: '#059669',
                  borderColor: '#047857',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.45rem 0.9rem',
                }}
              >
                🔴 Open Live Room Monitor
              </button>
              <button
                type="button"
                className="btn-card-secondary"
                onClick={handleSyncErp}
                disabled={isSyncingErp}
              >
                {isSyncingErp ? 'Syncing...' : '⚡ Re-sync to Portal'}
              </button>
              <button
                type="button"
                className="btn-card-secondary"
                onClick={handleDownloadSeb}
              >
                📥 Test .seb File
              </button>
            </div>
          </div>
        )}

        {error && <div className="form-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {/* Overview Stat Grid */}
      <div className="dash-stats-grid">
        <div className="dash-stat-tile">
          <span className="dash-stat-label">Schedule</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: '0.35rem' }}>
            {formatDate(exam.startTime)}
          </div>
          <span className="dash-stat-hint">Duration: {formatDuration(exam.durationMinutes)}</span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Format</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: '0.35rem' }}>
            {exam.questionSource === 'pdf' ? 'PDF Question Paper' : 'Question Builder'}
          </div>
          <span className="dash-stat-hint">{exam.allowFileUpload ? 'File Uploads Enabled' : 'No File Attachments'}</span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Grading Weight</span>
          <div className="dash-stat-number text-blue" style={{ fontSize: '2rem' }}>
            {exam.weightPercentage ?? (exam.assessmentType === 'coursework' ? 40 : 60)}%
          </div>
          <span className="dash-stat-hint">{exam.assessmentType === 'coursework' ? 'Coursework Score' : 'Final Exam Score'}</span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Submissions</span>
          <div className="dash-stat-number" style={{ fontSize: '2rem' }}>
            {stats?.totalSubmitted ?? 0}
          </div>
          <span className="dash-stat-hint">{stats?.totalJoined ?? 0} students joined</span>
        </div>
      </div>

      {/* Safe Exam Browser Configuration Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="section-panel__title" style={{ margin: 0 }}>Security & Environment Settings</h3>
            <p className="panel-subtitle">Permitted applications, screen restriction, and Safe Exam Browser key.</p>
          </div>
          {!editingSebSettings && exam.status !== 'closed' && (
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={() => setEditingSebSettings(true)}
            >
              Configure Settings
            </button>
          )}
        </div>

        {editingSebSettings ? (
          <div style={{ marginTop: '1rem' }}>
            <SebSettingsConfig
              sebSettings={sebSettingsInput}
              allowFileUpload={fileUploadInput}
              onChangeSettings={setSebSettingsInput}
              onChangeFileUpload={setFileUploadInput}
            />
            <div className="form-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setEditingSebSettings(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={handleSaveSebSettings}
                disabled={isSavingSebSettings}
              >
                {isSavingSebSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>Whitelisted Apps:</span>
              {(exam.sebSettings?.permittedProcesses?.length ?? 0) > 0 ? (
                exam.sebSettings?.permittedProcesses?.map((p) => (
                  <span key={p.executable} className="dash-course-pill" style={{ fontSize: '0.75rem' }}>
                    {p.title || p.executable}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>None (Browser Only)</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>Display Policy:</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {exam.sebSettings?.allowedDisplays === 1 && exam.sebSettings?.internalDisplayOnly
                  ? '🔒 Single Internal Screen (Strict Anti-Cheat)'
                  : '🖥️ External / Dual Monitors Permitted'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)' }}>Student File Uploads:</span>
              <span style={{ fontSize: '0.82rem', color: exam.allowFileUpload ? 'var(--color-success)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                {exam.allowFileUpload ? '✓ Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Advanced SEB Gateway URL Section */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedSeb(!showAdvancedSeb)}
          className="button button--ghost button--sm"
        >
          {showAdvancedSeb ? '▲ Hide Advanced Connection Details' : '▼ Advanced SEB Gateway Details'}
        </button>
      </div>

      {showAdvancedSeb && sebGateUrl && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                SEB Gateway Connection URL
              </h4>
              <p className="panel-subtitle">This URL is embedded in student .seb launch files.</p>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <code className="code-box">{sebGateUrl}</code>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={() => {
                  navigator.clipboard.writeText(sebGateUrl);
                  alert('URL copied to clipboard');
                }}
              >
                Copy URL
              </button>
              <button
                type="button"
                className="button button--secondary button--sm"
                onClick={handleRegenerateToken}
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Regenerating...' : 'Regenerate Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
