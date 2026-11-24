import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PIN_LENGTH = 6;

export function ExamJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [joinMode, setJoinMode] = useState<'pin' | 'credentials'>('pin');
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [studentName, setStudentName] = useState('');
  const [studentRegNumber, setStudentRegNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<{
    studentName: string;
    studentRegNumber: string;
  } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(PIN_LENGTH).fill(null));

  useEffect(() => {
    if (joinMode === 'pin') {
      inputRefs.current[0]?.focus();
    }
  }, [joinMode]);

  const pin = digits.join('');
  const isFull = pin.length === PIN_LENGTH && digits.every((d) => d !== '');

  const focusAt = useCallback((index: number) => {
    const el = inputRefs.current[Math.max(0, Math.min(PIN_LENGTH - 1, index))];
    el?.focus();
    el?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[idx] !== '') {
        const next = [...digits]; next[idx] = ''; setDigits(next);
      } else if (idx > 0) {
        const next = [...digits]; next[idx - 1] = ''; setDigits(next); focusAt(idx - 1);
      }
    } else if (e.key === 'ArrowLeft')  { e.preventDefault(); focusAt(idx - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(idx + 1); }
      else if (e.key === 'Enter' && isFull) { handleJoinPin(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const chars = val.split('').slice(0, PIN_LENGTH - idx);
    const next = [...digits];
    chars.forEach((c, i) => { if (idx + i < PIN_LENGTH) next[idx + i] = c; });
    setDigits(next);
    focusAt(Math.min(idx + chars.length, PIN_LENGTH - 1));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, idx: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const chars = pasted.split('').slice(0, PIN_LENGTH - idx);
    const next = [...digits];
    chars.forEach((c, i) => { if (idx + i < PIN_LENGTH) next[idx + i] = c; });
    setDigits(next);
    focusAt(Math.min(idx + chars.length, PIN_LENGTH - 1));
  };

  const handleJoinPin = async () => {
    if (!isFull) return;
    setIsLoading(true);
    setError('');
    setVerified(null);
    try {
      const res = await axios.post(`/seb/join-with-pin/${token}`, { pin }, { withCredentials: true });
      if (res.data.ok) {
        if (res.data.examToken) {
          try {
            sessionStorage.setItem(`exam_token_${res.data.examId}`, res.data.examToken);
            sessionStorage.setItem('current_exam_token', res.data.examToken);
          } catch {}
        }
        setVerified({ studentName: res.data.studentName, studentRegNumber: res.data.studentRegNumber });
        setTimeout(() => { navigate(`/exam/${res.data.examId}`, { state: { examToken: res.data.examToken } }); }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid PIN. Please check and try again.';
      setError(msg);
      setDigits(Array(PIN_LENGTH).fill(''));
      setTimeout(() => focusAt(0), 0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRegNumber.trim()) {
      setError('Please provide your name and student registration number.');
      return;
    }
    setIsLoading(true);
    setError('');
    setVerified(null);
    try {
      const res = await axios.post(`/seb/join/${token}`, {
        studentName: studentName.trim(),
        studentRegNumber: studentRegNumber.trim(),
      }, { withCredentials: true });

      if (res.data.ok) {
        if (res.data.examToken) {
          try {
            sessionStorage.setItem(`exam_token_${res.data.examId}`, res.data.examToken);
            sessionStorage.setItem('current_exam_token', res.data.examToken);
          } catch {}
        }
        setVerified({
          studentName: res.data.studentName || studentName.trim(),
          studentRegNumber: res.data.studentRegNumber || studentRegNumber.trim(),
        });
        setTimeout(() => { navigate(`/exam/${res.data.examId}`, { state: { examToken: res.data.examToken } }); }, 1500);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Unable to join exam session.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="exam-join-screen">
      <div className="exam-join-card">
        {/* Brand */}
        <div className="exam-join-brand">
          <img src="/logo_asset.png" alt="Multitech Business School" className="exam-join-logo" />
          <span className="exam-join-brand-name">Multitech<br />Business School</span>
        </div>

        <h1 className="exam-join-heading">Exam Verification</h1>
        <p className="exam-join-sub">
          {joinMode === 'pin' ? 'Enter your 6-digit PIN from the student portal' : 'Enter your student credentials to begin'}
        </p>

        {/* Verification mode toggle */}
        {!verified && (
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-bg)', padding: '4px', borderRadius: '10px', margin: '0.85rem 0 1.25rem' }}>
            <button
              type="button"
              onClick={() => { setJoinMode('pin'); setError(''); }}
              style={{
                flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: 700,
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: joinMode === 'pin' ? '#fff' : 'transparent',
                color: joinMode === 'pin' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                boxShadow: joinMode === 'pin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Portal PIN
            </button>
            <button
              type="button"
              onClick={() => { setJoinMode('credentials'); setError(''); }}
              style={{
                flex: 1, padding: '0.45rem', fontSize: '0.78rem', fontWeight: 700,
                borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: joinMode === 'credentials' ? '#fff' : 'transparent',
                color: joinMode === 'credentials' ? 'var(--color-navy)' : 'var(--color-text-muted)',
                boxShadow: joinMode === 'credentials' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Name &amp; Reg No.
            </button>
          </div>
        )}

        {error && (
          <div className="exam-auth-error" role="alert" style={{ marginBottom: '1.25rem' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {verified ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: '#dcfce7',
              border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 1rem',
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#16a34a">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#16a34a', marginBottom: '0.4rem' }}>Verified</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 0.2rem' }}>{verified.studentName}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem' }}>{verified.studentRegNumber}</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Starting your assessment…</p>
          </div>
        ) : joinMode === 'pin' ? (
          <>
            {/* PIN boxes */}
            <div className="exam-pin-row" role="group" aria-label="6-digit exam PIN">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  aria-label={`PIN digit ${idx + 1}`}
                  className="exam-pin-box"
                  onChange={(e) => handleInput(e, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onPaste={(e) => handlePaste(e, idx)}
                  onFocus={(e) => e.target.select()}
                  disabled={isLoading}
                  autoComplete="off"
                />
              ))}
            </div>

            <button
              type="button"
              className="exam-auth-submit"
              onClick={handleJoinPin}
              disabled={!isFull || isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="exam-auth-spinner" width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verifying…</span>
                </>
              ) : (
                <span>Enter Exam</span>
              )}
            </button>

            <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Your PIN is in <strong>Student Portal → Online Exams</strong>
            </p>
          </>
        ) : (
          <form onSubmit={handleJoinCredentials} style={{ display: 'grid', gap: '0.9rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '4px' }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. John Mukasa"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '4px' }}>
                Registration Number
              </label>
              <input
                type="text"
                required
                value={studentRegNumber}
                onChange={(e) => setStudentRegNumber(e.target.value)}
                placeholder="e.g. MBS/2024/014"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="exam-auth-submit"
              disabled={!studentName.trim() || !studentRegNumber.trim() || isLoading}
              style={{ marginTop: '0.5rem' }}
            >
              {isLoading ? (
                <>
                  <svg className="exam-auth-spinner" width="18" height="18" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Verifying…</span>
                </>
              ) : (
                <span>Enter Exam</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
