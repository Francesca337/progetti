'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Priority, TaskStatus } from '@prisma/client';
import { generateAccessToken, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notifyTaskAssigned } from '@/lib/notifications';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  deleteAttachment,
  isAllowedMime,
  makeBlobKey,
  uploadAttachment,
} from '@/lib/storage';

// ---------- Collaborators ----------

const collaboratorSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(120),
  email: z.string().email('Email non valida').max(200),
  slackUserId: z
    .string()
    .max(50)
    .regex(/^[A-Z0-9]+$/, 'Slack ID non valido (es. U01ABCDEF)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export async function createCollaborator(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = collaboratorSchema.safeParse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? '').toLowerCase(),
    slackUserId: String(formData.get('slackUserId') ?? '').trim() || undefined,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Dati non validi');
  }
  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: 'COLLABORATOR',
      accessToken: generateAccessToken(),
      slackUserId: parsed.data.slackUserId ?? null,
    },
  });
  revalidatePath('/admin/collaborators');
  revalidatePath('/admin');
}

export async function updateCollaboratorSlackId(
  userId: string,
  slackUserId: string,
): Promise<void> {
  await requireAdmin();
  const value = slackUserId.trim();
  if (value && !/^[A-Z0-9]+$/.test(value)) {
    throw new Error('Slack ID non valido (es. U01ABCDEF)');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { slackUserId: value || null },
  });
  revalidatePath('/admin/collaborators');
}

export async function deleteCollaborator(userId: string): Promise<void> {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/collaborators');
  revalidatePath('/admin');
}

export async function rotateAccessToken(userId: string): Promise<void> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { accessToken: generateAccessToken() },
  });
  revalidatePath('/admin/collaborators');
  revalidatePath(`/admin/collaborators/${userId}`);
}

// ---------- Projects ----------

const projectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Colore non valido')
    .default('#3566f5'),
});

export async function createProject(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = projectSchema.parse({
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color') || '#3566f5',
  });
  const created = await prisma.project.create({
    data: {
      name: parsed.name,
      description: parsed.description ?? null,
      color: parsed.color,
      ownerId: admin.id,
    },
  });
  revalidatePath('/admin/projects');
  revalidatePath('/admin');
  redirect(`/admin/projects/${created.id}`);
}

export async function updateProject(projectId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = projectSchema.parse({
    name: formData.get('name'),
    description: formData.get('description') || null,
    color: formData.get('color') || '#3566f5',
  });
  await prisma.project.update({
    where: { id: projectId },
    data: parsed,
  });
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath('/admin/projects');
}

export async function archiveProject(projectId: string, archived: boolean): Promise<void> {
  await requireAdmin();
  await prisma.project.update({ where: { id: projectId }, data: { archived } });
  revalidatePath('/admin/projects');
}

export async function deleteProject(projectId: string): Promise<void> {
  await requireAdmin();
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath('/admin/projects');
  redirect('/admin/projects');
}

// ---------- Tasks ----------

const taskSchema = z.object({
  title: z.string().min(1, 'Titolo obbligatorio').max(200),
  description: z.string().max(5000).optional().nullable(),
  projectId: z.string().min(1),
  assigneeId: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  deadline: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  driveFolderUrl: z
    .string()
    .trim()
    .url('Inserisci un URL valido')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
});

function parseTaskForm(formData: FormData) {
  return taskSchema.parse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    projectId: formData.get('projectId'),
    assigneeId: formData.get('assigneeId') || null,
    priority: formData.get('priority') || 'MEDIUM',
    status: formData.get('status') || 'TODO',
    deadline: formData.get('deadline') || null,
    driveFolderUrl: formData.get('driveFolderUrl') || null,
  });
}

export async function createTask(formData: FormData): Promise<{ taskId: string }> {
  await requireAdmin();
  const data = parseTaskForm(formData);

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error('Progetto non trovato');

  // Personal backlog tasks must not have an assignee.
  const assigneeId = project.isPersonalBacklog ? null : data.assigneeId || null;

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      projectId: data.projectId,
      assigneeId,
      priority: data.priority as Priority,
      status: data.status as TaskStatus,
      deadline: data.deadline,
      driveFolderUrl: data.driveFolderUrl,
    },
    include: { project: true, assignee: true },
  });

  if (task.assignee && task.assignee.role === 'COLLABORATOR') {
    await notifyTaskAssigned({
      task,
      project: task.project,
      assignee: task.assignee,
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath('/admin/backlog');
  revalidatePath(`/admin/projects/${data.projectId}`);
  if (assigneeId && task.assignee?.role === 'COLLABORATOR') {
    revalidatePath(`/admin/collaborators/${assigneeId}`);
  }
  return { taskId: task.id };
}

export async function updateTask(taskId: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const data = parseTaskForm(formData);

  const previous = await prisma.task.findUnique({ where: { id: taskId } });
  if (!previous) throw new Error('Task non trovata');

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) throw new Error('Progetto non trovato');
  const assigneeId = project.isPersonalBacklog ? null : data.assigneeId || null;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description ?? null,
      projectId: data.projectId,
      assigneeId,
      priority: data.priority as Priority,
      status: data.status as TaskStatus,
      deadline: data.deadline,
      driveFolderUrl: data.driveFolderUrl,
    },
    include: { project: true, assignee: true },
  });

  // Notify only when assignee changed AND new assignee is a collaborator
  // (don't email the admin when she assigns herself).
  const assigneeChanged = previous.assigneeId !== task.assigneeId;
  if (assigneeChanged && task.assignee && task.assignee.role === 'COLLABORATOR') {
    await notifyTaskAssigned({
      task,
      project: task.project,
      assignee: task.assignee,
    });
  }

  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath('/admin/backlog');
  revalidatePath(`/admin/projects/${data.projectId}`);
  if (previous.projectId !== data.projectId) {
    revalidatePath(`/admin/projects/${previous.projectId}`);
  }
  if (assigneeId && task.assignee?.role === 'COLLABORATOR') {
    revalidatePath(`/admin/collaborators/${assigneeId}`);
  }
  if (previous.assigneeId && previous.assigneeId !== assigneeId) {
    revalidatePath(`/admin/collaborators/${previous.assigneeId}`);
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  await requireAdmin();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { attachments: true },
  });
  if (!task) return;
  await Promise.all(
    task.attachments.map((a) => deleteAttachment(a.blobKey).catch(() => undefined)),
  );
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath('/admin/backlog');
  revalidatePath(`/admin/projects/${task.projectId}`);
  if (task.assigneeId) revalidatePath(`/admin/collaborators/${task.assigneeId}`);
}

export async function adminUpdateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  await requireAdmin();
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
}

// ---------- Attachments (admin) ----------

export async function adminUploadAttachment(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const admin = await requireAdmin();
  const taskId = String(formData.get('taskId') ?? '');
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Nessun file fornito' };
  const task = await prisma.task.findUnique({ where: { id: taskId } });
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
      uploadedBy: admin.id,
    },
  });

  revalidatePath(`/admin/projects/${task.projectId}`);
  if (task.assigneeId) revalidatePath(`/admin/collaborators/${task.assigneeId}`);
}

export async function adminDeleteAttachment(attachmentId: string): Promise<void> {
  await requireAdmin();
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: true },
  });
  if (!attachment) return;
  await deleteAttachment(attachment.blobKey).catch(() => undefined);
  await prisma.attachment.delete({ where: { id: attachmentId } });
  revalidatePath(`/admin/projects/${attachment.task.projectId}`);
  if (attachment.task.assigneeId)
    revalidatePath(`/admin/collaborators/${attachment.task.assigneeId}`);
}
