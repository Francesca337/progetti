'use client';

import { useState, useTransition } from 'react';
import { createBacklogProject, deleteBacklogProject } from './actions';

type Item = { id: string; name: string; color: string; taskCount: number };

export function BacklogProjectsClient({ projects }: { projects: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-4 space-y-3">
      <div className="text-sm font-medium">Sezioni del backlog</div>
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-sm bg-slate-50">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
            <span>{p.name}</span>
            <span className="text-xs text-slate-500">({p.taskCount})</span>
            <button
              type="button"
              className="text-xs text-rose-600 hover:underline"
              disabled={pending}
              onClick={() => {
                if (p.taskCount > 0) {
                  if (!confirm(`Eliminare "${p.name}" e tutte le sue task?`)) return;
                } else if (!confirm(`Eliminare la sezione "${p.name}"?`)) return;
                startTransition(async () => {
                  await deleteBacklogProject(p.id);
                });
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setError(null);
          startTransition(async () => {
            try {
              await createBacklogProject(fd);
              form.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Errore');
            }
          });
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <label className="label" htmlFor="name">Nuova sezione</label>
          <input id="name" name="name" required className="input" placeholder="es. Operativo" />
        </div>
        <div>
          <label className="label" htmlFor="color">Colore</label>
          <input id="color" name="color" type="color" defaultValue="#6b7280" className="h-10 w-14 rounded border border-slate-300" />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? '…' : 'Aggiungi'}
        </button>
        {error && <div className="w-full text-sm text-rose-700">{error}</div>}
      </form>
    </div>
  );
}
