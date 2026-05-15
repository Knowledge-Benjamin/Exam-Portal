import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
} from '../utils/validators';
import {
  assertExamOwner,
  getQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '../services/examService';

const router = Router({ mergeParams: true });

// GET /api/exams/:examId/questions
router.get(
  '/',
  requireAuth,
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      const qs = await getQuestions(req.params.examId);
      res.json({ questions: qs });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams/:examId/questions
router.post(
  '/',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      await assertExamOwner(req.params.examId, req.user!.sub);
      const data = createQuestionSchema.parse(req.body);
      const q = await addQuestion(req.params.examId, data);
      res.status(201).json({ question: q });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/exams/:examId/questions/reorder
router.put(
  '/reorder',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ examId: string }>, res: Response, next: NextFunction) => {
    try {
      await assertExamOwner(req.params.examId, req.user!.sub);
      const { order } = reorderQuestionsSchema.parse(req.body);
      await reorderQuestions(req.params.examId, order);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/exams/:examId/questions/:questionId
router.patch(
  '/:questionId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ examId: string; questionId: string }>, res: Response, next: NextFunction) => {
    try {
      const data = updateQuestionSchema.parse(req.body);
      const q = await updateQuestion(req.params.questionId, req.user!.sub, data);
      res.json({ question: q });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/exams/:examId/questions/:questionId
router.delete(
  '/:questionId',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ examId: string; questionId: string }>, res: Response, next: NextFunction) => {
    try {
      await deleteQuestion(req.params.questionId, req.user!.sub);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
