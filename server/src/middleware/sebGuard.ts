import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { timingSafeEqual } from '../utils/crypto';
import { getExamById } from '../services/examService';
import { getExamByToken } from '../services/sebService';
import { getUserProfile } from '../services/authService';

const SEB_BEK_HEADER = 'x-safeexambrowser-requesthash';
const SEB_CK_HEADER = 'x-safeexambrowser-configkeyhash';

/**
 * Blocks access unless the request carries the SEB request hash header.
 * In production, ALWAYS requires the SEB header.
 * Then fetches the teacher's SEB config key. If configured, cryptographically validates the hash.
 */
export async function sebGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bekHash = req.headers[SEB_BEK_HEADER] as string | undefined;
  const ckHash = req.headers[SEB_CK_HEADER] as string | undefined;
  const anyHeaderHash = bekHash || ckHash;

  // In non-production, if no SEB header is present, bypass for development
  if (!env.isProd && !anyHeaderHash) {
    (req as Request & { sebHash?: string }).sebHash = 'dev-bypass';
    next();
    return;
  }

  if (!anyHeaderHash) {
    res.status(403).json({
      error: `Access denied. This resource is only available inside Safe Exam Browser. (Debug: Missing header. Headers received: ${Object.keys(req.headers).join(', ')})`,
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
    // The SEB client computes the hash using the URL it sees in its address bar.
    // Since we are proxying from the frontend (CORS_ORIGIN), the Host header here 
    // is the backend's host, but SEB hashed the frontend's host.
    const origin = env.CORS_ORIGIN.replace(/\/$/, '');
    const fullUrl = `${origin}${req.originalUrl}`;

    // SEB computes SHA256(URL + Key)
    const expected = crypto.createHash('sha256').update(fullUrl + sebConfigKey, 'utf8').digest('hex');
    
    // Check if the expected hash matches either the BEK header or the CK header
    const matchesBek = bekHash ? timingSafeEqual(expected, bekHash) : false;
    const matchesCk = ckHash ? timingSafeEqual(expected, ckHash) : false;

    if (!matchesBek && !matchesCk) {
      res.status(403).json({
        error: `Safe Exam Browser authentication failed. Config key mismatch. (Debug: URL=${fullUrl}, Expected=${expected}, ReceivedBEK=${bekHash || 'none'}, ReceivedCK=${ckHash || 'none'})`,
      });
      return;
    }
  }

  (req as Request & { sebHash?: string }).sebHash = anyHeaderHash;
  next();
}
