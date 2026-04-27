'use client';

import { useState } from 'react';
import type { Project, User } from '@prisma/client';
import { TaskForm } from './TaskForm';
import { createTask } from '../actions';

export function NewTaskButton({
  projects,
  collaborators,
  defaultProjectId,
  defaultAssigneeId,
  label = 'Nuova task',
}: {
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
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
        <p className="eyebrow">Nuova task</p>
        <button type="button" className="btn-ghost btn-xs" onClick={() => setOpen(false)}>
          Chiudi
        </button>
      </div>
      <TaskForm
        projects={projects}
        collaborators={collaborators}
        defaultProjectId={defaultProjectId}
        initial={defaultAssigneeId ? { assigneeId: defaultAssigneeId } : undefined}
        submitLabel="Crea task"
        onSubmit={async (fd) => {
          await createTask(fd);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
