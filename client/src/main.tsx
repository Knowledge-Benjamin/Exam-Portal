import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Footer } from './components/layout/Footer';

// Lazy loaded pages
const DashboardHome = lazy(() => import('./pages/admin/DashboardHome').then(module => ({ default: module.DashboardHome })));
const CreateExam = lazy(() => import('./pages/admin/CreateExam').then(module => ({ default: module.CreateExam })));
const ExamDetail = lazy(() => import('./pages/admin/ExamDetail').then(module => ({ default: module.ExamDetail })));
const ExamBuilder = lazy(() => import('./pages/admin/ExamBuilder').then(module => ({ default: module.ExamBuilder })));
const SubmissionsList = lazy(() => import('./pages/admin/SubmissionsList').then(module => ({ default: module.SubmissionsList })));
const Settings = lazy(() => import('./pages/admin/Settings').then(module => ({ default: module.Settings })));
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(module => ({ default: module.UserManagement })));
const ExamRoom = lazy(() => import('./pages/student/ExamRoom').then(module => ({ default: module.ExamRoom })));
const ExamJoin = lazy(() => import('./pages/student/ExamJoin').then(module => ({ default: module.ExamJoin })));
const Login = lazy(() => import('./pages/auth/Login').then(module => ({ default: module.Login })));

import './index.css';

// Loading fallback for Suspense
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
  </div>
);

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
    element: <Suspense fallback={<LoadingFallback />}><Login /></Suspense>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: '',
        element: <Suspense fallback={<LoadingFallback />}><DashboardHome /></Suspense>,
      },
      {
        path: 'exams/create',
        element: <Suspense fallback={<LoadingFallback />}><CreateExam /></Suspense>,
      },
      {
        path: 'exams/:id',
        element: <Suspense fallback={<LoadingFallback />}><ExamDetail /></Suspense>,
      },
      {
        path: 'exams/:id/builder',
        element: <Suspense fallback={<LoadingFallback />}><ExamBuilder /></Suspense>,
      },
      {
        path: 'exams/:id/submissions',
        element: <Suspense fallback={<LoadingFallback />}><SubmissionsList /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<LoadingFallback />}><Settings /></Suspense>,
      },
      {
        path: 'users',
        element: <Suspense fallback={<LoadingFallback />}><UserManagement /></Suspense>,
      },
    ],
  },
  {
    path: '/exam/:id',
    element: <Suspense fallback={<LoadingFallback />}><ExamRoom /></Suspense>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/exam-join/:token',
    element: <Suspense fallback={<LoadingFallback />}><ExamJoin /></Suspense>,
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


