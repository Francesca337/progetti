'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
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
import {
  adminDeleteAttachment,
  adminUpdateTaskStatus,
  adminUploadAttachment,
  deleteTask,
  updateTask,
} from '../actions';
import { TaskForm } from './TaskForm';

type FullTask = Task & {
  project: Project;
  assignee: User | null;
  attachments: Attachment[];
};

export function TaskRow({
  task,
  projects,
  collaborators,
  showProject = true,
  showAssignee = true,
}: {
  task: FullTask;
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  showProject?: boolean;
  showAssignee?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [pending, startTransition] = useTransition();
  const severity = deadlineSeverity(task.deadline, task.status);

  if (editing) {
    return (
      <article className="card p-4 border-brand-300">
        <TaskForm
          projects={projects}
          collaborators={collaborators}
          initial={{
            id: task.id,
            title: task.title,
            description: task.description,
            projectId: task.projectId,
            assigneeId: task.assigneeId,
            priority: task.priority,
            status: task.status,
            deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
          }}
          submitLabel="Aggiorna"
          onSubmit={async (fd) => {
            await updateTask(task.id, fd);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </article>
    );
  }

  return (
    <article className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${STATUS_COLORS[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {showProject && (
              <Link
                href={`/admin/projects/${task.project.id}`}
                className="badge bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                <span
                  className="h-2 w-2 rounded-full mr-1"
                  style={{ backgroundColor: task.project.color }}
                  aria-hidden
                />
                {task.project.name}
              </Link>
            )}
            {showAssignee && task.assignee && (
              <Link
                href={`/admin/collaborators/${task.assignee.id}`}
                className="badge bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              >
                {task.assignee.name}
              </Link>
            )}
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
          {task.description && (
            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">{task.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          <select
            className="select w-44"
            defaultValue={task.status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as (typeof STATUS_ORDER)[number];
              startTransition(async () => {
                await adminUpdateTaskStatus(task.id, next);
              });
            }}
            aria-label="Cambia stato"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setEditing(true)}
            >
              Modifica
            </button>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => setShowAttachments((v) => !v)}
            >
              Allegati ({task.attachments.length})
            </button>
            <button
              type="button"
              className="btn-danger text-xs"
              onClick={() => {
                if (!confirm('Eliminare la task?')) return;
                startTransition(async () => {
                  await deleteTask(task.id);
                });
              }}
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
      {showAttachments && <AttachmentSection task={task} />}
    </article>
  );
}

function AttachmentSection({ task }: { task: FullTask }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 border-t pt-3">
      <ul className="space-y-1 mb-3">
        {task.attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <a
              href={`/api/attachments/${a.id}`}
              className="text-brand-600 hover:underline truncate mr-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {a.filename}
            </a>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500">{formatBytes(a.sizeBytes)}</span>
              <button
                type="button"
                className="text-xs text-rose-600 hover:underline"
                disabled={pending}
                onClick={() => {
                  if (!confirm('Eliminare l’allegato?')) return;
                  startTransition(async () => {
                    await adminDeleteAttachment(a.id);
                  });
                }}
              >
                Elimina
              </button>
            </div>
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
          setError(null);
          startTransition(async () => {
            const res = await adminUploadAttachment(fd);
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
        <button type="submit" className="btn-secondary text-xs" disabled={pending}>
          {pending ? 'Caricamento…' : 'Allega'}
        </button>
      </form>
      {error && <div className="mt-2 text-xs text-rose-700">{error}</div>}
      <p className="mt-1 text-xs text-slate-500">JPEG o PDF, max 15 MB.</p>
    </div>
  );
}
