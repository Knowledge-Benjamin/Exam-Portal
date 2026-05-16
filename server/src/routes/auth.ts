import { Router, Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import { loginSchema, registerSchema, updateProfileSchema, updatePasswordSchema, updateSystemConfigSchema } from '../utils/validators';
import {
  registerUser,
  loginUser,
  refreshSession,
  revokeRefreshToken,
  listUsers,
  updateProfile,
  updatePassword,
  updateSystemConfig,
  updateGoogleOAuthRefreshToken,
  getUserProfile,
  sanitizeUserForClient,
} from '../services/authService';
import { requireAuth, requireRole } from '../middleware/auth';
import { verifyAccessToken } from '../utils/token';
import { env } from '../config/env';

const router = Router();

// Helper function to get cookie options based on request protocol
function getCookieOptions(req: Request) {
  const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    ...(isSecure && env.COOKIE_DOMAIN !== 'localhost' ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

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
    const cookieOpts = getCookieOptions(req);

    res.cookie('access_token', result.accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOpts,
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
    const cookieOpts = getCookieOptions(req);

    res.cookie('access_token', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOpts,
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
    const cookieOpts = getCookieOptions(req);

    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('refresh_token', cookieOpts);
    res.clearCookie('exam_token', cookieOpts);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserProfile(req.user!.sub);
    res.json({ user: sanitizeUserForClient(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google-drive/start
router.get('/google-drive/start', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
      res.status(500).json({ error: 'Google OAuth is not configured on the server.' });
      return;
    }

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI,
    );

    const state = crypto.randomBytes(16).toString('hex');
    const cookieOpts = getCookieOptions(req);
    res.cookie('google_drive_oauth_state', state, {
      ...cookieOpts,
      maxAge: 5 * 60 * 1000,
    });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state,
    });

    res.redirect(authUrl);
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/google-drive/callback
// Callback from Google OAuth - access_token cookie should still be present from browser
router.get('/google-drive/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.query;
    const storedState = req.cookies?.google_drive_oauth_state as string | undefined;
    const token = req.cookies?.access_token as string | undefined;

    // Validate OAuth parameters
    if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
      res.status(400).json({ error: 'Missing OAuth authorization code or state.' });
      return;
    }

    if (!storedState || storedState !== state) {
      res.status(400).json({ error: 'Invalid OAuth state. Please try connecting again.' });
      return;
    }

    // Verify user is still authenticated (should have access_token from browser)
    if (!token) {
      res.status(401).json({ error: 'Session expired. Please login and try connecting again.' });
      return;
    }

    let userId: string;
    try {
      const payload = verifyAccessToken(token);
      userId = payload.sub;
    } catch {
      res.status(401).json({ error: 'Invalid session. Please login again.' });
      return;
    }

    const cookieOpts = getCookieOptions(req);
    res.clearCookie('google_drive_oauth_state', cookieOpts);

    const oauth2Client = new google.auth.OAuth2(
      env.GOOGLE_OAUTH_CLIENT_ID,
      env.GOOGLE_OAUTH_CLIENT_SECRET,
      env.GOOGLE_OAUTH_REDIRECT_URI,
    );

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      res.status(400).json({ error: 'Google did not return a refresh token. Please connect again with consent.' });
      return;
    }

    await updateGoogleOAuthRefreshToken(userId, tokens.refresh_token);

    const frontendRedirect = `${req.protocol}://${req.get('host')}/dashboard/settings?drive=connected`;
    res.redirect(frontendRedirect);
  } catch (err) {
    next(err);
  }
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

// PATCH /api/auth/config
router.patch('/config', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateSystemConfigSchema.parse(req.body);
    const updatedUser = await updateSystemConfig(req.user!.sub, data);
    res.json({ user: sanitizeUserForClient(updatedUser) });
  } catch (err) {
    next(err);
  }
});

export default router;
