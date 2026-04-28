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
          Le cose su cui <span className="serif-italic">stiamo lavorando.</span>
        </h1>
        <p className="mt-3 text-ink-500 max-w-xl">
          I progetti raccolgono le task. Ogni task ne fa parte.
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
