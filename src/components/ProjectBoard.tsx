"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft, Paperclip, Calendar, MoreHorizontal, Filter, LayoutGrid, List } from "lucide-react";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { PriorityIcon } from "./PriorityIcon";
import { TaskDialog } from "./TaskDialog";
import { cn, formatDueDate, isOverdue, STATUS_LABELS } from "@/lib/utils";

type Member = { id: string; name: string; email: string; color: string };
type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: { id: string; name: string; color: string } | null;
  attachmentsCount: number;
};

const COLUMNS: { status: string; label: string; tone: string }[] = [
  { status: "TODO", label: "Da fare", tone: "border-t-slate-400" },
  { status: "IN_PROGRESS", label: "In corso", tone: "border-t-blue-400" },
  { status: "IN_REVIEW", label: "In revisione", tone: "border-t-amber-400" },
  { status: "DONE", label: "Fatte", tone: "border-t-emerald-400" },
];

export function ProjectBoard({
  project,
  allCollaborators,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    members: Member[];
    tasks: TaskItem[];
  };
  allCollaborators: Member[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const [defaultStatus, setDefaultStatus] = useState<string>("TODO");

  const tasks = filterAssignee
    ? project.tasks.filter((t) => t.assignee?.id === filterAssignee)
    : project.tasks;

  const updateStatus = async (taskId: string, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  };

  const onDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/taskId", taskId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/taskId");
    if (taskId) updateStatus(taskId, status);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="px-5 lg:px-10 py-8 max-w-[1600px]">
      <Link href="/app/projects" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={14} /> Tutti i progetti
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div
            className="w-12 h-12 rounded-xl flex-shrink-0"
            style={{ background: project.color }}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-slate-600 mt-1 max-w-2xl">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {project.members.length > 0 ? (
                project.members.map((m) => (
                  <div key={m.id} className="inline-flex items-center gap-2 chip bg-white border-slate-200">
                    <Avatar name={m.name} color={m.color} size="xs" />
                    {m.name}
                  </div>
                ))
              ) : (
                <span className="text-xs text-slate-500">Nessun membro</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            setDefaultStatus("TODO");
            setCreating(true);
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Nuova task
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-0.5">
          <button
            onClick={() => setView("board")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              view === "board" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <LayoutGrid size={14} />
            Board
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              view === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <List size={14} />
            Lista
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="input py-1.5 text-xs w-auto pr-8"
          >
            <option value="">Tutti i collaboratori</option>
            {project.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div
                key={col.status}
                onDrop={(e) => onDrop(e, col.status)}
                onDragOver={onDragOver}
                className={cn("card border-t-4 p-3 min-h-[200px]", col.tone)}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-bold text-sm">{col.label}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">{colTasks.length}</span>
                    <button
                      onClick={() => {
                        setDefaultStatus(col.status);
                        setCreating(true);
                      }}
                      className="btn-ghost p-1"
                      aria-label="Aggiungi task"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">Trascina qui</div>
                  )}
                  {colTasks.map((t) => (
                    <Link
                      key={t.id}
                      href={`/app/task/${t.id}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      className="block bg-white rounded-xl p-3 border border-slate-100 hover:border-slate-300 hover:shadow-card-hover transition-all cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="text-sm font-medium leading-snug line-clamp-2">{t.title}</div>
                        <PriorityIcon priority={t.priority} />
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">{t.description}</p>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {t.dueDate && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs",
                                isOverdue(t.dueDate, t.status) ? "text-red-600 font-medium" : "text-slate-500",
                              )}
                            >
                              <Calendar size={11} />
                              {formatDueDate(t.dueDate)}
                            </span>
                          )}
                          {t.attachmentsCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Paperclip size={11} /> {t.attachmentsCount}
                            </span>
                          )}
                        </div>
                        {t.assignee ? (
                          <Avatar name={t.assignee.name} color={t.assignee.color} size="xs" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-dashed border-slate-300" />
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-12 px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <div className="col-span-6">Task</div>
            <div className="col-span-2">Stato</div>
            <div className="col-span-2">Scadenza</div>
            <div className="col-span-2">Assegnata a</div>
          </div>
          <div className="divide-y divide-slate-100">
            {tasks.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-slate-500">Nessuna task</div>
            ) : (
              tasks.map((t) => (
                <Link key={t.id} href={`/app/task/${t.id}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="md:col-span-6 flex items-center gap-2 min-w-0">
                    <PriorityIcon priority={t.priority} />
                    <span className="text-sm font-medium truncate">{t.title}</span>
                    {t.attachmentsCount > 0 && (
                      <span className="text-xs text-slate-400 inline-flex items-center gap-0.5">
                        <Paperclip size={11} /> {t.attachmentsCount}
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2"><StatusBadge status={t.status} /></div>
                  <div className="md:col-span-2 text-xs">
                    {t.dueDate ? (
                      <span className={cn(isOverdue(t.dueDate, t.status) ? "text-red-600 font-medium" : "text-slate-600")}>
                        {formatDueDate(t.dueDate)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2">
                    {t.assignee ? (
                      <>
                        <Avatar name={t.assignee.name} color={t.assignee.color} size="xs" />
                        <span className="text-xs">{t.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Non assegnata</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      {creating && (
        <TaskDialog
          projectId={project.id}
          collaborators={allCollaborators}
          defaultStatus={defaultStatus}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
