"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User as UserIcon,
  Trash2,
  Paperclip,
  Upload,
  Download,
  X,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { PriorityIcon } from "./PriorityIcon";
import {
  bytesToHuman,
  cn,
  formatDueDate,
  formatRelative,
  isOverdue,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/utils";

type Member = { id: string; name: string; email?: string; color: string };

type AttachmentItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: Member;
};

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  project: { id: string; name: string; color: string };
  assignee: Member | null;
  creator: Member;
  attachments: AttachmentItem[];
};

export function TaskDetail({
  mode,
  task: initialTask,
  collaborators,
  backHref,
}: {
  mode: "admin" | "collaborator";
  task: TaskData;
  collaborators?: Member[];
  backHref: string;
}) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = mode === "admin";
  const overdue = isOverdue(task.dueDate, task.status);

  const updateField = async (patch: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      const updated = data.task;
      setTask((t) => ({
        ...t,
        ...updated,
        dueDate: updated.dueDate || null,
        completedAt: updated.completedAt || null,
        assignee: updated.assignee
          ? { id: updated.assignee.id, name: updated.assignee.name, color: updated.assignee.color }
          : null,
      }));
      router.refresh();
    }
  };

  const removeTask = async () => {
    if (!confirm("Eliminare questa task?")) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.push(backHref);
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        alert(`Caricamento fallito: ${await res.text()}`);
      } else {
        const { attachment } = await res.json();
        setTask((t) => ({
          ...t,
          attachments: [
            {
              ...attachment,
              uploader: { id: attachment.uploaderId, name: "Tu", color: "#6366f1" },
              createdAt: attachment.createdAt,
            },
            ...t.attachments,
          ],
        }));
        router.refresh();
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAttachment = async (id: string) => {
    if (!confirm("Eliminare l'allegato?")) return;
    const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTask((t) => ({ ...t, attachments: t.attachments.filter((a) => a.id !== id) }));
      router.refresh();
    }
  };

  return (
    <div className="px-5 lg:px-10 py-8 max-w-4xl">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={14} /> Indietro
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={isAdmin ? `/app/projects/${task.project.id}` : "/me"}
            className="inline-flex items-center gap-2 chip bg-white border-slate-200 hover:bg-slate-50"
          >
            <span className="w-2 h-2 rounded-full" style={{ background: task.project.color }} />
            {task.project.name}
          </Link>
          <StatusBadge status={task.status} />
          <PriorityIcon priority={task.priority} withLabel />
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button onClick={() => setEditing(!editing)} className="btn-ghost p-2" title="Modifica">
              <Edit3 size={16} />
            </button>
            <button onClick={removeTask} className="btn-ghost p-2 text-red-600 hover:bg-red-50" title="Elimina">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {editing && isAdmin ? (
        <EditForm
          task={task}
          collaborators={collaborators ?? []}
          onSave={async (patch) => {
            await updateField(patch);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <h1 className="text-3xl font-bold tracking-tight mb-3">{task.title}</h1>
      )}

      {!editing && task.description && (
        <div className="prose prose-slate max-w-none mb-6">
          <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">{task.description}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <DetailField icon={<UserIcon size={14} />} label="Assegnata a">
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <Avatar name={task.assignee.name} color={task.assignee.color} size="xs" />
              <span className="text-sm font-medium">{task.assignee.name}</span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Non assegnata</span>
          )}
        </DetailField>
        <DetailField icon={<Calendar size={14} />} label="Scadenza">
          {task.dueDate ? (
            <span className={cn("text-sm font-medium", overdue ? "text-red-600" : "text-slate-700")}>
              {formatDueDate(task.dueDate)}
            </span>
          ) : (
            <span className="text-sm text-slate-400 italic">Nessuna</span>
          )}
        </DetailField>
        <DetailField icon={<CheckCircle2 size={14} />} label="Cambia stato">
          <select
            className="input py-1.5 text-sm"
            value={task.status}
            onChange={(e) => updateField({ status: e.target.value })}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </DetailField>
      </div>

      {/* Attachments */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2 text-sm">
            <Paperclip size={16} className="text-slate-500" />
            Allegati ({task.attachments.length})
          </h2>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            <Upload size={13} />
            {uploading ? "Caricamento..." : "Aggiungi file"}
          </button>
        </div>
        {task.attachments.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-4 text-center">Nessun allegato</p>
        ) : (
          <div className="space-y-2">
            {task.attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Paperclip size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.filename}</div>
                  <div className="text-xs text-slate-500">
                    {bytesToHuman(a.size)} · caricato da {a.uploader.name} · {formatRelative(a.createdAt)}
                  </div>
                </div>
                <a
                  href={`/api/attachments/${a.id}`}
                  download={a.filename}
                  className="btn-ghost p-2"
                  title="Scarica"
                >
                  <Download size={15} />
                </a>
                <button
                  onClick={() => removeAttachment(a.id)}
                  className="btn-ghost p-2 text-red-600 hover:bg-red-50"
                  title="Elimina"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        Creata da <Avatar name={task.creator.name} color={task.creator.color} size="xs" /> {task.creator.name} ·{" "}
        {formatRelative(task.createdAt)}
        {task.completedAt && <span> · Completata {formatRelative(task.completedAt)}</span>}
      </div>
    </div>
  );
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1.5">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function EditForm({
  task,
  collaborators,
  onSave,
  onCancel,
}: {
  task: TaskData;
  collaborators: Member[];
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split("T")[0] : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      title: title.trim(),
      description: description || null,
      assigneeId: assigneeId || null,
      priority,
      dueDate: dueDate ? new Date(dueDate + "T23:59:00").toISOString() : null,
    });
  };

  return (
    <form onSubmit={submit} className="card p-5 space-y-4 mb-6">
      <div>
        <label className="label">Titolo</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="label">Descrizione</label>
        <textarea
          className="input min-h-[120px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Assegna a</label>
          <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">— Non assegnata —</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Scadenza</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Priorità</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Annulla
        </button>
        <button type="submit" className="btn-primary">
          Salva
        </button>
      </div>
    </form>
  );
}
