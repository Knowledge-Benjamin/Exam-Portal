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
  const token = req.cookies?.exam_token as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'Exam session not found. Access via Safe Exam Browser.' });
    return;
  }
  try {
    req.examSession = verifyExamToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Exam session expired or invalid' });
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
