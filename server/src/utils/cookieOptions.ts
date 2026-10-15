import { Request } from 'express';
import { env } from '../config/env';

export function getCookieOptions(req: Request, overrides?: {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  domain?: string;
}) {
  const forwardedProto = String(req.get('x-forwarded-proto') ?? '');
  const protocol = req.protocol || forwardedProto.split(',')[0] || 'http';
  const isSecure = protocol.toLowerCase() === 'https';

  // In production the frontend (eportal-zv74.onrender.com) and backend
  // (exam-portal-backend-rwk8.onrender.com) are always cross-origin. Browser
  // SSO redirects carry no Origin header so the old crossSite detection always
  // returned false → SameSite=Lax → cookies were dropped on subsequent XHR
  // calls from the frontend. Force SameSite=None;Secure in production.
  const isProd = env.isProd;

  let crossSite = isProd; // always cross-site in production
  if (!isProd) {
    const originHeader = String(req.get('origin') ?? '');
    const hostHeader = String(req.get('host') ?? '');
    if (originHeader) {
      try {
        const originHost = new URL(originHeader).host;
        const corsHost = env.CORS_ORIGIN ? new URL(env.CORS_ORIGIN).host : '';
        crossSite = originHost !== hostHeader && originHost !== corsHost;
      } catch {
        crossSite = false;
      }
    }
  }

  const finalSameSite = overrides?.sameSite ?? (crossSite ? 'none' : 'lax');
  const finalSecure = overrides?.secure ?? (finalSameSite === 'none' || isProd ? true : isSecure);

  return {
    httpOnly: overrides?.httpOnly ?? true,
    secure: finalSecure,
    sameSite: finalSameSite,
    path: overrides?.path ?? '/',
    // Never set domain attribute—let cookies be host-only so they persist
    // regardless of frontend origin.
  };
}
