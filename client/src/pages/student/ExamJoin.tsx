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
        navigate(`/exam/${res.data.examId}`, {
          state: { examToken: res.data.examToken },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.error || 'Failed to join the exam. Please check your token or try again.');
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
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Join Exam</h1>
              <p className="page-copy">Enter your details to begin the assessment</p>
            </div>
          </div>
        </div>

        <div className="page-panel page-panel-hero">
          <div className="auth-icon-box">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          {error && (
            <div className="alert-panel">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="form-stack">
            <div className="form-group">
              <label className="form-label" htmlFor="studentName">
                Full Name
              </label>
              <input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="John Doe"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="studentRegNumber">
                Registration Number
              </label>
              <input
                id="studentRegNumber"
                type="text"
                value={studentRegNumber}
                onChange={(e) => setStudentRegNumber(e.target.value)}
                placeholder="REG/2023/001"
                className="form-input"
                required
              />
            </div>

            <div className="form-actions">
              <Button type="submit" className="button button-primary button-full" isLoading={isLoading}>
                Enter Exam Room
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


