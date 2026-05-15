import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createExamSchema,
  updateExamSchema,
} from '../utils/validators';
import {
  listExamsByTeacher,
  assertExamOwner,
  createExam,
  updateExam,
  publishExam,
  closeExam,
  republishExam,
  deleteExam,
  setPdfPath,
} from '../services/examService';
import { env } from '../config/env';

const router = Router();

// ─── Multer (PDF upload) ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(env.UPLOAD_DIR);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/exams
router.get(
  '/',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const examList = await listExamsByTeacher(req.user!.sub);
      res.json({ exams: examList });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams
router.post(
  '/',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createExamSchema.parse(req.body);
      const exam = await createExam(req.user!.sub, data);
      res.status(201).json({ exam });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/exams/:id
router.get(
  '/:id',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exam = await assertExamOwner(req.params.id, req.user!.sub);
      res.json({ exam });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/exams/:id
router.patch(
  '/:id',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const data = updateExamSchema.parse(req.body);
      const exam = await updateExam(req.params.id, req.user!.sub, data);
      res.json({ exam });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/exams/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await deleteExam(req.params.id, req.user!.sub);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams/:id/publish
router.post(
  '/:id/publish',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exam = await publishExam(req.params.id, req.user!.sub);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      res.json({
        exam,
        sebGateUrl: `${baseUrl}/seb/gate/${exam.sebExamToken}`,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams/:id/close
router.post(
  '/:id/close',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exam = await closeExam(req.params.id, req.user!.sub);
      res.json({ exam });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams/:id/republish  — reopen a closed exam within valid window
router.post(
  '/:id/republish',
  requireAuth,
  requireRole('teacher', 'admin'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const exam = await republishExam(req.params.id, req.user!.sub);
      res.json({ exam });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/exams/:id/pdf
router.post(
  '/:id/pdf',
  requireAuth,
  requireRole('teacher', 'admin'),
  upload.single('pdf'),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No PDF file provided' });
        return;
      }
      await assertExamOwner(req.params.id, req.user!.sub);
      await setPdfPath(req.params.id, req.file.filename);
      res.json({ filename: req.file.filename });
    } catch (err) {
      next(err);
    }
  },
);



export default router;
