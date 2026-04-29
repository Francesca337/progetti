'use client';

import { useState, useTransition } from 'react';
import type { Priority, Project, TaskStatus, User } from '@prisma/client';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';

type Initial = {
  id?: string;
  title?: string;
  description?: string | null;
  projectId?: string;
  assigneeId?: string | null;
  priority?: Priority;
  status?: TaskStatus;
  deadline?: string | null;
  driveFolderUrl?: string | null;
};

export function TaskForm({
  projects,
  collaborators,
  me,
  initial,
  defaultProjectId,
  onSubmit,
  onCancel,
  submitLabel = 'Salva',
}: {
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  me?: Pick<User, 'id' | 'name'>;
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
      className="space-y-5"
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
            {me && !isBacklog && (
              <option value={me.id}>
                {me.name} (tu)
              </option>
            )}
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <div>
        <label className="label" htmlFor="driveFolderUrl">Cartella Drive (opzionale)</label>
        <input
          id="driveFolderUrl"
          name="driveFolderUrl"
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/drive/folders/…"
          defaultValue={initial?.driveFolderUrl ?? ''}
          className="input"
        />
        <p className="mt-1 text-xs text-ink-500">
          Link alla cartella dove caricare o trovare i materiali per la task.
        </p>
      </div>

      {error && <div className="text-sm text-brand">{error}</div>}

      <div className="flex items-center gap-2 pt-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Salvataggio…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Annulla
          </button>
        )}
      </div>
    </form>
  );
}
