import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyExamToken, AccessTokenPayload, ExamTokenPayload } from '../utils/token';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      examSession?: ExamTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireExamAuth(req: Request, res: Response, next: NextFunction): void {
  const rawCookieHeader = String(req.headers.cookie ?? '');
  const hasCookieHeader = rawCookieHeader.length > 0;
  const hasExamToken = /(?:^|;\s*)exam_token=/.test(rawCookieHeader);
  const token = req.cookies?.exam_token as string | undefined;

  if (!token) {
    console.warn(
      `[seb] requireExamAuth blocked: missing exam_token. path=${req.method} ${req.originalUrl} cookieHeaderPresent=${hasCookieHeader} examTokenPresent=${hasExamToken}`,
    );
    res.status(401).json({
      error: 'Exam session not found. Access via Safe Exam Browser.',
      details: hasCookieHeader
        ? 'Cookie header was received, but exam_token is missing. Check SameSite/secure cookie settings and SEB cookie forwarding.'
        : 'No cookie header was received. Verify SEB is sending cookies to the backend.',
    });
    return;
  }
  try {
    req.examSession = verifyExamToken(token);
    next();
  } catch {
    console.warn(
      `[seb] requireExamAuth blocked: invalid or expired exam_token. path=${req.method} ${req.originalUrl} cookieHeaderPresent=${hasCookieHeader} examTokenPresent=${hasExamToken}`,
    );
    res.status(401).json({
      error: 'Exam session expired or invalid.',
      details: 'Exam token validation failed. Ensure the browser preserves the exam_token cookie across the SEB flow.',
    });
  }
}

export function requireRole(...roles: Array<'admin' | 'teacher' | 'student'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
