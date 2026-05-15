import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { validateSEBHash } from '../utils/crypto';

const SEB_HEADER = 'x-safeexambrowser-requesthash';

/**
 * Blocks access unless the request carries the SEB request hash header.
 * If SEB_CONFIG_KEY is configured, the hash is cryptographically validated.
 * If SEB_CONFIG_KEY is 'NONE', header presence is checked only (dev mode).
 */
export function sebGuard(req: Request, res: Response, next: NextFunction): void {
  // In development mode (SEB_CONFIG_KEY=NONE), bypass SEB enforcement entirely
  if (env.SEB_CONFIG_KEY === 'NONE') {
    (req as Request & { sebHash?: string }).sebHash = 'dev-bypass';
    next();
    return;
  }

  const headerHash = req.headers[SEB_HEADER] as string | undefined;

  if (!headerHash) {
    res.status(403).json({
      error: 'Access denied. This resource is only available inside Safe Exam Browser.',
    });
    return;
  }

  const protocol = req.protocol;
  const host = req.get('host') ?? '';
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  const valid = validateSEBHash(fullUrl, headerHash, env.SEB_CONFIG_KEY);
  if (!valid) {
    res.status(403).json({
      error: 'Safe Exam Browser authentication failed. Config key mismatch.',
    });
    return;
  }

  (req as Request & { sebHash?: string }).sebHash = headerHash;
  next();
}
