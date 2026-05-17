import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { Exam, Submission, Question } from '../../types';
import { formatDate } from '../../utils/formatters';

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

  const handleDownloadPdf = async (sub: Submission) => {
    // Lazy-load html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    const isFreeform = !!sub.answers?.freeform;
    let contentHtml = '';

    if (isFreeform) {
      // Prefer server-provided plain text; fall back to stripping HTML safely
      const plain = sub.answers.freeformPlain ?? (sub.answers.freeform ? (() => {
        try {
          const doc = new DOMParser().parseFromString(sub.answers.freeform, 'text/html');
          return doc.body.textContent || '';
        } catch (e) {
          return String(sub.answers.freeform || '');
        }
      })() : '');

      const escapeHtml = (str: string) =>
        str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      contentHtml = `<pre style="white-space:pre-wrap; font-family: 'Georgia', serif; color: #111; font-size:0.95rem; line-height:1.4; background:#fff; padding:16px; border-radius:8px;">${escapeHtml(plain)}</pre>`;
    } else {
      contentHtml = questions.map((q, i) => {
        const ansRaw = sub.answers?.[q.id] || '<em>No answer provided</em>';
        const ans = (() => {
          try {
            const doc = new DOMParser().parseFromString(String(ansRaw), 'text/html');
            return doc.body.textContent || '';
          } catch (e) {
            return String(ansRaw);
          }
        })();
        return `
            <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb">
              <p style="font-weight:700; color:#1e3a5f; margin-bottom:8px">Q${i + 1}. ${q.prompt} <span style="font-weight:400; color:#6b7280; font-size:0.85em">(${q.marks} mark${q.marks !== 1 ? 's' : ''})</span></p>
              <div style="padding-left:16px; color:#374151">${ans.replace(/\n/g, '<br>')}</div>
            </div>
          `;
      }).join('');
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-family: 'Georgia', serif; color: #111; max-width: 720px; margin: 0 auto; padding: 0">
        <div style="background:var(--color-primary); color:white; padding:32px 40px; margin-bottom:32px">
          <h1 style="margin:0 0 8px; font-size:1.4rem">${exam?.title ?? 'Exam'}</h1>
          <p style="margin:4px 0; font-size:0.9rem; opacity:0.8">Student: ${sub.studentName} &nbsp;|&nbsp; Reg: ${sub.studentRegNumber}</p>
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
    <div className="animate-pulse space-y-6 max-w-6xl mx-auto">
      <div className="h-12 bg-white/5 rounded-lg w-1/3"></div>
      <div className="flex gap-6 h-[600px]">
        <div className="w-1/3 bg-white/5 rounded-xl"></div>
        <div className="w-2/3 bg-white/5 rounded-xl"></div>
      </div>
    </div>
  );
  if (!exam) return <div className="text-center py-12 text-gray-500">Exam not found</div>;

  const getStatusBadge = (sub: Submission) => {
    if (!sub.isFinal) return <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-gray-500/10 border border-gray-500/30 text-gray-400">Working</span>;
    if (sub.marksAwarded !== undefined && sub.marksAwarded !== null) return <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--color-highlight)]/10 border border-[var(--color-highlight)]/30 text-[var(--color-highlight)]">Marked</span>;
    return <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-[var(--color-highlight)]/10 border border-[var(--color-highlight)]/30 text-[var(--color-highlight)]">Needs Marking</span>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <button 
            onClick={() => navigate(`/dashboard/exams/${id}`)} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 text-sm uppercase tracking-widest font-bold"
          >
            ← Back to Exam
          </button>
          <h2 className="text-3xl font-bold text-white tracking-wide">Submissions</h2>
          <p className="text-[var(--color-highlight)] text-sm tracking-widest uppercase mt-1">{exam.title}</p>
        </div>
        <div className="text-right bg-[var(--color-primary)] border border-white/5 px-6 py-4 rounded-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-[var(--color-highlight)] rounded-full mix-blend-screen filter blur-[30px] opacity-20 pointer-events-none"></div>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em] mb-1">Total Marks</p>
          <p className="text-3xl font-black text-[var(--color-highlight)]">{totalPossibleMarks}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
        
        {/* Left Column: List of Submissions */}
        <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-250px)] shadow-xl relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-danger)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
          <div className="p-6 border-b border-white/5 bg-[var(--color-primary)]/50 relative z-10 shrink-0">
            <h3 className="text-[12px] tracking-widest uppercase text-[var(--color-danger)] font-bold">Student Submissions <span className="ml-2 text-white bg-white/10 px-2 py-0.5 rounded">{submissions.length}</span></h3>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar relative z-10">
            {submissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No submissions yet.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {submissions.map(sub => (
                  <li 
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubmission(sub);
                      setMarks(sub.marksAwarded || 0);
                      setTeacherNote(sub.teacherNote || '');
                    }}
                    className={`p-5 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      selectedSubmission?.id === sub.id 
                        ? 'bg-white/5 border-l-4 border-l-[var(--color-danger)]' 
                        : 'hover:bg-white/5 border-l-4 border-l-transparent'
                    }`}
                  >
                    {selectedSubmission?.id === sub.id && (
                       <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[var(--color-danger)]/10 to-transparent pointer-events-none"></div>
                    )}
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <p className={`font-bold truncate pr-2 ${selectedSubmission?.id === sub.id ? 'text-white' : 'text-gray-300'}`}>
                        {sub.studentName} ({sub.studentRegNumber})
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(sub)}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadPdf(sub); }}
                          title="Download PDF"
                          className="flex items-center gap-2 px-3 py-1 border border-white/10 rounded-lg text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/8"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l4-4m-4 4l-4-4M21 21H3" /></svg>
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs mt-3 relative z-10">
                      <p className="text-gray-500 font-mono">{sub.submittedAt ? formatDate(sub.submittedAt) : 'In Progress'}</p>
                      {sub.marksAwarded != null && (
                        <p className="font-bold text-[var(--color-highlight)] tracking-widest">{sub.marksAwarded} / {totalPossibleMarks}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right Column: Submission Details & Marking */}
        <div className="lg:col-span-2 h-[calc(100vh-250px)]">
          {!selectedSubmission ? (
            <div className="bg-[var(--color-primary)] border border-white/5 border-dashed rounded-xl h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <p className="text-gray-400 text-sm tracking-wide">Select a student from the list to view their submission and assign marks.</p>
            </div>
          ) : (
            <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl h-full flex flex-col shadow-xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-10 pointer-events-none"></div>
              
              <div className="p-6 border-b border-white/5 bg-[var(--color-primary)]/50 shrink-0 relative z-10 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{selectedSubmission.studentName}</h3>
                  <p className="text-gray-500 text-xs tracking-wide">{selectedSubmission.studentRegNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownloadPdf(selectedSubmission)}
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-widest uppercase transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download PDF
                  </button>
                  <div className="text-right">
                    <p className="text-[10px] tracking-widest uppercase text-gray-500 font-bold mb-1">Submitted</p>
                    <p className="text-sm font-mono text-[var(--color-primary)]">
                      {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Not Finalized'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar bg-[var(--color-primary)] relative z-10">
                {selectedSubmission.answers?.freeform ? (
                  /* PDF exam — render free-form HTML or plain text if available */
                  selectedSubmission.answers.freeformPlain ? (
                    <div className="bg-white rounded-xl p-8 shadow-inner prose max-w-none text-gray-900 text-sm leading-relaxed">
                      <pre className="whitespace-pre-wrap font-sans text-sm">{selectedSubmission.answers.freeformPlain}</pre>
                    </div>
                  ) : (
                    <div
                      className="bg-white rounded-xl p-8 shadow-inner prose max-w-none text-gray-900 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedSubmission.answers.freeform }}
                    />
                  )
                ) : (
                  /* Builder exam — structured Q&A */
                  questions.map((q, idx) => (
                    <div key={q.id} className="bg-[var(--color-primary)] p-6 rounded-xl border border-white/5 shadow-lg relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]/50" />
                      <div className="flex justify-between items-start mb-4">
                        <div className="font-medium text-white max-w-[80%] leading-relaxed text-sm">
                          <span className="font-black text-[var(--color-primary)] mr-3 text-lg tracking-wider">Q{idx + 1}.</span>
                          {q.prompt}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[var(--color-primary)] border border-white/10 px-3 py-1.5 rounded">
                          {q.marks} Mark{q.marks !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-4 p-4 bg-[var(--color-primary)]/5 rounded-lg border border-[var(--color-primary)]/20">
                        <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest mb-3">Student's Answer</p>
                        {selectedSubmission.answers?.[q.id] ? (
                          q.type === 'long_answer'
                            ? <div className="text-gray-200 text-sm leading-relaxed prose-invert" dangerouslySetInnerHTML={{ __html: selectedSubmission.answers[q.id] }} />
                            : <p className="text-gray-200 text-sm">{selectedSubmission.answers[q.id]}</p>
                        ) : (
                          <p className="text-gray-500 italic text-sm">No answer provided.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-[var(--color-primary)]/80 shrink-0 relative z-10 backdrop-blur-md">
                <form onSubmit={handleMarkSubmission} className="flex gap-6 items-start">
                  <div className="w-32">
                    <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold mb-2 block">Marks (Max {totalPossibleMarks})</label>
                    <input
                      type="number"
                      min={0}
                      max={totalPossibleMarks}
                      required
                      value={marks}
                      onChange={(e) => setMarks(parseInt(e.target.value) || 0)}
                      className="w-full bg-[var(--color-primary)] text-[var(--color-highlight)] font-black text-center border border-[var(--color-highlight)]/30 rounded-lg p-3 focus:outline-none focus:border-[var(--color-highlight)] focus:ring-1 focus:ring-[var(--color-highlight)] transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold mb-2 block" htmlFor="note">Teacher Note (Optional)</label>
                    <textarea
                      id="note"
                      className="w-full bg-[var(--color-primary)] text-white placeholder-gray-600 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors resize-none"
                      rows={2}
                      placeholder="Add feedback for the student..."
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                    />
                  </div>
                  <div className="pt-6">
                    <button 
                      type="submit" 
                      disabled={isSaving || !selectedSubmission.isFinal}
                      className="px-8 py-3 bg-[var(--color-highlight)] hover:bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-highlight-rgb),0.4)] disabled:opacity-50 disabled:shadow-none whitespace-nowrap"
                    >
                      {isSaving ? 'Saving...' : 'Save Marks'}
                    </button>
                  </div>
                </form>
                {!selectedSubmission.isFinal && (
                  <p className="text-[10px] tracking-widest uppercase text-[var(--color-highlight)] mt-4 font-bold flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Warning: This exam is still in draft state. The student has not submitted it.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


