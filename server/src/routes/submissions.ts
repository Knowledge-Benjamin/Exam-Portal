import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requireExamAuth } from '../middleware/auth';
import { sebGuard } from '../middleware/sebGuard';
import { saveAnswersSchema, markSubmissionSchema } from '../utils/validators';
import { assertExamOwner } from '../services/examService';
import {
  getSubmissionById,
  saveAnswers,
  finalSubmit,
  getAllSubmissions,
  markSubmission,
} from '../services/submissionService';

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

export default router;
