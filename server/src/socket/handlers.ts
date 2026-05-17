import { Server, Socket } from 'socket.io';
import { verifyExamToken } from '../utils/token';
import { saveAnswers, forceSubmitAll, getSubmissionById } from '../services/submissionService';
import { getExamById } from '../services/examService';

interface AuthenticatedSocket extends Socket {
  submissionId: string;
  examId: string;
}

interface TimerHandle {
  interval: ReturnType<typeof setInterval>;
  forceSubmitTimeout: ReturnType<typeof setTimeout>;
}

const activeTimers = new Map<string, TimerHandle>();

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    // auth.examToken is set if client passes it explicitly;
    // fall back to parsing the httpOnly cookie sent in the handshake HTTP request
    let token = socket.handshake.auth?.examToken as string | undefined;
    let tokenSource = 'auth.examToken';

    if (!token) {
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const match = cookieHeader.match(/(?:^|;\s*)exam_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
        tokenSource = 'cookie';
      }
    }

    const rawCookieHeader = String(socket.handshake.headers.cookie ?? '');
    console.info('[socket] auth middleware:', {
      cookieHeaderPresent: rawCookieHeader.length > 0,
      cookieHeader: rawCookieHeader.slice(0, 100),
      tokenFound: !!token,
      tokenSource,
      handshakeHeaders: {
        origin: socket.handshake.headers.origin,
        referer: socket.handshake.headers.referer,
        host: socket.handshake.headers.host,
      },
    });

    if (!token) {
      const err = new Error('Exam session required');
      console.warn('[socket] authentication failed: no token available', {
        cookieHeaderPresent: rawCookieHeader.length > 0,
      });
      return next(err);
    }
    try {
      const payload = verifyExamToken(token);
      (socket as AuthenticatedSocket).submissionId = payload.submissionId;
      (socket as AuthenticatedSocket).examId = payload.examId;
      console.info('[socket] authentication successful:', {
        tokenSource,
        examId: payload.examId,
        submissionId: payload.submissionId,
      });
      next();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[socket] token verification failed:', errMsg);
      next(new Error('Invalid or expired exam session'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const s = socket as AuthenticatedSocket;
    const room = `exam:${s.examId}`;
    s.join(room);

    // Start or resume timer for this exam room
    startExamTimer(io, s.examId);

    // Restore existing answers on reconnect
    getSubmissionById(s.submissionId)
      .then((sub) => {
        if (sub) {
          s.emit('exam:restored', { answers: sub.answers, isFinal: sub.isFinal });
        }
      })
      .catch(() => {});

    // Auto-save event from client
    socket.on(
      'exam:autosave',
      async (payload: { answers: Record<string, string>; sebHash?: string }) => {
        try {
          const updated = await saveAnswers(
            s.submissionId,
            payload.answers,
            payload.sebHash ?? '',
          );
          s.emit('exam:autosave:ack', { savedAt: updated.updatedAt });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Save failed';
          s.emit('exam:error', { message });
        }
      },
    );

    socket.on('disconnect', () => {
      // Timer keeps running — student may reconnect
    });
  });
}

function startExamTimer(io: Server, examId: string): void {
  if (activeTimers.has(examId)) return;

  getExamById(examId)
    .then((exam) => {
      if (!exam) return;

      const room = `exam:${examId}`;
      const endTime = exam.endTime.getTime();

      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        io.to(room).emit('exam:timer:sync', { remaining });

        if (remaining === 0) {
          clearInterval(interval);
          activeTimers.delete(examId);
        }
      }, 5000);

      const msUntilEnd = Math.max(0, endTime - Date.now());
      const forceSubmitTimeout = setTimeout(async () => {
        io.to(room).emit('exam:force-submit', {
          message: 'Time is up. Your answers have been submitted automatically.',
        });
        await forceSubmitAll(examId).catch(() => {});
        clearInterval(interval);
        activeTimers.delete(examId);
      }, msUntilEnd);

      activeTimers.set(examId, { interval, forceSubmitTimeout });
    })
    .catch(() => {});
}
