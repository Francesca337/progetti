'use client';

import { useState, useTransition } from 'react';
import type { Attachment, Project, Task, User } from '@prisma/client';
import {
  STATUS_CHIP,
  STATUS_LABELS,
  STATUS_ORDER,
  deadlineSeverity,
  formatBytes,
  formatDate,
} from '@/lib/format';
import {
  createCollaboratorTask,
  deleteCollaboratorTask,
  updateCollaboratorTask,
  updateTaskDeadline,
  updateTaskStatus,
  uploadAttachmentAction,
} from './actions';
import { Logo } from '@/app/_components/Logo';

type TaskWithRelations = Task & { project: Project; attachments: Attachment[] };
type ProjectOption = Pick<Project, 'id' | 'name' | 'color'>;

export function CollaboratorView({
  token,
  user,
  assignedTasks,
  privateTasks,
  availableProjects,
}: {
  token: string;
  user: User;
  assignedTasks: TaskWithRelations[];
  privateTasks: TaskWithRelations[];
  availableProjects: ProjectOption[];
}) {
  const assignedByProject = groupBy(assignedTasks, (t) => t.project.id);
  const privateByProject = groupBy(privateTasks, (t) => t.project.id);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[60vh] blob-soft" aria-hidden />

      <header className="relative z-10 px-4 sm:px-6 pt-8">
        <div className="max-w-4xl mx-auto pill-nav justify-between">
          <span className="px-3 inline-flex items-center">
            <Logo size="sm" showSubmark={false} />
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

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        <section className="text-center pt-6">
          <p className="eyebrow mb-3">Le tue task</p>
          <h1 className="display text-4xl sm:text-5xl">
            Ciao {firstWord(user.name)}, <span className="serif-italic">a che punto siamo?</span>
          </h1>
        </section>

        {/* Assigned by the admin */}
        <section className="space-y-6">
          <div>
            <p className="eyebrow mb-2">Dal team</p>
            <h2 className="display text-2xl sm:text-3xl">
              Assegnate <span className="serif-italic">a te.</span>
            </h2>
          </div>
          {assignedTasks.length === 0 ? (
            <div className="card p-8 text-center text-ink-500">
              Per ora niente da fare. Quando avrai una task ti arriva una notifica.
            </div>
          ) : (
            Array.from(assignedByProject.entries()).map(([projectId, group]) => {
              const project = group[0].project;
              return (
                <div key={projectId} className="space-y-3">
                  <ProjectHeading project={project} count={group.length} />
                  {group.map((t) => (
                    <AssignedTaskCard key={t.id} task={t} token={token} />
                  ))}
                </div>
              );
            })
          )}
        </section>

        {/* Personal backlog */}
        <section className="space-y-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <p className="eyebrow mb-2">Solo per te</p>
              <h2 className="display text-2xl sm:text-3xl">
                Il tuo <span className="serif-italic">backlog.</span>
              </h2>
              <p className="text-sm text-ink-500 mt-2 max-w-md">
                Le tue note di lavoro, suddivise per progetto. Le vedi solo tu — il team non può
                aprirle né modificarle.
              </p>
            </div>
            <NewPrivateTaskButton token={token} availableProjects={availableProjects} />
          </div>

          {privateTasks.length === 0 ? (
            <div className="card-flat p-8 text-center text-ink-500 text-sm">
              Ancora niente. Aggiungi la tua prima task quando vuoi.
            </div>
          ) : (
            Array.from(privateByProject.entries()).map(([projectId, group]) => {
              const project = group[0].project;
              return (
                <div key={projectId} className="space-y-3">
                  <ProjectHeading project={project} count={group.length} />
                  {group.map((t) => (
                    <PrivateTaskCard
                      key={t.id}
                      task={t}
                      token={token}
                      availableProjects={availableProjects}
                    />
                  ))}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}

// ---------- Components ----------

function ProjectHeading({
  project,
  count,
}: {
  project: Pick<Project, 'name' | 'color'>;
  count: number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: project.color }}
        aria-hidden
      />
      <h3 className="text-base font-semibold text-ink-900">{project.name}</h3>
      <span className="text-xs text-ink-500">{count} task</span>
    </div>
  );
}

function AssignedTaskCard({ task, token }: { task: TaskWithRelations; token: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const severity = deadlineSeverity(task.deadline, task.status);

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${STATUS_CHIP[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            {task.deadline && (
              <span
                className={`text-xs ${
                  severity === 'overdue'
                    ? 'text-brand'
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
        <StatusDeadlineControls
          taskId={task.id}
          status={task.status}
          deadline={task.deadline}
          token={token}
          pending={pending}
          startTransition={startTransition}
        />
      </div>
      <Attachments task={task} token={token} />
    </article>
  );
}

function PrivateTaskCard({
  task,
  token,
  availableProjects,
}: {
  task: TaskWithRelations;
  token: string;
  availableProjects: ProjectOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const severity = deadlineSeverity(task.deadline, task.status);

  if (editing) {
    return (
      <article className="card p-5">
        <PrivateTaskForm
          token={token}
          taskId={task.id}
          availableProjects={availableProjects}
          initial={{
            title: task.title,
            description: task.description ?? '',
            projectId: task.projectId,
            status: task.status,
            deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : '',
          }}
          submitLabel="Salva"
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge ${STATUS_CHIP[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            <span className="badge bg-cream-100 text-ink-600">Personale</span>
            {task.deadline && (
              <span
                className={`text-xs ${
                  severity === 'overdue'
                    ? 'text-brand'
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
          {task.description && (
            <p className="mt-2 text-sm text-ink-600 whitespace-pre-wrap">{task.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          <StatusDeadlineControls
            taskId={task.id}
            status={task.status}
            deadline={task.deadline}
            token={token}
            pending={pending}
            startTransition={startTransition}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn-ghost btn-xs"
              onClick={() => {
                setError(null);
                setEditing(true);
              }}
            >
              Modifica
            </button>
            <button
              type="button"
              className="btn-danger btn-xs"
              disabled={pending}
              onClick={() => {
                if (!confirm('Eliminare questa task dal tuo backlog?')) return;
                setError(null);
                startTransition(async () => {
                  try {
                    await deleteCollaboratorTask(token, task.id);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Errore');
                  }
                });
              }}
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
      {error && <div className="mt-2 text-xs text-brand">{error}</div>}
      <Attachments task={task} token={token} />
    </article>
  );
}

function StatusDeadlineControls({
  taskId,
  status,
  deadline,
  token,
  pending,
  startTransition,
}: {
  taskId: string;
  status: keyof typeof STATUS_LABELS;
  deadline: Date | null;
  token: string;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  return (
    <div className="shrink-0 flex flex-col items-stretch gap-2 w-44">
      <div>
        <label
          className="block text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-1"
          htmlFor={`status-${taskId}`}
        >
          Stato
        </label>
        <select
          id={`status-${taskId}`}
          className="select"
          defaultValue={status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as (typeof STATUS_ORDER)[number];
            startTransition(async () => {
              await updateTaskStatus(token, taskId, next);
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
      <div>
        <label
          className="block text-[11px] uppercase tracking-[0.18em] text-ink-400 mb-1"
          htmlFor={`deadline-${taskId}`}
        >
          Deadline
        </label>
        <input
          id={`deadline-${taskId}`}
          type="date"
          className="input"
          defaultValue={deadline ? new Date(deadline).toISOString().slice(0, 10) : ''}
          disabled={pending}
          onChange={(e) => {
            const value = e.target.value || null;
            startTransition(async () => {
              await updateTaskDeadline(token, taskId, value);
            });
          }}
        />
      </div>
    </div>
  );
}

function NewPrivateTaskButton({
  token,
  availableProjects,
}: {
  token: string;
  availableProjects: ProjectOption[];
}) {
  const [open, setOpen] = useState(false);

  if (availableProjects.length === 0) {
    return (
      <span className="text-xs text-ink-500 max-w-xs">
        Nessun progetto attivo a cui agganciare una task.
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + Aggiungi una task
      </button>
    );
  }

  return (
    <div className="card p-5 w-full">
      <div className="flex items-center justify-between mb-4">
        <p className="eyebrow">Nuova task personale</p>
        <button type="button" className="btn-ghost btn-xs" onClick={() => setOpen(false)}>
          Chiudi
        </button>
      </div>
      <PrivateTaskForm
        token={token}
        availableProjects={availableProjects}
        submitLabel="Aggiungi"
        onDone={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

function PrivateTaskForm({
  token,
  taskId,
  availableProjects,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  token: string;
  taskId?: string;
  availableProjects: ProjectOption[];
  initial?: {
    title?: string;
    description?: string;
    projectId?: string;
    status?: keyof typeof STATUS_LABELS;
    deadline?: string;
  };
  submitLabel: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        fd.set('token', token);
        if (taskId) fd.set('taskId', taskId);
        setError(null);
        startTransition(async () => {
          const res = taskId
            ? await updateCollaboratorTask(fd)
            : await createCollaboratorTask(fd);
          if (res?.error) {
            setError(res.error);
          } else {
            form.reset();
            onDone();
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor={`title-${taskId ?? 'new'}`}>Titolo</label>
        <input
          id={`title-${taskId ?? 'new'}`}
          name="title"
          required
          maxLength={200}
          defaultValue={initial?.title ?? ''}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor={`desc-${taskId ?? 'new'}`}>Descrizione (opzionale)</label>
        <textarea
          id={`desc-${taskId ?? 'new'}`}
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ''}
          className="textarea"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor={`proj-${taskId ?? 'new'}`}>Progetto</label>
          <select
            id={`proj-${taskId ?? 'new'}`}
            name="projectId"
            required
            defaultValue={initial?.projectId ?? availableProjects[0]?.id}
            className="select"
          >
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`status-${taskId ?? 'new'}`}>Stato</label>
          <select
            id={`status-${taskId ?? 'new'}`}
            name="status"
            defaultValue={initial?.status ?? 'TODO'}
            className="select"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`dl-${taskId ?? 'new'}`}>Deadline</label>
          <input
            id={`dl-${taskId ?? 'new'}`}
            name="deadline"
            type="date"
            defaultValue={initial?.deadline ?? ''}
            className="input"
          />
        </div>
      </div>
      {error && <div className="text-sm text-brand">{error}</div>}
      <div className="flex gap-2 pt-1">
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

// ---------- Helpers ----------

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
