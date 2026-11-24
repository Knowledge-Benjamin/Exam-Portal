import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../api';
import type { CreateExamForm } from '../../types';
import { toDatetimeLocal } from '../../utils/formatters';
import { SebSettingsConfig } from '../../components/admin/SebSettingsConfig';
import {
  IconAcademic,
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconExternal,
  IconFileText,
} from '../../components/ui/Icons';

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
    api
      .get('/exams/erp-courses')
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
      setFormData((prev) => ({ ...prev, erpCourseCode }));
    }
  }, [location]);

  const matchedCourse = courses.find(
    (c) => c.course_code.trim().toUpperCase() === formData.erpCourseCode.trim().toUpperCase(),
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
      setError('Please provide or select a course unit code.');
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
      setError(
        detailsMsg || err?.response?.data?.error || err?.error || 'Failed to create examination',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isLockedFromSSO = Boolean(new URLSearchParams(location.search).get('erpCourseCode'));
  const webSystemUrl =
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:5173/lecturer/courses'
      : 'https://portal.multitech.ac.ug/lecturer/courses';

  return (
    <div className="create-exam-shell">
      <div className="exam-ws-top" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="exam-ws-back" onClick={() => navigate('/dashboard')}>
          <IconChevronLeft size={15} />
          <span>Assessments</span>
        </button>
        <span className="exam-ws-sep">/</span>
        <span className="exam-ws-code">New Assessment</span>
      </div>

      <header className="create-exam-header">
        <h1 className="page-title">Create Assessment</h1>
        <p className="panel-subtitle">
          Configure course details, timing, and Safe Exam Browser restrictions.
        </p>
      </header>

      {error && (
        <div className="dash-alert dash-alert-error" role="alert">
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-exam-sections">
        {/* Section 1: Course & Identity */}
        <section className="card create-section">
          <div className="create-section-head">
            <h2 className="create-section-title">Course &amp; Identity</h2>
            <p className="create-section-desc">Link to a Multitech course unit and set the paper title.</p>
          </div>

          <div className="form-group" ref={dropdownRef} style={{ position: 'relative' }}>
            <div className="form-label-row">
              <label className="form-label" htmlFor="erpCourseCode">
                Course Unit
              </label>
              {isLoadingCourses && (
                <span className="form-hint-inline">Syncing catalog...</span>
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
                style={
                  isLockedFromSSO
                    ? { backgroundColor: 'var(--color-bg-alt)', cursor: 'not-allowed' }
                    : { paddingRight: '2.25rem' }
                }
              />
              {!isLockedFromSSO && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="input-chevron-btn"
                  aria-label="Toggle course list"
                >
                  <IconChevronDown size={15} />
                </button>
              )}
            </div>

            {isDropdownOpen && !isLockedFromSSO && (
              <div className="course-dropdown">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((c) => (
                    <div
                      key={c.id || c.course_code}
                      onClick={() => handleSelectCourse(c)}
                      className="course-dropdown-item"
                    >
                      <div className="course-dropdown-top">
                        <span className="course-dropdown-name">
                          {c.course_code} &middot; {c.name}
                        </span>
                        {c.credits && (
                          <span className="dash-assessment-pill">{c.credits} Credits</span>
                        )}
                      </div>
                      {c.programme_name && (
                        <p className="course-dropdown-prog">{c.programme_name}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="course-dropdown-empty">
                    No matching catalog course. Custom code: <strong>{formData.erpCourseCode}</strong>
                  </div>
                )}
              </div>
            )}

            {matchedCourse && (
              <div className="verified-course-banner">
                <div style={{ minWidth: 0 }}>
                  <div className="verified-course-badge">
                    <IconCheck size={14} />
                    <span>Verified ERP Course</span>
                    <span className="dash-course-pill">{matchedCourse.course_code}</span>
                  </div>
                  <div className="verified-course-name">{matchedCourse.name}</div>
                </div>
                <a
                  href={webSystemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="verified-course-link"
                >
                  <span>Open in ERP</span>
                  <IconExternal size={13} />
                </a>
              </div>
            )}
          </div>

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

          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Candidate Instructions <span className="label-optional">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief instructions or paper notice shown to students"
              rows={2}
              className="form-textarea"
            />
          </div>
        </section>

        {/* Section 2: Classification & Format */}
        <section className="card create-section">
          <div className="create-section-head">
            <h2 className="create-section-title">Classification &amp; Format</h2>
            <p className="create-section-desc">Set grade weighting and choose how questions are delivered.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Assessment Type</label>
            <div className="seb-two-col">
              <label
                className={`option-card ${
                  formData.assessmentType === 'final_exam' ? 'option-card-selected' : ''
                }`}
              >
                <div className="option-card-top">
                  <input
                    type="radio"
                    name="assessmentType"
                    value="final_exam"
                    checked={formData.assessmentType === 'final_exam'}
                    onChange={() =>
                      setFormData({ ...formData, assessmentType: 'final_exam', weightPercentage: 60 })
                    }
                  />
                  <IconAcademic size={15} className="option-card-icon" />
                  <span className="option-card-label">Final Examination</span>
                </div>
                <p className="option-card-desc">Default weight: 60% of total course grade.</p>
              </label>

              <label
                className={`option-card ${
                  formData.assessmentType === 'coursework' ? 'option-card-selected' : ''
                }`}
              >
                <div className="option-card-top">
                  <input
                    type="radio"
                    name="assessmentType"
                    value="coursework"
                    checked={formData.assessmentType === 'coursework'}
                    onChange={() =>
                      setFormData({ ...formData, assessmentType: 'coursework', weightPercentage: 40 })
                    }
                  />
                  <IconFileText size={15} className="option-card-icon" />
                  <span className="option-card-label">Continuous Assessment (CAT)</span>
                </div>
                <p className="option-card-desc">Default weight: 40% of total course grade.</p>
              </label>
            </div>

            <div className="weight-row">
              <label htmlFor="weightPercentage" className="form-label" style={{ margin: 0 }}>
                Grading Weight
              </label>
              <div className="weight-input-wrap">
                <input
                  id="weightPercentage"
                  type="number"
                  min="1"
                  max="100"
                  value={
                    formData.weightPercentage ?? (formData.assessmentType === 'coursework' ? 40 : 60)
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, weightPercentage: parseInt(e.target.value, 10) || 0 })
                  }
                  className="form-input weight-input"
                />
                <span className="weight-suffix">% of course total</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Question Delivery</label>
            <div className="seb-two-col">
              <label
                className={`option-card ${
                  formData.questionSource === 'builder' ? 'option-card-selected' : ''
                }`}
              >
                <div className="option-card-top">
                  <input
                    type="radio"
                    name="questionSource"
                    value="builder"
                    checked={formData.questionSource === 'builder'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'builder' }))}
                  />
                  <span className="option-card-label">Question Builder</span>
                </div>
                <p className="option-card-desc">
                  Author interactive MCQ, short answer, and essay prompts directly.
                </p>
              </label>

              <label
                className={`option-card ${
                  formData.questionSource === 'pdf' ? 'option-card-selected' : ''
                }`}
              >
                <div className="option-card-top">
                  <input
                    type="radio"
                    name="questionSource"
                    value="pdf"
                    checked={formData.questionSource === 'pdf'}
                    onChange={() => setFormData((prev) => ({ ...prev, questionSource: 'pdf' }))}
                  />
                  <span className="option-card-label">PDF Question Paper</span>
                </div>
                <p className="option-card-desc">
                  Upload a PDF question paper alongside a rich-text answer sheet.
                </p>
              </label>
            </div>
          </div>
        </section>

        {/* Section 3: Schedule */}
        <section className="card create-section">
          <div className="create-section-head">
            <h2 className="create-section-title">Schedule &amp; Timing</h2>
            <p className="create-section-desc">Define when the session opens and the exam duration.</p>
          </div>

          <div className="seb-two-col">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="startTime">
                Start Date &amp; Time
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

            <div className="form-group" style={{ marginBottom: 0 }}>
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
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) || 60 })
                }
                className="form-input"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Safe Exam Browser */}
        <section className="card create-section">
          <div className="create-section-head">
            <h2 className="create-section-title">Safe Exam Browser Environment</h2>
            <p className="create-section-desc">
              Configure allowed local apps, file uploads, and hardware lock policies.
            </p>
          </div>

          <SebSettingsConfig
            sebSettings={formData.sebSettings ?? { allowedDisplays: 1, internalDisplayOnly: true }}
            allowFileUpload={formData.allowFileUpload}
            onChangeSettings={(sebSettings) => setFormData((prev) => ({ ...prev, sebSettings }))}
            onChangeFileUpload={(allowFileUpload) =>
              setFormData((prev) => ({ ...prev, allowFileUpload }))
            }
          />
        </section>

        <div className="create-exam-footer">
          <button type="button" className="button button--secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="button button--primary">
            {isLoading ? 'Creating...' : 'Save & Continue to Questions'}
          </button>
        </div>
      </form>
    </div>
  );
}
