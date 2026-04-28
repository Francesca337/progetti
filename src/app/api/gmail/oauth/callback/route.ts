import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens, fetchUserEmail } from '@/lib/gmail';
import { seal } from '@/lib/secret-box';

function callbackUrl(req: Request): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(
    /\/$/,
    '',
  );
  return `${base}/api/gmail/oauth/callback`;
}

function inboxRedirect(req: Request, params: Record<string, string> = {}) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(
    /\/$/,
    '',
  );
  const url = new URL(`${base}/admin/inbox`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  const oauthError = u.searchParams.get('error');

  if (oauthError) {
    return inboxRedirect(req, { error: oauthError });
  }
  if (!code || !state) {
    return inboxRedirect(req, { error: 'missing_params' });
  }

  const jar = await cookies();
  const expectedState = jar.get('pm_gmail_oauth_state')?.value;
  jar.delete('pm_gmail_oauth_state');
  if (!expectedState || expectedState !== state) {
    return inboxRedirect(req, { error: 'state_mismatch' });
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      redirectUri: callbackUrl(req),
    });
    if (!tokens.refresh_token) {
      // Google sometimes withholds it on re-consent; we forced prompt=consent
      // so this should be rare. If it happens, surface a clear error.
      return inboxRedirect(req, { error: 'no_refresh_token' });
    }
    const email = await fetchUserEmail(tokens.access_token);
    const sealed = seal(tokens.refresh_token);

    await prisma.gmailIntegration.upsert({
      where: { userId: admin.id },
      update: {
        email,
        refreshToken: sealed,
        // Reset cached label ID on re-auth in case label changed.
        labelId: null,
      },
      create: {
        userId: admin.id,
        email,
        refreshToken: sealed,
      },
    });
    return inboxRedirect(req, { connected: '1' });
  } catch (err) {
    console.error('[gmail/oauth/callback]', err);
    return inboxRedirect(req, { error: 'exchange_failed' });
  }
}
