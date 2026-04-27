import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';
import type { Role, User } from '@prisma/client';

const ADMIN_COOKIE = 'pm_admin_session';
const SESSION_TTL_DAYS = 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET must be set (min 16 chars).');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

function makeToken(payload: string): string {
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx === -1) return null;
  const payload = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return payload;
}

export function generateAccessToken(): string {
  return randomBytes(24).toString('base64url');
}

// ---------- Admin session (cookie-based) ----------

export async function verifyAdminCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  if (email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expectedPassword);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function ensureAdminUser(): Promise<User> {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL is not set');
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      return prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    }
    return existing;
  }
  return prisma.user.create({
    data: { email: email.toLowerCase(), name: 'Admin', role: 'ADMIN' },
  });
}

export async function createAdminSession(userId: string): Promise<void> {
  const token = makeToken(`${userId}:${Date.now()}`);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * SESSION_TTL_DAYS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function getAdminUser(): Promise<User | null> {
  const jar = await cookies();
  const cookie = jar.get(ADMIN_COOKIE);
  if (!cookie) return null;
  const payload = verifyToken(cookie.value);
  if (!payload) return null;
  const [userId] = payload.split(':');
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect('/login');
  return user;
}

// ---------- Collaborator auth (token-in-URL, no cookies) ----------
//
// Collaborators authenticate by possession of their personal accessToken.
// The token lives in the URL (/c/<token>) and is also sent with every
// server action call. We validate it against the DB on each request.
export async function getCollaboratorByToken(accessToken: string): Promise<User | null> {
  if (!accessToken) return null;
  const user = await prisma.user.findUnique({ where: { accessToken } });
  if (!user || user.role !== 'COLLABORATOR') return null;
  return user;
}

export async function requireCollaboratorByToken(accessToken: string): Promise<User> {
  const user = await getCollaboratorByToken(accessToken);
  if (!user) throw new Error('Token non valido');
  return user;
}

// ---------- Generic ----------

export async function getCurrentUser(): Promise<{ user: User; role: Role } | null> {
  const admin = await getAdminUser();
  if (admin) return { user: admin, role: 'ADMIN' };
  return null;
}
