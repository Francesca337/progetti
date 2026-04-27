'use client';

import { useState, useTransition } from 'react';
import type { Priority, Project, TaskStatus, User } from '@prisma/client';
import { PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER } from '@/lib/format';

type Initial = {
  id?: string;
  title?: string;
  description?: string | null;
  projectId?: string;
  assigneeId?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  deadline?: string | null; // ISO yyyy-mm-dd
};

export function TaskForm({
  projects,
  collaborators,
  initial,
  defaultProjectId,
  onSubmit,
  onCancel,
  submitLabel = 'Salva',
}: {
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  initial?: Initial;
  defaultProjectId?: string;
  onSubmit: (formData: FormData) => Promise<unknown>;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(
    initial?.projectId ?? defaultProjectId ?? projects[0]?.id ?? '',
  );

  const selectedProject = projects.find((p) => p.id === projectId);
  const isBacklog = selectedProject?.isPersonalBacklog ?? false;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            await onSubmit(fd);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore');
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="title">Titolo</label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          defaultValue={initial?.title ?? ''}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="description">Descrizione / output atteso</label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ''}
          className="textarea"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="projectId">Progetto</label>
          <select
            id="projectId"
            name="projectId"
            className="select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isPersonalBacklog ? ' (backlog)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="assigneeId">Assegnatario</label>
          <select
            id="assigneeId"
            name="assigneeId"
            className="select"
            defaultValue={initial?.assigneeId ?? ''}
            disabled={isBacklog}
          >
            <option value="">{isBacklog ? '— Backlog personale —' : '— Nessuno —'}</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="priority">Priorità</label>
          <select id="priority" name="priority" className="select" defaultValue={initial?.priority ?? 'MEDIUM'}>
            {(['HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Stato</label>
          <select id="status" name="status" className="select" defaultValue={initial?.status ?? 'TODO'}>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="deadline">Deadline</label>
          <input
            id="deadline"
            name="deadline"
            type="date"
            className="input"
            defaultValue={initial?.deadline ?? ''}
          />
        </div>
      </div>

      {error && <div className="text-sm text-rose-700">{error}</div>}

      <div className="flex items-center gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Salvataggio…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}
