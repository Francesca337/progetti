'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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

export async function updateTaskDeadline(
  token: string,
  taskId: string,
  deadline: string | null,
): Promise<void> {
  const user = await requireCollaboratorByToken(token);
  const task = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) throw new Error('Task non trovata');
  const next = deadline ? new Date(deadline) : null;
  if (next && Number.isNaN(next.getTime())) throw new Error('Data non valida');
  await prisma.task.update({
    where: { id: taskId },
    data: { deadline: next },
  });
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
  await uploadAttachment(key, await file.arrayBuffer(), file.type);

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

// ---------- Personal backlog (collaborator self-created tasks) ----------

const taskFieldsSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(200),
  description: z.string().max(5000).optional().nullable(),
  projectId: z.string().min(1, 'Scegli un progetto'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
  deadline: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
});

function parseTaskFields(formData: FormData) {
  return taskFieldsSchema.parse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    projectId: formData.get('projectId'),
    status: formData.get('status') || 'TODO',
    deadline: formData.get('deadline') || null,
  });
}

export async function createCollaboratorTask(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const token = String(formData.get('token') ?? '');
  let user;
  try {
    user = await requireCollaboratorByToken(token);
  } catch {
    return { error: 'Sessione non valida' };
  }

  let data;
  try {
    data = parseTaskFields(formData);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? 'Dati non validi' };
    }
    throw err;
  }

  // Project must exist and be a regular (non-personal-backlog) project that's
  // not archived; the collaborator can only file tasks against active projects.
  const project = await prisma.project.findFirst({
    where: {
      id: data.projectId,
      archived: false,
      isPersonalBacklog: false,
    },
    select: { id: true },
  });
  if (!project) return { error: 'Progetto non disponibile' };

  await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      projectId: data.projectId,
      assigneeId: user.id,
      status: data.status,
      deadline: data.deadline,
      isPrivate: true,
    },
  });

  revalidatePath(`/c/${token}`);
}

export async function updateCollaboratorTask(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const token = String(formData.get('token') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  let user;
  try {
    user = await requireCollaboratorByToken(token);
  } catch {
    return { error: 'Sessione non valida' };
  }

  // Only allow editing tasks the collaborator owns AND that are private.
  const existing = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: user.id, isPrivate: true },
    select: { id: true },
  });
  if (!existing) return { error: 'Task non modificabile' };

  let data;
  try {
    data = parseTaskFields(formData);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? 'Dati non validi' };
    }
    throw err;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: data.projectId,
      archived: false,
      isPersonalBacklog: false,
    },
    select: { id: true },
  });
  if (!project) return { error: 'Progetto non disponibile' };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description ?? null,
      projectId: data.projectId,
      status: data.status,
      deadline: data.deadline,
    },
  });

  revalidatePath(`/c/${token}`);
}

export async function deleteCollaboratorTask(
  token: string,
  taskId: string,
): Promise<void> {
  const user = await requireCollaboratorByToken(token);
  const task = await prisma.task.findFirst({
    where: { id: taskId, assigneeId: user.id, isPrivate: true },
    include: { attachments: true },
  });
  if (!task) throw new Error('Task non trovata o non eliminabile');
  await Promise.all(
    task.attachments.map((a) => deleteAttachment(a.blobKey).catch(() => undefined)),
  );
  await prisma.task.delete({ where: { id: task.id } });
  revalidatePath(`/c/${token}`);
}
