'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const schema = z.object({
  name: z.string().min(1).max(120),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#6b7280'),
});

export async function createBacklogProject(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = schema.parse({
    name: formData.get('name'),
    color: formData.get('color') || '#6b7280',
  });
  await prisma.project.create({
    data: {
      name: parsed.name,
      color: parsed.color,
      ownerId: admin.id,
      isPersonalBacklog: true,
    },
  });
  revalidatePath('/admin/backlog');
}

export async function deleteBacklogProject(projectId: string): Promise<void> {
  const admin = await requireAdmin();
  // Sanity guard: only admin's own backlog projects.
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== admin.id || !project.isPersonalBacklog) {
    throw new Error('Operazione non consentita');
  }
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath('/admin/backlog');
}
