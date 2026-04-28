import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
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

// ---------- Password hashing (scrypt, no external deps) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$1$${salt}$${derived}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  const parts = hash.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt' || parts[1] !== '1') return false;
  const [, , salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

// ---------- Admin authentication ----------

// Try env-bootstrap admin first (the "principal" admin defined in env vars),
// then fall back to DB-stored admins (created via the Admins UI).
export async function authenticateAdmin(email: string, password: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;

  if (envEmail && envPassword && normalized === envEmail) {
    const a = Buffer.from(password);
    const b = Buffer.from(envPassword);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return ensureAdminUser();
    }
    // Right email, wrong password — don't fall through to DB.
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user || user.role !== 'ADMIN' || !user.passwordHash) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
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

// True if this user row is the principal env-bootstrap admin.
export function isPrincipalAdmin(user: Pick<User, 'email'>): boolean {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!envEmail && user.email.trim().toLowerCase() === envEmail;
}

// ---------- Admin session (cookie-based) ----------

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
