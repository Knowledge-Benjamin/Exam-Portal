import bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/db';
import { users, refreshTokens } from '../db/schema';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token';
import { hashToken, randomHex } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

const BCRYPT_ROUNDS = 12;

export type UserRole = 'admin' | 'teacher' | 'student';

interface RegisterParams {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function registerUser(params: RegisterParams) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, params.email));

  if (existing.length > 0) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

  const [created] = await db
    .insert(users)
    .values({
      fullName: params.fullName,
      email: params.email,
      passwordHash,
      role: params.role,
    })
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return created;
}

export async function loginUser(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawRefresh = signRefreshToken(user.id);
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshSession(rawRefreshToken: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
      ),
    );

  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Session expired. Please log in again.');
  }

  // Rotate — revoke old, issue new
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.id, stored.id));

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, payload.sub));

  if (!user) throw new AppError(401, 'User not found');

  const newAccess = signAccessToken({ sub: user.id, role: user.role });
  const newRaw = signRefreshToken(user.id);
  const newHash = hashToken(newRaw);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({ userId: user.id, tokenHash: newHash, expiresAt });

  return { accessToken: newAccess, refreshToken: newRaw };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db
    .update(refreshTokens)
    .set({ revoked: true })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function listUsers(role?: UserRole) {
  const query = db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users);

  if (role) {
    return query.where(eq(users.role, role));
  }
  return query;
}

export async function updateProfile(userId: string, data: { fullName: string; email: string }) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, data.email));

  if (existing.length > 0 && existing[0].id !== userId) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const [updated] = await db
    .update(users)
    .set({ fullName: data.fullName, email: data.email })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return updated;
}

export async function updatePassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
}
