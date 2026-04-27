import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TaskRow } from '../../_components/TaskRow';
import { NewTaskButton } from '../../_components/NewTaskButton';

export default async function CollaboratorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== 'COLLABORATOR') notFound();

  const [tasks, projects, collaborators] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: id },
      include: { project: true, assignee: true, attachments: true },
      orderBy: [{ deadline: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
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

  const tasksByProject = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const arr = tasksByProject.get(t.projectId);
    if (arr) arr.push(t);
    else tasksByProject.set(t.projectId, [t]);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/collaborators" className="text-sm text-brand-600 hover:underline">
            ← Collaboratori
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{user.name}</h1>
          <p className="text-slate-600 text-sm">{user.email}</p>
        </div>
        <NewTaskButton
          projects={projects}
          collaborators={collaborators}
          defaultAssigneeId={user.id}
          label="Assegna nuova task"
        />
      </header>

      {tasks.length === 0 && (
        <div className="card p-6 text-sm text-slate-500">
          Nessuna task assegnata. Usa il bottone qui sopra per crearne una.
        </div>
      )}

      {Array.from(tasksByProject.entries()).map(([projectId, group]) => {
        const project = group[0].project;
        return (
          <section key={projectId} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <h2 className="text-base font-semibold">{project.name}</h2>
              <span className="text-sm text-slate-500">{group.length} task</span>
            </div>
            <div className="space-y-2">
              {group.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  projects={projects}
                  collaborators={collaborators}
                  showAssignee={false}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
