// Shared TypeScript interfaces used across the client

export type UserRole = 'admin' | 'teacher' | 'student';
export type ExamStatus = 'draft' | 'active' | 'closed';
export type QuestionType = 'short_answer' | 'long_answer' | 'multiple_choice';
export type QuestionSource = 'pdf' | 'builder';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  pdfPath?: string;
  questionSource: QuestionSource;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  windowBufferMinutes: number;
  sebExamToken?: string;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExamWithGateUrl extends Exam {
  sebGateUrl?: string;
}

export interface Question {
  id: string;
  examId: string;
  orderIndex: number;
  type: QuestionType;
  prompt: string;
  options?: string[];
  marks: number;
}

export interface Submission {
  id: string;
  examId: string;
  studentName: string;
  studentRegNumber: string;
  answers: Record<string, string>;
  isFinal: boolean;
  submittedAt?: string;
  marksAwarded?: number;
  teacherNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}

// Exam creation form state
export interface CreateExamForm {
  title: string;
  description: string;
  questionSource: QuestionSource;
  startTime: string;
  durationMinutes: number;
  windowBufferMinutes: number;
}

// Question builder form state
export interface QuestionForm {
  type: QuestionType;
  prompt: string;
  options: string[];
  marks: number;
}
