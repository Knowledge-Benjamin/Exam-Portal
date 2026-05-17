import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import type { Exam, Question, Submission } from '../../types';
import { useSocket } from '../../hooks/useSocket';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { ExamEditor } from '../../components/editor/ExamEditor';
import { QuestionAnswer } from '../../components/editor/QuestionAnswer';
import { formatCountdown } from '../../utils/formatters';

import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  const [numPages, setNumPages] = useState<number>(1);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => { fetchExamData(); }, [id]);

  useEffect(() => {
    if (exam?.pdfPath) {
      fetchPdfBlob();
    }
  }, [exam?.id, exam?.pdfPath]);

  useEffect(() => {
    if (forceSubmitMsg) {
      alert(forceSubmitMsg);
      navigate('/', { replace: true });
    }
  }, [forceSubmitMsg, navigate]);

  const fetchPdfBlob = async () => {
    if (!exam?.id) return;
    setIsPdfLoading(true);
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
      });
      setPdfBlob(response.data);
    } catch (err: any) {
      console.error('[pdf] fetch error:', {
        message: err.message,
        status: err.response?.status,
        body: err.response?.data,
      });
      setError('Failed to load PDF. Please refresh and try again.');
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

  // ─── Answer update ─────────────────────────────────────────────────────────

  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleFreeformChange = useCallback((html: string) => {
    setAnswers((prev) => ({ ...prev, freeform: html }));
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleFinalSubmit = async () => {
    if (submission?.isFinal) return;
    mute(3000); // suppress anti-cheat during the confirm dialog
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

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-primary)]">
        <div className="w-12 h-12 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm tracking-wide">Loading Exam Environment...</p>
      </div>
    );
  }

  if (error || submission?.isFinal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)] p-4">
        <div className="bg-[var(--color-primary)] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 text-2xl">⚠</div>
          <h2 className="text-xl font-bold text-white mb-2">
            {submission?.isFinal ? 'Already Submitted' : 'Access Denied'}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            {error || 'This exam has already been submitted.'}
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-primary)] overflow-hidden">

      {/* Violation Banner */}
      {violationMsg && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm font-bold text-center py-3 px-6 shadow-lg">
          {violationMsg}
          {tabSwitchCount > 0 && (
            <span className="ml-4 opacity-70 text-xs font-normal">({tabSwitchCount} violation{tabSwitchCount !== 1 ? 's' : ''} recorded)</span>
          )}
        </div>
      )}

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-[var(--color-primary)] border-b border-white/5 px-6 py-3 flex justify-between items-center shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm truncate leading-tight">{exam.title}</h1>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
              {submission?.studentName && (
                <span className="text-[var(--color-primary)] font-semibold">{submission.studentName} · {submission.studentRegNumber}</span>
              )}
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className={`flex items-center gap-1 ${isConnected ? 'text-[var(--color-highlight)]' : 'text-[var(--color-danger)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[var(--color-highlight)]' : 'bg-[var(--color-danger)]'} animate-pulse`} />
                {isConnected ? 'Auto-saving' : 'Reconnecting...'}
              </span>
              {lastSaved && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Progress */}
          {!isPdf && (
            <div className="hidden md:flex flex-col items-end gap-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-highlight)] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--color-highlight)] font-bold tabular-nums">{progress}%</span>
              </div>
            </div>
          )}

          {/* Timer */}
          <div className="flex flex-col items-center bg-[var(--color-primary)] border border-white/5 rounded-xl px-4 py-2 min-w-[90px]">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Time Left</span>
            <span className={`text-xl font-black tabular-nums tracking-tight ${
              remainingSeconds !== null && remainingSeconds < 300 ? 'text-[var(--color-danger)] animate-pulse' : 'text-[var(--color-primary)]'
            }`}>
              {remainingSeconds !== null ? formatCountdown(remainingSeconds) : '--:--'}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[var(--color-highlight)] hover:bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-xl text-xs font-black tracking-[0.15em] uppercase transition-all shadow-[0_0_20px_rgba(var(--color-highlight-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--color-highlight-rgb),0.6)] disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        </div>
      </header>

      {/* ─── Body ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
        <div
          className="w-1/2 border-r border-white/5 bg-[var(--color-primary)] overflow-y-auto flex flex-col select-none custom-scrollbar"
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isPdf ? (
            /* PDF Viewer */
            exam.pdfPath ? (
              <div className="flex-1 overflow-auto flex flex-col items-center py-8 px-4 gap-4">
                {isPdfLoading && !pdfBlob ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                    <div className="w-12 h-12 border-2 border-white/10 border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Loading PDF…</p>
                  </div>
                ) : pdfBlob ? (
                  <Document
                    file={pdfBlob}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    onLoadError={(error) => {
                      console.error('[pdf] load error:', {
                        error,
                        examId: exam.id,
                        pdfBlobSize: pdfBlob?.size,
                        pdfBlobType: pdfBlob?.type,
                      });
                      setError('Failed to load PDF. Please refresh and try again.');
                    }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={Math.min(540, window.innerWidth * 0.44)}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-2xl rounded overflow-hidden"
                    />
                  </Document>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                    <p>No PDF loaded yet. Please refresh or contact your instructor.</p>
                  </div>
                )}
                {numPages > 1 && pdfBlob && (
                  <div className="sticky bottom-4 flex items-center gap-3 bg-[var(--color-primary)] border border-white/10 rounded-xl px-4 py-2 shadow-xl text-white">
                    <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="disabled:opacity-30 hover:text-[var(--color-primary)] w-6 h-6 flex items-center justify-center transition-colors font-bold">‹</button>
                    <span className="text-xs font-medium text-gray-300">Page {pageNumber} of {numPages}</span>
                    <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="disabled:opacity-30 hover:text-[var(--color-primary)] w-6 h-6 flex items-center justify-center transition-colors font-bold">›</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <div className="w-16 h-16 rounded-full bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
                  <p className="text-gray-400 text-sm">No question paper uploaded for this exam.</p>
                </div>
              </div>
            )
          ) : (
            /* Question Navigator (Builder) */
            <div className="flex-1 flex flex-col">
              <div className="px-5 py-4 border-b border-white/5 bg-[var(--color-primary)]/50">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-primary)]">Questions</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{answeredCount} of {questions.length} answered</p>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2 custom-scrollbar">
                {questions.map((q, i) => {
                  const answered = !!answers[q.id];
                  const isActive = activeQuestionId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setActiveQuestionId(q.id);
                        document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                        isActive
                          ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]/50 text-white'
                          : 'bg-[var(--color-primary)]/50 border-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 border ${
                        answered
                          ? 'bg-[var(--color-highlight)]/10 border-[var(--color-highlight)]/40 text-[var(--color-highlight)]'
                          : isActive
                          ? 'bg-[var(--color-primary)]/30 border-[var(--color-primary)]/50 text-white'
                          : 'bg-white/5 border-white/10 text-gray-500'
                      }`}>
                        {answered ? '✓' : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{q.prompt}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{q.marks} mark{q.marks !== 1 ? 's' : ''} · {q.type.replace('_', ' ')}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL — Answer Sheet ────────────────────────────────────── */}
        <div
          className="w-1/2 flex flex-col overflow-hidden bg-[var(--color-primary)]"
          onPaste={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isPdf ? (
            /* Free-form TipTap editor for PDF exams */
            <ExamEditor
              content={answers.freeform ?? ''}
              onChange={handleFreeformChange}
            />
          ) : (
            /* Structured Q&A for Builder exams */
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-6 max-w-3xl mx-auto w-full">
                <div className="pb-2 border-b border-white/5">
                  <h2 className="text-lg font-bold text-white">Answer Sheet</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5 tracking-wide">
                    {isPdf ? 'Write freely — reference question numbers from the paper on the left.' : 'Answer each question below. Your work saves automatically.'}
                  </p>
                </div>
                {questions.map((q, i) => (
                  <QuestionAnswer
                    key={q.id}
                    question={q}
                    index={i}
                    value={answers[q.id] ?? ''}
                    onChange={handleAnswerChange}
                  />
                ))}
                {/* Bottom submit button */}
                <div className="pt-4 pb-8 flex justify-end">
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-[var(--color-highlight)] hover:bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-xl text-xs font-black tracking-[0.15em] uppercase transition-all shadow-[0_0_20px_rgba(var(--color-highlight-rgb),0.3)] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


