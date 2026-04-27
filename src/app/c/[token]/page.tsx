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

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id },
    include: {
      project: true,
      attachments: true,
    },
    orderBy: [{ deadline: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
  });

  return <CollaboratorView token={token} user={user} tasks={tasks} />;
}
