import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { TaskRow } from '../_components/TaskRow';
import { NewTaskButton } from '../_components/NewTaskButton';
import { BacklogProjectsClient } from './client';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';

export default async function BacklogPage() {
  const admin = await requireAdmin();
  const me = { id: admin.id, name: admin.name };

  let backlogProjects = await prisma.project.findMany({
    where: { isPersonalBacklog: true, ownerId: admin.id },
    orderBy: { name: 'asc' },
    include: { _count: { select: { tasks: true } } },
  });

  if (backlogProjects.length === 0) {
    await prisma.project.create({
      data: {
        name: 'Backlog',
        color: '#6B6B7A',
        ownerId: admin.id,
        isPersonalBacklog: true,
      },
    });
    backlogProjects = await prisma.project.findMany({
      where: { isPersonalBacklog: true, ownerId: admin.id },
      orderBy: { name: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  const backlogProjectIds = backlogProjects.map((p) => p.id);

  const [backlogTasks, myTasksInOtherProjects, allProjectsForForm, collaborators] =
    await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: backlogProjectIds } },
        include: { project: true, assignee: true, attachments: true },
        orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.task.findMany({
        where: {
          assigneeId: admin.id,
          project: { isPersonalBacklog: false },
        },
        include: { project: true, assignee: true, attachments: true },
        orderBy: [{ deadline: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
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

  const backlogByProject = new Map<string, typeof backlogTasks>();
  for (const t of backlogTasks) {
    const arr = backlogByProject.get(t.projectId);
    if (arr) arr.push(t);
    else backlogByProject.set(t.projectId, [t]);
  }

  const myTasksByProject = new Map<string, typeof myTasksInOtherProjects>();
  for (const t of myTasksInOtherProjects) {
    const arr = myTasksByProject.get(t.projectId);
    if (arr) arr.push(t);
    else myTasksByProject.set(t.projectId, [t]);
  }

  return (
    <div className="space-y-12">
      <header className="pt-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-3">Solo per te</p>
          <h1 className="display text-4xl sm:text-5xl">
            Le cose che hai <span className="serif-italic">in mano tu.</span>
          </h1>
          <p className="mt-3 text-ink-500 max-w-xl">
            Quello che ti sei presa nei progetti, più gli appunti privati. Solo per te: i
            collaboratori non li vedono.
          </p>
        </div>
        <NewTaskButton
          projects={allProjectsForForm}
          collaborators={collaborators}
          me={me}
          defaultProjectId={backlogProjects[0]?.id}
          label="Aggiungi una task"
        />
      </header>

      {/* Section 1: my assignments in regular projects, grouped by project */}
      {myTasksInOtherProjects.length > 0 && (
        <section className="space-y-6">
          <div>
            <p className="eyebrow mb-2">Nei progetti</p>
            <h2 className="display text-2xl sm:text-3xl">
              Quello che ti sei <span className="serif-italic">presa.</span>
            </h2>
          </div>
          {Array.from(myTasksByProject.entries()).map(([projectId, group]) => {
            const project = group[0].project;
            return (
              <div key={projectId} className="space-y-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color }}
                    aria-hidden
                  />
                  <h3 className="text-base font-semibold text-ink-900">{project.name}</h3>
                  <span className="text-xs text-ink-500">{group.length} task</span>
                </div>
                <div className="space-y-2">
                  {group.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      projects={allProjectsForForm}
                      collaborators={collaborators}
                      me={me}
                      showAssignee={false}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Section 2: private backlog buckets */}
      <section className="space-y-6">
        <div>
          <p className="eyebrow mb-2">Solo tuo</p>
          <h2 className="display text-2xl sm:text-3xl">
            Appunti <span className="serif-italic">privati.</span>
          </h2>
        </div>

        <BacklogProjectsClient
          projects={backlogProjects.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            taskCount: p._count.tasks,
          }))}
        />

        {backlogProjects.map((project) => {
          const group = backlogByProject.get(project.id) ?? [];
          return (
            <div key={project.id} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-ink-900">{project.name}</h3>
                <span className="text-xs text-ink-500">{group.length} task</span>
              </div>
              {group.length === 0 ? (
                <div className="card-flat p-6 text-sm text-ink-500">Ancora niente qui.</div>
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
                          me={me}
                          showProject={false}
                          showAssignee={false}
                        />
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
