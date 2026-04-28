// Gmail API helpers — OAuth code exchange, access-token refresh, and the
// minimal set of message endpoints we need (list, get).
//
// Scopes used:
//   https://www.googleapis.com/auth/gmail.readonly  (read-only; no send/write)
//   https://www.googleapis.com/auth/userinfo.email  (which mailbox is this)

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export function buildAuthUrl(args: { redirectUri: string; state: string }): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: args.redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: args.state,
    include_granted_scopes: 'true',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(args: {
  code: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth env vars missing');
  const body = new URLSearchParams({
    code: args.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth env vars missing');
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`refresh failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
  const json = (await res.json()) as { email: string };
  return json.email;
}

// ---------- Gmail messages ----------

async function gmailGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail GET ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export type GmailLabel = { id: string; name: string };

export async function findLabelByName(
  accessToken: string,
  name: string,
): Promise<GmailLabel | null> {
  const data = await gmailGet<{ labels: GmailLabel[] }>(accessToken, '/labels');
  const found = data.labels?.find((l) => l.name.toLowerCase() === name.toLowerCase());
  return found ?? null;
}

export async function listMessageIdsWithLabel(
  accessToken: string,
  labelId: string,
): Promise<string[]> {
  // Gmail API caps per-page at 500; this is plenty for a triage inbox.
  const data = await gmailGet<{ messages?: { id: string }[] }>(
    accessToken,
    `/messages?labelIds=${encodeURIComponent(labelId)}&maxResults=50`,
  );
  return data.messages?.map((m) => m.id) ?? [];
}

export type GmailMessageDetail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string;
};

export async function getMessageDetail(
  accessToken: string,
  id: string,
): Promise<GmailMessageDetail> {
  type Raw = {
    id: string;
    threadId: string;
    snippet: string;
    payload?: { headers?: { name: string; value: string }[] };
  };
  const raw = await gmailGet<Raw>(
    accessToken,
    // metadata format with the headers we need; avoids decoding bodies.
    `/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
  );
  const headers = raw.payload?.headers ?? [];
  const get = (h: string) =>
    headers.find((x) => x.name.toLowerCase() === h.toLowerCase())?.value ?? '';
  return {
    id: raw.id,
    threadId: raw.threadId,
    subject: get('Subject') || '(senza oggetto)',
    from: get('From'),
    snippet: raw.snippet ?? '',
  };
}

// Public link to a Gmail thread the user can click.
export function gmailThreadLink(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#all/${threadId}`;
}
