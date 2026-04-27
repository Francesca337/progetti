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
    <div className="space-y-10">
      <header className="pt-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/collaborators" className="text-xs text-ink-500 hover:text-ink-900 transition uppercase tracking-[0.18em]">
            ← Collaboratori
          </Link>
          <h1 className="display text-4xl sm:text-5xl mt-3">
            {firstWord(user.name)}{' '}
            <span className="serif-italic">{restWords(user.name) || 'tasks.'}</span>
          </h1>
          <p className="text-ink-500 text-sm mt-2">{user.email}</p>
        </div>
        <NewTaskButton
          projects={projects}
          collaborators={collaborators}
          defaultAssigneeId={user.id}
          label="Assegna task"
        />
      </header>

      {tasks.length === 0 && (
        <div className="card-flat p-8 text-center text-ink-500 text-sm">
          Nessuna task assegnata. Usa il bottone sopra per crearne una.
        </div>
      )}

      {Array.from(tasksByProject.entries()).map(([projectId, group]) => {
        const project = group[0].project;
        return (
          <section key={projectId} className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <h2 className="text-lg font-semibold text-ink-900">{project.name}</h2>
              <span className="text-xs text-ink-500">{group.length} task</span>
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

function firstWord(s: string): string {
  return s.split(/\s+/)[0] ?? s;
}
function restWords(s: string): string {
  const parts = s.split(/\s+/);
  return parts.slice(1).join(' ');
}
