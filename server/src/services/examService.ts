import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/db';
import { exams, questions } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { randomHex } from '../utils/crypto';

// ─── Exams ───────────────────────────────────────────────────────────────────

export async function listExamsByTeacher(teacherId: string) {
  return db
    .select()
    .from(exams)
    .where(eq(exams.teacherId, teacherId))
    .orderBy(asc(exams.createdAt));
}

export async function getExamById(examId: string) {
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  return exam ?? null;
}

export async function assertExamOwner(examId: string, teacherId: string) {
  const exam = await getExamById(examId);
  if (!exam) throw new AppError(404, 'Exam not found');
  if (exam.teacherId !== teacherId) throw new AppError(403, 'Access denied');
  return exam;
}

export async function createExam(
  teacherId: string,
  data: {
    title: string;
    description?: string;
    questionSource: 'pdf' | 'builder';
    startTime: string;
    durationMinutes: number;
    windowBufferMinutes: number;
    sebConfigKey?: string;
  },
) {
  const start = new Date(data.startTime);
  const end = new Date(start.getTime() + data.durationMinutes * 60 * 1000);

  const [exam] = await db
    .insert(exams)
    .values({
      title: data.title,
      description: data.description,
      teacherId,
      questionSource: data.questionSource,
      startTime: start,
      endTime: end,
      durationMinutes: data.durationMinutes,
      windowBufferMinutes: data.windowBufferMinutes,
      sebConfigKey: data.sebConfigKey,
      status: 'draft',
    })
    .returning();

  return exam;
}

export async function updateExam(
  examId: string,
  teacherId: string,
  data: Partial<{
    title: string;
    description: string;
    startTime: string;
    durationMinutes: number;
    windowBufferMinutes: number;
    sebConfigKey: string;
  }>,
) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== 'draft') {
    throw new AppError(400, 'Only draft exams can be edited');
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) updates.title = data.title;
  if (data.description !== undefined) updates.description = data.description;
  if (data.durationMinutes) updates.durationMinutes = data.durationMinutes;
  if (data.windowBufferMinutes !== undefined) updates.windowBufferMinutes = data.windowBufferMinutes;
  if (data.sebConfigKey !== undefined) updates.sebConfigKey = data.sebConfigKey;
  if (data.startTime) {
    const start = new Date(data.startTime);
    const duration = data.durationMinutes ?? exam.durationMinutes;
    updates.startTime = start;
    updates.endTime = new Date(start.getTime() + duration * 60 * 1000);
  }

  const [updated] = await db
    .update(exams)
    .set(updates as any)
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

export async function publishExam(examId: string, teacherId: string) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== 'draft') {
    throw new AppError(400, 'Exam is already published or closed');
  }

  const token = randomHex(32);

  const [updated] = await db
    .update(exams)
    .set({ status: 'active', sebExamToken: token, updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

export async function closeExam(examId: string, teacherId: string) {
  await assertExamOwner(examId, teacherId);
  const [updated] = await db
    .update(exams)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning();
  return updated;
}

/**
 * Republish a closed exam — only allowed while the exam window is still open.
 * (now <= endTime + windowBufferMinutes)
 */
export async function republishExam(examId: string, teacherId: string) {
  const exam = await assertExamOwner(examId, teacherId);

  if (exam.status !== 'closed') {
    throw new AppError(400, 'Only closed exams can be republished');
  }

  const now = new Date();
  const bufferMs = exam.windowBufferMinutes * 60 * 1000;
  const deadline = new Date(exam.endTime.getTime() + bufferMs);

  if (now > deadline) {
    throw new AppError(403, 'The exam window has passed. Republishing is no longer allowed.');
  }

  const [updated] = await db
    .update(exams)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning();

  return updated;
}

/**
 * Auto-close all active exams whose window has expired.
 * Called on a schedule from the server entry point.
 */
export async function autoCloseExpiredExams() {
  const now = new Date();
  const allActive = await db
    .select()
    .from(exams)
    .where(eq(exams.status, 'active'));

  const expired = allActive.filter((e) => {
    const bufferMs = e.windowBufferMinutes * 60 * 1000;
    const deadline = new Date(e.endTime.getTime() + bufferMs);
    return now > deadline;
  });

  if (expired.length === 0) return;

  await Promise.all(
    expired.map((e) =>
      db
        .update(exams)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(exams.id, e.id)),
    ),
  );

  console.log(`[scheduler] Auto-closed ${expired.length} expired exam(s): ${expired.map((e) => e.id).join(', ')}`);
}

import { uploadPdfToDrive, deletePdfFromDrive, DriveCredentials } from './driveService';
import { getUserProfile } from './authService';

export async function deleteExam(examId: string, teacherId: string) {
  const exam = await assertExamOwner(examId, teacherId);
  if (exam.status !== 'draft') {
    throw new AppError(400, 'Only draft exams can be deleted');
  }

  if (exam.pdfPath) {
    const teacher = await getUserProfile(teacherId);
    if (teacher && teacher.googleServiceAccountEmail && teacher.googlePrivateKey && teacher.googleDriveFolderId) {
      const creds: DriveCredentials = {
        email: teacher.googleServiceAccountEmail,
        privateKey: teacher.googlePrivateKey,
        folderId: teacher.googleDriveFolderId,
      };
      await deletePdfFromDrive(exam.pdfPath, creds);
    }
  }

  await db.delete(exams).where(eq(exams.id, examId));
}

export async function setPdfPath(examId: string, teacherId: string, pdfPath: string) {
  const exam = await assertExamOwner(examId, teacherId);

  if (exam.pdfPath && exam.pdfPath !== pdfPath) {
    const teacher = await getUserProfile(teacherId);
    if (teacher && teacher.googleServiceAccountEmail && teacher.googlePrivateKey && teacher.googleDriveFolderId) {
      const creds: DriveCredentials = {
        email: teacher.googleServiceAccountEmail,
        privateKey: teacher.googlePrivateKey,
        folderId: teacher.googleDriveFolderId,
      };
      await deletePdfFromDrive(exam.pdfPath, creds);
    }
  }

  await db.update(exams).set({ pdfPath, updatedAt: new Date() }).where(eq(exams.id, examId));
}

// ─── Questions ───────────────────────────────────────────────────────────────

export async function getQuestions(examId: string) {
  return db
    .select()
    .from(questions)
    .where(eq(questions.examId, examId))
    .orderBy(asc(questions.orderIndex));
}

export async function addQuestion(
  examId: string,
  data: {
    type: 'short_answer' | 'long_answer' | 'multiple_choice';
    prompt: string;
    options?: string[];
    marks: number;
    orderIndex?: number;
  },
) {
  const existing = await getQuestions(examId);
  const nextIndex = data.orderIndex ?? existing.length;

  const [q] = await db
    .insert(questions)
    .values({
      examId,
      type: data.type,
      prompt: data.prompt,
      options: data.options ?? null,
      marks: data.marks,
      orderIndex: nextIndex,
    })
    .returning();

  return q;
}

export async function updateQuestion(
  questionId: string,
  teacherId: string,
  data: Partial<{
    type: 'short_answer' | 'long_answer' | 'multiple_choice';
    prompt: string;
    options: string[];
    marks: number;
  }>,
) {
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw new AppError(404, 'Question not found');

  const exam = await assertExamOwner(q.examId, teacherId);
  if (exam.status !== 'draft') throw new AppError(400, 'Cannot edit questions of a published exam');

  const [updated] = await db
    .update(questions)
    .set(data as any)
    .where(eq(questions.id, questionId))
    .returning();

  return updated;
}

export async function deleteQuestion(questionId: string, teacherId: string) {
  const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!q) throw new AppError(404, 'Question not found');

  const exam = await assertExamOwner(q.examId, teacherId);
  if (exam.status !== 'draft') throw new AppError(400, 'Cannot delete questions of a published exam');

  await db.delete(questions).where(eq(questions.id, questionId));
}

export async function reorderQuestions(examId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(questions).set({ orderIndex: index }).where(eq(questions.id, id)),
    ),
  );
}

