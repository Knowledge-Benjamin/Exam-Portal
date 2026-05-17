import { Router, Request, Response, NextFunction } from 'express';
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
  getExamById,
} from '../services/examService';
import { getUserProfile } from '../services/authService';
import { uploadPdfToDrive, getPdfStreamFromDrive, DriveCredentials, getDriveCredentialsFromUser } from '../services/driveService';
import { env } from '../config/env';

const router = Router();

// ─── Multer (PDF upload via Memory) ───────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
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

// POST /api/exams/:id/republish
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
      const exam = await assertExamOwner(req.params.id, req.user!.sub);
      
      const teacher = await getUserProfile(req.user!.sub);
      const creds = getDriveCredentialsFromUser(teacher);
      if (!teacher || !creds) {
        res.status(400).json({ error: 'Google Drive is not configured in your settings. Please configure it to upload PDFs.' });
        return;
      }

      const fileId = await uploadPdfToDrive(req.file.buffer, req.file.originalname, req.file.mimetype, creds);
      await setPdfPath(req.params.id, req.user!.sub, fileId);
      
      res.json({ filename: fileId });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/exams/:id/pdf/download
router.get(
  '/:id/pdf/download',
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      // Allow if user is teacher OR if student is in an active exam session for this exam
      const examId = req.params.id;
      let isAuthorized = false;

      // 1. Check teacher auth
      const accessToken = req.cookies?.access_token as string | undefined;
      let teacherIdFromToken: string | null = null;
      if (accessToken) {
        const { verifyAccessToken } = await import('../utils/token');
        try {
          const user = verifyAccessToken(accessToken);
          if (user.role === 'admin' || user.role === 'teacher') {
            isAuthorized = true;
            teacherIdFromToken = user.sub;
          }
        } catch { /* ignore */ }
      }

      // 2. Check student exam session
      if (!isAuthorized) {
        const examToken = req.cookies?.exam_token as string | undefined;
        const rawCookies = String(req.headers.cookie ?? '');
        if (examToken) {
          const { verifyExamToken } = await import('../utils/token');
          try {
            const session = verifyExamToken(examToken);
            if (session.examId === examId) {
              isAuthorized = true;
            }
          } catch (err) {
            console.warn('[pdf] exam token verification failed:', err instanceof Error ? err.message : 'unknown');
          }
        } else {
          console.warn('[pdf] no exam_token found in cookies', {
            cookieHeaderPresent: rawCookies.length > 0,
            examId,
            hasAccessToken: !!accessToken,
          });
        }
      }

      if (!isAuthorized) {
        console.warn('[pdf] unauthorized pdf access attempt:', {
          examId,
          hasAccessToken: !!accessToken,
          hasExamToken: !!req.cookies?.exam_token,
        });
        res.status(401).json({ error: 'Not authorized to view this PDF' });
        return;
      }

      const exam = await getExamById(examId);
      if (!exam || !exam.pdfPath) {
        res.status(404).json({ error: 'Exam or PDF not found' });
        return;
      }

      // Ensure teacher is the owner if accessed via access token
      if (teacherIdFromToken && exam.teacherId !== teacherIdFromToken) {
        res.status(403).json({ error: 'You do not own this exam' });
        return;
      }

      const teacher = await getUserProfile(exam.teacherId);
      const creds = getDriveCredentialsFromUser(teacher);
      if (!teacher || !creds) {
        res.status(500).json({ error: 'Google Drive is not configured for this exam owner.' });
        return;
      }

      const stream = await getPdfStreamFromDrive(exam.pdfPath, creds);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="exam.pdf"');
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },
);



export default router;
