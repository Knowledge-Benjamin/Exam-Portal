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
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #102b4e 0%, #1d456a 60%, #1a3a6b 100%)',
        padding: '1.5rem',
        fontFamily: 'var(--sans)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '55%',
          height: '65%',
          background: 'rgba(37,99,235,0.18)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px' }}>
        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img
            src="/logo_asset.png"
            alt="Multitech Business School"
            style={{ width: '72px', height: '72px', objectFit: 'contain', marginBottom: '1rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
          />
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(228,198,110,0.9)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Multitech Business School
          </div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#ffffff', margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Exam Portal
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(220,38,38,0.2)',
            border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.875rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Email */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.5)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem', transition: 'border-color 0.2s' }}>
              <svg style={{ width: '1.1rem', height: '1.1rem', color: 'rgba(255,255,255,0.65)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
                placeholder="Email address"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.5)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <svg style={{ width: '1.1rem', height: '1.1rem', color: 'rgba(255,255,255,0.65)', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <div style={{ position: 'relative', width: 16, height: 16, border: '1px solid rgba(255,255,255,0.6)', borderRadius: '3px', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                {rememberMe && (
                  <svg viewBox="0 0 14 14" fill="none" style={{ width: 10, height: 10, pointerEvents: 'none' }}>
                    <path d="M11.6666 3.5L5.24992 9.91667L2.33325 7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)' }}>Remember me</span>
            </label>

            <a href="#" style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { if (!isLoading) (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
          >
            {isLoading ? (
              <svg style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 0.8s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
