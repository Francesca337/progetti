'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { archiveProject, createProject } from '../actions';

type Item = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  taskCount: number;
};

export function ProjectsClient({ projects }: { projects: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setError(null);
          startTransition(async () => {
            try {
              await createProject(fd);
              form.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Errore');
            }
          });
        }}
        className="card p-4 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-3 items-end"
      >
        <div>
          <label className="label" htmlFor="name">Nome progetto</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Descrizione</label>
          <input id="description" name="description" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Colore</label>
          <input id="color" name="color" type="color" defaultValue="#3566f5" className="h-10 w-14 rounded border border-slate-300" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Creazione…' : 'Crea progetto'}
        </button>
        {error && <div className="sm:col-span-4 text-sm text-rose-700">{error}</div>}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.length === 0 && (
          <div className="card p-4 text-sm text-slate-500 md:col-span-2">
            Nessun progetto attivo. Creane uno qui sopra.
          </div>
        )}
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} pending={pending} startTransition={startTransition} />
        ))}
      </div>

      {archived.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer font-medium text-sm">Archiviati ({archived.length})</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {archived.map((p) => (
              <ProjectCard key={p.id} project={p} pending={pending} startTransition={startTransition} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  pending,
  startTransition,
}: {
  project: Item;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Link href={`/admin/projects/${project.id}`} className="font-medium hover:underline">
            {project.name}
          </Link>
          {project.description && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
          )}
          <p className="text-xs text-slate-500 mt-1">{project.taskCount} task</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <Link href={`/admin/projects/${project.id}`} className="btn-secondary text-xs">
          Apri
        </Link>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={pending}
          onClick={() => startTransition(async () => {
            await archiveProject(project.id, !project.archived);
          })}
        >
          {project.archived ? 'Ripristina' : 'Archivia'}
        </button>
      </div>
    </div>
  );
}
