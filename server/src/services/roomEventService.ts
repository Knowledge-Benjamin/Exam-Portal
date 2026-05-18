import { db } from '../db/db';
import { examRoomEvents } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function getRoomEvents(examId: string, limit = 50, offset = 0) {
  const rows = await db
    .select({
      id: examRoomEvents.id,
      submissionId: examRoomEvents.submissionId,
      studentName: examRoomEvents.studentName,
      studentRegNumber: examRoomEvents.studentRegNumber,
      type: examRoomEvents.type,
      timestamp: examRoomEvents.timestamp,
      message: examRoomEvents.message,
      createdAt: examRoomEvents.createdAt,
    })
    .from(examRoomEvents)
    .where(eq(examRoomEvents.examId, examId))
    .orderBy(desc(examRoomEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((r) => ({
    id: r.id,
    submissionId: r.submissionId,
    studentName: r.studentName,
    studentRegNumber: r.studentRegNumber,
    type: r.type,
    timestamp: (r.timestamp as Date).toISOString(),
    message: r.message,
    createdAt: (r.createdAt as Date).toISOString(),
  }));
}

export async function countRoomEvents(examId: string) {
  const [row] = await db
    .select({ count: sql`count(*)` })
    .from(examRoomEvents)
    .where(eq(examRoomEvents.examId, examId));
  // Drizzle raw count may return string/number depending on dialect
  // normalize to number
  const c = (row as any).count;
  return typeof c === 'string' ? parseInt(c, 10) : Number(c || 0);
}
