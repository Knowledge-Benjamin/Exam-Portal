import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import type { Exam, Question, Submission } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { ExamEditor } from '../../components/editor/ExamEditor';
import { QuestionAnswer } from '../../components/editor/QuestionAnswer';
import { formatCountdown } from '../../utils/formatters';

type Answers = Record<string, string>;

export function ExamRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const examToken = (location.state as any)?.examToken ||
    (id ? sessionStorage.getItem(`exam_token_${id}`) : null) ||
    sessionStorage.getItem('current_exam_token') ||
    '';

  const authHeaders = examToken
    ? { Authorization: `Bearer ${examToken}`, 'x-exam-token': examToken }
    : {};

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
  const allowExternalApps = Boolean(
    (exam?.sebSettings?.permittedProcesses && exam.sebSettings.permittedProcesses.length > 0) ||
    exam?.allowFileUpload
  );

  const { tabSwitchCount } = useAntiCheat(examActive, {
    allowExternalApps,
    onViolation: (type) => {
      const msgs: Record<string, string> = {
        tab_switch: '⚠ Tab switch detected and recorded.',
        window_blur: '⚠ Please stay in the exam window.',
        copy: '⚠ Copying is disabled.',
        paste: '⚠ Pasting is disabled.',
        devtools: '⚠ Developer tools are disabled.',
        print: '⚠ Printing is disabled.',
        fullscreen_exit: '⚠ Please remain in fullscreen mode.',
      };
      setViolationMsg(msgs[type] ?? '⚠ Prohibited action detected.');
      setTimeout(() => setViolationMsg(''), 4000);
    },
  });

  const { isConnected, remainingSeconds, lastSaved, forceSubmitMsg } = useSocket(id!, answers, examToken);

  const answersRef = useRef<Answers>({});
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

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
      axios.post('/seb/submission/submit', { answers: answersRef.current }, { withCredentials: true, headers: authHeaders }).catch(() => {});
      if (id) {
        try {
          localStorage.removeItem(`exam_draft_answers_${id}`);
        } catch {}
      }
      alert(forceSubmitMsg);
      navigate('/', { replace: true });
    }
  }, [forceSubmitMsg, navigate, id]);

  const fetchPdfBlob = async () => {
    if (!id) return;
    setIsPdfLoading(true);
    setPdfError(null);
    try {
      let response;
      try {
        response = await axios.get(`/seb/exam/${id}/pdf-blob`, {
          responseType: 'blob',
          withCredentials: true,
          headers: authHeaders,
        });
      } catch (sebErr: any) {
        // Fallback to /api/exams/:id/pdf/download
        response = await axios.get(`/api/exams/${id}/pdf/download`, {
          responseType: 'blob',
          withCredentials: true,
          headers: authHeaders,
        });
      }

      const contentType = String(response.headers['content-type'] || '');
      if (contentType && !contentType.includes('application/pdf')) {
        const text = await (response.data as Blob).text();
        let errorData: any = {};
        try { errorData = JSON.parse(text); } catch {}
        setPdfError({
          message: errorData.error || 'Server did not return a valid PDF.',
          details: errorData.details || text.substring(0, 300),
        });
        return;
      }

      setPdfBlob(response.data);
    } catch (err: any) {
      let errMsg = 'Failed to load question paper PDF.';
      let details: string | undefined;

      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errMsg = parsed.error || errMsg;
          details = parsed.details;
        } catch {}
      } else {
        errMsg = err.response?.data?.error || err.message || errMsg;
        details = err.response?.data?.details;
      }

      setPdfError({ message: errMsg, details });
    } finally {
      setIsPdfLoading(false);
    }
  };

  const fetchExamData = async () => {
    try {
      const [examRes, questionsRes, subRes] = await Promise.all([
        axios.get(`/seb/exam/${id}`, { withCredentials: true, headers: authHeaders }),
        axios.get(`/seb/exam/${id}/questions`, { withCredentials: true, headers: authHeaders }),
        axios.get('/seb/submission', { withCredentials: true, headers: authHeaders }),
      ]);

      setExam(examRes.data.exam);
      setQuestions(questionsRes.data.questions);

      const sub = subRes.data.submission;
      setSubmission(sub);

      let loadedAnswers: Answers = {};
      if (sub?.answers) {
        loadedAnswers = sub.answers;
      } else {
        try {
          const cached = localStorage.getItem(`exam_draft_answers_${id}`);
          if (cached) {
            loadedAnswers = JSON.parse(cached);
          }
        } catch {}
      }
      setAnswers(loadedAnswers);

      if (questionsRes.data.questions?.length > 0) {
        setActiveQuestionId(questionsRes.data.questions[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load exam session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = useCallback((questionId: string, val: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: val };
      try {
        localStorage.setItem(`exam_draft_answers_${id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [id]);

  const handleFreeformChange = useCallback((html: string) => {
    setAnswers((prev) => {
      const next = { ...prev, freeform: html };
      try {
        localStorage.setItem(`exam_draft_answers_${id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [id]);

  const handleFinalSubmit = async () => {
    if (exam?.allowFileUpload && fileUploadError && !submission?.submissionFileName) {
      alert('Your file upload is invalid or failed. Please resolve the file error before submitting.');
      return;
    }

    if (!window.confirm('Submit your examination paper? Once submitted, no further changes can be made.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        '/seb/submission/submit',
        { answers },
        { withCredentials: true, headers: authHeaders }
      );

      if (id) {
        try {
          localStorage.removeItem(`exam_draft_answers_${id}`);
        } catch {}
      }

      alert('Exam submitted successfully! You may now exit Safe Exam Browser.');
      navigate('/', { replace: true });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit exam.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setFileUploadError(null);
      return;
    }

    const blockedExtensions = [
      '.exe', '.bat', '.cmd', '.sh', '.msi', '.vbs', '.js', '.jar', '.com', '.scr',
      '.pif', '.application', '.gadget', '.hta', '.cpl', '.msc', '.msp', '.reg',
      '.ps1', '.psm1', '.psd1', '.ws', '.wsf', '.vb', '.vbe',
    ];

    const fileNameLower = file.name.toLowerCase();
    const isBlocked = blockedExtensions.some((ext) => fileNameLower.endsWith(ext));
    if (isBlocked) {
      setSelectedFile(null);
      setFileUploadError('Executable and script files are blocked for security.');
      return;
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileUploadError('File size exceeds the 50MB limit.');
      return;
    }

    setSelectedFile(file);
    setFileUploadError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsUploadingFile(true);
    setFileUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('/seb/submission/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', ...authHeaders },
        withCredentials: true,
      });

      setUploadSuccess(`Uploaded ${response.data.fileName}`);
      setSubmission((prev) => prev ? {
        ...prev,
        submissionFileId: response.data.fileId,
        submissionFileName: response.data.fileName,
      } : null);
      setSelectedFile(null);
    } catch (err: any) {
      setFileUploadError(err.response?.data?.error || 'Failed to upload file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="exam-room-shell" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-navy)', fontWeight: 600 }}>Loading secure exam session...</p>
        </div>
      </div>
    );
  }

  if (error || submission?.isFinal) {
    return (
      <div className="exam-room-shell" style={{ display: 'grid', placeItems: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', display: 'grid', placeItems: 'center', margin: '0 auto 1rem', color: 'var(--color-danger)', fontSize: '1.25rem' }}>
            {submission?.isFinal ? '✓' : '⚠'}
          </div>
          <h2 style={{ color: 'var(--color-navy)', fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
            {submission?.isFinal ? 'Examination Completed' : 'Access Restricted'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
            {error || 'This exam paper has already been submitted.'}
          </p>
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
      {/* Violation Alert Banner */}
      {violationMsg && (
        <div className="exam-room-violation-banner">
          {violationMsg}
          {tabSwitchCount > 0 && (
            <span style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: 400, marginLeft: '0.5rem' }}>
              ({tabSwitchCount} violation{tabSwitchCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
      )}

      {/* Top Header Bar */}
      <header className="exam-room-header">
        <div className="exam-room-brand">
          <img
            src="/logo_asset.png"
            alt="Multitech"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <div>
            <h1 className="exam-room-title">{exam.title}</h1>
            <div className="exam-room-meta">
              {submission?.studentName && (
                <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                  {submission.studentName} ({submission.studentRegNumber})
                </span>
              )}
              <span className="status-dot" />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: isConnected ? 'var(--color-success)' : 'var(--color-warning)' }}>
                <span className="status-dot" style={{ backgroundColor: isConnected ? 'var(--color-success)' : 'var(--color-warning)' }} />
                {isConnected ? 'Autosaved' : 'Offline Mode'}
              </span>
              {lastSaved && (
                <>
                  <span className="status-dot" />
                  <span>Last saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="exam-room-header-right">
          {!isPdf && (
            <div className="exam-room-progress">
              <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Progress</span>
              <div className="exam-room-meter">
                <div className="exam-room-meter-bar">
                  <div className="exam-room-meter-fill" style={{ width: `${progress}%` }} />
                </div>
                <span style={{ color: 'var(--color-blue)', fontWeight: 700, fontSize: '0.75rem' }}>{progress}%</span>
              </div>
            </div>
          )}

          {/* Timer */}
          <div className="exam-room-timer">
            <span className="exam-room-timer-label">Time Remaining</span>
            <span className={remainingSeconds !== null && remainingSeconds < 300 ? 'exam-room-timer-value exam-room-timer-value--danger' : 'exam-room-timer-value'}>
              {remainingSeconds !== null ? formatCountdown(remainingSeconds) : '--:--'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="button button--primary"
            style={{ padding: '0.65rem 1.4rem' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </header>

      {/* Permitted Apps Info Strip */}
      {exam.sebSettings?.permittedProcesses && exam.sebSettings.permittedProcesses.length > 0 && (
        <div style={{
          background: '#f0f6ff',
          borderBottom: '1px solid #cce0ff',
          padding: '0.5rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-blue)', whiteSpace: 'nowrap' }}>
            Permitted Applications
          </span>
          {exam.sebSettings.permittedProcesses.map((proc: any, i: number) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              background: '#fff', border: '1px solid #cce0ff',
              borderRadius: '6px', padding: '0.2rem 0.55rem',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-navy)',
            }}>
              <span style={{ fontSize: '0.7rem' }}>💻</span>
              {proc.title || proc.executable}
            </span>
          ))}
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>ℹ</span> Launch or switch using the Safe Exam Browser taskbar below
          </span>
        </div>
      )}

      {/* Main Body */}
      <main className="exam-room-body">
        {/* Left pane: Question List or PDF Viewer */}
        <section
          className="exam-room-sidebar"
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="exam-room-sidebar-inner">
            {isPdf ? (
              exam.pdfPath ? (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}>
                  {pdfError && (
                    <div style={{ padding: '1rem', background: 'var(--color-danger-bg)', borderBottom: '1px solid var(--color-danger-border)' }}>
                      <p style={{ margin: 0, color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.85rem' }}>{pdfError.message}</p>
                      <button type="button" onClick={() => window.location.reload()} className="button button--secondary" style={{ marginTop: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                        Reload PDF
                      </button>
                    </div>
                  )}

                  {isPdfLoading && !pdfBlob ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                      <div className="spinner" style={{ marginBottom: '1rem' }} />
                      <p style={{ fontSize: '0.875rem' }}>Loading question paper…</p>
                    </div>
                  ) : pdfBlob && pdfBlobUrl ? (
                    <object data={pdfBlobUrl} type="application/pdf" style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}>
                      <div style={{ padding: '1.5rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                        Unable to render PDF inside browser window. <a href={pdfBlobUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>Open document</a>.
                      </div>
                    </object>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      No question paper loaded. Please refresh or contact exam supervisor.
                    </div>
                  )}
                </div>
              ) : (
                <div className="exam-room-empty-state">
                  <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No question paper uploaded for this exam.</p>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flex: 1, minHeight: 0, flexDirection: 'column' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-blue)' }}>
                    Questions ({questions.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {answeredCount} of {questions.length} completed
                  </span>
                </div>
                <div className="exam-room-list-wrapper">
                  {questions.map((q, i) => {
                    const answered = !!answers[q.id];
                    const isActive = activeQuestionId === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setActiveQuestionId(q.id);
                          document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`exam-room-question-button ${isActive ? 'exam-room-question-button--active' : ''} ${answered ? 'exam-room-question-button--answered' : ''}`}
                      >
                        <span className="exam-room-question-badge">
                          {answered ? '✓' : i + 1}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {q.prompt}
                          </p>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            {q.marks} mark{q.marks !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supporting File Upload Box (if permitted) */}
            {exam.allowFileUpload && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-navy)' }}>Attach Solution File</strong>
                  {submission?.submissionFileName && (
                    <span className="status-pill status-pill--info" style={{ fontSize: '0.65rem' }}>Uploaded</span>
                  )}
                </div>
                <input
                  type="file"
                  accept=".pdf,.txt,.html,.htm,.sql,.csv,.doc,.docx,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                  onChange={handleFileSelect}
                  disabled={!examActive || isUploadingFile}
                  className="form-input"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                />
                {selectedFile && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleFileUpload}
                      disabled={isUploadingFile}
                      className="button button--primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {isUploadingFile ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                )}
                {fileUploadError && (
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--color-danger)', fontSize: '0.75rem' }}>{fileUploadError}</p>
                )}
                {uploadSuccess && (
                  <p style={{ margin: '0.35rem 0 0', color: 'var(--color-success)', fontSize: '0.75rem' }}>{uploadSuccess}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right pane: Answer Form or Document Editor */}
        <section className="exam-room-content">
          <div className="exam-room-content-inner">
            {isPdf ? (
              <ExamEditor content={answers.freeform ?? ''} onChange={handleFreeformChange} />
            ) : (
              <div>
                {questions.map((q, i) => (
                  <QuestionAnswer
                    key={q.id}
                    question={q}
                    index={i}
                    value={answers[q.id] ?? ''}
                    onChange={handleAnswerChange}
                  />
                ))}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingBottom: '2rem' }}>
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="button button--primary"
                    style={{ padding: '0.85rem 2.25rem', fontSize: '0.95rem' }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Examination Paper'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
