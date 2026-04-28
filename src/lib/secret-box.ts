import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

// Symmetric AES-256-GCM. Key derived from SESSION_SECRET via scrypt + per-row
// salt. Stored format: salt:iv:authTag:ciphertext (all hex, ':' separated).
//
// Use case: encrypt third-party refresh tokens (Gmail, future Slack user
// tokens) before persisting them in the DB.

function masterSecret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET must be set (min 16 chars).');
  }
  return Buffer.from(s, 'utf8');
}

export function seal(plaintext: string): string {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(masterSecret(), salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [salt.toString('hex'), iv.toString('hex'), authTag.toString('hex'), enc.toString('hex')].join(':');
}

export function unseal(blob: string): string {
  const parts = blob.split(':');
  if (parts.length !== 4) throw new Error('Invalid sealed blob');
  const [saltHex, ivHex, tagHex, dataHex] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const key = scryptSync(masterSecret(), salt, 32);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}
