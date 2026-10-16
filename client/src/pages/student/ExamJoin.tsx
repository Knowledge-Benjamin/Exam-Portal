import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/Button';

const PIN_LENGTH = 6;

export function ExamJoin() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // PIN digits stored as an array of strings ('0'-'9' or '')
  const [digits, setDigits] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState<{
    studentName: string;
    studentRegNumber: string;
  } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(PIN_LENGTH).fill(null));

  // Auto-focus first box on mount
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
    const val = e.target.value.replace(/\D/g, ''); // digits only
    if (!val) return;

    // Handle paste: fill from current index
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
        // Show verified identity card briefly, then navigate
        setVerified({
          studentName: res.data.studentName,
          studentRegNumber: res.data.studentRegNumber,
        });

        setTimeout(() => {
          navigate(`/exam/${res.data.examId}`, {
            state: { examToken: res.data.examToken },
          });
        }, 1800);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Verification failed. Please try again.';
      setError(msg);
      // Clear pin so student can re-enter
      setDigits(Array(PIN_LENGTH).fill(''));
      setTimeout(() => focusAt(0), 0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__background" aria-hidden="true">
        <div className="auth-page__circle auth-page__circle--top" />
        <div className="auth-page__circle auth-page__circle--bottom" />
      </div>

      <div className="auth-content">
        {/* Header */}
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Join Exam</h1>
              <p className="page-copy">Enter your 6-digit Exam PIN to begin</p>
            </div>
          </div>
        </div>

        <div className="page-panel page-panel-hero">
          {/* Icon */}
          <div className="auth-icon-box">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>

          {/* Error */}
          {error && (
            <div className="alert-panel" role="alert">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Verified identity card */}
          {verified ? (
            <div className="pin-verified-card">
              <div className="pin-verified-check">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="pin-verified-label">Identity Verified</p>
              <p className="pin-verified-name">{verified.studentName}</p>
              <p className="pin-verified-reg">{verified.studentRegNumber}</p>
              <p className="pin-verified-source">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: '0.9rem', height: '0.9rem', display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verified via Multitech Web System · Starting exam…
              </p>
            </div>
          ) : (
            <>
              {/* PIN input boxes */}
              <div className="pin-input-group" role="group" aria-label="6-digit exam PIN">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6} // allow paste of full pin into first box
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

              {/* Submit button */}
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  className="button button-primary button-full"
                  isLoading={isLoading}
                  onClick={handleJoin}
                  disabled={!isFull || isLoading}
                >
                  {isLoading ? 'Verifying…' : 'Verify & Enter Exam'}
                </Button>
              </div>

              {/* Help text */}
              <div className="pin-help">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Need your PIN?{' '}
                  Log into your{' '}
                  <strong>Multitech Student Portal</strong>,{' '}
                  open <em>Online Exams</em>, and click{' '}
                  <strong>Generate Exam PIN</strong>.{' '}
                  Each PIN is single-use and expires in 1 hour.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
