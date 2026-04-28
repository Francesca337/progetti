'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Priority, TaskStatus } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  findLabelByName,
  getMessageDetail,
  gmailThreadLink,
  listMessageIdsWithLabel,
  refreshAccessToken,
} from '@/lib/gmail';
import { unseal } from '@/lib/secret-box';
import { notifyTaskAssigned } from '@/lib/notifications';

// ---------- Sync from Gmail ----------

export async function syncGmailInbox(): Promise<{
  imported: number;
  skipped: number;
  error?: string;
}> {
  const admin = await requireAdmin();
  const integ = await prisma.gmailIntegration.findUnique({
    where: { userId: admin.id },
  });
  if (!integ) return { imported: 0, skipped: 0, error: 'Gmail non collegato' };

  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(unseal(integ.refreshToken));
  } catch (err) {
    return {
      imported: 0,
      skipped: 0,
      error: 'Impossibile rinfrescare il token. Riprova a collegare Gmail.',
    };
  }

  // Resolve and cache the label ID. The label has to exist in Gmail; if
  // it doesn't, surface a friendly error so the user can create it.
  let labelId = integ.labelId;
  if (!labelId) {
    const label = await findLabelByName(accessToken, integ.labelName);
    if (!label) {
      return {
        imported: 0,
        skipped: 0,
        error: `Label "${integ.labelName}" non trovata in Gmail. Creala e riprova.`,
      };
    }
    labelId = label.id;
    await prisma.gmailIntegration.update({
      where: { id: integ.id },
      data: { labelId },
    });
  }

  let messageIds: string[];
  try {
    messageIds = await listMessageIdsWithLabel(accessToken, labelId);
  } catch (err) {
    return {
      imported: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : 'Errore lettura Gmail',
    };
  }

  let imported = 0;
  let skipped = 0;
  for (const id of messageIds) {
    // Skip if we already have this message in the inbox.
    const existing = await prisma.inboxItem.findUnique({
      where: {
        userId_source_sourceId: {
          userId: admin.id,
          source: 'GMAIL',
          sourceId: id,
        },
      },
    });
    if (existing) {
      skipped++;
      continue;
    }
    try {
      const detail = await getMessageDetail(accessToken, id);
      await prisma.inboxItem.create({
        data: {
          userId: admin.id,
          source: 'GMAIL',
          sourceId: detail.id,
          title: detail.subject,
          description: detail.snippet || null,
          sender: detail.from || null,
          link: gmailThreadLink(detail.threadId),
        },
      });
      imported++;
    } catch (err) {
      console.error('[gmail/sync] failed to import', id, err);
    }
  }

  await prisma.gmailIntegration.update({
    where: { id: integ.id },
    data: { lastSyncAt: new Date() },
  });

  revalidatePath('/admin/inbox');
  return { imported, skipped };
}

// ---------- Item actions ----------

export async function archiveInboxItem(itemId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.inboxItem.updateMany({
    where: { id: itemId, userId: admin.id },
    data: { status: 'ARCHIVED' },
  });
  revalidatePath('/admin/inbox');
}

export async function unarchiveInboxItem(itemId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.inboxItem.updateMany({
    where: { id: itemId, userId: admin.id },
    data: { status: 'PENDING' },
  });
  revalidatePath('/admin/inbox');
}

const convertSchema = z.object({
  itemId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  projectId: z.string().min(1),
  assigneeId: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).default('TODO'),
  deadline: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
});

export async function convertInboxItemToTask(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const admin = await requireAdmin();
  let data;
  try {
    data = convertSchema.parse({
      itemId: formData.get('itemId'),
      title: formData.get('title'),
      description: formData.get('description') || null,
      projectId: formData.get('projectId'),
      assigneeId: formData.get('assigneeId') || null,
      status: formData.get('status') || 'TODO',
      deadline: formData.get('deadline') || null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? 'Dati non validi' };
    }
    throw err;
  }

  const item = await prisma.inboxItem.findFirst({
    where: { id: data.itemId, userId: admin.id, status: 'PENDING' },
  });
  if (!item) return { error: 'Item non trovato' };

  const project = await prisma.project.findUnique({ where: { id: data.projectId } });
  if (!project) return { error: 'Progetto non trovato' };

  const assigneeId = project.isPersonalBacklog ? null : data.assigneeId || null;
  // Append a back-link to the source message in the description, so the
  // PM can always jump back to the email that started the task.
  const descParts: string[] = [];
  if (data.description) descParts.push(data.description);
  if (item.link) descParts.push(`📨 Origine: ${item.link}`);
  const description = descParts.join('\n\n') || null;

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description,
      projectId: data.projectId,
      assigneeId,
      priority: 'MEDIUM' as Priority,
      status: data.status as TaskStatus,
      deadline: data.deadline,
    },
    include: { project: true, assignee: true },
  });

  await prisma.inboxItem.update({
    where: { id: item.id },
    data: { status: 'CONVERTED', convertedTaskId: task.id },
  });

  if (task.assignee && task.assignee.role === 'COLLABORATOR') {
    await notifyTaskAssigned({
      task,
      project: task.project,
      assignee: task.assignee,
    });
  }

  revalidatePath('/admin/inbox');
  revalidatePath('/admin');
  revalidatePath('/admin/projects');
  revalidatePath(`/admin/projects/${data.projectId}`);
  if (assigneeId) revalidatePath(`/admin/collaborators/${assigneeId}`);
}

// ---------- Integration management ----------

export async function disconnectGmail(): Promise<void> {
  const admin = await requireAdmin();
  await prisma.gmailIntegration.deleteMany({ where: { userId: admin.id } });
  revalidatePath('/admin/inbox');
}

export async function setGmailLabel(labelName: string): Promise<{ error?: string } | void> {
  const admin = await requireAdmin();
  const cleaned = labelName.trim();
  if (!cleaned) return { error: 'Nome label non valido' };
  await prisma.gmailIntegration.updateMany({
    where: { userId: admin.id },
    data: { labelName: cleaned, labelId: null },
  });
  revalidatePath('/admin/inbox');
}
