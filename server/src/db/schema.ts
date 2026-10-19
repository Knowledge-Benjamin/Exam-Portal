import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  index,
  varchar,
  numeric,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ─────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'teacher', 'student']);
export const examStatusEnum = pgEnum('exam_status', ['draft', 'active', 'closed']);
export const questionTypeEnum = pgEnum('question_type', [
  'short_answer',
  'long_answer',
  'multiple_choice',
]);
export const questionSourceEnum = pgEnum('question_source', ['pdf', 'builder']);

// ─── Tables ─────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  googleServiceAccountEmail: text('google_service_account_email'),
  googlePrivateKey: text('google_private_key'),
  googleDriveFolderId: text('google_drive_folder_id'),
  googleOAuthRefreshToken: text('google_oauth_refresh_token'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── SEB Settings type ───────────────────────────────────────────────────────
// Mirrors the subset of SEB plist keys that teachers are allowed to control.
// Stored as JSONB per exam; merged into the generated .seb file at publish time.
export interface SebSettings {
  // Allowed external applications (permittedProcesses array in SEB plist)
  permittedProcesses?: Array<{
    executable: string;    // e.g. "Code.exe" or "WINWORD.EXE"
    title?: string;        // friendly name shown in the SEB taskbar
    allowUserToChooseApp?: boolean;
    os?: 0 | 1;           // 0 = Windows, 1 = macOS (default 0)
  }>;

  // Display / anti-cheat
  allowedDisplays?: number;        // 1 = single display (default); 2 = allow dual
  internalDisplayOnly?: boolean;   // true = block HDMI/external monitors

  // Browser behaviour
  allowSpellCheck?: boolean;
  allowDictionaryLookup?: boolean;
  browserWindowAllowReload?: boolean;

  // Task-bar & UI
  showTaskBar?: boolean;
  taskBarHeight?: number;          // pixels (default 40)
  showTime?: boolean;
  showInputLanguage?: boolean;

  // Quit / exit
  allowQuit?: boolean;
  quitURLConfirm?: boolean;
  hashedQuitPassword?: string;     // SHA-256 of quit password; empty = no password

  // URL filtering (advanced)
  URLFilterEnable?: boolean;
  URLFilterRules?: Array<{ action: 0 | 1; regex: string }>; // 0=block, 1=allow
}

export const exams = pgTable('exams', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  erpCourseCode: text('erp_course_code').notNull(),
  description: text('description'),
  teacherId: uuid('teacher_id')
    .notNull()
    .references(() => users.id),
  pdfPath: text('pdf_path'),
  questionSource: questionSourceEnum('question_source').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  windowBufferMinutes: integer('window_buffer_minutes').notNull().default(5),
  allowFileUpload: boolean('allow_file_upload').notNull().default(false),
  assessmentType: varchar('assessment_type', { length: 50 }).notNull().default('final_exam'),
  weightPercentage: numeric('weight_percentage', { precision: 5, scale: 2 }).notNull().default('60.00'),
  sebExamToken: text('seb_exam_token').unique(),
  sebConfigKey: text('seb_config_key'),
  sebSettings: jsonb('seb_settings').$type<SebSettings>().notNull().default({}),
  status: examStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    teacherIdx: index('exams_teacher_id_idx').on(table.teacherId),
    statusIdx: index('exams_status_idx').on(table.status),
  };
});

export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  type: questionTypeEnum('type').notNull(),
  prompt: text('prompt').notNull(),
  options: jsonb('options').$type<string[]>(),
  marks: integer('marks').notNull().default(1),
}, (table) => {
  return {
    examIdIdx: index('questions_exam_id_idx').on(table.examId),
  };
});



export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id),
  studentName: text('student_name').notNull(),
  studentRegNumber: text('student_reg_number').notNull(),
  answers: jsonb('answers').notNull().default({}).$type<Record<string, string>>(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  isFinal: boolean('is_final').notNull().default(false),
  forcedSubmit: boolean('forced_submit').notNull().default(false),
  marksAwarded: integer('marks_awarded'),
  teacherNote: text('teacher_note'),
  submissionFileId: text('submission_file_id'),
  submissionFileName: text('submission_file_name'),
  submissionFileType: text('submission_file_type'),
  submissionFileSize: integer('submission_file_size'),
  ipAddress: text('ip_address'),
  sebRequestHash: text('seb_request_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    examIdIdx: index('submissions_exam_id_idx').on(table.examId),
    studentRegNumberIdx: index('submissions_student_reg_number_idx').on(table.studentRegNumber),
  };
});

export const examRoomEventTypeEnum = pgEnum('exam_room_event_type', [
  'joined',
  'left',
  'reconnected',
]);

export const examRoomEvents = pgTable('exam_room_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  examId: uuid('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  submissionId: uuid('submission_id')
    .notNull()
    .references(() => submissions.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  studentRegNumber: text('student_reg_number').notNull(),
  type: examRoomEventTypeEnum('type').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    examIdIdx: index('exam_room_events_exam_id_idx').on(table.examId),
    submissionIdIdx: index('exam_room_events_submission_id_idx').on(table.submissionId),
  };
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  exams: many(exams),
  submissions: many(submissions),
  refreshTokens: many(refreshTokens),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  teacher: one(users, { fields: [exams.teacherId], references: [users.id] }),
  questions: many(questions),
  submissions: many(submissions),
  roomEvents: many(examRoomEvents),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  exam: one(exams, { fields: [questions.examId], references: [exams.id] }),
}));



export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  exam: one(exams, { fields: [submissions.examId], references: [exams.id] }),
  roomEvents: many(examRoomEvents),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));
