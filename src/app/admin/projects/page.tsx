import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ProjectsClient } from './client';

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    where: { isPersonalBacklog: false },
    orderBy: [{ archived: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { tasks: true } } },
  });
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Progetti</h1>
        <p className="text-slate-600 text-sm">
          Crea progetti per organizzare le task. Ogni task appartiene a un progetto.
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
      <div className="text-sm">
        <Link href="/admin" className="text-brand-600 hover:underline">
          ← Torna alla dashboard
        </Link>
      </div>
    </div>
  );
}
