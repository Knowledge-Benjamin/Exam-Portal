import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { CreateExamForm } from '../../types';
import { toDatetimeLocal } from '../../utils/formatters';

export function CreateExam() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateExamForm>({
    title: '',
    description: '',
    questionSource: 'builder',
    startTime: toDatetimeLocal(new Date(Date.now() + 86400000).toISOString()),
    durationMinutes: 60,
    windowBufferMinutes: 5,
  });

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


