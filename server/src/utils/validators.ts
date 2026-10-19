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

// ─── SEB Settings sub-schema ─────────────────────────────────────────────────

const permittedProcessSchema = z.object({
  executable: z.string().min(1).max(260).trim(),
  title: z.string().max(100).trim().optional(),
  allowUserToChooseApp: z.boolean().optional(),
  os: z.union([z.literal(0), z.literal(1)]).optional(), // 0 = Windows, 1 = macOS
});

const urlFilterRuleSchema = z.object({
  action: z.union([z.literal(0), z.literal(1)]), // 0 = block, 1 = allow
  regex: z.string().max(500).trim(),
});

export const sebSettingsSchema = z.object({
  permittedProcesses: z.array(permittedProcessSchema).max(30).optional(),
  allowedDisplays: z.number().int().min(1).max(2).optional(),
  internalDisplayOnly: z.boolean().optional(),
  allowSpellCheck: z.boolean().optional(),
  allowDictionaryLookup: z.boolean().optional(),
  browserWindowAllowReload: z.boolean().optional(),
  showTaskBar: z.boolean().optional(),
  taskBarHeight: z.number().int().min(20).max(80).optional(),
  showTime: z.boolean().optional(),
  showInputLanguage: z.boolean().optional(),
  allowQuit: z.boolean().optional(),
  quitURLConfirm: z.boolean().optional(),
  hashedQuitPassword: z.string().max(128).optional().or(z.literal('')),
  URLFilterEnable: z.boolean().optional(),
  URLFilterRules: z.array(urlFilterRuleSchema).max(50).optional(),
}).optional();

// ─── Exams ───────────────────────────────────────────────────────────────────

export const createExamSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  erpCourseCode: z.string().min(2).max(50).trim(),
  description: z.string().max(1000).trim().optional(),
  questionSource: z.enum(['pdf', 'builder']),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  windowBufferMinutes: z.number().int().min(0).max(30).default(5),
  allowFileUpload: z.boolean().default(false),
  assessmentType: z.enum(['final_exam', 'coursework']).default('final_exam').optional(),
  weightPercentage: z.number().min(1).max(100).default(60).optional(),
  sebSettings: sebSettingsSchema,
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
