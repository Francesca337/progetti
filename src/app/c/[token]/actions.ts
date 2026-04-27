'use server';

import { revalidatePath } from 'next/cache';
import type { TaskStatus } from '@prisma/client';
import { requireCollaboratorByToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  deleteAttachment,
  isAllowedMime,
  makeBlobKey,
  uploadAttachment,
} from '@/lib/storage';

export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const user = await requireCollaboratorByToken(token);
  const task = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) throw new Error('Task non trovata');
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath(`/c/${token}`);
}

export async function uploadAttachmentAction(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const token = String(formData.get('token') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  const file = formData.get('file');

  let user;
  try {
    user = await requireCollaboratorByToken(token);
  } catch {
    return { error: 'Sessione non valida' };
  }

  if (!(file instanceof File)) return { error: 'Nessun file fornito' };

  const task = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) return { error: 'Task non trovata' };

  if (!isAllowedMime(file.type)) {
    return { error: `Tipo non supportato. Consenti: ${ALLOWED_MIME_TYPES.join(', ')}` };
  }
  if (file.size > MAX_FILE_SIZE) return { error: 'File troppo grande (max 15 MB)' };

  const key = makeBlobKey(taskId, file.name);
  await uploadAttachment(key, Buffer.from(await file.arrayBuffer()), file.type);

  await prisma.attachment.create({
    data: {
      taskId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      blobKey: key,
      uploadedBy: user.id,
    },
  });

  revalidatePath(`/c/${token}`);
}

export async function deleteAttachmentAction(
  token: string,
  attachmentId: string,
): Promise<void> {
  const user = await requireCollaboratorByToken(token);
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, task: { assigneeId: user.id } },
  });
  if (!attachment) throw new Error('Allegato non trovato');
  await deleteAttachment(attachment.blobKey).catch(() => undefined);
  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/c/${token}`);
}
