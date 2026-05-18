import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Footer } from './components/layout/Footer';
import { DashboardHome } from './pages/admin/DashboardHome';
import { CreateExam } from './pages/admin/CreateExam';
import { ExamDetail } from './pages/admin/ExamDetail';
import { ExamBuilder } from './pages/admin/ExamBuilder';
import { SubmissionsList } from './pages/admin/SubmissionsList';
import { Settings } from './pages/admin/Settings';
import { ExamRoom } from './pages/student/ExamRoom';
import { ExamJoin } from './pages/student/ExamJoin';
import { Login } from './pages/auth/Login';
import './index.css';

function ErrorPage() {
  const error = useRouteError();
  let message = 'An unexpected error occurred.';
  let status = '';

  if (isRouteErrorResponse(error)) {
    status = `${error.status}`;
    message = error.status === 404 ? 'Page not found.' : error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-black text-[var(--color-primary)] mb-4">{status || '!'}</div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-8">{message}</p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white rounded-xl font-bold transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/login',
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '',
        element: <DashboardHome />,
      },
      {
        path: 'exams/create',
        element: <CreateExam />,
      },
      {
        path: 'exams/:id',
        element: <ExamDetail />,
      },
      {
        path: 'exams/:id/builder',
        element: <ExamBuilder />,
      },
      {
        path: 'exams/:id/submissions',
        element: <SubmissionsList />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/exam/:id',
    element: <ExamRoom />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/exam-join/:token',
    element: <ExamJoin />,
    errorElement: <ErrorPage />,
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <RouterProvider router={router} />
      </div>
      <Footer />
    </div>
  </StrictMode>
);


