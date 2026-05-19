import path from 'path';
import multer from 'multer';
import { Router, Request, Response, NextFunction } from 'express';
import { sebGuard } from '../middleware/sebGuard';
import { sebLimiter } from '../middleware/rateLimiter';
import { requireExamAuth } from '../middleware/auth';
import { processSEBJoin } from '../services/sebService';
import { examJoinSchema, saveAnswersSchema } from '../utils/validators';
import { getExamById, getQuestions } from '../services/examService';
import { getSubmissionById, saveAnswers, finalSubmit, saveSubmissionFile } from '../services/submissionService';
import { getUserProfile } from '../services/authService';
import { getDriveCredentialsFromUser, uploadPdfToDrive } from '../services/driveService';
import { isFileExtensionAllowed, isFileTypeAllowed, MAX_SUBMISSION_FILE_SIZE_MB } from '../utils/fileTypes';
import { env } from '../config/env';
import { getCookieOptions } from '../utils/cookieOptions';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SUBMISSION_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!isFileTypeAllowed(file.mimetype)) {
      cb(new Error('This file type is not allowed for security reasons'));
      return;
    }

    if (!isFileExtensionAllowed(file.originalname)) {
      cb(new Error(`File extension not allowed: ${file.originalname}`));
      return;
    }

    cb(null, true);
  },
});

const router = Router();

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
      console.info('[seb] issuing exam_token', {
        origin: req.get('origin'),
        host: req.get('host'),
        protocol: req.protocol,
        forwardedProto: req.get('x-forwarded-proto'),
        cookieOpts,
      });

      res.cookie('exam_token', result.examToken, {
        ...cookieOpts,
        maxAge: 90 * 60 * 1000,
      });

      res.json({ 
        ok: true, 
        examId: result.examId,
        examToken: result.examToken, // Also return token for socket.io handshake auth
      });
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

router.post(
  '/submission/upload',
  sebGuard,
  requireExamAuth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.info('[seb submission file upload] request', {
        examId: req.examSession?.examId,
        submissionId: req.examSession?.submissionId,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        fileType: req.file?.mimetype,
      });

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const exam = await getExamById(req.examSession!.examId);
      if (!exam) {
        res.status(404).json({ error: 'Exam not found' });
        return;
      }
      if (!exam.allowFileUpload) {
        res.status(403).json({ error: 'File uploads are not enabled for this exam' });
        return;
      }

      const submissionId = req.examSession!.submissionId;
      const submission = await getSubmissionById(submissionId);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      if (submission.examId !== req.examSession!.examId) {
        res.status(400).json({ error: 'Submission does not belong to this exam' });
        return;
      }

      if (submission.isFinal) {
        res.status(400).json({ error: 'Cannot upload files after final submission' });
        return;
      }

      const teacher = await getUserProfile(exam.teacherId);
      const creds = getDriveCredentialsFromUser(teacher);

      if (!teacher || !creds) {
        console.warn('[seb submission file upload] missing google drive configuration', { teacherId: exam.teacherId });
        res.status(400).json({ error: 'Google Drive is not configured for submissions' });
        return;
      }

      if (!isFileExtensionAllowed(req.file.originalname)) {
        res.status(400).json({ error: `File extension not allowed: ${req.file.originalname}` });
        return;
      }

      const fileId = await uploadPdfToDrive(req.file.buffer, req.file.originalname, req.file.mimetype, creds);

      const updated = await saveSubmissionFile(
        submissionId,
        fileId,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
      );

      console.info('[seb submission file upload] success', {
        examId: req.examSession!.examId,
        submissionId,
        fileId,
        fileName: req.file.originalname,
      });

      res.json({ submission: updated });
    } catch (err: any) {
      console.error('[seb submission file upload] error', err);
      if (err.message?.includes('not allowed')) {
        res.status(400).json({ error: err.message });
      } else {
        next(err);
      }
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
