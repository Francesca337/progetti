'use client';

import { useState, useTransition } from 'react';
import type { Project } from '@prisma/client';
import { archiveProject, deleteProject, updateProject } from '../../actions';

export function ProjectHeader({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setError(null);
          startTransition(async () => {
            try {
              await updateProject(project.id, fd);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Errore');
            }
          });
        }}
        className="card p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="label" htmlFor="name">Nome progetto</label>
            <input id="name" name="name" required defaultValue={project.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Colore</label>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={project.color}
              className="h-11 w-14 rounded-2xl border border-ink-200 bg-white cursor-pointer"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Descrizione</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={project.description ?? ''}
            className="textarea"
          />
        </div>
        {error && <div className="text-sm text-brand">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            Annulla
          </button>
        </div>
      </form>
    );
  }

  return (
    <header className="flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        <p className="eyebrow mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} aria-hidden />
          Progetto
        </p>
        <h1 className="display text-4xl sm:text-5xl">
          {firstWord(project.name)}{' '}
          <span className="serif-italic">{restWords(project.name) || ''}</span>
        </h1>
        {project.description && (
          <p className="text-ink-600 text-base mt-3 max-w-2xl whitespace-pre-wrap">{project.description}</p>
        )}
        {project.archived && (
          <span className="badge bg-ink-100 text-ink-600 mt-3">Archiviato</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" className="btn-secondary btn-xs" onClick={() => setEditing(true)}>
          Modifica
        </button>
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
        <button
          type="button"
          className="btn-danger btn-xs"
          disabled={pending}
          onClick={() => {
            if (!confirm('Eliminare il progetto e tutte le sue task? Operazione irreversibile.')) return;
            startTransition(async () => {
              await deleteProject(project.id);
            });
          }}
        >
          Elimina
        </button>
      </div>
    </header>
  );
}

function firstWord(s: string): string {
  return s.split(/\s+/)[0] ?? s;
}
function restWords(s: string): string {
  const parts = s.split(/\s+/);
  return parts.slice(1).join(' ');
}
