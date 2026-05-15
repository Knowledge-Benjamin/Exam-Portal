import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { validateSEBHash } from '../utils/crypto';
import { getExamById } from '../services/examService';
import { getExamByToken } from '../services/sebService';
import { getUserProfile } from '../services/authService';

const SEB_HEADER = 'x-safeexambrowser-requesthash';

/**
 * Blocks access unless the request carries the SEB request hash header.
 * In production, ALWAYS requires the SEB header.
 * Then fetches the teacher's SEB config key. If configured, cryptographically validates the hash.
 */
export async function sebGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const headerHash = req.headers[SEB_HEADER] as string | undefined;

  // In non-production, if no SEB header is present, bypass for development
  if (!env.isProd && !headerHash) {
    (req as Request & { sebHash?: string }).sebHash = 'dev-bypass';
    next();
    return;
  }

  if (!headerHash) {
    res.status(403).json({
      error: 'Access denied. This resource is only available inside Safe Exam Browser.',
    });
    return;
  }

  // Determine examId based on route context
  let examId: string | null = null;
  
  if (req.examSession?.examId) {
    examId = req.examSession.examId;
  } else if (req.params.token) {
    try {
      const tokenStr = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
      const exam = await getExamByToken(tokenStr as string);
      if (exam) examId = exam.id;
    } catch { /* ignore */ }
  } else if (req.params.examId) {
    const examIdStr = Array.isArray(req.params.examId) ? req.params.examId[0] : req.params.examId;
    examId = examIdStr as string;
  }

  let sebConfigKey: string | null = null;

  if (examId) {
    try {
      const exam = await getExamById(examId);
      if (exam) {
        const teacher = await getUserProfile(exam.teacherId);
        if (teacher?.sebConfigKey) {
          sebConfigKey = teacher.sebConfigKey;
        }
      }
    } catch { /* ignore */ }
  }

  // If a key is configured for this teacher, validate it strictly
  if (sebConfigKey) {
    const protocol = req.protocol;
    const host = req.get('host') ?? '';
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const valid = validateSEBHash(fullUrl, headerHash, sebConfigKey);
    if (!valid) {
      res.status(403).json({
        error: 'Safe Exam Browser authentication failed. Config key mismatch.',
      });
      return;
    }
  }

  (req as Request & { sebHash?: string }).sebHash = headerHash;
  next();
}
