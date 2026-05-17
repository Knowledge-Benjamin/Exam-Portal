import { Request } from 'express';
import { env } from '../config/env';

export function getCookieOptions(req: Request, overrides?: {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
}) {
  const originHeader = String(req.get('origin') ?? '');
  const hostHeader = String(req.get('host') ?? '');
  const forwardedProto = String(req.get('x-forwarded-proto') ?? '');
  const protocol = req.protocol || forwardedProto.split(',')[0] || 'http';
  const isSecure = protocol.toLowerCase() === 'https';

  let crossSite = false;
  if (originHeader) {
    try {
      crossSite = new URL(originHeader).host !== hostHeader;
    } catch {
      crossSite = false;
    }
  }

  return {
    httpOnly: overrides?.httpOnly ?? true,
    secure: overrides?.secure ?? isSecure,
    sameSite: overrides?.sameSite ?? (crossSite ? 'none' : 'lax'),
    path: overrides?.path ?? '/',
    // Never set domain attribute—let cookies be host-only so they persist
    // regardless of frontend origin. This ensures cookies work when frontend
    // makes requests via relative paths to the backend's actual host.
  };
}
