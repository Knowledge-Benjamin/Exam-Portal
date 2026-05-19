import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import type { Exam, Question, Submission } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { ExamEditor } from '../../components/editor/ExamEditor';
import { QuestionAnswer } from '../../components/editor/QuestionAnswer';
import { formatCountdown } from '../../utils/formatters';

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = Record<string, string>;

// ─── Component ───────────────────────────────────────────────────────────────

export function ExamRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const examToken = (location.state as any)?.examToken || '';

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [violationMsg, setViolationMsg] = useState('');
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<{ message: string; details?: string } | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const examActive = !isLoading && !!exam && !submission?.isFinal;

  const { tabSwitchCount, mute } = useAntiCheat(examActive, {
    onViolation: (type) => {
      const msgs: Record<string, string> = {
        tab_switch: '⚠ Tab switch detected — this is logged.',
        window_blur: '⚠ Stay in the exam window.',
        copy: '⚠ Copying is not allowed.',
        paste: '⚠ Pasting is not allowed.',
        devtools: '⚠ Developer tools are not allowed.',
        print: '⚠ Printing is not allowed.',
        fullscreen_exit: '⚠ Please stay in fullscreen mode.',
      };
      setViolationMsg(msgs[type] ?? '⚠ Action not allowed.');
      setTimeout(() => setViolationMsg(''), 4000);
    },
  });

  const { isConnected, remainingSeconds, lastSaved, forceSubmitMsg } = useSocket(id!, answers, examToken);

  useEffect(() => { fetchExamData(); }, [id]);

  useEffect(() => {
    if (exam?.pdfPath) {
      fetchPdfBlob();
    }
  }, [exam?.id, exam?.pdfPath]);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [pdfBlob]);

  useEffect(() => {
    if (forceSubmitMsg) {
      alert(forceSubmitMsg);
      navigate('/', { replace: true });
    }
  }, [forceSubmitMsg, navigate]);

  const fetchPdfBlob = async () => {
    if (!exam?.id) return;
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      const response = await axios.get(`/api/exams/${exam.id}/pdf/download`, {
        withCredentials: true,
        responseType: 'blob',
      });
      console.info('[pdf] fetch completed', {
        examId: exam.id,
        status: response.status,
        size: response.data?.size,
        type: response.data?.type,
        headers: {
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length'],
        },
      });
      setPdfBlob(response.data);
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      const statusCode = err.response?.status || 'N/A';
      const errorBody = err.response?.data?.error || JSON.stringify(err.response?.data);
      const details = `HTTP ${statusCode}: ${errorBody}`;
      console.error('[pdf] fetch error:', { message: errorMsg, status: statusCode, body: errorBody });
      setPdfError({ message: 'Failed to load PDF from server', details });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const fetchExamData = async () => {
    try {
      const [examRes, qRes, subRes] = await Promise.all([
        axios.get(`/seb/exam/${id}`, { withCredentials: true }),
        axios.get(`/seb/exam/${id}/questions`, { withCredentials: true }),
        axios.get(`/seb/submission`, { withCredentials: true }),
      ]);
      setExam(examRes.data.exam);
      setQuestions(qRes.data.questions);
      const sub = subRes.data.submission;
      setSubmission(sub);
      if (sub?.answers) setAnswers(sub.answers);
      if (sub?.isFinal) setError('This exam has already been submitted.');
      if (qRes.data.questions.length > 0) setActiveQuestionId(qRes.data.questions[0].id);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load exam. Please re-enter via the SEB link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleFreeformChange = useCallback((html: string) => {
    setAnswers((prev) => ({ ...prev, freeform: html }));
  }, []);

  const blockedExtensions = new Set([
    '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jsx', '.ts', '.tsx', '.py', '.rb', '.pl', '.jar', '.apk', '.com', '.scr',
  ]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadSuccess(null);
    setFileUploadError(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
    if (blockedExtensions.has(extension)) {
      setSelectedFile(null);
      setFileUploadError('This file type is not allowed for security reasons.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSelectedFile(null);
      setFileUploadError('File must be smaller than 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setFileUploadError('Please choose a file to upload.');
      return;
    }

    setIsUploadingFile(true);
    setFileUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('/seb/submission/upload', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess(`Uploaded ${selectedFile.name}`);
      setSelectedFile(null);
      setSubmission(response.data.submission);
    } catch (err: any) {
      setFileUploadError(err.response?.data?.error ?? 'Failed to upload file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (submission?.isFinal) return;

    const uploadBlocked = exam.allowFileUpload && fileUploadError && !submission?.submissionFileName;
    if (uploadBlocked) {
      alert('A file upload error occurred. Please resolve the upload before submitting your exam.');
      return;
    }

    mute(3000);
    if (!window.confirm('Submit your exam? You will not be able to make changes after this.')) return;
    setIsSubmitting(true);
    try {
      await axios.post('/seb/submission/submit', { answers }, { withCredentials: true });
      mute(3000);
      alert('Exam submitted successfully! You may now close this window.');
      navigate('/', { replace: true });
    } catch (err: any) {
      mute(2000);
      alert(err.response?.data?.error ?? 'Failed to submit exam. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="exam-room-shell">
        <div className="exam-room-empty-state">
          <div className="page-panel" style={{ maxWidth: '18rem', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ width: '3rem', height: '3rem', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'transparent', borderRadius: '999px', animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: '#94a3b8', textAlign: 'center', margin: 0 }}>Loading Exam Environment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || submission?.isFinal) {
    return (
      <div className="exam-room-shell">
        <div className="exam-room-empty-state">
          <div className="page-panel" style={{ maxWidth: '28rem', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '999px', background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.2)', margin: '0 auto 1rem', color: '#f87171', fontSize: '1.5rem' }}>
              ⚠
            </div>
            <h2 style={{ color: 'white', fontSize: '1.25rem', margin: '0', textAlign: 'center' }}>
              {submission?.isFinal ? 'Already Submitted' : 'Access Denied'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginTop: '0.75rem', textAlign: 'center', margin: 0 }}>
              {error || 'This exam has already been submitted.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) return null;

  const isPdf = exam.questionSource === 'pdf';
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const totalQuestions = isPdf ? 1 : questions.length;
  const progress = isPdf
    ? (answers.freeform && answers.freeform !== '<p></p>' ? 100 : 0)
    : Math.round((answeredCount / Math.max(totalQuestions, 1)) * 100);

  return (
    <div className="exam-room-shell">
      {violationMsg && (
        <div className="exam-room-violation-banner">
          {violationMsg}
          {tabSwitchCount > 0 && (
            <span style={{ opacity: 0.7, fontSize: '0.75rem', fontWeight: 400, marginLeft: '1rem' }}>
              ({tabSwitchCount} violation{tabSwitchCount !== 1 ? 's' : ''} recorded)
            </span>
          )}
        </div>
      )}

      <header className="exam-room-header">
        <div className="exam-room-brand">
          <div className="exam-room-brand-mark">
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="exam-room-title">{exam.title}</h1>
            <div className="exam-room-meta">
              {submission?.studentName && (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{submission.studentName} · {submission.studentRegNumber}</span>
              )}
              <span className="status-dot" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: isConnected ? 'var(--color-highlight)' : 'var(--color-danger)' }}>
                <span className={`status-dot ${isConnected ? 'status-dot--highlight' : 'status-dot--danger'}`} />
                {isConnected ? 'Auto-saving' : 'Reconnecting...'}
              </span>
              {lastSaved && (
                <>
                  <span className="status-dot" style={{ background: '#94a3b8' }} />
                  <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="exam-room-header-right">
          {!isPdf && (
            <div className="exam-room-progress">
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8' }}>Progress</span>
              <div className="exam-room-meter">
                <div className="exam-room-meter-bar">
                  <div className="exam-room-meter-fill" style={{ width: `${progress}%` }} />
                </div>
                <span style={{ color: 'var(--color-highlight)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: '0.75rem' }}>{progress}%</span>
              </div>
            </div>
          )}

          <div className="exam-room-timer">
            <span className="exam-room-timer-label">Time Left</span>
            <span className={remainingSeconds !== null && remainingSeconds < 300 ? 'exam-room-timer-value exam-room-timer-value--danger' : 'exam-room-timer-value'}>
              {remainingSeconds !== null ? formatCountdown(remainingSeconds) : '--:--'}
            </span>
          </div>

          <button type="button" onClick={handleFinalSubmit} disabled={isSubmitting} className="button button--highlight" style={{ whiteSpace: 'nowrap' }}>
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </header>

      <main className="exam-room-body">
        <section className="exam-room-sidebar" onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onContextMenu={(e) => e.preventDefault()}>
          <div className="exam-room-sidebar-inner">
            {isPdf ? (
              exam.pdfPath ? (
                <div className="page-panel" style={{ flex: 1, minHeight: 0, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                  {pdfError && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ margin: 0, color: '#fda4af', fontWeight: 700 }}>{pdfError.message}</p>
                      {pdfError.details && (
                        <p style={{ margin: '0.75rem 0 0', color: '#f8c3c3', fontSize: '0.85rem', wordBreak: 'break-word' }}>{pdfError.details}</p>
                      )}
                      <button type="button" onClick={() => window.location.reload()} className="button button-secondary" style={{ width: '100%', marginTop: '1rem' }}>
                        Reload Page
                      </button>
                    </div>
                  )}
                  {isPdfLoading && !pdfBlob ? (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ width: '3rem', height: '3rem', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'transparent', borderRadius: '999px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                      <p>Loading PDF…</p>
                    </div>
                  ) : pdfBlob ? (
                    pdfBlobUrl ? (
                      <div style={{ flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <object data={pdfBlobUrl} type="application/pdf" style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}>
                          <div style={{ padding: '1rem', color: '#94a3b8' }}>
                            Unable to display the PDF in this browser. <a href={pdfBlobUrl} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Open PDF directly</a>.
                          </div>
                        </object>
                      </div>
                    ) : (
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ width: '3rem', height: '3rem', border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'transparent', borderRadius: '999px', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
                        <p>Preparing PDF viewer…</p>
                      </div>
                    )
                  ) : (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8' }}>
                      <p style={{ margin: 0 }}>No PDF loaded yet. Please refresh or contact your instructor.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="exam-room-empty-state" style={{ minHeight: 0, padding: '2rem' }}>
                  <div>
                    <div style={{ width: '4rem', height: '4rem', borderRadius: '999px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#f87171', fontSize: '1.5rem' }}>
                      !
                    </div>
                    <p style={{ margin: 0 }}>No question paper uploaded for this exam.</p>
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <div className="page-panel" style={{ margin: 0, borderRadius: 0, background: 'transparent', border: 'none', padding: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#7dd3fc' }}>Questions</p>
                      <p style={{ margin: '0.5rem 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>{answeredCount} of {questions.length} answered</p>
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '1rem' }} className="custom-scrollbar">
                  {questions.map((q, i) => {
                    const answered = !!answers[q.id];
                    const isActive = activeQuestionId === q.id;
                    const buttonClasses = [
                      'exam-room-question-button',
                      isActive ? 'exam-room-question-button--active' : '',
                      answered ? 'exam-room-question-button--answered' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setActiveQuestionId(q.id);
                          document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={buttonClasses}
                      >
                        <span className="exam-room-question-badge">{answered ? '✓' : i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.prompt}</p>
                          <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''} · {q.type.replace('_', ' ')}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {exam.allowFileUpload && (
              <div className="page-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 700 }}>Upload Supporting File</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.4 }}>
                  Upload a file for your instructor to review. Executable and script files are blocked.
                </p>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="file"
                    accept=".pdf,.txt,.html,.htm,.sql,.csv,.doc,.docx,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                    onChange={handleFileSelect}
                    disabled={!examActive || isUploadingFile}
                    className="form-input"
                  />
                  {selectedFile && (
                    <p style={{ margin: 0, color: '#d1fae5', fontSize: '0.9rem' }}>
                      Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </p>
                  )}
                  {fileUploadError && (
                    <p style={{ margin: 0, color: '#fecaca', fontSize: '0.9rem' }}>{fileUploadError}</p>
                  )}
                  {uploadSuccess && (
                    <p style={{ margin: 0, color: '#bbf7d0', fontSize: '0.9rem' }}>{uploadSuccess}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={!examActive || isUploadingFile || !selectedFile}
                    className="button button--secondary"
                  >
                    {isUploadingFile ? 'Uploading...' : 'Upload File'}
                  </button>
                  {submission?.submissionFileName && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem' }}>
                        Uploaded file: <strong>{submission.submissionFileName}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="exam-room-content">
          <div className="exam-room-content-inner">
            {isPdf ? (
              <ExamEditor content={answers.freeform ?? ''} onChange={handleFreeformChange} />
            ) : (
              <div className="exam-room-panel">
                <div className="exam-room-panel-header">
                  <h2>Answer Sheet</h2>
                  <p>{isPdf ? 'Write freely — reference question numbers from the paper on the left.' : 'Answer each question below. Your work saves automatically.'}</p>
                </div>
                <div>
                  {questions.map((q, i) => (
                    <QuestionAnswer key={q.id} question={q} index={i} value={answers[q.id] ?? ''} onChange={handleAnswerChange} />
                  ))}
                </div>
                <div className="exam-room-submit-row">
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting || (exam.allowFileUpload && fileUploadError && !submission?.submissionFileName)}
                    className="exam-room-submit-button"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                  </button>
                </div>
                {exam.allowFileUpload && fileUploadError && !submission?.submissionFileName && (
                  <p style={{ marginTop: '0.75rem', color: '#fecaca', fontSize: '0.9rem' }}>
                    Your file upload failed. Fix the upload or remove the file before submitting.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


