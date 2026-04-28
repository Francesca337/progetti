'use client';

import { useState } from 'react';
import type { Project, User } from '@prisma/client';
import { TaskForm } from './TaskForm';
import { createTask } from '../actions';

export function NewTaskButton({
  projects,
  collaborators,
  me,
  defaultProjectId,
  defaultAssigneeId,
  label = 'Aggiungi una task',
}: {
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  me?: Pick<User, 'id' | 'name'>;
  defaultProjectId?: string;
  defaultAssigneeId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="eyebrow">Aggiungi una task</p>
        <button type="button" className="btn-ghost btn-xs" onClick={() => setOpen(false)}>
          Chiudi
        </button>
      </div>
      <TaskForm
        projects={projects}
        collaborators={collaborators}
        me={me}
        defaultProjectId={defaultProjectId}
        initial={defaultAssigneeId ? { assigneeId: defaultAssigneeId } : undefined}
        submitLabel="Aggiungi"
        onSubmit={async (fd) => {
          await createTask(fd);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
