import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const PIN_LENGTH = 6;

export function ExamJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<{
    studentName: string;
    studentRegNumber: string;
  } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(PIN_LENGTH).fill(null));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

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
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        const next = [...digits];
        next[idx - 1] = '';
        setDigits(next);
        focusAt(idx - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(idx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(idx + 1);
    } else if (e.key === 'Enter' && isFull) {
      handleJoin();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;

    const chars = val.split('').slice(0, PIN_LENGTH - idx);
    const next = [...digits];
    chars.forEach((c, i) => {
      if (idx + i < PIN_LENGTH) next[idx + i] = c;
    });
    setDigits(next);
    const nextFocus = Math.min(idx + chars.length, PIN_LENGTH - 1);
    focusAt(nextFocus);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, idx: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const chars = pasted.split('').slice(0, PIN_LENGTH - idx);
    const next = [...digits];
    chars.forEach((c, i) => {
      if (idx + i < PIN_LENGTH) next[idx + i] = c;
    });
    setDigits(next);
    const nextFocus = Math.min(idx + chars.length, PIN_LENGTH - 1);
    focusAt(nextFocus);
  };

  const handleJoin = async () => {
    if (!isFull) return;
    setIsLoading(true);
    setError('');
    setVerified(null);

    try {
      const res = await axios.post(
        `/seb/join-with-pin/${token}`,
        { pin },
        { withCredentials: true },
      );

      if (res.data.ok) {
        setVerified({
          studentName: res.data.studentName,
          studentRegNumber: res.data.studentRegNumber,
        });

        setTimeout(() => {
          navigate(`/exam/${res.data.examId}`, {
            state: { examToken: res.data.examToken },
          });
        }, 1500);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Invalid PIN. Please check and try again.';
      setError(msg);
      setDigits(Array(PIN_LENGTH).fill(''));
      setTimeout(() => focusAt(0), 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="page-panel" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          {/* Institution Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
            <img
              src="/logo_asset.png"
              alt="Multitech Business School"
              style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '0.75rem' }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--color-navy)', textTransform: 'uppercase' }}>
              Multitech Business School
            </span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.2rem' }}>
              Exam Verification
            </h1>
          </div>

          {error && (
            <div className="alert-panel" role="alert" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {verified ? (
            <div className="pin-verified-card">
              <div className="pin-verified-check">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="pin-verified-label">Verified</p>
              <p className="pin-verified-name">{verified.studentName}</p>
              <p className="pin-verified-reg">{verified.studentRegNumber}</p>
              <p className="pin-verified-source">Starting your assessment now…</p>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Enter your 6-digit PIN from the student portal
              </p>

              {/* PIN Inputs */}
              <div className="pin-input-group" role="group" aria-label="6-digit exam PIN">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    aria-label={`PIN digit ${idx + 1}`}
                    className={`pin-digit${digit ? ' pin-digit--filled' : ''}`}
                    onChange={(e) => handleInput(e, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    onPaste={(e) => handlePaste(e, idx)}
                    onFocus={(e) => e.target.select()}
                    disabled={isLoading}
                    autoComplete="off"
                  />
                ))}
              </div>

              {/* Action Button */}
              <div style={{ marginTop: '1.75rem' }}>
                <Button
                  type="button"
                  className="button button-primary button-full"
                  isLoading={isLoading}
                  onClick={handleJoin}
                  disabled={!isFull || isLoading}
                >
                  {isLoading ? 'Verifying…' : 'Enter Exam'}
                </Button>
              </div>

              <div className="pin-help" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Log into <strong>Student Portal &rarr; Online Exams</strong> to get your PIN.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
