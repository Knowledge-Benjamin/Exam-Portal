import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { timingSafeEqual } from '../utils/crypto';
import { getExamById } from '../services/examService';
import { getExamByToken } from '../services/sebService';

const SEB_BEK_HEADER = 'x-safeexambrowser-requesthash';
const SEB_CK_HEADER = 'x-safeexambrowser-configkeyhash';

/**
 * Blocks access unless the request carries the SEB request hash header.
 * In production, ALWAYS requires the SEB header.
 *
 * SEB Browser Exam Key spec:
 *   requestHash = SHA256( url_as_utf8_bytes + configKey_as_raw_bytes )
 * where configKey_as_raw_bytes is the 32-byte binary SHA256 of the plist XML —
 * NOT the hex string representation. We store it as hex in the DB, so we must
 * Buffer.from(hex, 'hex') before hashing.
 */
export async function sebGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bekHash = req.headers[SEB_BEK_HEADER] as string | undefined;
  const ckHash  = req.headers[SEB_CK_HEADER]  as string | undefined;
  const anyHeaderHash = bekHash || ckHash;

  // In non-production, if no SEB header is present, bypass for development
  if (!env.isProd && !anyHeaderHash) {
    (req as Request & { sebHash?: string }).sebHash = 'dev-bypass';
    next();
    return;
  }

  if (!anyHeaderHash) {
    console.warn(
      `[seb] sebGuard blocked: missing SEB header. path=${req.method} ${req.originalUrl} headers=${Object.keys(req.headers).join(', ')}`,
    );
    res.status(403).json({
      error: 'Access denied. This resource is only available inside Safe Exam Browser.',
      details: 'No SEB request hash header was present.',
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
      if (exam?.sebConfigKey) {
        sebConfigKey = exam.sebConfigKey;
      }
    } catch { /* ignore */ }
  }

  // If a config key is stored for this exam, validate the SEB hash strictly
  if (sebConfigKey) {
    const sanitizedKey = sebConfigKey.trim().toLowerCase();

    // configKey stored in DB is hex — decode to raw 32-byte Buffer
    const configKeyBytes = Buffer.from(sanitizedKey, 'hex');

    // Try both https and http variants of the origin (robust to misconfigured env)
    const baseOrigin  = env.CORS_ORIGIN.replace(/\/$/, '');
    const originHttps = baseOrigin.replace(/^http:\/\//, 'https://');
    const originHttp  = baseOrigin.replace(/^https:\/\//, 'http://');

    const urlHttps = `${originHttps}${req.originalUrl}`;
    const urlHttp  = `${originHttp}${req.originalUrl}`;

    // SHA256( url_utf8_bytes || configKey_raw_bytes )
    const expectedHttps = crypto.createHash('sha256')
      .update(Buffer.from(urlHttps, 'utf8'))
      .update(configKeyBytes)
      .digest('hex');
    const expectedHttp = crypto.createHash('sha256')
      .update(Buffer.from(urlHttp, 'utf8'))
      .update(configKeyBytes)
      .digest('hex');

    const receivedBek = bekHash?.toLowerCase() ?? null;
    const receivedCk  = ckHash?.toLowerCase()  ?? null;

    const matchesBek = receivedBek
      ? (timingSafeEqual(expectedHttps, receivedBek) || timingSafeEqual(expectedHttp, receivedBek))
      : false;
    const matchesCk  = receivedCk
      ? (timingSafeEqual(expectedHttps, receivedCk) || timingSafeEqual(expectedHttp, receivedCk))
      : false;

    if (!matchesBek && !matchesCk) {
      const keySnippet = `${sanitizedKey.substring(0, 6)}...${sanitizedKey.substring(sanitizedKey.length - 4)}`;
      console.warn(
        `[seb] config key mismatch. URL=${urlHttps} expected=${expectedHttps} BEK=${receivedBek ?? 'none'} CK=${receivedCk ?? 'none'} DBKey=${keySnippet}`,
      );
      res.status(403).json({
        error: 'Safe Exam Browser authentication failed. Config key mismatch.',
        details: `Debug: expected=${expectedHttps}, BEK=${receivedBek ?? 'none'}, CK=${receivedCk ?? 'none'}, URL=${urlHttps}`,
      });
      return;
    }
  }

  (req as Request & { sebHash?: string }).sebHash = anyHeaderHash;
  next();
}
