import { getStore } from "@netlify/blobs";

const STORE_NAME = "task-attachments";

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function putBlob(key: string, data: ArrayBuffer, metadata?: Record<string, string>) {
  await store().set(key, data, metadata ? { metadata } : undefined);
}

export async function getBlob(key: string): Promise<ArrayBuffer | null> {
  const result = await store().get(key, { type: "arrayBuffer" });
  return result ?? null;
}

export async function getBlobMetadata(key: string) {
  return store().getMetadata(key);
}

export async function deleteBlob(key: string) {
  await store().delete(key);
}
