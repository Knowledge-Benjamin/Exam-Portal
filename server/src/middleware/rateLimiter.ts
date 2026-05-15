import rateLimit from 'express-rate-limit';

const json429 = (_req: unknown, res: { status: Function; json: Function }) => {
  res.status(429).json({ error: 'Too many requests. Please slow down.' });
};

/** Strict limiter for auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429 as any,
});

/** General API limiter for authenticated routes */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429 as any,
});

/** SEB gate limiter — tighter to prevent token bruteforce */
export const sebLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429 as any,
});
