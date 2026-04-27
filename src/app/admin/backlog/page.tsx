import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { TaskRow } from '../_components/TaskRow';
import { NewTaskButton } from '../_components/NewTaskButton';
import { BacklogProjectsClient } from './client';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';

export default async function BacklogPage() {
  const admin = await requireAdmin();

  let projects = await prisma.project.findMany({
    where: { isPersonalBacklog: true, ownerId: admin.id },
    orderBy: { name: 'asc' },
    include: { _count: { select: { tasks: true } } },
  });

  if (projects.length === 0) {
    await prisma.project.create({
      data: {
        name: 'Backlog',
        color: '#6B6B7A',
        ownerId: admin.id,
        isPersonalBacklog: true,
      },
    });
    projects = await prisma.project.findMany({
      where: { isPersonalBacklog: true, ownerId: admin.id },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  const projectIds = projects.map((p) => p.id);

  const [tasks, allProjectsForForm, collaborators] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      include: { project: true, assignee: true, attachments: true },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: {
        OR: [
          { archived: false, isPersonalBacklog: false },
          { isPersonalBacklog: true, ownerId: admin.id },
        ],
      },
      orderBy: [{ isPersonalBacklog: 'desc' }, { name: 'asc' }],
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
          <p className="eyebrow mb-3">Solo per te</p>
          <h1 className="display text-4xl sm:text-5xl">
            Le tue cose <span className="serif-italic">da fare.</span>
          </h1>
          <p className="mt-3 text-ink-500 max-w-xl">
            Il backlog personale: task private, suddivise per sezione. Non sono visibili ai
            collaboratori.
          </p>
        </div>
        <NewTaskButton
          projects={allProjectsForForm}
          collaborators={collaborators}
          defaultProjectId={projects[0]?.id}
          label="Nuova task"
        />
      </header>

      <BacklogProjectsClient
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          taskCount: p._count.tasks,
        }))}
      />

      {projects.map((project) => {
        const group = tasksByProject.get(project.id) ?? [];
        return (
          <section key={project.id} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <h2 className="text-lg font-semibold text-ink-900">{project.name}</h2>
              <span className="text-xs text-ink-500">{group.length} task</span>
            </div>
            {group.length === 0 ? (
              <div className="card-flat p-6 text-sm text-ink-500">Nessuna task in questa sezione.</div>
            ) : (
              STATUS_ORDER.map((status) => {
                const subset = group.filter((t) => t.status === status);
                if (subset.length === 0) return null;
                return (
                  <div key={status} className="space-y-2">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
                      {STATUS_LABELS[status]} ({subset.length})
                    </div>
                    {subset.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        projects={allProjectsForForm}
                        collaborators={collaborators}
                        showProject={false}
                        showAssignee={false}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
