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
        options: qType === 'multiple_choice' ? qOptions.filter(o => o.trim() !== '') : undefined,
      };

      const { data } = await api.post(`/exams/${id}/questions`, payload);
      setQuestions([...questions, data.question]);
      
      // Reset form
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
      setQuestions(questions.filter(q => q.id !== qId));
    } catch (err: any) {
      alert(err.error || 'Failed to delete question');
    }
  };

  if (isLoading) return (
    <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
      <div className="h-12 bg-white/5 rounded-lg w-1/3"></div>
      <div className="h-64 bg-white/5 rounded-xl w-full"></div>
    </div>
  );
  if (!exam) return <div className="text-center py-12 text-gray-500">Exam not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(`/dashboard/exams/${id}`)} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2 text-sm uppercase tracking-widest font-bold"
          >
            ← Back to Exam
          </button>
          <h2 className="text-3xl font-bold text-white tracking-wide">Content Builder</h2>
          <p className="text-[var(--color-primary)] text-sm tracking-widest uppercase mt-1">{exam.title}</p>
        </div>
        {/* Allow editing SEB key even after publish so teachers can paste the key after generating it from the SEB tool. */}
        {(
          <div className="ml-4">
            {!editingSebKey ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">SEB Key: {exam.sebConfigKey ? 'Set' : 'Not set'}</span>
                <button onClick={() => setEditingSebKey(true)} className="px-3 py-2 bg-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-xs font-bold">Edit</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  value={sebKeyInput}
                  onChange={(e) => setSebKeyInput(e.target.value)}
                  placeholder="SEB Config Key"
                  className="bg-[var(--color-primary)] border border-white/10 rounded-lg p-2 text-sm text-white"
                />
                <button
                  onClick={async () => {
                    try {
                      await api.patch(`/exams/${id}`, { sebConfigKey: sebKeyInput });
                      setExam((prev) => prev ? { ...prev, sebConfigKey: sebKeyInput } : prev);
                      setEditingSebKey(false);
                      alert('SEB Config Key saved');
                    } catch (err: any) {
                      alert(err.error || 'Failed to save SEB Config Key');
                    }
                  }}
                  className="px-3 py-2 bg-[var(--color-highlight)] text-[var(--color-primary)] rounded-lg text-xs font-bold"
                >
                  Save
                </button>
                <button onClick={() => { setEditingSebKey(false); setSebKeyInput(exam.sebConfigKey ?? ''); }} className="px-3 py-2 text-sm text-gray-400">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      {exam.status !== 'draft' && (
        <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] p-4 rounded-xl text-sm flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse"></span>
          This exam is {exam.status}. You cannot modify its content.
        </div>
      )}

      {/* PDF Upload Section */}
      {exam.questionSource === 'pdf' && (
        <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-danger)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
          
          <h3 className="text-[12px] tracking-widest uppercase text-[var(--color-danger)] font-bold mb-4 relative z-10">Upload Question Paper</h3>
          <p className="text-sm text-gray-400 mb-6 relative z-10 max-w-lg">
            Upload the PDF that students will see on the left side of their screen during the exam.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 relative z-10">
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              disabled={exam.status !== 'draft'}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || exam.status !== 'draft'}
              className="px-6 py-3 bg-[#1a4a85] border border-[var(--color-danger)]/50 hover:bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Select PDF File'}
            </button>
            {exam.pdfPath && (
              <span className="text-sm text-[var(--color-highlight)] font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {exam.pdfPath}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Questions Section */}
      <div className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div>
            <h3 className="text-[12px] tracking-widest uppercase text-[var(--color-primary)] font-bold mb-2">Questions List</h3>
            <p className="text-sm text-gray-400">
              {exam.questionSource === 'pdf' 
                ? 'Add answer fields for the students to fill in corresponding to your PDF.' 
                : 'Build the full exam questions here.'}
            </p>
          </div>
          {exam.status === 'draft' && !showForm && (
            <button 
              onClick={() => setShowForm(true)} 
              className="px-6 py-3 bg-[var(--color-primary)] hover:bg-[#00d0db] text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)]"
            >
              Add Question
            </button>
          )}
        </div>

        {/* Question Form */}
        {showForm && exam.status === 'draft' && (
          <form onSubmit={handleAddQuestion} className="bg-[var(--color-primary)] p-6 rounded-xl border border-[var(--color-primary)]/30 mb-8 space-y-6 relative z-10 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.05)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">Type</label>
                <select 
                  className="w-full bg-[var(--color-primary)] text-white border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors" 
                  value={qType} 
                  onChange={(e) => setQType(e.target.value as QuestionType)}
                >
                  <option value="short_answer">Short Answer</option>
                  <option value="long_answer">Long Answer</option>
                  <option value="multiple_choice">Multiple Choice</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">Marks</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={qMarks}
                  onChange={(e) => setQMarks(parseInt(e.target.value) || 1)}
                  className="w-full bg-[var(--color-primary)] text-white border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">Prompt / Question Text</label>
              <textarea
                required
                rows={3}
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder={exam.questionSource === 'pdf' ? 'e.g. Question 1 (a)' : 'What is the capital of France?'}
                className="w-full bg-[var(--color-primary)] text-white placeholder-gray-600 border border-white/10 rounded-lg p-4 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors resize-y custom-scrollbar"
              />
            </div>

            {qType === 'multiple_choice' && (
              <div className="space-y-4">
                <label className="text-[10px] tracking-widest uppercase text-gray-400 font-bold">Options</label>
                <div className="space-y-3">
                  {qOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-3">
                      <input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...qOptions];
                          newOpts[idx] = e.target.value;
                          setQOptions(newOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        required={idx < 2}
                        className="flex-1 bg-[var(--color-primary)] text-white placeholder-gray-600 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
                      />
                      <button 
                        type="button" 
                        onClick={() => setQOptions(qOptions.filter((_, i) => i !== idx))}
                        disabled={qOptions.length <= 2}
                        className="px-4 bg-[var(--color-primary)] border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={() => setQOptions([...qOptions, ''])}
                  className="px-4 py-2 border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all"
                >
                  Add Option
                </button>
              </div>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 text-gray-400 hover:text-white rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[#00d0db] text-[var(--color-primary)] rounded-lg text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.4)]"
              >
                Save Question
              </button>
            </div>
          </form>
        )}

        {/* Questions List */}
        <div className="space-y-4 relative z-10">
          {questions.length === 0 && !showForm ? (
            <div className="text-center py-16 border border-white/5 border-dashed rounded-xl bg-[var(--color-primary)]/50">
              <p className="text-gray-500 text-sm tracking-wide">No questions added yet.</p>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className="bg-[var(--color-primary)] border border-white/5 rounded-xl p-6 flex justify-between items-start group hover:border-[var(--color-primary)]/50 transition-all duration-300 shadow-lg relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-primary)]/0 group-hover:bg-[var(--color-primary)] transition-colors duration-300"></div>
                <div className="pl-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[var(--color-primary)] font-black text-lg tracking-wider">Q{idx + 1}.</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/10">
                      {QUESTION_TYPE_LABELS[q.type]}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-highlight)]">
                      {q.marks} mark{q.marks !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-white text-sm leading-relaxed">{q.prompt}</p>
                  
                  {q.type === 'multiple_choice' && q.options && (
                    <ul className="mt-4 space-y-2">
                      {q.options.map((opt, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                
                {exam.status === 'draft' && (
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                    title="Delete Question"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


