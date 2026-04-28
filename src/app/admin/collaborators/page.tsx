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
    <div className="space-y-10">
      <header className="pt-6">
        <p className="eyebrow mb-3">Persone</p>
        <h1 className="display text-4xl sm:text-5xl">
          I tuoi <span className="serif-italic">collaboratori.</span>
        </h1>
        <p className="mt-3 text-ink-500 max-w-xl">
          Aggiungi una persona, copia il suo link personale, assegna le task. Niente password:
          basta il link.
        </p>
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
    </div>
  );
}
