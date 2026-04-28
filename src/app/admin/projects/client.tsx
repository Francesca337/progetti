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
    <div className="space-y-8">
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
        className="card p-6"
      >
        <p className="eyebrow mb-4">Nuovo progetto</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-3 items-end">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="description">Descrizione</label>
            <input id="description" name="description" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Colore</label>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue="#E40066"
              className="h-11 w-14 rounded-2xl border border-ink-200 bg-white cursor-pointer"
            />
          </div>
          <button type="submit" className="btn-dark" disabled={pending}>
            {pending ? 'Creazione…' : 'Crea'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-brand">{error}</div>}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {active.length === 0 && (
          <div className="card-flat p-8 text-center text-sm text-ink-500 md:col-span-2">
            Ancora nessun progetto. Inizia da qui sopra quando vuoi.
          </div>
        )}
        {active.map((p) => (
          <ProjectCard key={p.id} project={p} pending={pending} startTransition={startTransition} />
        ))}
      </div>

      {archived.length > 0 && (
        <details className="card-flat p-5">
          <summary className="cursor-pointer text-sm font-medium text-ink-700">
            Archiviati ({archived.length})
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
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
    <div className="card-flat p-5 hover:shadow-soft transition">
      <div className="flex items-start gap-3">
        <span
          className="mt-1.5 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/projects/${project.id}`}
            className="font-semibold text-ink-900 hover:text-brand transition"
          >
            {project.name}
          </Link>
          {project.description && (
            <p className="text-sm text-ink-600 mt-1 line-clamp-2">{project.description}</p>
          )}
          <p className="text-xs text-ink-500 mt-2">
            {project.taskCount} {project.taskCount === 1 ? 'task' : 'task'}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Link href={`/admin/projects/${project.id}`} className="btn-secondary btn-xs">
          Apri
        </Link>
        <button
          type="button"
          className="btn-ghost btn-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await archiveProject(project.id, !project.archived);
            })
          }
        >
          {project.archived ? 'Ripristina' : 'Archivia'}
        </button>
      </div>
    </div>
  );
}
