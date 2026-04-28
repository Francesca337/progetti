'use client';

import { useState, useTransition } from 'react';
import type { Attachment, Project, Task, User } from '@prisma/client';
import {
  PRIORITY_CHIP,
  PRIORITY_LABELS,
  STATUS_CHIP,
  STATUS_LABELS,
  STATUS_ORDER,
  deadlineSeverity,
  formatBytes,
  formatDate,
} from '@/lib/format';
import { updateTaskStatus, uploadAttachmentAction } from './actions';
import { BrandDot } from '@/app/_components/Logo';

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
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[60vh] blob-soft" aria-hidden />

      <header className="relative z-10 px-4 sm:px-6 pt-8">
        <div className="max-w-4xl mx-auto pill-nav justify-between">
          <span className="logo text-base px-3 inline-flex items-baseline gap-1.5">
            <BrandDot px={11} />
            <span className="leading-none">
              ex<span className="text-brand">d</span>
            </span>
          </span>
          <div className="flex items-center gap-3 px-3 text-sm">
            <div className="h-8 w-8 rounded-full bg-ink-900 text-cream flex items-center justify-center text-xs font-semibold">
              {initials(user.name)}
            </div>
            <div className="hidden sm:block">
              <div className="font-medium text-ink-900 leading-tight">{user.name}</div>
              <div className="text-xs text-ink-500 leading-tight">{user.email}</div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <section className="text-center pt-6">
          <p className="eyebrow mb-3">Le tue task</p>
          <h1 className="display text-4xl sm:text-5xl">
            Ciao {firstWord(user.name)}, <span className="serif-italic">a che punto siamo?</span>
          </h1>
        </section>

        {tasks.length === 0 && (
          <div className="card p-10 text-center text-ink-500">
            Per ora niente da fare. Quando avrai una task ti arriva una mail.
          </div>
        )}

        {Array.from(tasksByProject.entries()).map(([projectId, group]) => {
          const project = group[0].project;
          return (
            <section key={projectId} className="space-y-4">
              <div className="flex items-baseline gap-3">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: project.color }}
                  aria-hidden
                />
                <h2 className="text-lg font-semibold text-ink-900">{project.name}</h2>
                <span className="text-xs text-ink-500">{group.length} task</span>
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
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${STATUS_CHIP[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            <span className={`badge ${PRIORITY_CHIP[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.deadline && (
              <span
                className={`text-xs ${
                  severity === 'overdue'
                    ? 'text-brand font-medium'
                    : severity === 'due-soon'
                      ? 'text-amber-700'
                      : 'text-ink-500'
                }`}
              >
                {severity === 'overdue' ? 'Era per il ' : 'Deadline: '}
                {formatDate(task.deadline)}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-ink-900 text-base">{task.title}</h3>
          {task.description && open && (
            <p className="mt-2 text-sm text-ink-600 whitespace-pre-wrap">{task.description}</p>
          )}
          {task.description && (
            <button
              type="button"
              className="mt-2 text-xs text-brand hover:underline"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Nascondi dettagli' : 'Mostra dettagli'}
            </button>
          )}
        </div>
        <div className="shrink-0">
          <select
            className="select w-44"
            defaultValue={task.status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as (typeof STATUS_ORDER)[number];
              startTransition(async () => {
                await updateTaskStatus(token, task.id, next);
              });
            }}
            aria-label="Stato"
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
    <div className="mt-4 pt-4 border-t border-ink-100">
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-2">
        Allegati ({task.attachments.length})
      </div>
      <ul className="space-y-1.5 mb-3">
        {task.attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <a
              href={`/api/attachments/${a.id}?t=${encodeURIComponent(token)}`}
              className="text-brand hover:underline truncate mr-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.filename}
            </a>
            <span className="text-xs text-ink-500 shrink-0">{formatBytes(a.sizeBytes)}</span>
          </li>
        ))}
        {task.attachments.length === 0 && (
          <li className="text-xs text-ink-500">Nessun allegato.</li>
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
          className="text-sm file:mr-3 file:rounded-pill file:border-0 file:bg-ink-900 file:text-white file:px-4 file:py-2 file:text-xs file:font-medium hover:file:bg-ink-800"
        />
        <button type="submit" className="btn-primary btn-xs" disabled={pending}>
          {pending ? 'Caricamento…' : 'Allega file'}
        </button>
      </form>
      {error && <div className="mt-2 text-xs text-brand">{error}</div>}
      <p className="mt-1.5 text-xs text-ink-500">JPEG o PDF, max 15 MB.</p>
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

function firstWord(s: string): string {
  return s.split(/\s+/)[0] ?? s;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}
