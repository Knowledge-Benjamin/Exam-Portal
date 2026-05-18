import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { Question, QuestionType, Exam } from '../../types';
import { QUESTION_TYPE_LABELS } from '../../utils/constants';

export function ExamBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSebKey, setEditingSebKey] = useState(false);
  const [sebKeyInput, setSebKeyInput] = useState('');

  // New question form
  const [showForm, setShowForm] = useState(false);
  const [qType, setQType] = useState<QuestionType>('short_answer');
  const [qPrompt, setQPrompt] = useState('');
  const [qMarks, setQMarks] = useState(1);
  const [qOptions, setQOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (exam) setSebKeyInput(exam.sebConfigKey ?? '');
  }, [exam]);

  const fetchData = async () => {
    try {
      const [examRes, qRes] = await Promise.all([
        api.get(`/exams/${id}`),
        api.get(`/exams/${id}/questions`),
      ]);
      setExam(examRes.data.exam);
      setQuestions(qRes.data.questions);
    } catch (err: any) {
      alert('Failed to load builder data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File must be smaller than 10MB');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      await api.post(`/exams/${id}/pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('PDF uploaded successfully');
      fetchData();
    } catch (err: any) {
      alert(err.error || 'Failed to upload PDF');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        type: qType,
        prompt: qPrompt,
        marks: qMarks,
        options: qType === 'multiple_choice' ? qOptions.filter((o) => o.trim() !== '') : undefined,
      };

      const { data } = await api.post(`/exams/${id}/questions`, payload);
      setQuestions([...questions, data.question]);

      setQPrompt('');
      setQMarks(1);
      setQOptions(['', '']);
      setShowForm(false);
    } catch (err: any) {
      alert(err.error || 'Failed to add question');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/exams/${id}/questions/${qId}`);
      setQuestions(questions.filter((q) => q.id !== qId));
    } catch (err: any) {
      alert(err.error || 'Failed to delete question');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="loading-box">Loading builder data...</div>
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

  const isExamClosed = exam.status === 'closed';

  return (
    <div className="settings-page">
      <div className="page-header">
        <button type="button" onClick={() => navigate(`/dashboard/exams/${id}`)} className="button button--link">
          ← Back to Exam
        </button>

        <div className="page-title-row">
          <div>
            <h1 className="page-title">Content Builder</h1>
            <p className="section-copy">{exam.title}</p>
          </div>
        </div>
      </div>

      {isExamClosed && (
        <div className="card card-compact">
          <div className="card-body">
            <p className="text-warning">
              This exam is closed. You cannot modify its content.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="panel-heading">Safe Exam Browser Config Key</h3>
            <p className="panel-subtitle">Paste your SEB config key here so the exam can validate against your SEB profile.</p>
          </div>
        </div>

        {!editingSebKey ? (
          <div className="card-body">
            {exam.sebConfigKey ? (
              <div className="card card-compact">
                <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setEditingSebKey(false);
                  setSebKeyInput(exam.sebConfigKey ?? '');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button--highlight"
                onClick={async () => {
                  try {
                    await api.patch(`/exams/${id}`, { sebConfigKey: sebKeyInput });
                    setExam((prev) => (prev ? { ...prev, sebConfigKey: sebKeyInput } : prev));
                    setEditingSebKey(false);
                    alert('SEB Config Key saved successfully');
                  } catch (err: any) {
                    alert(err.error || 'Failed to save SEB Config Key');
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {exam.questionSource === 'pdf' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="panel-heading">Upload Question Paper</h3>
              <p className="panel-subtitle">Upload the PDF that students will see during the exam.</p>
            </div>
          </div>
          <div className="card-body">
            <input
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={isExamClosed}
            />
            <div className="form-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isExamClosed}
              >
                {isUploading ? 'Uploading...' : 'Select PDF File'}
              </button>
              {exam.pdfPath && <span className="text-muted">{exam.pdfPath}</span>}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="panel-heading">Questions List</h3>
            <p className="panel-subtitle">
              {exam.questionSource === 'pdf'
                ? 'Add answer fields for the students to fill in corresponding to your PDF.'
                : 'Build the full exam questions here.'}
            </p>
          </div>
          {!isExamClosed && !showForm && (
            <button type="button" className="button button--primary" onClick={() => setShowForm(true)}>
              Add Question
            </button>
          )}
        </div>

        <div className="card-body">
          {showForm && !isExamClosed && (
            <form onSubmit={handleAddQuestion} className="card card-compact">
              <div className="card-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="qType">
                      Question Type
                    </label>
                    <select
                      id="qType"
                      className="form-input"
                      value={qType}
                      onChange={(e) => setQType(e.target.value as QuestionType)}
                    >
                      <option value="short_answer">Short Answer</option>
                      <option value="long_answer">Long Answer</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="qMarks">
                      Marks
                    </label>
                    <input
                      id="qMarks"
                      type="number"
                      min={1}
                      required
                      value={qMarks}
                      onChange={(e) => setQMarks(parseInt(e.target.value) || 1)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="qPrompt">
                    Prompt / Question Text
                  </label>
                  <textarea
                    id="qPrompt"
                    required
                    rows={3}
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                    placeholder={exam.questionSource === 'pdf' ? 'e.g. Question 1 (a)' : 'What is the capital of France?'}
                    className="form-input"
                  />
                </div>

                {qType === 'multiple_choice' && (
                  <div className="form-group">
                    <label className="form-label">Options</label>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {qOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}
                        >
                          <input
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...qOptions];
                              newOpts[idx] = e.target.value;
                              setQOptions(newOpts);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            required={idx < 2}
                            className="form-input"
                          />
                          <button
                            type="button"
                            onClick={() => setQOptions(qOptions.filter((_, i) => i !== idx))}
                            disabled={qOptions.length <= 2}
                            className="button button--ghost"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="button button--outline"
                      onClick={() => setQOptions([...qOptions, ''])}
                    >
                      Add Option
                    </button>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="button button--secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="button button--highlight">
                    Save Question
                  </button>
                </div>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gap: '1rem' }}>
            {questions.length === 0 && !showForm ? (
              <div className="card card-compact">
                <div className="card-body">
                  <p className="text-muted">No questions added yet.</p>
                </div>
              </div>
            ) : (
              questions.map((q, idx) => (
                <div key={q.id} className="card card-compact">
                  <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        <span className="status-pill status-pill--highlight">Q{idx + 1}</span>
                        <span className="status-pill status-pill--muted">{QUESTION_TYPE_LABELS[q.type]}</span>
                        <span className="status-pill status-pill--info">{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-light">{q.prompt}</p>
                      {q.type === 'multiple_choice' && q.options && (
                        <ul style={{ display: 'grid', gap: '0.5rem', paddingLeft: 0, margin: 0, listStyle: 'none' }}>
                          {q.options.map((opt, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#94a3b8' }}>
                              <span className="status-pill status-pill--muted">{String.fromCharCode(65 + i)}</span>
                              <span>{opt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {!isExamClosed && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="button button--ghost" onClick={() => handleDeleteQuestion(q.id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


