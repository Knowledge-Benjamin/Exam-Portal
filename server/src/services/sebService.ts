import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { exams } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { signExamToken } from '../utils/token';
import { createSubmission, findActiveSubmissionByRegNumber } from './submissionService';

export async function getExamByToken(token: string) {
  const [exam] = await db
    .select()
    .from(exams)
    .where(eq(exams.sebExamToken, token));
  return exam ?? null;
}

export interface GateResult {
  examToken: string;
  examId: string;
}

export async function processSEBJoin(
  token: string,
  studentName: string,
  studentRegNumber: string,
  ipAddress: string,
): Promise<GateResult> {
  const exam = await getExamByToken(token);
  if (!exam) {
    throw new AppError(404, 'Exam not found or link is invalid');
  }

  if (exam.status !== 'active') {
    throw new AppError(403, 'This exam is not currently active');
  }

  const now = new Date();
  const bufferMs = exam.windowBufferMinutes * 60 * 1000;
  const openFrom = new Date(exam.startTime.getTime() - bufferMs);
  const openUntil = new Date(exam.endTime.getTime() + bufferMs);

  if (now < openFrom) {
    const minutesUntil = Math.ceil((openFrom.getTime() - now.getTime()) / 60000);
    throw new AppError(403, `Exam has not started yet. Opens in ${minutesUntil} minute(s).`);
  }

  if (now > openUntil) {
    throw new AppError(403, 'The exam window has closed');
  }

  const normalizedRegNumber = studentRegNumber.trim();
  const existingSubmission = await findActiveSubmissionByRegNumber(exam.id, normalizedRegNumber);

  const submission = existingSubmission
    ? existingSubmission
    : await createSubmission(exam.id, studentName, studentRegNumber, ipAddress);

  const examToken = signExamToken({ 
    submissionId: submission.id, 
    examId: exam.id 
  });

  return {
    examToken,
    examId: exam.id,
  };
}
