import { notFound } from 'next/navigation';
import { getCollaboratorByToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CollaboratorView } from './view';

export default async function CollaboratorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCollaboratorByToken(token);
  if (!user) notFound();

  const [assignedTasks, privateTasks, availableProjects] = await Promise.all([
    prisma.task.findMany({
      where: { assignees: { some: { id: user.id } }, isPrivate: false },
      include: { project: true, attachments: true },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.task.findMany({
      where: { assignees: { some: { id: user.id } }, isPrivate: true },
      include: { project: true, attachments: true },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: { archived: false, isPersonalBacklog: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <CollaboratorView
      token={token}
      user={user}
      assignedTasks={assignedTasks}
      privateTasks={privateTasks}
      availableProjects={availableProjects}
    />
  );
}
