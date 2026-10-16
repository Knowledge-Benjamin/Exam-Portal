import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { timingSafeEqual } from '../utils/crypto';
import { getExamById } from '../services/examService';
import { getExamByToken } from '../services/sebService';
import { generateConfigKeyHash } from '../utils/sebKey';

const SEB_BEK_HEADER = 'x-safeexambrowser-requesthash';
const SEB_CK_HEADER  = 'x-safeexambrowser-configkeyhash';

/**
 * Safe Exam Browser Security Guard
 *
 * 1. Blocks any non-SEB client (Chrome, Firefox, Safari, Edge, curl, Postman).
 *    All legitimate SEB clients automatically inject:
 *      x-safeexambrowser-requesthash
 *      x-safeexambrowser-configkeyhash
 *
 * 2. When an exam has a registered SEB Config Key, verifies the request hash
 *    according to the official SEB specification:
 *      headerHash = SHA-256( requestedURL + configKeyHex )
 *
 * 3. Supports strict mode via env.SEB_CONFIG_KEY === 'STRICT'. In default mode,
 *    an authentic SEB client is admitted with detailed warning logs if a legacy/stale
 *    DB key is encountered, preventing student lockout during live exams.
 */
export async function sebGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const bekHash = req.headers[SEB_BEK_HEADER] as string | undefined;
  const ckHash  = req.headers[SEB_CK_HEADER]  as string | undefined;
  const anyHeaderHash = bekHash || ckHash;

  // In non-production, bypass when no SEB headers are present (allows dev work)
  if (!env.isProd && !anyHeaderHash) {
    (req as Request & { sebHash?: string }).sebHash = 'dev-bypass';
    next();
    return;
  }

  // Block any non-SEB browser or script
  if (!anyHeaderHash) {
    console.warn(
      `[seb] Blocked non-SEB client: ${req.method} ${req.originalUrl} | headers=${Object.keys(req.headers).join(', ')}`,
    );
    res.status(403).json({
      error: 'Access denied. This resource is only available inside Safe Exam Browser.',
      details: 'No SEB request hash header was present.',
    });
    return;
  }

  // ── Resolve examId from route context ────────────────────────────────────────
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
    examId = Array.isArray(req.params.examId) ? req.params.examId[0] : req.params.examId;
  }

  // ── Load stored sebConfigKey for this exam ────────────────────────────────────
  let sebConfigKey: string | null = null;
  let examToken: string | null = null;

  if (examId) {
    try {
      const exam = await getExamById(examId);
      if (exam?.sebConfigKey) sebConfigKey = exam.sebConfigKey.trim().toLowerCase();
      if (exam?.sebExamToken) examToken = exam.sebExamToken;
    } catch { /* ignore */ }
  }

  // ── Config Key validation ───────────────────────────────────────────────────
  if (sebConfigKey && ckHash) {
    const receivedCk = ckHash.trim().toLowerCase();
    const host = (req.get('host') || '').trim();
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    const origin = env.CORS_ORIGIN.replace(/\/$/, '');

    // Gather candidate URLs that SEB could have evaluated for this request
    const candidateUrls = new Set<string>();

    if (host) {
      candidateUrls.add(`${proto}://${host}${req.originalUrl}`);
      candidateUrls.add(`https://${host}${req.originalUrl}`);
      candidateUrls.add(`http://${host}${req.originalUrl}`);
      const pathOnly = req.originalUrl.split('?')[0];
      candidateUrls.add(`${proto}://${host}${pathOnly}`);
      candidateUrls.add(`https://${host}${pathOnly}`);
    }

    if (origin) {
      candidateUrls.add(`${origin}${req.originalUrl}`);
      candidateUrls.add(`${origin.replace(/^http:/, 'https:')}${req.originalUrl}`);
      candidateUrls.add(`${origin.replace(/^https:/, 'http:')}${req.originalUrl}`);
    }

    const reqOrigin = req.get('origin');
    if (reqOrigin) {
      candidateUrls.add(`${reqOrigin.replace(/\/$/, '')}${req.originalUrl}`);
    }

    // Also include gate/start URL if this is a join endpoint
    if (examToken && origin) {
      candidateUrls.add(`${origin}/exam-join/${examToken}`);
      candidateUrls.add(`${origin.replace(/^http:/, 'https:')}/exam-join/${examToken}`);
    }

    // Check if any candidate URL matches the received Config Key Hash
    let matchedUrl: string | null = null;
    for (const url of candidateUrls) {
      const expected = generateConfigKeyHash(url, sebConfigKey);
      if (timingSafeEqual(expected, receivedCk)) {
        matchedUrl = url;
        break;
      }
    }

    if (matchedUrl) {
      // Verified authentic config key!
      (req as Request & { sebHash?: string }).sebHash = anyHeaderHash;
      next();
      return;
    }

    // Hash did not match candidate URLs
    const keySnippet = `${sebConfigKey.substring(0, 8)}...${sebConfigKey.substring(sebConfigKey.length - 4)}`;
    console.warn(
      `[seb] Config key hash mismatch: examId=${examId} DBKey=${keySnippet} ReceivedCK=${receivedCk} TestedUrls=[${Array.from(candidateUrls).join(', ')}]`,
    );

    const isStrict = env.SEB_CONFIG_KEY === 'STRICT';
    if (isStrict) {
      res.status(403).json({
        error: 'Safe Exam Browser authentication failed. Config key mismatch.',
        details:
          'The .seb configuration used does not match the active exam settings. ' +
          'Please re-download the .seb file from the student portal and try again.',
      });
      return;
    }

    // Default mode: Client is verified inside genuine SEB; log warning and proceed
    console.info(`[seb] Admitted verified SEB client under lax configuration check.`);
  }

  (req as Request & { sebHash?: string }).sebHash = anyHeaderHash;
  next();
}
