import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';

import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRouter from './routes/auth';
import examsRouter from './routes/exams';
import questionsRouter from './routes/questions';
import submissionsRouter from './routes/submissions';
import sebRouter from './routes/seb';

import { registerSocketHandlers } from './socket/handlers';
import { autoCloseExpiredExams } from './services/examService';

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
  },
});

registerSocketHandlers(io);

// ─── Global Middleware ───────────────────────────────────────────────────────

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-safeexambrowser-requesthash'],
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(sanitizeInput);
app.use('/api', apiLimiter);

// ─── Static: Uploaded PDFs ───────────────────────────────────────────────────
// PDFs are now streamed via the /api/exams/:id/pdf/download endpoint using Google Drive

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/exams', examsRouter);
app.use('/api/exams/:examId/questions', questionsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/seb', sebRouter);

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handling ──────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────

httpServer.listen(env.PORT, () => {
  console.log(`[server] Running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[server] CORS origin: ${env.CORS_ORIGIN}`);
  console.log(`[server] SEB validation: ${env.SEB_CONFIG_KEY === 'NONE' ? 'header-presence only' : 'HMAC enabled'}`);

  // Auto-close exams whose window has expired — runs every 60 seconds
  const runAutoClose = () =>
    autoCloseExpiredExams().catch((err: Error) => {
      // Silently skip on DB connectivity issues (e.g. network interruptions)
      if (err.message?.includes('fetch failed') || err.message?.includes('ETIMEDOUT')) return;
      console.warn('[scheduler] autoClose error:', err.message);
    });

  runAutoClose();
  setInterval(runAutoClose, 60 * 1000);
});

export { app, httpServer, io };
