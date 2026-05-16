import { Router, Request, Response, NextFunction } from 'express';
import { sebGuard } from '../middleware/sebGuard';
import { sebLimiter } from '../middleware/rateLimiter';
import { requireExamAuth } from '../middleware/auth';
import { processSEBJoin } from '../services/sebService';
import { examJoinSchema, saveAnswersSchema } from '../utils/validators';
import { getExamById, getQuestions } from '../services/examService';
import { getSubmissionById, saveAnswers, finalSubmit } from '../services/submissionService';
import { env } from '../config/env';

const router = Router();

// Helper to compute cookie options based on request protocol (mirrors auth route behavior)
function getCookieOptions(req: Request) {
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    ...(isSecure && env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/**
 * GET /seb/gate/:token
 *
 * Embedded in the .seb config file. Redirects SEB browser to the React lobby.
 */
router.get(
  '/gate/:token',
  sebLimiter,
  (req: Request<{ token: string }>, res: Response) => {
    res.redirect(`${env.CORS_ORIGIN}/exam-join/${req.params.token}`);
  },
);

/**
 * POST /seb/join/:token
 *
 * Called by the React frontend after the student enters their name + reg number.
 * Validates the time window, creates the submission row, and issues the exam token.
 */
router.post(
  '/join/:token',
  sebLimiter,
  sebGuard,
  async (req: Request<{ token: string }>, res: Response, next: NextFunction) => {
    try {
      const { studentName, studentRegNumber } = examJoinSchema.parse(req.body);
      const ipAddress = req.ip ?? '';

      const result = await processSEBJoin(
        req.params.token,
        studentName,
        studentRegNumber,
        ipAddress,
      );

      const cookieOpts = getCookieOptions(req);
      res.cookie('exam_token', result.examToken, {
        ...cookieOpts,
        maxAge: 90 * 60 * 1000,
      });

      res.json({ ok: true, examId: result.examId });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /seb/exam/:examId
 *
 * Student-facing exam data endpoint — requires only the exam_token cookie.
 * Returns exam metadata so ExamRoom can render without a teacher access_token.
 */
router.get(
  '/exam/:examId',
  sebGuard,
  requireExamAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      // Verify the exam_token matches the requested examId
      if (req.examSession!.examId !== req.params.examId) {
        res.status(403).json({ error: 'Token does not match this exam' });
        return;
      }
      const exam = await getExamById(req.params.examId);
      if (!exam) {
        res.status(404).json({ error: 'Exam not found' });
        return;
      }
      // Sanitize exam object for student: remove sebConfigKey (sensitive)
      const { sebConfigKey, ...sanitizedExam } = exam;
      res.json({ exam: sanitizedExam });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /seb/exam/:examId/questions
 *
 * Student-facing questions endpoint — requires only the exam_token cookie.
 */
router.get(
  '/exam/:examId/questions',
  sebGuard,
  requireExamAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      if (req.examSession!.examId !== req.params.examId) {
        res.status(403).json({ error: 'Token does not match this exam' });
        return;
      }
      const questions = await getQuestions(req.params.examId);
      res.json({ questions });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /seb/submission
 *
 * Student-facing submission endpoint — returns their own submission using exam_token.
 */
router.get(
  '/submission',
  sebGuard,
  requireExamAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sub = await getSubmissionById(req.examSession!.submissionId);
      res.json({ submission: sub });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /seb/submission/save
 *
 * Auto-save answers via REST (fallback if socket not connected).
 */
router.put(
  '/submission/save',
  sebGuard,
  requireExamAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answers } = saveAnswersSchema.parse(req.body);
      const sub = await saveAnswers(req.examSession!.submissionId, answers, 'rest-save');
      res.json({ savedAt: sub.updatedAt });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /seb/submission/submit
 *
 * Final submit for the student.
 */
router.post(
  '/submission/submit',
  sebGuard,
  requireExamAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answers } = saveAnswersSchema.parse(req.body);
      const sub = await finalSubmit(req.examSession!.submissionId, answers, 'rest-submit');
      res.json({ submission: sub });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
