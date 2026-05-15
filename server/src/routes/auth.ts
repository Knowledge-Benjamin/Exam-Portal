import { Router, Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema, updateProfileSchema, updatePasswordSchema } from '../utils/validators';
import {
  registerUser,
  loginUser,
  refreshSession,
  revokeRefreshToken,
  listUsers,
  updateProfile,
  updatePassword,
} from '../services/authService';
import { requireAuth, requireRole } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict' as const,
  domain: env.COOKIE_DOMAIN,
};

// POST /api/auth/register  (admin only)
router.post(
  '/register',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = registerSchema.parse(req.body);
      const user = await registerUser(data);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await loginUser(email, password);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (!raw) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const tokens = await refreshSession(raw);

    res.cookie('access_token', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (raw) await revokeRefreshToken(raw);

    res.clearCookie('access_token', COOKIE_OPTIONS);
    res.clearCookie('refresh_token', COOKIE_OPTIONS);
    res.clearCookie('exam_token', COOKIE_OPTIONS);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// GET /api/auth/users?role=student  (admin/teacher)
router.get(
  '/users',
  requireAuth,
  requireRole('admin', 'teacher'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.query.role as 'admin' | 'teacher' | 'student' | undefined;
      const users = await listUsers(role);
      res.json({ users });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const updatedUser = await updateProfile(req.user!.sub, data);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/password
router.patch('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
    await updatePassword(req.user!.sub, currentPassword, newPassword);
    res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
