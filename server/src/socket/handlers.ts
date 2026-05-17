import { Server, Socket } from 'socket.io';
import { verifyAccessToken, verifyExamToken } from '../utils/token';
import { saveAnswers, forceSubmitAll, getSubmissionById } from '../services/submissionService';
import { assertExamOwner, getExamById } from '../services/examService';

interface AuthenticatedSocket extends Socket {
  submissionId?: string;
  examId: string;
  userId?: string;
  userRole?: 'admin' | 'teacher' | 'student';
}

interface TimerHandle {
  interval: ReturnType<typeof setInterval>;
  forceSubmitTimeout: ReturnType<typeof setTimeout>;
}

interface StudentPresence {
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  firstJoinedAt: Date;
  lastSeenAt: Date;
  sockets: Set<string>;
}

interface RoomEvent {
  type: 'joined' | 'left' | 'reconnected';
  submissionId: string;
  studentName: string;
  studentRegNumber: string;
  timestamp: string;
  message: string;
}

const activeTimers = new Map<string, TimerHandle>();
const examRoomPresence = new Map<string, Map<string, StudentPresence>>();
const examRoomLogs = new Map<string, RoomEvent[]>();
const MAX_ROOM_LOGS = 100;

const teacherRoomName = (examId: string) => `exam:${examId}:teachers`;

export function cleanupExamRoomData(examId: string): void {
  const timer = activeTimers.get(examId);
  if (timer) {
    clearInterval(timer.interval);
    clearTimeout(timer.forceSubmitTimeout);
    activeTimers.delete(examId);
  }
  examRoomPresence.delete(examId);
  examRoomLogs.delete(examId);
  console.info('[socket] cleaned up exam room data:', { examId });
}

function getPresenceMap(examId: string) {
  if (!examRoomPresence.has(examId)) {
    examRoomPresence.set(examId, new Map());
  }
  return examRoomPresence.get(examId)!;
}

function getRoomLogs(examId: string) {
  if (!examRoomLogs.has(examId)) {
    examRoomLogs.set(examId, []);
  }
  return examRoomLogs.get(examId)!;
}

function buildRoomState(examId: string) {
  const map = getPresenceMap(examId);
  const participants = Array.from(map.values()).map((presence) => ({
    submissionId: presence.submissionId,
    studentName: presence.studentName,
    studentRegNumber: presence.studentRegNumber,
    firstJoinedAt: presence.firstJoinedAt.toISOString(),
    lastSeenAt: presence.lastSeenAt.toISOString(),
    isConnected: presence.sockets.size > 0,
    connections: presence.sockets.size,
  }));
  const currentCount = participants.filter((participant) => participant.isConnected).length;
  return { currentCount, participants };
}

function emitRoomState(io: Server, examId: string) {
  const state = buildRoomState(examId);
  io.to(teacherRoomName(examId)).emit('exam:room:state', state);
}

function pushRoomEvent(io: Server, examId: string, event: RoomEvent) {
  const logs = getRoomLogs(examId);
  logs.unshift(event);
  if (logs.length > MAX_ROOM_LOGS) logs.pop();
  io.to(teacherRoomName(examId)).emit('exam:room:event', event);
  io.to(teacherRoomName(examId)).emit('exam:room:logs', logs);
  emitRoomState(io, examId);
}

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const rawCookieHeader = String(socket.handshake.headers.cookie ?? '');
    const cookieHeaderPresent = rawCookieHeader.length > 0;
    let token = socket.handshake.auth?.examToken as string | undefined;
    let tokenSource = 'auth.examToken';

    if (!token) {
      const match = rawCookieHeader.match(/(?:^|;\s*)exam_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
        tokenSource = 'cookie';
      }
    }

    if (token) {
      try {
        const payload = verifyExamToken(token);
        (socket as AuthenticatedSocket).submissionId = payload.submissionId;
        (socket as AuthenticatedSocket).examId = payload.examId;
        (socket as AuthenticatedSocket).userRole = 'student';
        console.info('[socket] exam auth successful:', {
          tokenSource,
          examId: payload.examId,
          submissionId: payload.submissionId,
        });
        return next();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[socket] exam token verification failed:', errMsg);
      }
    }

    const accessTokenFromAuth = socket.handshake.auth?.accessToken as string | undefined;
    let accessToken = accessTokenFromAuth;
    let accessTokenSource = accessTokenFromAuth ? 'auth.accessToken' : undefined;

    if (!accessToken) {
      const match = rawCookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) {
        accessToken = decodeURIComponent(match[1]);
        accessTokenSource = 'cookie';
      }
    }

    const requestedExamId = socket.handshake.auth?.watchExamId as string | undefined;

    if (!accessToken || !requestedExamId) {
      const err = new Error('Teacher access token and exam ID required');
      console.warn('[socket] teacher authentication failed: missing credentials', {
        cookieHeaderPresent,
        accessTokenPresent: !!accessToken,
        requestedExamId,
      });
      return next(err);
    }

    try {
      const payload = verifyAccessToken(accessToken);
      if (payload.role !== 'teacher' && payload.role !== 'admin') {
        return next(new Error('Teacher access required'));
      }

      if (payload.role === 'teacher') {
        await assertExamOwner(requestedExamId, payload.sub);
      } else {
        const exam = await getExamById(requestedExamId);
        if (!exam) throw new Error('Exam not found');
      }

      (socket as AuthenticatedSocket).examId = requestedExamId;
      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).userRole = payload.role;
      console.info('[socket] teacher auth successful:', {
        accessTokenSource,
        examId: requestedExamId,
        userId: payload.sub,
        role: payload.role,
      });
      next();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[socket] access token verification failed:', errMsg);
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const s = socket as AuthenticatedSocket;
    const room = `exam:${s.examId}`;

    // Teacher monitoring sockets are separate from student exam rooms
    if (s.userRole === 'teacher' || s.userRole === 'admin') {
      const teacherRoom = teacherRoomName(s.examId);
      socket.join(teacherRoom);
      startExamTimer(io, s.examId);
      socket.emit('exam:room:logs', getRoomLogs(s.examId));
      emitRoomState(io, s.examId);
      return;
    }

    if (!s.submissionId) {
      console.error('[socket] student missing submissionId:', { userId: s.userId, examId: s.examId });
      socket.emit('exam:error', { message: 'Invalid exam session' });
      socket.disconnect();
      return;
    }

    socket.join(room);

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

    // Track live student presence
    getSubmissionById(s.submissionId)
      .then((submission) => {
        if (!submission) {
          console.warn('[socket] submission not found for presence tracking:', { submissionId: s.submissionId });
          return;
        }
        const now = new Date();
        const name = submission.studentName ?? 'Unknown Student';
        const reg = submission.studentRegNumber ?? 'Unknown ID';
        const presenceMap = getPresenceMap(s.examId);
        const existing = presenceMap.get(s.submissionId!);

        if (!existing) {
          presenceMap.set(s.submissionId!, {
            submissionId: s.submissionId!,
            studentName: name,
            studentRegNumber: reg,
            firstJoinedAt: now,
            lastSeenAt: now,
            sockets: new Set([socket.id]),
          });
          pushRoomEvent(io, s.examId, {
            type: 'joined',
            submissionId: s.submissionId!,
            studentName: name,
            studentRegNumber: reg,
            timestamp: now.toISOString(),
            message: `${name} joined the exam room`,
          });
        } else {
          const wasConnected = existing.sockets.size > 0;
          existing.sockets.add(socket.id);
          if (wasConnected) {
            pushRoomEvent(io, s.examId, {
              type: 'reconnected',
              submissionId: s.submissionId!,
              studentName: name,
              studentRegNumber: reg,
              timestamp: now.toISOString(),
              message: `${name} reconnected to the exam room`,
            });
          }
        }
      })
      .catch((err) => {
        console.error('[socket] failed to fetch submission for presence tracking:', {
          submissionId: s.submissionId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    // Auto-save event from client
    socket.on(
      'exam:autosave',
      async (payload: { answers: Record<string, string>; sebHash?: string }) => {
        try {
          const updated = await saveAnswers(
            s.submissionId!,
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
      const presenceMap = getPresenceMap(s.examId);
      const presence = presenceMap.get(s.submissionId!);
      if (!presence) return;

      presence.sockets.delete(socket.id);

      if (presence.sockets.size === 0) {
        const now = new Date();
        presence.lastSeenAt = now;
        pushRoomEvent(io, s.examId, {
          type: 'left',
          submissionId: s.submissionId!,
          studentName: presence.studentName,
          studentRegNumber: presence.studentRegNumber,
          timestamp: now.toISOString(),
          message: `${presence.studentName} left the exam room`,
        });
      }
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
        io.to(teacherRoomName(examId)).emit('exam:timer:sync', { remaining });

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
        io.to(teacherRoomName(examId)).emit('exam:force-submit', {
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
