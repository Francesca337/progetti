"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Paperclip,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { PriorityIcon } from "./PriorityIcon";
import { cn, formatDueDate, isOverdue, STATUS_LABELS } from "@/lib/utils";

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  project: { id: string; name: string; color: string };
  attachmentsCount: number;
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  TODO: Circle,
  IN_PROGRESS: Clock,
  IN_REVIEW: Eye,
  DONE: CheckCircle2,
};

const NEXT_STATUS: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "IN_REVIEW",
  IN_REVIEW: "DONE",
  DONE: "TODO",
};

type Mode = "active" | "all" | "done";

export function MyTasksView({ userName, tasks: initialTasks }: { userName: string; tasks: TaskItem[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [mode, setMode] = useState<Mode>("active");
  const [projectFilter, setProjectFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let list = tasks;
    if (mode === "active") list = list.filter((t) => t.status !== "DONE");
    else if (mode === "done") list = list.filter((t) => t.status === "DONE");
    if (projectFilter) list = list.filter((t) => t.project.id === projectFilter);
    return list;
  }, [tasks, mode, projectFilter]);

  // Group by project
  const byProject = useMemo(() => {
    const map = new Map<string, { project: TaskItem["project"]; tasks: TaskItem[] }>();
    for (const t of filtered) {
      if (!map.has(t.project.id)) map.set(t.project.id, { project: t.project, tasks: [] });
      map.get(t.project.id)!.tasks.push(t);
    }
    return Array.from(map.values());
  }, [filtered]);

  const projects = useMemo(() => {
    const s = new Map<string, TaskItem["project"]>();
    tasks.forEach((t) => s.set(t.project.id, t.project));
    return Array.from(s.values());
  }, [tasks]);

  const stats = {
    total: tasks.filter((t) => t.status !== "DONE").length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
    done: tasks.filter((t) => t.status === "DONE").length,
  };

  const toggleStatus = async (taskId: string, newStatus: string) => {
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  };

  return (
    <div className="px-5 lg:px-10 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Le mie task</h1>
        <p className="text-slate-600 mt-1">
          Ciao {userName.split(" ")[0]}, ecco tutto quello che hai da fare.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Da fare" value={stats.total} accent="text-slate-900" />
        <Stat label="In ritardo" value={stats.overdue} accent={stats.overdue > 0 ? "text-red-600" : "text-slate-900"} />
        <Stat label="Completate" value={stats.done} accent="text-emerald-600" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="inline-flex bg-white border border-slate-200 rounded-xl p-0.5">
          {([
            ["active", "Attive"],
            ["done", "Completate"],
            ["all", "Tutte"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                mode === k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {projects.length > 1 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="input py-1.5 text-xs w-auto pr-8"
          >
            <option value="">Tutti i progetti</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {byProject.length === 0 ? (
        <div className="card p-12 text-center">
          {mode === "done" ? (
            <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={36} />
          ) : (
            <Sparkles className="mx-auto mb-4 text-slate-400" size={36} />
          )}
          <h2 className="font-bold text-lg mb-1">
            {mode === "done" ? "Nessuna task ancora completata" : "Tutto a posto!"}
          </h2>
          <p className="text-sm text-slate-500">
            {mode === "active"
              ? "Non hai task aperte. Se ne arriveranno di nuove, le troverai qui."
              : "Nessuna task in questa vista."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byProject.map(({ project, tasks }) => (
            <div key={project.id}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: project.color }}
                />
                <h2 className="font-bold text-sm">{project.name}</h2>
                <span className="text-xs text-slate-500">· {tasks.length}</span>
              </div>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {tasks.map((t) => (
                  <TaskListItem
                    key={t.id}
                    task={t}
                    onToggle={() => toggleStatus(t.id, NEXT_STATUS[t.status])}
                    onMarkDone={() => toggleStatus(t.id, "DONE")}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card p-4">
      <div className={cn("text-2xl font-bold", accent)}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function TaskListItem({
  task,
  onToggle,
  onMarkDone,
}: {
  task: TaskItem;
  onToggle: () => void;
  onMarkDone: () => void;
}) {
  const overdue = isOverdue(task.dueDate, task.status);
  const Icon = STATUS_ICONS[task.status];
  const done = task.status === "DONE";

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3.5 group", done && "opacity-60")}>
      <button
        onClick={done ? onToggle : onMarkDone}
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          done
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50",
        )}
        title={done ? "Riapri" : "Segna come fatta"}
      >
        {done ? <CheckCircle2 size={16} /> : <Icon size={14} />}
      </button>

      <Link href={`/me/task/${task.id}`} className="flex-1 min-w-0 flex items-center gap-3">
        <PriorityIcon priority={task.priority} />
        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium leading-snug", done && "line-through")}>{task.title}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  overdue ? "text-red-600 font-medium" : "text-slate-500",
                )}
              >
                <Calendar size={11} />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.attachmentsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Paperclip size={11} /> {task.attachmentsCount}
              </span>
            )}
          </div>
        </div>
        <StatusBadge status={task.status} className="hidden sm:inline-flex" />
      </Link>
    </div>
  );
}
