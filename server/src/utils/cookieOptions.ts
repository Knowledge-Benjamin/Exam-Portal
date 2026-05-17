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
    ...(overrides?.domain
      ? { domain: overrides.domain }
      : isSecure && env.COOKIE_DOMAIN !== 'localhost'
      ? { domain: env.COOKIE_DOMAIN }
      : {}),
  };
}
