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
        className="card p-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="label" htmlFor="name">Nome progetto</label>
            <input id="name" name="name" required defaultValue={project.name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="color">Colore</label>
            <input id="color" name="color" type="color" defaultValue={project.color} className="h-10 w-14 rounded border border-slate-300" />
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
        {error && <div className="text-sm text-rose-700">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Annulla
          </button>
        </div>
      </form>
    );
  }

  return (
    <header className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-2 h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
          aria-hidden
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.description && (
            <p className="text-slate-600 text-sm mt-1 whitespace-pre-wrap">{project.description}</p>
          )}
          {project.archived && (
            <span className="badge bg-slate-100 text-slate-600 border-slate-200 mt-2">Archiviato</span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(true)}>
          Modifica
        </button>
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
        <button
          type="button"
          className="btn-danger text-xs"
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
