import { eq, and } from 'drizzle-orm';
import { db } from '../db/db';
import { submissions } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { htmlToPlain } from '../utils/html';

export async function createSubmission(
  examId: string,
  studentName: string,
  studentRegNumber: string,
  ipAddress: string,
) {
  const [created] = await db
    .insert(submissions)
    .values({ 
      examId, 
      studentName, 
      studentRegNumber, 
      answers: {}, 
      ipAddress 
    })
    .returning();

  return created;
}

export async function getSubmissionById(submissionId: string) {
  const [row] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId));
  return row ?? null;
}

export async function saveAnswers(
  submissionId: string,
  answers: Record<string, string>,
  sebHash: string,
) {
  const existing = await getSubmissionById(submissionId);

  if (!existing) throw new AppError(404, 'Submission record not found');
  if (existing.isFinal) throw new AppError(400, 'Exam already submitted');

  // ensure we store a plain-text copy of any freeform HTML for teacher views
  const answersToStore = { ...answers } as Record<string, any>;
  if (typeof answersToStore.freeform === 'string') {
    answersToStore.freeformPlain = htmlToPlain(answersToStore.freeform);
  }

  const [updated] = await db
    .update(submissions)
    .set({ answers: answersToStore, sebRequestHash: sebHash, updatedAt: new Date() })
    .where(eq(submissions.id, existing.id))
    .returning();

  return updated;
}

export async function finalSubmit(
  submissionId: string,
  answers: Record<string, string>,
  sebHash: string,
  forcedSubmit: boolean = false,
) {
  const existing = await getSubmissionById(submissionId);

  if (!existing) throw new AppError(404, 'Submission record not found');
  if (existing.isFinal) throw new AppError(400, 'Exam already submitted');

  // store plain-text copy for freeform HTML
  const answersToStore = { ...answers } as Record<string, any>;
  if (typeof answersToStore.freeform === 'string') {
    answersToStore.freeformPlain = htmlToPlain(answersToStore.freeform);
  }

  const [updated] = await db
    .update(submissions)
    .set({
      answers: answersToStore,
      isFinal: true,
      submittedAt: new Date(),
      forcedSubmit,
      sebRequestHash: sebHash,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, existing.id))
    .returning();

  return updated;
}

export async function getAllSubmissions(examId: string) {
  const rows = await db
    .select({
      id: submissions.id,
      studentName: submissions.studentName,
      studentRegNumber: submissions.studentRegNumber,
      answers: submissions.answers,
      isFinal: submissions.isFinal,
      submittedAt: submissions.submittedAt,
      marksAwarded: submissions.marksAwarded,
      teacherNote: submissions.teacherNote,
      createdAt: submissions.createdAt,
      updatedAt: submissions.updatedAt,
    })
    .from(submissions)
    .where(eq(submissions.examId, examId));

  // Ensure freeformPlain is present in results for teacher views
  return rows.map(r => {
    try {
      const ans = (r as any).answers ?? {};
      if (typeof ans.freeform === 'string' && !ans.freeformPlain) {
        (r as any).answers = { ...ans, freeformPlain: htmlToPlain(ans.freeform) };
      }
    } catch (e) {
      // ignore and return row as-is
    }
    return r;
  });
}

export async function markSubmission(
  submissionId: string,
  marksAwarded: number,
  teacherNote?: string,
) {
  const [updated] = await db
    .update(submissions)
    .set({ marksAwarded, teacherNote, updatedAt: new Date() })
    .where(eq(submissions.id, submissionId))
    .returning();

  if (!updated) throw new AppError(404, 'Submission not found');
  return updated;
}

export async function forceSubmitAll(examId: string) {
  await db
    .update(submissions)
    .set({ isFinal: true, submittedAt: new Date(), forcedSubmit: true, updatedAt: new Date() })
    .where(and(eq(submissions.examId, examId), eq(submissions.isFinal, false)));
}
