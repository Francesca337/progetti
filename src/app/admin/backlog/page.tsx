import Link from 'next/link';
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
    // Auto-seed a default backlog bucket so the admin sees something.
    await prisma.project.create({
      data: {
        name: 'Backlog',
        color: '#6b7280',
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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Backlog personale</h1>
        <p className="text-slate-600 text-sm">
          Le tue cose da fare, suddivise per progetto. Le task qui non sono visibili ai collaboratori.
        </p>
      </header>

      <BacklogProjectsClient
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          taskCount: p._count.tasks,
        }))}
      />

      <div className="flex justify-end">
        <NewTaskButton
          projects={allProjectsForForm}
          collaborators={collaborators}
          defaultProjectId={projects[0]?.id}
          label="Nuova task nel backlog"
        />
      </div>

      {projects.map((project) => {
        const group = tasksByProject.get(project.id) ?? [];
        return (
          <section key={project.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden
              />
              <h2 className="text-base font-semibold">{project.name}</h2>
              <span className="text-sm text-slate-500">{group.length} task</span>
            </div>
            {group.length === 0 ? (
              <div className="card p-4 text-sm text-slate-500">Nessuna task.</div>
            ) : (
              STATUS_ORDER.map((status) => {
                const subset = group.filter((t) => t.status === status);
                if (subset.length === 0) return null;
                return (
                  <div key={status} className="space-y-2">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
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

      <div className="text-sm">
        <Link href="/admin" className="text-brand-600 hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
