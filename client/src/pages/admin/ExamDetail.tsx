import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl, SebSettings } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';
import { SebSettingsConfig } from '../../components/admin/SebSettingsConfig';
import { ExamWorkspaceNav } from '../../components/admin/ExamWorkspaceNav';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconLock,
  IconMonitor,
  IconRefresh,
} from '../../components/ui/Icons';

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
    if (
      !window.confirm(
        'Regenerate SEB security token? Students must re-download their .seb configuration file.',
      )
    )
      return;
    setIsRegenerating(true);
    try {
      const { data } = await api.post(`/exams/${id}/regenerate-token`);
      setExam((prev) =>
        prev ? { ...prev, sebGateUrl: data.sebGateUrl, sebExamToken: data.sebExamToken } : prev,
      );
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
      if (res.data.sebSynced) {
        alert(
          'Settings saved and .seb configuration updated. Students joining should use the newly generated .seb file.',
        );
      } else {
        alert('SEB settings saved successfully.');
      }
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
        <p className="dash-loading-text">Loading assessment details...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="settings-page">
        <div className="dash-empty-box">
          <h3 className="dash-empty-title">Assessment Not Found</h3>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const canRepublish = exam.status === 'closed' && ((exam as any).remainingRepublishes ?? 1) > 0;

  const backendOrigin = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '')
    : window.location.origin;

  const sebGateUrl =
    exam.sebGateUrl ??
    (exam.sebExamToken ? `${backendOrigin}/seb/gate/${exam.sebExamToken}` : undefined);

  const primaryAction = (
    <>
      {exam.status === 'draft' && (
        <button
          type="button"
          className="button button--primary"
          onClick={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? 'Publishing...' : 'Publish Exam'}
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
    </>
  );

  return (
    <div className="settings-page">
      <ExamWorkspaceNav
        examId={exam.id}
        title={exam.title}
        courseCode={exam.erpCourseCode || 'General'}
        status={exam.status}
        assessmentType={exam.assessmentType}
        submittedCount={stats?.totalSubmitted}
        actions={primaryAction}
      />

      {exam.description && <p className="panel-subtitle" style={{ marginTop: '-0.5rem' }}>{exam.description}</p>}

      {error && <div className="dash-alert dash-alert-error">{error}</div>}

      {/* Concise Live Sync Strip */}
      {exam.status === 'active' && (
        <div className="live-sync-strip">
          <div>
            <div className="live-sync-title">
              <span className="status-live-dot" />
              <span>Published to Multitech Student Portal</span>
            </div>
            <p className="live-sync-desc">
              Students can generate their 6-digit PIN from the portal or launch the .seb configuration file directly.
            </p>
          </div>
          <div className="live-sync-actions">
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={handleSyncErp}
              disabled={isSyncingErp}
            >
              <IconRefresh size={14} />
              <span>{isSyncingErp ? 'Syncing...' : 'Re-sync Portal'}</span>
            </button>
            <button
              type="button"
              className="button button--secondary button--sm"
              onClick={handleDownloadSeb}
            >
              <IconDownload size={14} />
              <span>Download .seb</span>
            </button>
          </div>
        </div>
      )}

      {/* Overview Stat Grid */}
      <div className="dash-stats-grid">
        <div className="dash-stat-tile">
          <span className="dash-stat-label">Schedule</span>
          <div className="detail-metric-text">{formatDate(exam.startTime)}</div>
          <span className="dash-stat-hint">Duration: {formatDuration(exam.durationMinutes)}</span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Format</span>
          <div className="detail-metric-text">
            {exam.questionSource === 'pdf' ? 'PDF Question Paper' : 'Question Builder'}
          </div>
          <span className="dash-stat-hint">
            {exam.allowFileUpload ? 'File Uploads Enabled' : 'No File Attachments'}
          </span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Grading Weight</span>
          <div className="dash-stat-number text-blue">
            {exam.weightPercentage ?? (exam.assessmentType === 'coursework' ? 40 : 60)}%
          </div>
          <span className="dash-stat-hint">
            {exam.assessmentType === 'coursework' ? 'Coursework Score' : 'Final Exam Score'}
          </span>
        </div>

        <div className="dash-stat-tile">
          <span className="dash-stat-label">Submissions</span>
          <div className="dash-stat-number">{stats?.totalSubmitted ?? 0}</div>
          <span className="dash-stat-hint">{stats?.totalJoined ?? 0} students joined</span>
        </div>
      </div>

      {/* Safe Exam Browser Configuration Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Security &amp; Environment Settings</h3>
            <p className="panel-subtitle">
              Permitted local applications, file upload policy, and screen restrictions.
            </p>
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

        <div className="card-body">
          {editingSebSettings ? (
            <div>
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
            <div className="detail-settings-list">
              <div className="detail-setting-row">
                <span className="detail-setting-key">Whitelisted Apps</span>
                <div className="detail-setting-val">
                  {(exam.sebSettings?.permittedProcesses?.length ?? 0) > 0 ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {exam.sebSettings?.permittedProcesses?.map((p) => (
                        <span key={p.executable} className="dash-course-pill">
                          {p.title || p.executable}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">None (Browser Only)</span>
                  )}
                </div>
              </div>

              <div className="detail-setting-row">
                <span className="detail-setting-key">Display Policy</span>
                <span className="detail-setting-val detail-setting-icon-val">
                  {exam.sebSettings?.allowedDisplays === 1 && exam.sebSettings?.internalDisplayOnly ? (
                    <>
                      <IconLock size={14} />
                      <span>Single Internal Screen (Strict)</span>
                    </>
                  ) : (
                    <>
                      <IconMonitor size={14} />
                      <span>External / Dual Monitors Permitted</span>
                    </>
                  )}
                </span>
              </div>

              <div className="detail-setting-row">
                <span className="detail-setting-key">Student File Uploads</span>
                <span
                  className="detail-setting-val detail-setting-icon-val"
                  style={{
                    color: exam.allowFileUpload ? 'var(--color-success)' : 'var(--color-text-muted)',
                    fontWeight: 600,
                  }}
                >
                  {exam.allowFileUpload ? (
                    <>
                      <IconCheck size={14} />
                      <span>Enabled</span>
                    </>
                  ) : (
                    <span>Disabled</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advanced SEB Gateway URL Section */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvancedSeb(!showAdvancedSeb)}
          className="button button--ghost button--sm"
        >
          {showAdvancedSeb ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
          <span>{showAdvancedSeb ? 'Hide Gateway Details' : 'SEB Gateway Details'}</span>
        </button>
      </div>

      {showAdvancedSeb && sebGateUrl && (
        <div className="card">
          <div className="card-header">
            <div>
              <h4 className="card-title">SEB Gateway Connection URL</h4>
              <p className="panel-subtitle">Embedded inside student .seb launch configurations.</p>
            </div>
          </div>
          <div className="card-body">
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
