import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum(['admin', 'teacher', 'student']),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export const updateSystemConfigSchema = z.object({
  googleServiceAccountEmail: z.string().email().optional().or(z.literal('')),
  googlePrivateKey: z.string().optional().or(z.literal('')),
  googleDriveFolderId: z.string().optional().or(z.literal('')),
});

// ─── Exams ───────────────────────────────────────────────────────────────────

export const createExamSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().max(1000).trim().optional(),
  questionSource: z.enum(['pdf', 'builder']),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  windowBufferMinutes: z.number().int().min(0).max(30).default(5),
  allowFileUpload: z.boolean().default(false),
});

// Update schema: allow all create fields to be optional for edits,
// and explicitly allow `sebConfigKey` on update so teachers can set it post-publish.
export const updateExamSchema = createExamSchema
  .partial()
  .extend({
    sebConfigKey: z.string().optional().or(z.literal('')),
  });

// ─── Questions ───────────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  type: z.enum(['short_answer', 'long_answer', 'multiple_choice']),
  prompt: z.string().min(1).max(2000).trim(),
  options: z.array(z.string().min(1).max(500)).min(2).max(6).optional(),
  marks: z.number().int().min(1).max(100).default(1),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const reorderQuestionsSchema = z.object({
  order: z.array(z.string().uuid()),
});

// ─── Exam Join ─────────────────────────────────────────────────────────────

export const examJoinSchema = z.object({
  studentName: z.string().min(2).max(100).trim(),
  studentRegNumber: z.string().min(2).max(50).trim(),
});

// ─── Submissions ─────────────────────────────────────────────────────────────

export const saveAnswersSchema = z.object({
  // Keys are either question UUIDs (builder exams) or 'freeform' (PDF exams)
  answers: z.record(z.string().min(1), z.string().max(500_000)),
});

export const markSubmissionSchema = z.object({
  marksAwarded: z.number().int().min(0).max(10000),
  teacherNote: z.string().max(1000).trim().optional(),
});
