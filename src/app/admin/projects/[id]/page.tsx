import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TaskRow } from '../../_components/TaskRow';
import { NewTaskButton } from '../../_components/NewTaskButton';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';
import { ProjectHeader } from './header';

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const [tasks, allProjects, collaborators] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: id },
      include: { project: true, assignee: true, attachments: true },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
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
  ]);

  const tasksByStatus = new Map<string, typeof tasks>();
  for (const s of STATUS_ORDER) tasksByStatus.set(s, []);
  for (const t of tasks) tasksByStatus.get(t.status)?.push(t);

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />

      <div className="flex justify-end">
        <NewTaskButton
          projects={allProjects}
          collaborators={collaborators}
          defaultProjectId={project.id}
        />
      </div>

      {STATUS_ORDER.map((status) => {
        const group = tasksByStatus.get(status) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={status} className="space-y-2">
            <h2 className="text-sm uppercase tracking-wide text-slate-500">
              {STATUS_LABELS[status]} ({group.length})
            </h2>
            <div className="space-y-2">
              {group.map((t) => (
                <div key={t.id} id={`task-${t.id}`}>
                  <TaskRow
                    task={t}
                    projects={allProjects}
                    collaborators={collaborators}
                    showProject={false}
                  />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {tasks.length === 0 && (
        <div className="card p-6 text-sm text-slate-500">
          Nessuna task in questo progetto. Creane una qui sopra.
        </div>
      )}

      <div className="text-sm">
        <Link href="/admin/projects" className="text-brand-600 hover:underline">
          ← Tutti i progetti
        </Link>
      </div>
    </div>
  );
}
