import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      setUser(data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.error || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#2d6fba] font-sans">
      
      {/* Mesh Gradient Background Simulation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Top left lighter blue */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#6aaae6] rounded-full mix-blend-normal filter blur-[140px] opacity-90"></div>
        {/* Bottom right darker blue */}
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[80%] bg-[#0f3261] rounded-full mix-blend-normal filter blur-[150px] opacity-100"></div>
        {/* Center-left very dark base to create gradient depth */}
        <div className="absolute top-[30%] left-[20%] w-[50%] h-[50%] bg-[#1a4a85] rounded-full mix-blend-normal filter blur-[120px] opacity-60"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-[380px] flex flex-col items-center px-6 py-12">
        
        {/* Circular Profile Icon matching the image */}
        <div className="w-[88px] h-[88px] bg-[#1a4478] rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/10">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        
        <h1 className="text-white text-[22px] font-light tracking-[0.15em] uppercase mb-10 text-center">
          Exam Portal
        </h1>

        {error && (
          <div className="w-full mb-6 p-3 bg-red-500/20 border border-red-400/50 rounded flex items-center justify-center text-white text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full mt-8 flex flex-col gap-10">
          
          <div className="flex flex-col gap-8">
            {/* Email ID Field */}
            <div className="border-b border-white/70 py-2 flex items-center gap-4 transition-transform duration-300 focus-within:scale-[1.02] focus-within:border-white">
              {/* Envelope Icon */}
              <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:border-none focus:outline-none focus-visible:outline-none shadow-none text-white placeholder:text-white/80 text-[15px]"
                placeholder="Email ID"
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="border-b border-white/70 py-2 flex items-center gap-4 transition-transform duration-300 focus-within:scale-[1.02] focus-within:border-white">
              {/* Lock Icon */}
              <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none outline-none ring-0 focus:ring-0 focus:border-none focus:outline-none focus-visible:outline-none shadow-none text-white placeholder:text-white/80 text-[15px]"
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between -mt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="w-[16px] h-[16px] border border-white/80 rounded-[3px] bg-transparent flex items-center justify-center relative transition-transform group-hover:scale-110">
                <input 
                  type="checkbox" 
                  className="peer absolute inset-0 opacity-0 cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <svg className="w-3 h-3 text-transparent peer-checked:text-white pointer-events-none" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[13px] text-white/90 tracking-wide">Remember me</span>
            </label>
            
            <a href="#" className="text-[13px] !text-white italic hover:text-white/80 transition-colors tracking-wide hover:underline">
              Forgot Password?
            </a>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: '#0c3975' }}
              className="w-full py-3.5 rounded-md text-white text-[13px] font-semibold tracking-wider transition-all duration-300 hover:bg-[#092955] hover:shadow-lg hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'LOGIN'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
