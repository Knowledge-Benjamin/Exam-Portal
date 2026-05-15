import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type TokenType = 'access' | 'refresh' | 'exam';

export interface AccessTokenPayload {
  sub: string;
  role: 'admin' | 'teacher' | 'student';
  type: 'access';
}

export interface ExamTokenPayload {
  submissionId: string;
  examId: string;
  type: 'exam';
}

function secretFor(type: TokenType): string {
  if (type === 'access') return env.JWT_ACCESS_SECRET;
  if (type === 'refresh') return env.JWT_REFRESH_SECRET;
  return env.JWT_EXAM_SECRET;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  const opts: SignOptions = { expiresIn: '15m' };
  return jwt.sign({ ...payload, type: 'access' }, secretFor('access'), opts);
}

export function signExamToken(payload: Omit<ExamTokenPayload, 'type'>): string {
  const opts: SignOptions = { expiresIn: '90m' };
  return jwt.sign({ ...payload, type: 'exam' }, secretFor('exam'), opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, secretFor('access')) as AccessTokenPayload;
}

export function verifyExamToken(token: string): ExamTokenPayload {
  return jwt.verify(token, secretFor('exam')) as ExamTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, secretFor('refresh')) as { sub: string };
}

export function signRefreshToken(userId: string): string {
  const opts: SignOptions = { expiresIn: '7d' };
  return jwt.sign({ sub: userId }, secretFor('refresh'), opts);
}
