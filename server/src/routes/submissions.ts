import { Router, Request, Response, NextFunction } from 'express';
import { pipeline } from 'stream/promises';
import { requireAuth, requireRole, requireExamAuth } from '../middleware/auth';
import { sebGuard } from '../middleware/sebGuard';
import { saveAnswersSchema, markSubmissionSchema } from '../utils/validators';
import { assertExamOwner } from '../services/examService';
import { getExamById } from '../services/examService';
import { getUserProfile } from '../services/authService';
import { getSubmissionById, saveAnswers, finalSubmit, getAllSubmissions, markSubmission } from '../services/submissionService';
import { getDriveCredentialsFromUser, getPdfStreamFromDrive } from '../services/driveService';
import { downloadLimiter } from '../middleware/rateLimiter';

const router = Router();


// GET /api/submissions/my/:examId  — student (SEB required)
router.get(
  '/my/:examId',
  sebGuard,
  requireExamAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      const submissionId = req.examSession!.submissionId;
      const sub = await getSubmissionById(submissionId);
      res.json({ submission: sub });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/submissions/my/:examId  — auto-save (SEB required)
router.put(
  '/my/:examId',
  sebGuard,
  requireExamAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      const submissionId = req.examSession!.submissionId;
      const { answers } = saveAnswersSchema.parse(req.body);
      const sebHash = (req as Request & { sebHash?: string }).sebHash ?? '';
      const sub = await saveAnswers(submissionId, answers, sebHash);
      res.json({ submission: sub, savedAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/submissions/my/:examId/submit  — final submit (SEB required)
router.post(
  '/my/:examId/submit',
  sebGuard,
  requireExamAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      const submissionId = req.examSession!.submissionId;
      const { answers } = saveAnswersSchema.parse(req.body);
      const sebHash = (req as Request & { sebHash?: string }).sebHash ?? '';
      const sub = await finalSubmit(submissionId, answers, sebHash);
      res.json({ submission: sub });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/submissions/:examId  — teacher: list all submissions
router.get(
  '/:examId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      await assertExamOwner(req.params.examId, req.user!.sub);
      const subs = await getAllSubmissions(req.params.examId);
      res.json({ submissions: subs });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/submissions/mark/:submissionId  — teacher: assign marks
router.patch(
  '/mark/:submissionId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ submissionId: string }>, res: Response, next: NextFunction) => {
    try {
      const { marksAwarded, teacherNote } = markSubmissionSchema.parse(req.body);
      const sub = await markSubmission(req.params.submissionId, marksAwarded, teacherNote);
      res.json({ submission: sub });
    } catch (err) {
      next(err);
    }
  },
);


// GET /api/submissions/file/:submissionId — teacher: download student-uploaded file
router.get(
  '/file/:submissionId',
  requireAuth,
  requireRole('teacher', 'admin'),
  downloadLimiter,
  async (req: Request<{ submissionId: string }>, res: Response, next: NextFunction) => {
    try {
      const submission = await getSubmissionById(req.params.submissionId);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      await assertExamOwner(submission.examId, req.user!.sub);
      if (!submission.submissionFileId) {
        res.status(404).json({ error: 'No uploaded file attached to this submission' });
        return;
      }

      const teacher = await getUserProfile(req.user!.sub);
      const creds = getDriveCredentialsFromUser(teacher);
      if (!teacher || !creds) {
        res.status(400).json({ error: 'Google Drive is not configured for downloads' });
        return;
      }

      console.info('[submission file download] request', {
        submissionId: req.params.submissionId,
        examId: submission.examId,
        teacherId: req.user!.sub,
      });

      const stream = await getPdfStreamFromDrive(submission.submissionFileId, creds);

      const rawName = submission.submissionFileName ?? 'submission';
      const safeName = String(rawName).replace(/[\r\n"]/g, '_').slice(0, 255);

      if (submission.submissionFileSize != null) {
        res.setHeader('Content-Length', String(submission.submissionFileSize));
      }
      res.setHeader('Content-Type', submission.submissionFileType ?? 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
      res.setHeader('Cache-Control', 'no-cache');

      stream.on('error', (err) => {
        console.error('[submission file download] stream error', {
          submissionId: req.params.submissionId,
          fileId: submission.submissionFileId,
          error: err?.message,
        });
      });

      req.on('close', () => {
        stream.destroy();
      });

      await pipeline(stream, res);
    } catch (err: any) {
      if (res.headersSent) {
        res.destroy(err);
        return;
      }

      if (err.status && typeof err.status === 'number') {
        res.status(err.status).json({ error: err.message || 'Download failed' });
      } else {
        next(err);
      }
    }
  },
);

export default router;
