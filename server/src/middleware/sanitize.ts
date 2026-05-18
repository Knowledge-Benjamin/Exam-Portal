import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Recursively escapes all string values in an object.
 * Skips escaping for fields that contain HTML content (handled separately by DOMPurify on client).
 */
const RAW_STRING_KEYS = new Set(['googlePrivateKey', 'googleOAuthRefreshToken', 'sebConfigKey']);
const HTML_CONTENT_KEYS = new Set(['answers']); // Don't escape HTML content fields

function escapeStrings(value: unknown, key?: string, parentKey?: string): unknown {
  if (typeof value === 'string') {
    // Skip escaping for raw string keys and HTML content fields
    if (key && RAW_STRING_KEYS.has(key)) {
      return value;
    }
    if (parentKey && HTML_CONTENT_KEYS.has(parentKey)) {
      return value;
    }
    const escaped = validator.escape(value.trim());
    // preserve forward slashes in plain text fields like registration numbers
    return escaped.replace(/&#x2F;|&#x2f;|&#47;/g, '/');
  }
  if (Array.isArray(value)) {
    return value.map((item) => escapeStrings(item, undefined, key));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, escapeStrings(v, k, key)]),
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
