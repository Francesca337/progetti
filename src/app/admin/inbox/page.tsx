import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InboxClient } from './client';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; show?: string }>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const showArchived = sp.show === 'archived';

  const [integration, items, projects, collaborators] = await Promise.all([
    prisma.gmailIntegration.findUnique({ where: { userId: admin.id } }),
    prisma.inboxItem.findMany({
      where: {
        userId: admin.id,
        status: showArchived ? 'ARCHIVED' : 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.project.findMany({
      where: { archived: false, isPersonalBacklog: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isPersonalBacklog: true },
    }),
    prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="eyebrow mb-3">Da triare</p>
        <h1 className="display text-4xl sm:text-5xl">
          Cose viste <span className="serif-italic">altrove.</span>
        </h1>
        <p className="mt-3 text-ink-500 max-w-xl">
          Tutte le email che hai marcato in Gmail con la label{' '}
          <span className="font-mono text-ink-700">{integration?.labelName ?? 'PM-todo'}</span> arrivano qui. Tu decidi se diventano task o si archiviano.
        </p>
      </header>

      <InboxClient
        me={{ id: admin.id, name: admin.name }}
        integration={
          integration
            ? {
                email: integration.email,
                labelName: integration.labelName,
                lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
              }
            : null
        }
        items={items.map((i) => ({
          id: i.id,
          source: i.source,
          title: i.title,
          description: i.description,
          sender: i.sender,
          link: i.link,
          status: i.status,
          createdAt: i.createdAt.toISOString(),
        }))}
        projects={projects}
        collaborators={collaborators}
        showArchived={showArchived}
        flash={{ connected: sp.connected === '1', error: sp.error ?? null }}
      />
    </div>
  );
}
