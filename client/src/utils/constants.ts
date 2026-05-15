export const APP_NAME = 'Multitech Exam Portal';

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  EXAM_CREATE: '/dashboard/exams/create',
  EXAM_DETAIL: (id: string) => `/dashboard/exams/${id}`,
  EXAM_BUILDER: (id: string) => `/dashboard/exams/${id}/builder`,
  SUBMISSIONS: (id: string) => `/dashboard/exams/${id}/submissions`,
  EXAM_ROOM: (id: string) => `/exam/${id}`,
} as const;

export const AUTOSAVE_INTERVAL_MS = 30_000;

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_answer:    'Short Answer',
  long_answer:     'Long Answer',
  multiple_choice: 'Multiple Choice',
};

export const STATUS_LABELS: Record<string, string> = {
  draft:  'Draft',
  active: 'Active',
  closed: 'Closed',
};

export const MAX_FILE_SIZE_MB = 10;
