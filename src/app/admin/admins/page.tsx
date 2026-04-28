import { isPrincipalAdmin, requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminsClient } from './client';

export default async function AdminsPage() {
  const me = await requireAdmin();
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    orderBy: [{ createdAt: 'asc' }],
  });

  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="eyebrow mb-3">Permessi</p>
        <h1 className="display text-4xl sm:text-5xl">
          Chi può <span className="serif-italic">amministrare.</span>
        </h1>
        <p className="mt-3 text-ink-500 max-w-xl">
          Gli admin possono gestire progetti, collaboratori e task. Aggiungi qui un altro admin con
          email e password — si loggherà con le credenziali che gli imposti.
        </p>
      </header>

      <AdminsClient
        meId={me.id}
        admins={admins.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          isPrincipal: isPrincipalAdmin(a),
          isMe: a.id === me.id,
          hasPassword: !!a.passwordHash,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
