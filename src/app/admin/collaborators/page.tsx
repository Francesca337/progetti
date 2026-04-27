import Link from 'next/link';
import { prisma } from '@/lib/db';
import { CollaboratorsClient } from './client';

export default async function CollaboratorsPage() {
  const collaborators = await prisma.user.findMany({
    where: { role: 'COLLABORATOR' },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { tasksAssigned: true } },
    },
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Collaboratori</h1>
          <p className="text-slate-600 text-sm">Aggiungi o rimuovi collaboratori e copia il loro link personale.</p>
        </div>
      </header>
      <CollaboratorsClient
        appUrl={appUrl}
        collaborators={collaborators.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          accessToken: c.accessToken ?? '',
          taskCount: c._count.tasksAssigned,
        }))}
      />
      <div className="text-sm">
        <Link href="/admin" className="text-brand-600 hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
