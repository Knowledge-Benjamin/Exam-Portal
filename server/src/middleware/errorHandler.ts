import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import fs from 'fs';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isZodError = err instanceof ZodError || (err && (err as any).name === 'ZodError');
  if (isZodError) {
    const zodErr = err as ZodError;
    res.status(400).json({
      error: 'Validation failed',
      details: zodErr.errors ? zodErr.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })) : [],
    });
    return;
  }

  const isAppError = err instanceof AppError || (err && (err as any).name === 'AppError');
  if (isAppError) {
    const appErr = err as AppError;
    res.status(appErr.statusCode || 400).json({ error: appErr.message });
    return;
  }


  // Always log unexpected errors so they can be debugged in prod logs
  console.error('[Unhandled Error]', err);
  try {
    require('fs').appendFileSync('error.log', new Date().toISOString() + ' - ' + (err instanceof Error ? err.stack : JSON.stringify(err)) + '\n');
  } catch (e) { }

  res.status(500).json({ error: 'An unexpected error occurred' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}
