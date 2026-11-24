import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { IconActivity, IconChevronLeft, IconClipboard, IconEdit, IconFileText } from '../ui/Icons';

interface ExamWorkspaceNavProps {
  examId: string;
  title: string;
  courseCode?: string;
  status?: 'draft' | 'active' | 'closed' | string;
  assessmentType?: 'final_exam' | 'coursework' | string;
  submittedCount?: number;
  activeMonitorCount?: number;
  actions?: ReactNode;
}

export function ExamWorkspaceNav({
  examId,
  title,
  courseCode,
  status,
  assessmentType,
  submittedCount,
  activeMonitorCount,
  actions,
}: ExamWorkspaceNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = `/dashboard/exams/${examId}`;
  const path = location.pathname;

  const isOverview = path === basePath || path === `${basePath}/`;
  const isBuilder = path.startsWith(`${basePath}/builder`);
  const isMonitor = path.startsWith(`${basePath}/monitor`);
  const isSubmissions = path.startsWith(`${basePath}/submissions`);

  const statusPillClass =
    status === 'active'
      ? 'dash-status-pill status-live'
      : status === 'draft'
      ? 'dash-status-pill status-draft'
      : 'dash-status-pill status-closed';

  const statusLabel = status === 'active' ? 'Live' : status === 'draft' ? 'Draft' : 'Closed';

  return (
    <div className="exam-ws-header">
      <div className="exam-ws-top">
        <button
          type="button"
          className="exam-ws-back"
          onClick={() => navigate('/dashboard')}
        >
          <IconChevronLeft size={15} />
          <span>Assessments</span>
        </button>
        {courseCode && (
          <>
            <span className="exam-ws-sep">/</span>
            <span className="exam-ws-code">{courseCode}</span>
          </>
        )}
      </div>

      <div className="exam-ws-title-row">
        <div className="exam-ws-title-block">
          <div className="exam-ws-badges">
            {courseCode && <span className="dash-course-pill">{courseCode}</span>}
            {assessmentType && (
              <span className="dash-assessment-pill">
                {assessmentType === 'coursework' ? 'Continuous Assessment' : 'Final Exam'}
              </span>
            )}
            {status && (
              <span className={statusPillClass}>
                {status === 'active' && <span className="status-live-dot" />}
                {statusLabel}
              </span>
            )}
          </div>
          <h1 className="exam-ws-title">{title}</h1>
        </div>

        {actions && <div className="exam-ws-actions">{actions}</div>}
      </div>

      <nav className="exam-ws-tabs" aria-label="Exam sections">
        <Link to={basePath} className={`exam-ws-tab ${isOverview ? 'is-active' : ''}`}>
          <IconFileText size={15} />
          <span>Overview</span>
        </Link>

        <Link to={`${basePath}/builder`} className={`exam-ws-tab ${isBuilder ? 'is-active' : ''}`}>
          <IconEdit size={15} />
          <span>Questions &amp; Paper</span>
        </Link>

        <Link to={`${basePath}/monitor`} className={`exam-ws-tab ${isMonitor ? 'is-active' : ''}`}>
          <IconActivity size={15} />
          <span>Live Monitor</span>
          {status === 'active' && <span className="exam-ws-live-indicator" />}
          {typeof activeMonitorCount === 'number' && activeMonitorCount > 0 && (
            <span className="exam-ws-tab-count">{activeMonitorCount}</span>
          )}
        </Link>

        <Link to={`${basePath}/submissions`} className={`exam-ws-tab ${isSubmissions ? 'is-active' : ''}`}>
          <IconClipboard size={15} />
          <span>Submissions</span>
          {typeof submittedCount === 'number' && (
            <span className="exam-ws-tab-count">{submittedCount}</span>
          )}
        </Link>
      </nav>
    </div>
  );
}
