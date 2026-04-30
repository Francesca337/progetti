import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { TaskRow } from '../../_components/TaskRow';
import { NewTaskButton } from '../../_components/NewTaskButton';
import { CompletedSection } from '@/app/_components/CompletedSection';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';
import { ProjectHeader } from './header';
import { NotesSection } from './NotesSection';

const ACTIVE_STATUSES = STATUS_ORDER.filter((s) => s !== 'DONE');

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const me = { id: admin.id, name: admin.name };

  const [tasks, allProjects, collaborators, notes] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: id, isPrivate: false },
      include: { project: true, assignee: true, attachments: true },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.project.findMany({
      where: { archived: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isPersonalBacklog: true },
    }),
    prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.projectNote.findMany({
      where: { projectId: id, authorId: admin.id },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const tasksByStatus = new Map<string, typeof tasks>();
  for (const s of STATUS_ORDER) tasksByStatus.set(s, []);
  for (const t of tasks) tasksByStatus.get(t.status)?.push(t);

  return (
    <div className="space-y-10">
      <Link href="/admin/projects" className="text-xs text-ink-500 hover:text-ink-900 transition uppercase tracking-[0.18em] inline-block pt-6">
        ← Tutti i progetti
      </Link>

      <ProjectHeader project={project} />

      <NotesSection
        projectId={project.id}
        notes={notes.map((n) => ({
          id: n.id,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
        }))}
      />

      <div className="flex justify-end">
        <NewTaskButton
          projects={allProjects}
          collaborators={collaborators}
          me={me}
          defaultProjectId={project.id}
        />
      </div>

      {tasks.length === 0 && (
        <div className="card-flat p-8 text-center text-sm text-ink-500">
          Ancora niente qui. Aggiungi la prima task quando vuoi.
        </div>
      )}

      {ACTIVE_STATUSES.map((status) => {
        const group = tasksByStatus.get(status) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={status} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <p className="eyebrow">{STATUS_LABELS[status]}</p>
              <span className="text-xs text-ink-400">{group.length}</span>
            </div>
            <div className="space-y-2">
              {group.map((t) => (
                <div key={t.id} id={`task-${t.id}`}>
                  <TaskRow
                    task={t}
                    projects={allProjects}
                    collaborators={collaborators}
                    me={me}
                    showProject={false}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <CompletedSection count={tasksByStatus.get('DONE')?.length ?? 0}>
        {(tasksByStatus.get('DONE') ?? []).map((t) => (
          <div key={t.id} id={`task-${t.id}`}>
            <TaskRow
              task={t}
              projects={allProjects}
              collaborators={collaborators}
              me={me}
              showProject={false}
              muted
            />
          </div>
        ))}
      </CompletedSection>
    </div>
  );
}
