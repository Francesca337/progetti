'use client';

import { useState, useTransition } from 'react';
import type { Attachment, Project, Task, User } from '@prisma/client';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  deadlineSeverity,
  formatBytes,
  formatDate,
} from '@/lib/format';
import { updateTaskStatus, uploadAttachmentAction } from './actions';

type TaskWithRelations = Task & { project: Project; attachments: Attachment[] };

export function CollaboratorView({
  token,
  user,
  tasks,
}: {
  token: string;
  user: User;
  tasks: TaskWithRelations[];
}) {
  const tasksByProject = groupBy(tasks, (t) => t.project.id);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Le tue task</div>
            <h1 className="text-lg font-semibold">{user.name}</h1>
          </div>
          <div className="text-sm text-slate-500">{user.email}</div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {tasks.length === 0 && (
          <div className="card p-8 text-center text-slate-600">
            Nessuna task assegnata al momento. Riceverai una notifica via email quando ne avrai una.
          </div>
        )}
        {Array.from(tasksByProject.entries()).map(([projectId, group]) => {
          const project = group[0].project;
          return (
            <section key={projectId} className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden
                />
                <h2 className="text-base font-semibold">{project.name}</h2>
                <span className="text-sm text-slate-500">{group.length} task</span>
              </div>
              <div className="space-y-3">
                {group.map((t) => (
                  <CollaboratorTaskCard key={t.id} task={t} token={token} />
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

function CollaboratorTaskCard({ task, token }: { task: TaskWithRelations; token: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const severity = deadlineSeverity(task.deadline, task.status);

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.deadline && (
              <span
                className={`text-xs ${
                  severity === 'overdue'
                    ? 'text-rose-700 font-medium'
                    : severity === 'due-soon'
                      ? 'text-amber-700'
                      : 'text-slate-500'
                }`}
              >
                {severity === 'overdue' ? 'In ritardo: ' : 'Deadline: '}
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
          <h3 className="font-medium mt-2">{task.title}</h3>
          {task.description && open && (
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
          )}
          {task.description && (
            <button
              type="button"
              className="mt-2 text-xs text-brand-600 hover:underline"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Nascondi dettagli' : 'Mostra dettagli'}
            </button>
          )}
        </div>
        <div>
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Stato
          </label>
          <select
            id={`status-${task.id}`}
            className="select w-44"
            defaultValue={task.status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as (typeof STATUS_ORDER)[number];
              startTransition(async () => {
                await updateTaskStatus(token, task.id, next);
              });
            }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Attachments task={task} token={token} />
    </article>
  );
}

function Attachments({ task, token }: { task: TaskWithRelations; token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 border-t pt-3">
      <div className="text-xs font-medium text-slate-600 mb-2">
        Allegati ({task.attachments.length})
      </div>
      <ul className="space-y-1 mb-3">
        {task.attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <a
              href={`/api/attachments/${a.id}?t=${encodeURIComponent(token)}`}
              className="text-brand-600 hover:underline truncate mr-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.filename}
            </a>
            <span className="text-xs text-slate-500 shrink-0">{formatBytes(a.sizeBytes)}</span>
          </li>
        ))}
        {task.attachments.length === 0 && (
          <li className="text-xs text-slate-500">Nessun allegato.</li>
        )}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          fd.set('taskId', task.id);
          fd.set('token', token);
          setError(null);
          startTransition(async () => {
            const res = await uploadAttachmentAction(fd);
            if (res?.error) setError(res.error);
            else form.reset();
          });
        }}
        className="flex flex-col sm:flex-row sm:items-center gap-2"
      >
        <input
          type="file"
          name="file"
          accept="image/jpeg,application/pdf"
          required
          className="text-sm"
        />
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? 'Caricamento…' : 'Allega file'}
        </button>
      </form>
      {error && <div className="mt-2 text-xs text-rose-700">{error}</div>}
      <p className="mt-1 text-xs text-slate-500">JPEG o PDF, max 15 MB.</p>
    </div>
  );
}

function groupBy<T, K>(items: T[], key: (x: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return m;
}
