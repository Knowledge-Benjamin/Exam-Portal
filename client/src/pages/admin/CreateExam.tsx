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
    startTime: toDatetimeLocal(new Date(Date.now() + 86400000).toISOString()), // Default: tomorrow
    durationMinutes: 60,
    windowBufferMinutes: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Convert local datetime-local string to ISO UTC
      const startTimeISO = new Date(formData.startTime).toISOString();
      const payload = {
        ...formData,
        startTime: startTimeISO,
      };

      const { data } = await api.post('/exams', payload);
      navigate(`/dashboard/exams/${data.exam.id}`);
    } catch (err: any) {
      setError(err.error || 'Failed to create exam');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      
      {/* Breadcrumb */}
      <div className="flex items-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-8">
        <span className="text-gray-500 hover:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>DASHBOARD</span> 
        <span className="mx-2">/</span> 
        <span className="text-gray-500 hover:text-white cursor-pointer" onClick={() => navigate('/dashboard')}>EXAMS</span>
        <span className="mx-2">/</span>
        <span className="text-[#00f2fe]">CREATE</span>
      </div>

      <div className="mb-8">
        <h2 className="text-[18px] uppercase tracking-[0.2em] font-bold text-white">Create New Exam</h2>
        <div className="h-1 w-12 bg-gradient-to-r from-[#00f2fe] to-transparent mt-2 rounded-full mb-4"></div>
        <p className="text-gray-400 text-sm tracking-wide">Configure a new secure assessment environment.</p>
      </div>

      <div className="bg-[#1a4478] border border-white/5 p-6 sm:p-8 rounded-xl shadow-2xl">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-2">
            <label className="text-[11px] tracking-widest uppercase text-[#00f2fe] font-bold" htmlFor="title">EXAM TITLE</label>
            <input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Midterm Computer Science 101"
              className="w-full bg-[#0f3261] border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] tracking-widest uppercase text-gray-400 font-bold" htmlFor="description">DESCRIPTION (OPTIONAL)</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions or information for students"
              rows={3}
              className="w-full bg-[#0f3261] border border-white/10 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all resize-none"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] tracking-widest uppercase text-gray-400 font-bold">QUESTION SOURCE</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label 
                className={`text-left relative border rounded-lg p-5 cursor-pointer transition-all duration-300 overflow-hidden select-none ${
                  formData.questionSource === 'builder' 
                    ? 'border-[#00f2fe] bg-[#00f2fe]/10 shadow-[0_0_15px_rgba(0,242,254,0.15)]' 
                    : 'border-white/10 bg-[#0f3261] hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <input 
                    type="radio" 
                    name="questionSource" 
                    value="builder"
                    checked={formData.questionSource === 'builder'}
                    onChange={() => setFormData(prev => ({ ...prev, questionSource: 'builder' }))}
                    className="w-5 h-5 text-[#00f2fe] bg-[#0f3261] border-gray-500 focus:ring-[#00f2fe] focus:ring-2 cursor-pointer"
                  />
                  <div className={`font-bold text-sm tracking-wide ${formData.questionSource === 'builder' ? 'text-[#00f2fe]' : 'text-white'}`}>
                    Question Builder
                  </div>
                </div>
                <div className="text-[12px] text-gray-400 pl-8">
                  Create questions directly using the interactive portal tools.
                </div>
              </label>
              
              <label 
                className={`text-left relative border rounded-lg p-5 cursor-pointer transition-all duration-300 overflow-hidden select-none ${
                  formData.questionSource === 'pdf' 
                    ? 'border-[#fe0979] bg-[#fe0979]/10 shadow-[0_0_15px_rgba(254,9,121,0.15)]' 
                    : 'border-white/10 bg-[#0f3261] hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <input 
                    type="radio" 
                    name="questionSource" 
                    value="pdf"
                    checked={formData.questionSource === 'pdf'}
                    onChange={() => setFormData(prev => ({ ...prev, questionSource: 'pdf' }))}
                    className="w-5 h-5 text-[#fe0979] bg-[#0f3261] border-gray-500 focus:ring-[#fe0979] focus:ring-2 cursor-pointer"
                  />
                  <div className={`font-bold text-sm tracking-wide ${formData.questionSource === 'pdf' ? 'text-[#fe0979]' : 'text-white'}`}>
                    Upload PDF
                  </div>
                </div>
                <div className="text-[12px] text-gray-400 pl-8">
                  Upload an existing PDF document containing the questions.
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="space-y-2">
              <label className="text-[11px] tracking-widest uppercase text-gray-400 font-bold" htmlFor="startTime">START DATE & TIME</label>
              <input
                id="startTime"
                type="datetime-local"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] tracking-widest uppercase text-gray-400 font-bold" htmlFor="durationMinutes">DURATION (MINUTES)</label>
              <input
                id="durationMinutes"
                type="number"
                min={5}
                max={480}
                required
                value={formData.durationMinutes}
                onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                className="w-full bg-[#0f3261] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all"
              />
            </div>
          </div>

          {/* SEB Config Key must be generated after the exam link (gate URL) is created. Use the Exam Builder to add the key after publishing. */}

          <div className="flex items-center justify-end gap-4 pt-8 border-t border-white/10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-[#00f2fe] hover:bg-[#00d0db] text-[#0f3261] rounded-lg text-[11px] font-bold tracking-[0.2em] uppercase transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4 text-[#0f3261]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Create Exam'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
