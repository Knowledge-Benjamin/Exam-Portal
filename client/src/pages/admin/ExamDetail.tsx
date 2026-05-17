import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration, formatDateTimeCompact } from '../../utils/formatters';
import { useExamRoomMonitor } from '../../hooks/useExamRoomMonitor';

export function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamWithGateUrl | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);
  const [editingSebKey, setEditingSebKey] = useState(false);
  const [sebKeyInput, setSebKeyInput] = useState('');

  const { connectionStatus, roomState, logs, remainingSeconds, error: monitorError } = useExamRoomMonitor(id);

  useEffect(() => {
    fetchExam();
  }, [id]);

  const fetchExam = async () => {
    try {
      const examRes = await api.get(`/exams/${id}`);
      setExam(examRes.data.exam);
      setSebKeyInput(examRes.data.exam.sebConfigKey ?? '');
    } catch (err: any) {
      setError(err.error || 'Failed to load exam details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this exam? Students will be able to access it via SEB.')) {
      return;
    }
    
    setIsPublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/publish`);
      setExam({ ...data.exam, sebGateUrl: data.sebGateUrl });
    } catch (err: any) {
      alert(err.error || 'Failed to publish exam');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to close this exam? It will end the session for all active students.')) {
      return;
    }
    
    try {
      const { data } = await api.post(`/exams/${id}/close`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Failed to close exam');
    }
  };

  const handleRepublish = async () => {
    if (!window.confirm('Republish this exam? Students with the existing SEB link will be able to re-enter.')) {
      return;
    }
    setIsRepublishing(true);
    try {
      const { data } = await api.post(`/exams/${id}/republish`);
      setExam(data.exam);
    } catch (err: any) {
      alert(err.error || 'Cannot republish: the exam window has already closed.');
    } finally {
      setIsRepublishing(false);
    }
  };

  // Republish is allowed only while the exam window is still open
  const canRepublish = exam
    ? new Date() <= new Date(new Date(exam.endTime).getTime() + exam.windowBufferMinutes * 60 * 1000)
    : false;

  if (isLoading) return (
    <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
      <div className="h-12 bg-white/5 rounded-lg w-1/3"></div>
      <div className="h-64 bg-white/5 rounded-xl w-full"></div>
    </div>
  );
  if (!exam) return <div className="text-center py-12 text-gray-500">Exam not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--color-primary)] border border-white/5 p-6 sm:p-8 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">{exam.title}</h2>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-sm border ${
              exam.status === 'active' ? 'text-[var(--color-danger)] border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10' :
              exam.status === 'draft' ? 'text-[var(--color-highlight)] border-[var(--color-highlight)]/30 bg-[var(--color-highlight)]/10' :
              'text-gray-400 border-gray-400/30 bg-gray-400/10'
            }`}>
              {exam.status}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{exam.description || 'No description provided'}</p>
        </div>
        
        <div className="flex gap-3 relative z-10">
          {exam.status === 'draft' && (
            <button 
              onClick={handlePublish} 
              disabled={isPublishing} 
              className="px-6 py-2.5 bg-[var(--color-danger)] hover:bg-[#d60665] text-white rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-danger-rgb),0.4)] disabled:opacity-50"
            >
              {isPublishing ? 'Publishing...' : 'Publish Exam'}
            </button>
          )}
          {exam.status === 'active' && (
            <button 
              onClick={handleClose} 
              className="px-6 py-2.5 border border-red-500/50 hover:bg-red-500/10 text-red-400 rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all"
            >
              Close Exam
            </button>
          )}
          {exam.status === 'closed' && (
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={handleRepublish}
                disabled={isRepublishing || !canRepublish}
                title={!canRepublish ? 'Exam window has passed — republishing is disabled' : 'Reopen exam for students'}
                className="px-6 py-2.5 bg-[var(--color-highlight)] hover:bg-[#e09600] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-highlight-rgb),0.3)]"
              >
                {isRepublishing ? 'Republishing...' : 'Republish Exam'}
              </button>
              {!canRepublish && (
                <p className="text-[10px] text-red-400/70 tracking-wide">Window expired</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SEB Gate URL & Config Key Section */}
      {exam.sebGateUrl && (
        <div className="space-y-6">
          <div className="bg-[var(--color-primary)] border border-[var(--color-highlight)]/30 p-6 rounded-xl relative overflow-hidden group shadow-[0_0_20px_rgba(var(--color-highlight-rgb),0.05)]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--color-highlight)] rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>
            <h3 className="text-[var(--color-highlight)] font-bold tracking-widest text-sm uppercase mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-highlight)] animate-pulse"></span>
              Exam is Published
            </h3>
            <p className="mb-4 text-sm text-gray-400">
              Embed this URL in your Safe Exam Browser <code className="text-[var(--color-highlight)]">.seb</code> configuration file.
              Students must use this exact SEB profile to take the exam.
            </p>
            <div className="flex items-center gap-3">
              <code className="bg-[var(--color-primary)] px-4 py-3 rounded-lg flex-1 select-all overflow-x-auto text-[var(--color-highlight)] border border-white/10 font-mono text-sm tracking-tight shadow-inner">
                {exam.sebGateUrl}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(exam.sebGateUrl!);
                  alert('Copied to clipboard');
                }}
                className="px-6 py-3 border border-[var(--color-highlight)]/50 hover:bg-[var(--color-highlight)]/10 text-[var(--color-highlight)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all whitespace-nowrap"
              >
                Copy URL
              </button>
            </div>
          </div>

          {/* SEB Config Key Input */}
          <div className="bg-[var(--color-primary)] border border-[var(--color-primary)]/30 p-6 rounded-xl relative overflow-hidden group shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.05)]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>
            <div className="flex items-start justify-between gap-4 relative z-10">
              <div className="flex-1">
                <h3 className="text-[var(--color-primary)] font-bold tracking-widest text-sm uppercase mb-2">Safe Exam Browser Config Key</h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  1. Use the gate URL above with the SEB Configuration Tool to generate a config key. 2. Paste the generated key below to enforce strict SEB settings validation.
                </p>
              </div>
            </div>
            {!editingSebKey ? (
              <div className="flex items-center gap-3 relative z-10">
                {exam.sebConfigKey ? (
                  <div className="flex-1 flex items-center gap-3 bg-[var(--color-primary)] px-4 py-3 rounded-lg border border-[var(--color-highlight)]/30">
                    <span className="text-[var(--color-highlight)] text-sm font-mono truncate">{exam.sebConfigKey.substring(0, 16)}...</span>
                    <button 
                      onClick={() => setEditingSebKey(true)}
                      className="ml-auto px-3 py-2 bg-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-xs font-bold hover:bg-[#00d0db] transition-all"
                    >
                      Update
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setEditingSebKey(true)}
                    className="flex-1 px-4 py-3 border border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all"
                  >
                    Add Config Key
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 relative z-10">
                <input
                  type="text"
                  value={sebKeyInput}
                  onChange={(e) => setSebKeyInput(e.target.value)}
                  placeholder="Paste the SEB config key here..."
                  className="flex-1 bg-[var(--color-primary)] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-sm"
                />
                <button
                  onClick={async () => {
                    try {
                      await api.patch(`/exams/${id}`, { sebConfigKey: sebKeyInput });
                      setExam((prev) => prev ? { ...prev, sebConfigKey: sebKeyInput } : prev);
                      setEditingSebKey(false);
                      alert('SEB Config Key saved successfully');
                    } catch (err: any) {
                      alert(err.error || 'Failed to save SEB Config Key');
                    }
                  }}
                  className="px-4 py-3 bg-[var(--color-highlight)] hover:bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-highlight-rgb),0.3)]"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingSebKey(false);
                    setSebKeyInput(exam.sebConfigKey ?? '');
                  }}
                  className="px-4 py-3 text-gray-400 hover:text-white text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Questions */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <h3 className="text-[12px] tracking-widest uppercase text-gray-500 font-bold mb-6">Exam Settings</h3>
            
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary)] font-bold mb-2">START TIME</p>
                <p className="text-white">{formatDate(exam.startTime)}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary)] font-bold mb-2">DURATION</p>
                <p className="text-white">{formatDuration(exam.durationMinutes)}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary)] font-bold mb-2">QUESTION SOURCE</p>
                <p className="text-white">{exam.questionSource === 'pdf' ? 'PDF Upload' : 'Custom Builder'}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-primary)] font-bold mb-2">WINDOW BUFFER</p>
                <p className="text-white">±{exam.windowBufferMinutes} minutes</p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-danger)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className="text-[12px] tracking-widest uppercase text-gray-500 font-bold">Exam Content</h3>
              {exam.status === 'draft' && (
                <button 
                  onClick={() => navigate(`/dashboard/exams/${exam.id}/builder`)}
                  className="px-4 py-2 border border-white/10 hover:border-[var(--color-danger)]/50 hover:text-[var(--color-danger)] text-gray-400 rounded-lg text-[10px] font-bold tracking-[0.2em] uppercase transition-all"
                >
                  Manage Content
                </button>
              )}
            </div>
            
            {exam.questionSource === 'pdf' ? (
              <div className="bg-[var(--color-primary)] border border-white/5 p-6 rounded-lg text-center relative z-10">
                {exam.pdfPath ? (
                  <p className="text-[var(--color-highlight)] text-sm tracking-wide flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    PDF Question Paper Uploaded
                  </p>
                ) : (
                  <p className="text-[var(--color-danger)] text-sm tracking-wide flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    No PDF Uploaded Yet
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-[var(--color-primary)] border border-white/5 p-6 rounded-lg text-center relative z-10">
                <p className="text-gray-400 text-sm tracking-wide">Questions are managed directly in the builder.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Students & Submissions */}
        <div className="space-y-8">


          <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-highlight)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <h3 className="text-[12px] tracking-widest uppercase text-[var(--color-highlight)] font-bold mb-3 relative z-10">Submissions</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed relative z-10">
              Review answers, verify integrity, and grade completed assessments.
            </p>
            <button 
              disabled={exam.status === 'draft'}
              onClick={() => navigate(`/dashboard/exams/${exam.id}/submissions`)}
              className="w-full px-4 py-3 bg-[var(--color-highlight)] hover:bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-lg text-[10px] font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-highlight-rgb),0.4)] disabled:opacity-50 disabled:shadow-none relative z-10"
            >
              View Submissions
            </button>
          </div>

          <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[12px] tracking-widest uppercase text-[var(--color-highlight)] font-bold">Live Exam Room</h3>
                  <p className="text-xs text-gray-500">Real-time student presence, joins, exits, and room history.</p>
                </div>
                <span className={`text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1 rounded ${connectionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : connectionStatus === 'connecting' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' : 'bg-red-500/10 text-red-300 border border-red-500/20'}`}>
                  {connectionStatus.replace('ed', '')}
                </span>
              </div>

              {monitorError && (
                <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {monitorError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl bg-[var(--color-primary)]/80 p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Students in room</p>
                  <p className="text-3xl font-black text-white">{roomState.currentCount}</p>
                </div>
                <div className="rounded-xl bg-[var(--color-primary)]/80 p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Timer sync</p>
                  <p className="text-3xl font-black text-white">{remainingSeconds !== null ? `${remainingSeconds}s` : '—'}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Connected participants</p>
                  {roomState.participants.length === 0 ? (
                    <p className="text-gray-400 text-sm">No students have joined the exam room yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {roomState.participants.map((participant) => (
                        <div key={participant.submissionId} className="rounded-xl border border-white/10 p-3 bg-[var(--color-primary)]/60">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{participant.studentName}</p>
                              <p className="text-[11px] text-gray-400 font-mono">{participant.studentRegNumber}</p>
                            </div>
                            <span className={`text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-1 rounded ${participant.isConnected ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-gray-500/10 text-gray-300 border border-gray-500/20'}`}>
                              {participant.isConnected ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div className="mt-3 text-[11px] text-gray-400 grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500">Joined</p>
                              <p>{formatDateTimeCompact(participant.firstJoinedAt)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.2em] text-gray-500">Last {participant.isConnected ? 'active' : 'seen'}</p>
                              <p>{formatDateTimeCompact(participant.lastSeenAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Join / Exit log</p>
                {logs.length === 0 ? (
                  <p className="text-gray-400 text-sm">No activity yet. Changes appear here as students join or leave.</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[var(--color-primary)]/70 p-4 custom-scrollbar text-sm text-gray-300">
                    {logs.slice(0, 10).map((event) => (
                      <div key={`${event.submissionId}-${event.timestamp}`} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">{event.studentName}</p>
                          <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">{event.type}</span>
                        </div>
                        <p className="text-[12px] text-gray-400">{event.message}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{formatDateTimeCompact(event.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


