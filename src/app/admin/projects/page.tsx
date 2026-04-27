import { prisma } from '@/lib/db';
import { ProjectsClient } from './client';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    where: { isPersonalBacklog: false },
    orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { tasks: true } } },
  });
  return (
    <div className="space-y-10">
      <header className="pt-6">
        <p className="eyebrow mb-3">Progetti</p>
        <h1 className="display text-4xl sm:text-5xl">
          Tutto ciò su cui <span className="serif-italic">stai lavorando.</span>
        </h1>
        <p className="mt-3 text-ink-500 max-w-xl">
          Crea progetti per organizzare le task. Ogni task vive dentro un progetto.
        </p>
      </header>
      <ProjectsClient
        projects={projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          archived: p.archived,
          taskCount: p._count.tasks,
        }))}
      />
    </div>
  );
}
