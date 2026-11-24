import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api';
import type { CreateExamForm } from '../../types';
import { toDatetimeLocal } from '../../utils/formatters';
import { SebSettingsConfig } from '../../components/admin/SebSettingsConfig';

interface ErpCourse {
  id: string;
  course_code: string;
  name: string;
  credits?: number;
  programme_name?: string;
  target_year?: number;
  target_semester?: number;
}

export function CreateExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [courses, setCourses] = useState<ErpCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    let mounted = true;
    setIsLoadingCourses(true);
    api.get('/exams/erp-courses')
      .then((res) => {
        if (mounted && res.data?.courses) {
          setCourses(res.data.courses);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCourses(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const erpCourseCode = params.get('erpCourseCode');
    if (erpCourseCode) {
      setFormData(prev => ({ ...prev, erpCourseCode }));
    }
  }, [location]);

  const matchedCourse = courses.find(
    (c) => c.course_code.trim().toUpperCase() === formData.erpCourseCode.trim().toUpperCase()
  );

  const filteredCourses = courses.filter((c) => {
    const query = formData.erpCourseCode.toLowerCase();
    if (!query) return true;
    return (
      c.course_code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query) ||
      (c.programme_name && c.programme_name.toLowerCase().includes(query))
    );
  });

  const handleSelectCourse = (course: ErpCourse) => {
    setFormData((prev) => ({
      ...prev,
      erpCourseCode: course.course_code,
      title: prev.title || `${course.course_code} - ${course.name}`,
    }));
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.erpCourseCode.trim()) {
      setError('Please provide or select a course unit code');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
      };
      const { data } = await api.post('/exams', payload);
      navigate(`/dashboard/exams/${data.exam.id}/builder`);
    } catch (err: any) {
      const detailsMsg = err?.response?.data?.details?.[0]
        ? `${err.response.data.details[0].field}: ${err.response.data.details[0].message}`
        : null;
      setError(detailsMsg || err?.response?.data?.error || err?.error || 'Failed to create examination');
    } finally {
      setIsLoading(false);
    }
  };

  const isLockedFromSSO = Boolean(new URLSearchParams(location.search).get('erpCourseCode'));
  const webSystemUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5173/lecturer/courses'
    : 'https://portal.multitech.ac.ug/lecturer/courses';

  return (
    <div className="settings-page">
      <div className="breadcrumb">
        <button type="button" className="breadcrumb-link" onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
        <span>/</span>
        <span style={{ color: 'var(--color-blue)', fontWeight: 600 }}>Create Exam</span>
      </div>

      <header className="page-header" style={{ marginBottom: '1rem' }}>
        <h1 className="page-title">Create Examination</h1>
        <p className="page-subtitle">Set up course assessment and Safe Exam Browser security.</p>
      </header>

      <div className="settings-panel">
        {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="form-stack">
          {/* Course Unit Integration */}
          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="form-label" htmlFor="erpCourseCode" style={{ margin: 0 }}>
                Course Unit (Multitech ERP)
              </label>
              {isLoadingCourses && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-blue)' }}>Syncing courses...</span>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <input
                id="erpCourseCode"
                required
                readOnly={isLockedFromSSO}
                value={formData.erpCourseCode}
                onFocus={() => !isLockedFromSSO && setIsDropdownOpen(true)}
                onChange={(e) => {
                  setFormData({ ...formData, erpCourseCode: e.target.value });
                  setIsDropdownOpen(true);
                }}
                placeholder="Search by course code or name..."
                className="form-input"
                style={isLockedFromSSO ? { backgroundColor: 'var(--color-bg-alt)', cursor: 'not-allowed' } : {}}
              />
              {!isLockedFromSSO && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-faint)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  ▼
                </button>
              )}
            </div>

            {/* Course dropdown */}
            {isDropdownOpen && !isLockedFromSSO && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  zIndex: 50,
                }}
              >
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((c) => (
                    <div
                      key={c.id || c.course_code}
                      onClick={() => handleSelectCourse(c)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-alt)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.88rem' }}>
                          {c.course_code} · {c.name}
                        </span>
                        {c.credits && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-blue)', background: 'rgba(37,99,235,0.08)', padding: '1px 6px', borderRadius: '4px' }}>
                            {c.credits} Credits
                          </span>
                        )}
                      </div>
                      {c.programme_name && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {c.programme_name}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '12px 14px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    No matching ERP courses found. Custom code: <strong>{formData.erpCourseCode}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Matched course summary */}
            {matchedCourse && (
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'var(--color-success-bg)',
                  border: '1px solid var(--color-success-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.82rem' }}>
                      ✓ Verified ERP Course
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(22,163,74,0.15)', color: 'var(--color-success)', fontWeight: 600 }}>
                      {matchedCourse.course_code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-navy)', fontWeight: 600, marginTop: '2px' }}>
                    {matchedCourse.name}
                  </div>
                </div>
                <a
                  href={webSystemUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-blue)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  View in ERP ↗
                </a>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="title">
              Exam Title
            </label>
            <input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. End of Semester Examination"
              className="form-input"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Instructions for Students (optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief instructions or paper notice"
              rows={2}
              className="form-input"
            />
          </div>

          {/* Assessment Type & Grade Weight */}
          <div style={{ background: 'var(--color-bg)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <label className="form-label" style={{ marginBottom: '0.5rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              Assessment Classification
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '0.85rem',
                borderRadius: '10px',
                border: `2px solid ${formData.assessmentType === 'final_exam' ? 'var(--color-blue)' : 'var(--color-border)'}`,
                background: formData.assessmentType === 'final_exam' ? 'rgba(37,99,235,0.06)' : 'var(--color-surface)',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="assessmentType"
                  value="final_exam"
                  checked={formData.assessmentType === 'final_exam'}
                  onChange={() => setFormData({ ...formData, assessmentType: 'final_exam', weightPercentage: 60 })}
                  style={{ marginTop: '2px', accentColor: 'var(--color-blue)' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    🎓 Final Examination
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Default weight: 60% of total grade
                  </span>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '0.85rem',
                borderRadius: '10px',
                border: `2px solid ${formData.assessmentType === 'coursework' ? 'var(--color-blue)' : 'var(--color-border)'}`,
                background: formData.assessmentType === 'coursework' ? 'rgba(37,99,235,0.06)' : 'var(--color-surface)',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="assessmentType"
                  value="coursework"
                  checked={formData.assessmentType === 'coursework'}
                  onChange={() => setFormData({ ...formData, assessmentType: 'coursework', weightPercentage: 40 })}
                  style={{ marginTop: '2px', accentColor: 'var(--color-blue)' }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    📝 Continuous Assessment (CAT)
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Default weight: 40% of total grade
                  </span>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="weightPercentage" style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 600 }}>
                Weight (%):
              </label>
              <input
                id="weightPercentage"
                type="number"
                min="1"
                max="100"
                value={formData.weightPercentage ?? (formData.assessmentType === 'coursework' ? 40 : 60)}
                onChange={(e) => setFormData({ ...formData, weightPercentage: parseInt(e.target.value) || 0 })}
                className="form-input"
                style={{ width: '70px', textAlign: 'center', padding: '5px 8px', fontWeight: 700 }}
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>% of course total</span>
            </div>
          </div>

          {/* Question Source */}
          <div className="form-group">
            <label className="form-label">Format</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <label className={`option-card ${formData.questionSource === 'builder' ? 'option-card-selected' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="questionSource"
                    value="builder"
                    checked={formData.questionSource === 'builder'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'builder' }))}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    Question Builder
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Interactive questions (MCQ, short answer, essay).
                </p>
              </label>

              <label className={`option-card ${formData.questionSource === 'pdf' ? 'option-card-selected' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    name="questionSource"
                    value="pdf"
                    checked={formData.questionSource === 'pdf'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'pdf' }))}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-navy)' }}>
                    PDF Exam Paper
                  </span>
                </div>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Upload an existing PDF exam question paper.
                </p>
              </label>
            </div>
          </div>

          {/* Schedule */}
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

          {/* Safe Exam Browser Settings */}
          <div
            style={{
              marginTop: '1rem',
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <span className="status-pill status-pill--highlight" style={{ fontSize: '0.7rem' }}>
                Safe Exam Browser Environment
              </span>
            </div>

            <SebSettingsConfig
              sebSettings={formData.sebSettings ?? { allowedDisplays: 1, internalDisplayOnly: true }}
              allowFileUpload={formData.allowFileUpload}
              onChangeSettings={(sebSettings) => setFormData((prev) => ({ ...prev, sebSettings }))}
              onChangeFileUpload={(allowFileUpload) => setFormData((prev) => ({ ...prev, allowFileUpload }))}
            />
          </div>

          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="button button--primary">
              {isLoading ? 'Creating...' : 'Continue to Content Builder →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
