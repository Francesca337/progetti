'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashPassword, isPrincipalAdmin, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createAdminSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(120),
  email: z.string().email('Email non valida').max(200),
  password: z
    .string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .max(200),
});

export async function createAdmin(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = createAdminSchema.parse({
    name: formData.get('name'),
    email: String(formData.get('email') ?? '').toLowerCase(),
    password: formData.get('password'),
  });

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) {
    throw new Error('Esiste già un utente con questa email');
  }

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      role: 'ADMIN',
      passwordHash: hashPassword(parsed.password),
    },
  });

  revalidatePath('/admin/admins');
}

export async function removeAdmin(userId: string): Promise<void> {
  const me = await requireAdmin();
  if (userId === me.id) {
    throw new Error('Non puoi rimuovere te stessa');
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== 'ADMIN') {
    throw new Error('Admin non trovato');
  }
  if (isPrincipalAdmin(target)) {
    throw new Error('L’admin principale non può essere rimosso da qui');
  }
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath('/admin/admins');
}

const changePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La password deve essere di almeno 8 caratteri')
    .max(200),
});

export async function changeAdminPassword(
  userId: string,
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const parsed = changePasswordSchema.parse({
    password: formData.get('password'),
  });
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== 'ADMIN') {
    throw new Error('Admin non trovato');
  }
  if (isPrincipalAdmin(target)) {
    throw new Error(
      'L’admin principale ha la password nelle variabili d’ambiente di Netlify, non qui',
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(parsed.password) },
  });
  revalidatePath('/admin/admins');
}
