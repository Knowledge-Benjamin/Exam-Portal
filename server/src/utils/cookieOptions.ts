import { Request } from 'express';
import { env } from '../config/env';

export function getCookieOptions(req: Request, overrides?: {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
}) {
  const isSecure = env.isProd || req.secure || req.get('x-forwarded-proto') === 'https';

  return {
    httpOnly: overrides?.httpOnly ?? true,
    secure: overrides?.secure ?? isSecure,
    sameSite: overrides?.sameSite ?? (env.isProd ? 'none' : isSecure ? 'none' : 'lax'),
    path: overrides?.path ?? '/',
    ...(overrides?.domain
      ? { domain: overrides.domain }
      : isSecure && env.COOKIE_DOMAIN !== 'localhost'
      ? { domain: env.COOKIE_DOMAIN }
      : {}),
  };
}
