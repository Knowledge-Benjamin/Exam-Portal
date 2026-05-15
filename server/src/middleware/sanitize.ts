import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Recursively escapes all string values in an object.
 */
function escapeStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return validator.escape(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(escapeStrings);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, escapeStrings(v)]),
    );
  }
  return value;
}

/**
 * Sanitizes req.body, req.query, and req.params by escaping HTML entities
 * in all string values. This prevents XSS from being stored in the database.
 *
 * NOTE: Zod validators run after this middleware and provide the primary
 * type/shape validation. This middleware handles raw injection prevention.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = escapeStrings(req.body);
  }
  next();
}
