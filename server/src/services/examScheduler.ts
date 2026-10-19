import { db } from '../db/db';
import { exams } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { Server as SocketIOServer } from 'socket.io';

export interface SchedulableExam {
  id: string;
  endTime: Date | string;
  windowBufferMinutes: number;
}

// 32-bit signed integer limit for setTimeout in Node.js (~24.85 days)
const MAX_TIMEOUT_MS = 2_147_483_647;

class ExamScheduler {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private io: SocketIOServer | null = null;

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Calculate the exact millisecond deadline for an exam.
   */
  public getExamDeadline(exam: SchedulableExam): Date {
    const end = typeof exam.endTime === 'string' ? new Date(exam.endTime) : exam.endTime;
    const bufferMs = (exam.windowBufferMinutes ?? 0) * 60 * 1000;
    return new Date(end.getTime() + bufferMs);
  }

  /**
   * Schedule auto-closure of an exam at its exact deadline.
   * Zero polling: a single setTimeout triggers at the precise millisecond.
   */
  public schedule(exam: SchedulableExam) {
    // Clear any existing timer for this exam first
    this.cancel(exam.id);

    const deadline = this.getExamDeadline(exam);
    const now = Date.now();
    const delay = deadline.getTime() - now;

    if (delay <= 0) {
      // Already past deadline - execute auto-close immediately
      this.executeAutoClose(exam.id).catch((err) => {
        console.error(`[examScheduler] Error auto-closing expired exam ${exam.id}:`, err);
      });
      return;
    }

    if (delay > MAX_TIMEOUT_MS) {
      // If deadline is > 24.8 days away, schedule a checkpoint timer
      const timer = setTimeout(() => {
        this.timers.delete(exam.id);
        this.schedule(exam);
      }, MAX_TIMEOUT_MS);
      this.timers.set(exam.id, timer);
      console.log(`[examScheduler] Exam ${exam.id} scheduled (long checkpoint, >24 days)`);
      return;
    }

    // Schedule exact timer
    const timer = setTimeout(async () => {
      this.timers.delete(exam.id);
      await this.executeAutoClose(exam.id).catch((err) => {
        console.error(`[examScheduler] Error auto-closing exam ${exam.id}:`, err);
      });
    }, delay);

    this.timers.set(exam.id, timer);
    console.log(
      `[examScheduler] Exam ${exam.id} scheduled to auto-close in ${Math.round(delay / 1000)}s (${deadline.toISOString()})`
    );
  }

  /**
   * Cancel an exam's scheduled auto-close timer.
   */
  public cancel(examId: string) {
    const existing = this.timers.get(examId);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(examId);
      console.log(`[examScheduler] Cancelled auto-close timer for exam ${examId}`);
    }
  }

  /**
   * Reschedule an exam (e.g. after startTime, duration, or buffer edit).
   */
  public reschedule(exam: SchedulableExam) {
    this.cancel(exam.id);
    this.schedule(exam);
  }

  /**
   * Execute closure: updates DB, notifies sockets, cleans up memory.
   */
  public async executeAutoClose(examId: string): Promise<void> {
    // Update DB status to 'closed' only if still 'active'
    const [closed] = await db
      .update(exams)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(exams.id, examId))
      .returning();

    if (closed) {
      console.log(`[examScheduler] Exam ${examId} reached deadline and auto-closed.`);

      // Notify connected sockets in the exam room
      if (this.io) {
        this.io.to(`exam:${examId}`).emit('exam:closed', {
          examId,
          message: 'The examination window has concluded.',
        });
      }

      // Cleanup socket room tracking data
      try {
        const { cleanupExamRoomData } = await import('../socket/handlers');
        cleanupExamRoomData(examId);
      } catch {
        // Socket handlers cleanup non-fatal
      }
    }
  }

  /**
   * Boot-time initialization.
   * Runs a SINGLE query on startup:
   * 1. Closes any exams that expired while the server was down.
   * 2. Schedules exact timers for any currently active exams.
   * If there are no active exams, it does NOTHING and never queries the DB again.
   */
  public async init(io?: SocketIOServer) {
    if (io) this.setSocketServer(io);

    try {
      const activeExams = await db
        .select({
          id: exams.id,
          endTime: exams.endTime,
          windowBufferMinutes: exams.windowBufferMinutes,
        })
        .from(exams)
        .where(eq(exams.status, 'active'));

      if (activeExams.length === 0) {
        console.log('[examScheduler] Initialized: 0 active exams. Database can idle freely.');
        return;
      }

      console.log(`[examScheduler] Initializing event timers for ${activeExams.length} active exam(s)...`);
      for (const exam of activeExams) {
        this.schedule(exam);
      }
    } catch (err: any) {
      // Don't crash server if DB is unreachable on startup
      console.error('[examScheduler] Failed to initialize active exam timers:', err.message);
    }
  }
}

export const examScheduler = new ExamScheduler();
