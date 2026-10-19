import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api';
import type { CreateExamForm } from '../../types';
import { toDatetimeLocal } from '../../utils/formatters';
import { SebSettingsConfig } from '../../components/admin/SebSettingsConfig';

export function CreateExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateExamForm>({
    title: '',
    description: '',
    erpCourseCode: '',
    questionSource: 'builder',
    startTime: toDatetimeLocal(new Date(Date.now() + 86400000).toISOString()),
    durationMinutes: 60,
    windowBufferMinutes: 5,
    allowFileUpload: false,
    assessmentType: 'final_exam',
    weightPercentage: 60,
    sebSettings: {
      allowedDisplays: 1,
      internalDisplayOnly: true,
      permittedProcesses: [],
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const erpCourseCode = params.get('erpCourseCode');
    if (erpCourseCode) {
      setFormData(prev => ({ ...prev, erpCourseCode }));
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const startTimeISO = new Date(formData.startTime).toISOString();
      const payload = { ...formData, startTime: startTimeISO };
      const { data } = await api.post('/exams', payload);
      navigate(`/dashboard/exams/${data.exam.id}`);
    } catch (err: any) {
      setError(err.error || 'Failed to create exam');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => navigate('/dashboard')}>
          DASHBOARD
        </button>
        <span>/</span>
        <button type="button" className="breadcrumb-link" onClick={() => navigate('/dashboard')}>
          EXAMS
        </button>
        <span>/</span>
        <span style={{ color: '#93c5fd' }}>CREATE</span>
      </div>

      <header className="page-header">
        <div className="page-heading-row">
          <h2 className="page-title">Create New Exam</h2>
          <div className="page-underline" />
        </div>
        <p className="page-subtitle">Configure a new secure assessment environment.</p>
      </header>

      <div className="settings-panel">
        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Exam Title
            </label>
            <input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Midterm Computer Science 101"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="erpCourseCode">
              Course Code (ERP Link)
            </label>
            <input
              id="erpCourseCode"
              required
              readOnly={!!new URLSearchParams(location.search).get('erpCourseCode')}
              value={formData.erpCourseCode}
              onChange={(e) => setFormData({ ...formData, erpCourseCode: e.target.value })}
              placeholder="e.g. CS101"
              className={`form-input ${new URLSearchParams(location.search).get('erpCourseCode') ? 'readonly-locked' : ''}`}
              style={new URLSearchParams(location.search).get('erpCourseCode') ? { backgroundColor: 'rgba(0,0,0,0.2)', cursor: 'not-allowed', color: '#94a3b8' } : {}}
            />
            {new URLSearchParams(location.search).get('erpCourseCode') && (
              <p className="panel-subtitle" style={{ color: '#10b981', marginTop: '5px' }}>
                ✓ Linked via ERP Single Sign-On
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions or information for students"
              rows={3}
              className="form-input"
            />
          </div>

          {/* Assessment Type & Grade Contribution */}
          <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', fontWeight: 700 }}>
              Assessment Classification &amp; Grade Weight
            </label>
            <p className="panel-subtitle" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              Determines whether this assessment flows into Coursework or the Final Exam component on the university transcript.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '1rem',
                borderRadius: '10px',
                border: `2px solid ${formData.assessmentType === 'final_exam' ? 'var(--color-primary, #3b82f6)' : 'rgba(255,255,255,0.1)'}`,
                background: formData.assessmentType === 'final_exam' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0,0,0,0.15)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="assessmentType"
                  value="final_exam"
                  checked={formData.assessmentType === 'final_exam'}
                  onChange={() => setFormData({ ...formData, assessmentType: 'final_exam', weightPercentage: 60 })}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#f8fafc' }}>
                    🎓 Final Examination
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '3px' }}>
                    End-of-term examination. Populates the <strong>Exam Mark</strong> component (Default: 60%).
                  </span>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '1rem',
                borderRadius: '10px',
                border: `2px solid ${formData.assessmentType === 'coursework' ? 'var(--color-primary, #3b82f6)' : 'rgba(255,255,255,0.1)'}`,
                background: formData.assessmentType === 'coursework' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0,0,0,0.15)',
                cursor: 'pointer'
              }}>
                <input
                  type="radio"
                  name="assessmentType"
                  value="coursework"
                  checked={formData.assessmentType === 'coursework'}
                  onChange={() => setFormData({ ...formData, assessmentType: 'coursework', weightPercentage: 40 })}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: '#f8fafc' }}>
                    📝 Continuous Assessment / Test (CAT)
                  </strong>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4, display: 'block', marginTop: '3px' }}>
                    Midterm test, quiz, or practical. Populates the <strong>Coursework Mark</strong> component (Default: 40%).
                  </span>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label htmlFor="weightPercentage" style={{ fontSize: '0.85rem', color: '#cbd5e1', fontWeight: 600 }}>
                Grading Weight:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  id="weightPercentage"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.weightPercentage ?? (formData.assessmentType === 'coursework' ? 40 : 60)}
                  onChange={(e) => setFormData({ ...formData, weightPercentage: parseInt(e.target.value) || 0 })}
                  className="form-input"
                  style={{ width: '80px', textAlign: 'center', padding: '6px 10px', fontWeight: 700 }}
                />
                <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.88rem' }}>% of overall course grade</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Question Source</label>
            <div className="settings-grid">
              <label
                className={`option-card ${formData.questionSource === 'builder' ? 'option-card-selected' : ''}`}
              >
                <div className="option-card__header">
                  <input
                    type="radio"
                    name="questionSource"
                    value="builder"
                    checked={formData.questionSource === 'builder'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'builder' }))}
                  />
                  <div className="option-card__title">Question Builder</div>
                </div>
                <p className="panel-subtitle">
                  Create questions directly using the interactive portal tools.
                </p>
              </label>

              <label
                className={`option-card ${formData.questionSource === 'pdf' ? 'option-card-selected' : ''}`}
              >
                <div className="option-card__header">
                  <input
                    type="radio"
                    name="questionSource"
                    value="pdf"
                    checked={formData.questionSource === 'pdf'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'pdf' }))}
                  />
                  <div className="option-card__title">Upload PDF</div>
                </div>
                <p className="panel-subtitle">
                  Upload an existing PDF document containing the questions.
                </p>
              </label>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="startTime">
                Start Date & Time
              </label>
              <input
                id="startTime"
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="durationMinutes">
                Duration (minutes)
              </label>
              <input
                id="durationMinutes"
                type="number"
                min={5}
                max={480}
                required
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                className="form-input"
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              padding: '1.25rem',
              borderRadius: '0.85rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="status-pill status-pill--highlight" style={{ fontSize: '0.72rem' }}>
                  SAFE EXAM BROWSER SETTINGS
                </span>
              </div>
              <h3 style={{ margin: '0.4rem 0 0', fontSize: '1.15rem', color: '#fff', fontWeight: 600 }}>
                External Software & Exam Security Environment
              </h3>
              <p className="panel-subtitle" style={{ margin: '0.2rem 0 0' }}>
                Configure whether this exam allows coding in VS Code, writing in Word, Excel spreadsheets, and student file attachment uploads.
              </p>
            </div>

            <SebSettingsConfig
              sebSettings={formData.sebSettings ?? { allowedDisplays: 1, internalDisplayOnly: true }}
              allowFileUpload={formData.allowFileUpload}
              onChangeSettings={(sebSettings) => setFormData((prev) => ({ ...prev, sebSettings }))}
              onChangeFileUpload={(allowFileUpload) => setFormData((prev) => ({ ...prev, allowFileUpload }))}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="button button--primary button-full">
              {isLoading ? 'Creating...' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


