import { eq, and, isNotNull, count } from 'drizzle-orm';
import { db } from '../db/db';
import { submissions } from '../db/schema';

export async function getExamStats(examId: string) {
  // Total who participated (created submissions)
  const totalJoinedResult = await db
    .select({ count: count() })
    .from(submissions)
    .where(eq(submissions.examId, examId));

  const totalJoined = totalJoinedResult[0]?.count ?? 0;

  // Total who submitted (submittedAt is not null)
  const totalSubmittedResult = await db
    .select({ count: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.examId, examId),
        isNotNull(submissions.submittedAt)
      )
    );

  const totalSubmitted = totalSubmittedResult[0]?.count ?? 0;

  // Total forced submissions
  const totalForcedResult = await db
    .select({ count: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.examId, examId),
        isNotNull(submissions.submittedAt),
        eq(submissions.forcedSubmit, true)
      )
    );

  const totalForced = totalForcedResult[0]?.count ?? 0;

  return {
    totalJoined,
    totalSubmitted,
    totalForced,
    totalNotSubmitted: totalJoined - totalSubmitted,
  };
}
