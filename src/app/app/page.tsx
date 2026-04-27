import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityIcon } from "@/components/PriorityIcon";
import { Avatar } from "@/components/Avatar";
import { formatDueDate, isOverdue, cn } from "@/lib/utils";
import { CheckSquare, Clock, Users, FolderKanban, AlertTriangle, ArrowRight, Plus, type LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const me = await requireAdmin();

  const [projects, allTasks, collaborators] = await Promise.all([
    prisma.project.findMany({
      where: { archived: false },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.task.findMany({
      where: { status: { not: "DONE" } },
      include: { project: true, assignee: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      where: { role: "COLLABORATOR" },
      include: { _count: { select: { assignedTasks: { where: { status: { not: "DONE" } } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const overdue = allTasks.filter((t) => isOverdue(t.dueDate, t.status));
  const dueSoon = allTasks.filter(
    (t) => t.dueDate && !isOverdue(t.dueDate, t.status) && new Date(t.dueDate).getTime() < Date.now() + 7 * 24 * 3600 * 1000,
  );
  const inProgress = allTasks.filter((t) => t.status === "IN_PROGRESS");

  return (
    <div className="px-5 lg:px-10 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Ciao {me.name.split(" ")[0]} 👋</h1>
        <p className="text-slate-600 mt-1">Ecco una panoramica dei tuoi progetti e delle task in corso.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Task aperte" value={allTasks.length} icon={CheckSquare} accent="bg-indigo-50 text-indigo-600" />
        <KpiCard label="In ritardo" value={overdue.length} icon={AlertTriangle} accent="bg-red-50 text-red-600" />
        <KpiCard label="In corso" value={inProgress.length} icon={Clock} accent="bg-blue-50 text-blue-600" />
        <KpiCard label="Collaboratori" value={collaborators.length} icon={Users} accent="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Tasks needing attention */}
        <div className="lg:col-span-2 space-y-6">
          {overdue.length > 0 && (
            <Section
              title="In ritardo"
              count={overdue.length}
              icon={<AlertTriangle size={16} className="text-red-600" />}
              accent="border-l-red-400"
            >
              {overdue.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </Section>
          )}

          <Section
            title="In scadenza nei prossimi 7 giorni"
            count={dueSoon.length}
            icon={<Clock size={16} className="text-amber-600" />}
            accent="border-l-amber-400"
          >
            {dueSoon.length === 0 ? (
              <Empty msg="Nessuna scadenza imminente" />
            ) : (
              dueSoon.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </Section>

          <Section
            title="In corso ora"
            count={inProgress.length}
            icon={<CheckSquare size={16} className="text-blue-600" />}
            accent="border-l-blue-400"
          >
            {inProgress.length === 0 ? (
              <Empty msg="Nessuna task in corso" />
            ) : (
              inProgress.slice(0, 6).map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </Section>
        </div>

        {/* Sidebar: progetti + collaboratori */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <FolderKanban size={16} className="text-slate-500" />
                Progetti recenti
              </h2>
              <Link href="/app/projects" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                Tutti <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {projects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-3">Nessun progetto</p>
                  <Link href="/app/projects" className="btn-primary text-xs px-3 py-1.5">
                    <Plus size={14} /> Crea progetto
                  </Link>
                </div>
              ) : (
                projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/app/projects/${p.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: p.color }}
                    />
                    <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-slate-400">{p._count.tasks}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2">
                <Users size={16} className="text-slate-500" />
                Carico collaboratori
              </h2>
              <Link href="/app/people" className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1">
                Gestisci <ArrowRight size={12} />
              </Link>
            </div>
            <div className="space-y-1">
              {collaborators.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500 mb-3">Nessun collaboratore</p>
                  <Link href="/app/people" className="btn-primary text-xs px-3 py-1.5">
                    <Plus size={14} /> Invita
                  </Link>
                </div>
              ) : (
                collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                    <Avatar name={c.name} color={c.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                    </div>
                    <span
                      className={cn(
                        "chip text-[10px]",
                        c._count.assignedTasks === 0
                          ? "bg-slate-100 text-slate-500 border-slate-200"
                          : c._count.assignedTasks > 5
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200",
                      )}
                    >
                      {c._count.assignedTasks} task
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="card p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", accent)}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
  icon,
  accent,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={cn("card border-l-4 overflow-hidden", accent)}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <h2 className="font-bold flex items-center gap-2 text-sm">
          {icon}
          {title}
        </h2>
        <span className="text-xs text-slate-500">{count}</span>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="px-5 py-8 text-center text-sm text-slate-400">{msg}</div>;
}

type TaskWithJoins = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: { name: string; color: string };
  assignee: { id: string; name: string; color: string } | null;
};

function TaskRow({ task }: { task: TaskWithJoins }) {
  const overdue = isOverdue(task.dueDate, task.status);
  return (
    <Link
      href={`/app/task/${task.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
    >
      <PriorityIcon priority={task.priority} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{task.title}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.project.color }} />
            {task.project.name}
          </span>
          {task.dueDate && (
            <span className={cn("text-xs", overdue ? "text-red-600 font-medium" : "text-slate-500")}>
              · {formatDueDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
      <StatusBadge status={task.status} />
      {task.assignee ? (
        <Avatar name={task.assignee.name} color={task.assignee.color} size="sm" />
      ) : (
        <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300" title="Non assegnata" />
      )}
    </Link>
  );
}
