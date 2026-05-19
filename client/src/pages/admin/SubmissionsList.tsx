import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { api } from '../../api';
import type { Exam, Submission, Question } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useSubmissionStatus } from '../../hooks/useSubmissionStatus';

// `stripHtml` was removed in favor of rendering sanitized HTML with DOMPurify
// kept previous logic in git history if plain-text conversion is required later

const escapeHtml = (str: string) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Sanitize HTML to prevent XSS attacks while preserving formatting
const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'br', 'code', 'pre', 'div'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

export function SubmissionsList() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [marks, setMarks] = useState<number>(0);
  const [teacherNote, setTeacherNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track real-time submission status (active, left, submitted)
  const submissionStatusMap = useSubmissionStatus(id);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [examRes, qRes, subRes] = await Promise.all([
        api.get(`/exams/${id}`),
        api.get(`/exams/${id}/questions`),
        api.get(`/submissions/${id}`),
      ]);
      setExam(examRes.data.exam);
      setQuestions(qRes.data.questions);
      setSubmissions(subRes.data.submissions);
    } catch (err: any) {
      setError('Failed to load submissions data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPossibleMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  const handleMarkSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    setIsSaving(true);
    try {
      const { data } = await api.patch(`/submissions/mark/${selectedSubmission.id}`, {
        marksAwarded: marks,
        teacherNote,
      });
      setSubmissions(submissions.map(s =>
        s.id === selectedSubmission.id ? { ...s, ...data.submission } : s
      ));
      setSelectedSubmission(null);
    } catch (err: any) {
      alert(err.error || 'Failed to save marks');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFile = async (sub: Submission) => {
    try {
      const response = await fetch(`/api/submissions/file/${sub.id}`, {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileName = `${sub.studentName}_${sub.submissionFileName ?? 'submission'}`;
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Unable to download file. Please try again.');
    }
  };

  const handleDownloadPdf = async (sub: Submission) => {
    // Lazy-load html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    const isFreeform = !!sub.answers?.freeform;
    let contentHtml = '';

    if (isFreeform) {
      // Use the actual HTML to preserve formatting (bold, italics, lists, etc.)
      const html = sub.answers.freeform || '<em>No answer provided</em>';
      const sanitized = sanitizeHtml(html);
      contentHtml = `<div style="font-family: 'Georgia', serif; color: #111; font-size:0.95rem; line-height:1.6; background:#fff; padding:16px; border-radius:8px; word-break: break-word;">${sanitized}</div>`;
    } else {
      contentHtml = questions.map((q, i) => {
        const ansRaw = sub.answers?.[q.id] || '<em>No answer provided</em>';
        // For long answers, preserve HTML formatting; for others, escape text
        const ansHtml = q.type === 'long_answer' ? sanitizeHtml(String(ansRaw)) : escapeHtml(String(ansRaw)).replace(/\n/g, '<br>');
        return `
            <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb">
              <p style="font-weight:700; color:#1e3a5f; margin-bottom:8px">Q${i + 1}. ${escapeHtml(q.prompt)} <span style="font-weight:400; color:#6b7280; font-size:0.85em">(${q.marks} mark${q.marks !== 1 ? 's' : ''})</span></p>
              <div style="padding-left:16px; color:#374151; word-break: break-word;">${ansHtml}</div>
            </div>
          `;
      }).join('');
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-family: 'Georgia', serif; color: #111; max-width: 720px; margin: 0 auto; padding: 0">
        <div style="background:var(--color-primary); color:white; padding:32px 40px; margin-bottom:32px">
          <h1 style="margin:0 0 8px; font-size:1.4rem">${escapeHtml(exam?.title ?? 'Exam')}</h1>
          <p style="margin:4px 0; font-size:0.9rem; opacity:0.8">Student: ${escapeHtml(sub.studentName)} &nbsp;|&nbsp; Reg: ${escapeHtml(sub.studentRegNumber)}</p>
          <p style="margin:4px 0; font-size:0.85rem; opacity:0.6">Submitted: ${sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Not submitted'}</p>
        </div>
        <div style="padding:0 40px 40px">${contentHtml}</div>
      </div>
    `;

    html2pdf().set({
      margin: 0,
      filename: `${sub.studentName.replace(/\s+/g, '_')}_${(exam?.title ?? 'exam').replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.97 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(wrapper).save();
  };

  if (isLoading) return (
    <div className="page-content submission-placeholder" style={{ minHeight: '24rem' }}>
      <div className="submission-list-item-title" style={{ width: '18rem', height: '1.25rem', background: 'rgba(255,255,255,0.08)', marginBottom: '1.25rem' }} />
      <div className="submission-layout" style={{ minHeight: '16rem' }}>
        <div className="panel-card panel-card--accent" style={{ minHeight: '100%' }} />
        <div className="panel-card panel-card--accent" style={{ minHeight: '100%' }} />
      </div>
    </div>
  );
  if (!exam) return <div className="submission-placeholder">Exam not found</div>;

  const getStatusBadge = (sub: Submission) => {
    const realtimeStatus = submissionStatusMap[sub.id];
    
    // If submission is finalized, show marking status
    if (sub.isFinal) {
      if (sub.marksAwarded !== undefined && sub.marksAwarded !== null) {
        return <span className="status-pill status-pill--highlight">Marked</span>;
      }
      return <span className="status-pill status-pill--highlight">Needs Marking</span>;
    }

    // If not finalized, show real-time status
    if (realtimeStatus === 'active') {
      return <span className="status-pill status-pill--working">Working</span>;
    } else if (realtimeStatus === 'left') {
      return <span className="status-pill status-pill--left">Left Exam</span>;
    } else {
      // No real-time status yet (hasn't joined room yet, or old exam)
      return <span className="status-pill status-pill--idle">Idle</span>;
    }
  };

  return (
    <div className="page-content page-animate">
      <div className="page-header page-header-row">
        <div>
          <button
            onClick={() => navigate(`/dashboard/exams/${id}`)}
            className="button button--ghost button--sm"
          >
            ← Back to Exam
          </button>
          <h2 className="panel-title">Submissions</h2>
          <p className="panel-subtitle">{exam.title}</p>
        </div>

        <div className="panel-card panel-card--accent" style={{ minWidth: '14rem' }}>
          <p className="status-label">Total Marks</p>
          <p className="panel-title" style={{ marginTop: '0.75rem' }}>{totalPossibleMarks}</p>
        </div>
      </div>

      {error && (
        <div className="panel-card panel-card--danger">
          {error}
        </div>
      )}

      <div className="submission-layout">
        <section className="panel-card panel-card--danger panel-card--full-height panel-card--overflow">
          <div className="panel-header">
            <div>
              <p className="panel-card__subtitle">Student Submissions</p>
            </div>
          </div>

          <div className="submission-list">
            <div className="submission-list__items">
              {submissions.length === 0 ? (
                <div className="submission-placeholder">
                  No submissions yet.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setMarks(sub.marksAwarded || 0);
                      setTeacherNote(sub.teacherNote || '');
                    }}
                    className={`submission-list-item ${selectedSubmission?.id === sub.id ? 'submission-list-item--active' : ''}`}
                  >
                    <div className="panel-header">
                      <p className="submission-list-item-title">{sub.studentName} ({sub.studentRegNumber})</p>
                      <div className="panel-actions">
                        {getStatusBadge(sub)}
                        {sub.submissionFileId && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDownloadFile(sub); }}
                            title="Download uploaded file"
                            className="button button--outline button--sm"
                            style={{ marginRight: '0.5rem' }}
                          >
                            <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            File
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDownloadPdf(sub); }}
                          title="Download PDF"
                          className="button button--outline button--sm"
                        >
                          <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3" /></svg>
                          Download
                        </button>
                      </div>
                    </div>
                    <p className="submission-list-item-meta">
                      {sub.submittedAt ? formatDate(sub.submittedAt) : 'In Progress'}
                      {sub.marksAwarded != null && ` · ${sub.marksAwarded} / ${totalPossibleMarks}`}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="panel-card panel-card--accent panel-card--full-height panel-card--overflow">
          {!selectedSubmission ? (
            <div className="submission-placeholder">
              <div className="submission-placeholder-icon">
                <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <p className="panel-subtitle">Select a student from the list to view their submission and assign marks.</p>
            </div>
          ) : (
            <div className="panel-card--body-scroll">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">{selectedSubmission.studentName}</h3>
                  <p className="panel-subtitle">{selectedSubmission.studentRegNumber}</p>
                </div>
                <div className="panel-actions">
                  {selectedSubmission.submissionFileId && (
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(selectedSubmission)}
                      className="button button--outline button--sm"
                    >
                      <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download File
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(selectedSubmission)}
                    className="button button--outline button--sm"
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download PDF
                  </button>
                  <div>
                    <p className="status-label">Submitted</p>
                    <p className="panel-subtitle">{selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Not Finalized'}</p>
                  </div>
                </div>
              </div>

              {selectedSubmission.answers?.freeform ? (
                <div className="panel-card panel-card--accent essay-content" style={{ color: '#cbd5e1', lineHeight: 1.7, fontSize: '0.95rem' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedSubmission.answers.freeform) }} />
              ) : (
                questions.map((q, idx) => (
                  <div key={q.id} className="panel-card panel-card--accent">
                    <div className="panel-header" style={{ alignItems: 'flex-start' }}>
                      <div>
                        <p className="submission-list-item-title">Q{idx + 1}. {q.prompt}</p>
                      </div>
                      <span className="status-pill status-pill--muted">
                        {q.marks} Mark{q.marks !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="status-label" style={{ marginBottom: '0.75rem' }}>Student's Answer</p>
                      {selectedSubmission.answers?.[q.id] ? (
                        q.type === 'long_answer'
                          ? <div className="essay-content" style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.7' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedSubmission.answers[q.id]) }} />
                          : <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.7' }}>{selectedSubmission.answers[q.id]}</p>
                      ) : (
                        <p className="panel-subtitle">No answer provided.</p>
                      )}
                    </div>
                  </div>
                ))
              )}

              <div className="panel-card panel-card--accent">
                <form onSubmit={handleMarkSubmission} className="form-stack">
                  <div className="form-row form-row--2">
                    <div className="form-group">
                      <label className="form-label">Marks (Max {totalPossibleMarks})</label>
                      <input
                        type="number"
                        min={0}
                        max={totalPossibleMarks}
                        required
                        value={marks}
                        onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="note">Teacher Note (Optional)</label>
                      <textarea
                        id="note"
                        className="form-input"
                        rows={2}
                        placeholder="Add feedback for the student..."
                        value={teacherNote}
                        onChange={(e) => setTeacherNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="panel-actions" style={{ justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={isSaving || !selectedSubmission.isFinal}
                      className="button button--highlight button--sm"
                    >
                      {isSaving ? 'Saving...' : 'Save Marks'}
                    </button>
                  </div>

                  {!selectedSubmission.isFinal && (
                    <p className="form-status form-status--error" style={{ marginTop: '0.75rem' }}>
                      Warning: This exam is still in draft state. The student has not submitted it.
                    </p>
                  )}
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
      <style>{`
        .essay-content p { margin: 0.5em 0; }
        .essay-content h1, .essay-content h2, .essay-content h3, .essay-content h4, .essay-content h5, .essay-content h6 { font-weight: 700; margin: 0.75em 0 0.5em 0; color: #cbd5e1; }
        .essay-content strong, .essay-content b { font-weight: 700; color: #e2e8f0; }
        .essay-content em, .essay-content i { font-style: italic; }
        .essay-content u { text-decoration: underline; }
        .essay-content ul, .essay-content ol { margin: 0.5em 0; padding-left: 2rem; }
        .essay-content li { margin: 0.25em 0; }
        .essay-content blockquote { margin: 0.5em 0; padding-left: 1rem; border-left: 3px solid rgba(255,255,255,0.1); }
        .essay-content code { background: rgba(0,0,0,0.2); padding: 0.2em 0.4em; border-radius: 4px; font-family: 'Courier New', monospace; }
        .essay-content pre { background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
      `}</style>
    </div>
  );
}


