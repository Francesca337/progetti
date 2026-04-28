import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { buildAuthUrl } from '@/lib/gmail';

function callbackUrl(req: Request): string {
  // Prefer NEXT_PUBLIC_APP_URL so the URL matches what's whitelisted in
  // the Google Cloud OAuth client. Fall back to the request origin.
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(
    /\/$/,
    '',
  );
  return `${base}/api/gmail/oauth/callback`;
}

export async function GET(req: Request) {
  await requireAdmin();
  const state = randomBytes(16).toString('hex');
  const jar = await cookies();
  jar.set('pm_gmail_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  const url = buildAuthUrl({ redirectUri: callbackUrl(req), state });
  return NextResponse.redirect(url);
}
