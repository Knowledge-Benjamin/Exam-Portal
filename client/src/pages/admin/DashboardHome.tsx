import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import type { ExamWithGateUrl } from '../../types';
import { formatDate, formatDuration } from '../../utils/formatters';

export function DashboardHome() {
  const [exams, setExams] = useState<ExamWithGateUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data } = await api.get('/exams');
      setExams(data.exams);
    } catch (err: any) {
      setError(err.error || 'Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#00f2fe] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeExams = exams.filter(e => e.status === 'active').length;
  const draftExams = exams.filter(e => e.status === 'draft').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Breadcrumb */}
      <div className="flex items-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">
        <span className="text-white">DASHBOARD</span> 
        <span className="mx-2">/</span> 
        <span className="text-[#00f2fe]">HOME</span>
      </div>

      {/* Top Metrics Row - Replicating the vibrant circle charts from the reference */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1 */}
        <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2fe] rounded-full mix-blend-screen filter blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
          
          <div className="w-[88px] h-[88px] rounded-full border-[5px] border-[#1f0d36] border-t-[#00f2fe] border-r-[#00f2fe] flex items-center justify-center shadow-[0_0_25px_rgba(0,242,254,0.2)] mb-6">
            <span className="text-white text-xl font-bold">{exams.length}</span>
          </div>
          
          <h3 className="text-[11px] tracking-widest uppercase text-[#00f2fe] font-bold mb-3">TOTAL EXAMS</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed px-2">
            Total number of examinations created in the system.
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe0979] rounded-full mix-blend-screen filter blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
          
          <div className="w-[88px] h-[88px] rounded-full border-[5px] border-[#1f0d36] border-t-[#fe0979] border-r-[#fe0979] flex items-center justify-center shadow-[0_0_25px_rgba(254,9,121,0.2)] mb-6">
            <span className="text-white text-xl font-bold">{activeExams}</span>
          </div>
          
          <h3 className="text-[11px] tracking-widest uppercase text-[#fe0979] font-bold mb-3">PUBLISHED</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed px-2">
            Exams currently active and accessible via SEB.
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8 relative overflow-hidden group flex flex-col items-center text-center">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff87] rounded-full mix-blend-screen filter blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
          
          <div className="w-[88px] h-[88px] rounded-full border-[5px] border-[#1f0d36] border-t-[#00ff87] border-r-[#00ff87] flex items-center justify-center shadow-[0_0_25px_rgba(0,255,135,0.2)] mb-6">
            <span className="text-white text-xl font-bold">{draftExams}</span>
          </div>
          
          <h3 className="text-[11px] tracking-widest uppercase text-[#00ff87] font-bold mb-3">DRAFTS</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed px-2">
            Exams currently in preparation phase.
          </p>
        </div>

        {/* Action Panel */}
        <div className="bg-gradient-to-br from-[#2d6fba] to-[#0c3975] border border-[#fe0979]/30 rounded-xl p-6 flex flex-col justify-center">
          <h3 className="text-[11px] tracking-widest uppercase text-[#fe0979] font-bold mb-2">QUICK ACTION</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Configure a new secure assessment environment.
          </p>
          <Link 
            to="/dashboard/exams/create"
            className="w-full py-3 bg-[#fe0979] hover:bg-[#d60665] text-white text-[11px] font-bold tracking-[0.2em] uppercase rounded-lg transition-all text-center shadow-[0_0_20px_rgba(254,9,121,0.4)]"
          >
            CREATE EXAM
          </Link>
        </div>

      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Main Exams List Container */}
      <div className="bg-[#1a4478] border border-white/5 rounded-xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[14px] uppercase tracking-[0.2em] font-bold text-white">PROJECTS / EXAMS</h2>
            <div className="h-1 w-12 bg-gradient-to-r from-[#00f2fe] to-transparent mt-2 rounded-full"></div>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-lg">
            <p className="text-sm text-gray-500 tracking-widest uppercase">No data available</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <div key={exam.id} className="group bg-[#0f3261] border border-white/5 rounded-xl p-6 hover:border-[#00f2fe]/30 transition-all hover:shadow-[0_0_30px_rgba(0,242,254,0.1)] relative overflow-hidden">
                
                {/* Accent glow on hover */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#00f2fe] rounded-full mix-blend-screen filter blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity"></div>

                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-sm font-bold text-white tracking-wide truncate pr-4">{exam.title}</h3>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm border ${
                    exam.status === 'active' ? 'text-[#00ff87] border-[#00ff87]/30 bg-[#00ff87]/10' :
                    exam.status === 'draft' ? 'text-gray-400 border-gray-400/30 bg-gray-400/10' :
                    'text-[#fe0979] border-[#fe0979]/30 bg-[#fe0979]/10'
                  }`}>
                    {exam.status}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest">STARTS</span>
                    <span className="text-[12px] text-gray-300">{formatDate(exam.startTime)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest">DURATION</span>
                    <span className="text-[12px] text-gray-300">{formatDuration(exam.durationMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500 uppercase tracking-widest">TYPE</span>
                    <span className="text-[12px] text-[#00f2fe]">{exam.questionSource === 'pdf' ? 'PDF' : 'BUILDER'}</span>
                  </div>
                </div>

                <div className="mt-8 pt-4">
                  <Link 
                    to={`/dashboard/exams/${exam.id}`} 
                    className="block w-full py-2.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold tracking-[0.2em] uppercase rounded transition-all text-center"
                  >
                    MANAGE
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
