import { getStore } from '@netlify/blobs';
import { randomBytes } from 'node:crypto';

const STORE_NAME = 'task-attachments';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'application/pdf'] as const;
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

function blobStore() {
  // On Netlify, env vars (NETLIFY_BLOBS_CONTEXT) are injected automatically.
  // For local dev without Netlify CLI, we fall back to an in-memory store
  // by relying on @netlify/blobs default behaviour or an explicit siteID/token.
  return getStore({
    name: STORE_NAME,
    consistency: 'strong',
  });
}

export function makeBlobKey(taskId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const id = randomBytes(8).toString('hex');
  return `tasks/${taskId}/${id}-${safe}`;
}

export async function uploadAttachment(
  key: string,
  data: ArrayBuffer,
  mimeType: string,
): Promise<void> {
  await blobStore().set(key, data, {
    metadata: { mimeType },
  });
}

export async function getAttachmentBuffer(
  key: string,
): Promise<{ data: ArrayBuffer; mimeType?: string } | null> {
  const store = blobStore();
  const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!result) return null;
  return {
    data: result.data as ArrayBuffer,
    mimeType: typeof result.metadata?.mimeType === 'string' ? result.metadata.mimeType : undefined,
  };
}

export async function deleteAttachment(key: string): Promise<void> {
  const store = blobStore();
  await store.delete(key);
}
