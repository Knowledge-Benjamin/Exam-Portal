import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

export function ExamJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState('');
  const [studentRegNumber, setStudentRegNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRegNumber.trim()) {
      setError('Both name and registration number are required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post(`/seb/join/${token}`, {
        studentName,
        studentRegNumber,
      }, { withCredentials: true });

      if (res.data.ok) {
        navigate(`/exam/${res.data.examId}`);
      }
    } catch (err: any) {
      setError(err.error || 'Failed to join the exam. Please check your token or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f3261] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#1a4478] mix-blend-screen filter blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#2d6fba] mix-blend-screen filter blur-[150px] opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-6 backdrop-blur-xl shadow-2xl">
            <svg className="w-8 h-8 text-[#00f2fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Join Exam</h1>
          <p className="text-[#2d6fba] font-medium tracking-wide">Enter your details to begin the assessment</p>
        </div>

        <form onSubmit={handleJoin} className="bg-[#1a4478]/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-12 duration-700 delay-150 fill-mode-both relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#00f2fe] rounded-full mix-blend-screen filter blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700"></div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 backdrop-blur-md">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#2d6fba] mb-2 pl-1">Full Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-[#0f3261]/50 border border-white/10 text-white p-4 rounded-xl focus:border-[#00f2fe]/50 focus:ring-1 focus:ring-[#00f2fe]/50 outline-none transition-all placeholder:text-gray-500"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#2d6fba] mb-2 pl-1">Registration Number</label>
              <input
                type="text"
                value={studentRegNumber}
                onChange={(e) => setStudentRegNumber(e.target.value)}
                className="w-full bg-[#0f3261]/50 border border-white/10 text-white p-4 rounded-xl focus:border-[#00f2fe]/50 focus:ring-1 focus:ring-[#00f2fe]/50 outline-none transition-all placeholder:text-gray-500"
                placeholder="REG/2023/001"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-[#00f2fe] to-[#4facfe] hover:from-[#00e1eb] hover:to-[#3e9ceb] text-[#0f3261] font-bold text-lg rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:shadow-[0_0_30px_rgba(0,242,254,0.5)] transition-all border-none"
              isLoading={isLoading}
            >
              Enter Exam Room
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
