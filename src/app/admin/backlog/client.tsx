'use client';

import { useState, useTransition } from 'react';
import { createBacklogProject, deleteBacklogProject } from './actions';

type Item = { id: string; name: string; color: string; taskCount: number };

export function BacklogProjectsClient({ projects }: { projects: Item[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card p-6 space-y-4">
      <p className="eyebrow">Sezioni</p>
      <div className="flex flex-wrap gap-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2 rounded-pill border border-ink-200 bg-cream-50 pl-3 pr-1 py-1 text-sm"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
            <span className="text-ink-700">{p.name}</span>
            <span className="text-xs text-ink-400">({p.taskCount})</span>
            <button
              type="button"
              className="text-ink-400 hover:text-brand transition w-6 h-6 rounded-full flex items-center justify-center"
              disabled={pending}
              onClick={() => {
                if (p.taskCount > 0) {
                  if (!confirm(`Eliminare "${p.name}" e tutte le sue task?`)) return;
                } else if (!confirm(`Eliminare la sezione "${p.name}"?`)) return;
                startTransition(async () => {
                  await deleteBacklogProject(p.id);
                });
              }}
              aria-label={`Elimina ${p.name}`}
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
        className="flex flex-wrap items-end gap-3 pt-2 border-t border-ink-100"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="label" htmlFor="name">Nuova sezione</label>
          <input id="name" name="name" required className="input" placeholder="es. Operativo" />
        </div>
        <div>
          <label className="label" htmlFor="color">Colore</label>
          <input
            id="color"
            name="color"
            type="color"
            defaultValue="#6B6B7A"
            className="h-11 w-14 rounded-2xl border border-ink-200 bg-white cursor-pointer"
          />
        </div>
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? '…' : 'Aggiungi'}
        </button>
        {error && <div className="w-full text-sm text-brand">{error}</div>}
      </form>
    </div>
  );
}
