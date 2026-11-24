import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('rememberedEmail', email);
      setUser(data.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.error || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="exam-auth-screen">
      {/* Decorative circles matching Multitech StudentLogin.css */}
      <span className="exam-auth-deco exam-auth-deco--tl" aria-hidden="true" />
      <span className="exam-auth-deco exam-auth-deco--br" aria-hidden="true" />

      <div className="exam-auth-layout">
        {/* Left — Brand intro panel */}
        <section className="exam-auth-intro" aria-label="Multitech Exam Portal">
          <div className="exam-auth-brand">
            <img
              src="/logo_asset.png"
              alt="Multitech Business School"
              className="exam-auth-brand-logo"
            />
            <span className="exam-auth-brand-name">
              Multitech<br />Business School
            </span>
          </div>

          <p className="exam-auth-eyebrow">Secure Examination System</p>
          <h1 className="exam-auth-headline">
            Assess your students<br /><em>with confidence.</em>
          </h1>
          <p className="exam-auth-copy">
            Create, publish, and monitor course assessments integrated with Safe Exam Browser.
          </p>

          <div className="exam-auth-assurance">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Faculty &amp; administrator access only</span>
          </div>
        </section>

        {/* Right — Auth card */}
        <section className="exam-auth-card" aria-labelledby="exam-login-title">
          <div className="exam-auth-card-heading">
            <span className="exam-auth-card-eyebrow">Welcome back</span>
            <h2 id="exam-login-title">Sign in to Exam Portal</h2>
          </div>

          {error && (
            <div className="exam-auth-error" role="alert">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="exam-auth-form">
            <div className="exam-auth-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                className="exam-auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@multitech.ac.ug"
                required
                autoComplete="username"
              />
            </div>

            <div className="exam-auth-field">
              <label htmlFor="login-password">Password</label>
              <div className="exam-auth-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="exam-auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="exam-auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="exam-auth-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="exam-auth-spinner" width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in…</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
