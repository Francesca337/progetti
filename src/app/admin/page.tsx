import Link from 'next/link';
import { prisma } from '@/lib/db';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatDate,
} from '@/lib/format';

export default async function AdminDashboard() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const in7Days = new Date(startOfToday);
  in7Days.setDate(in7Days.getDate() + 7);

  const [overdue, dueSoon, inProgress, totals] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
        deadline: { lt: startOfToday },
      },
      include: { project: true, assignee: true },
      orderBy: { deadline: 'asc' },
      take: 50,
    }),
    prisma.task.findMany({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] },
        deadline: { gte: startOfToday, lte: in7Days },
      },
      include: { project: true, assignee: true },
      orderBy: { deadline: 'asc' },
      take: 50,
    }),
    prisma.task.findMany({
      where: { status: 'IN_PROGRESS' },
      include: { project: true, assignee: true },
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
      take: 50,
    }),
    prisma.task.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const statusCount = Object.fromEntries(totals.map((t) => [t.status, t._count._all])) as Record<
    string,
    number
  >;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-slate-600 text-sm">Panoramica delle task in ritardo, in scadenza e in corso.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Da fare" value={statusCount.TODO ?? 0} />
        <Stat label="In corso" value={statusCount.IN_PROGRESS ?? 0} accent="blue" />
        <Stat label="In revisione" value={statusCount.IN_REVIEW ?? 0} accent="amber" />
        <Stat label="Completate" value={statusCount.DONE ?? 0} accent="emerald" />
      </section>

      <Section
        title={`In ritardo (${overdue.length})`}
        empty="Nessuna task in ritardo. 🎉"
        accent="rose"
      >
        {overdue.map((t) => (
          <TaskLine key={t.id} task={t} />
        ))}
      </Section>

      <Section
        title={`In scadenza nei prossimi 7 giorni (${dueSoon.length})`}
        empty="Nessuna scadenza imminente."
        accent="amber"
      >
        {dueSoon.map((t) => (
          <TaskLine key={t.id} task={t} />
        ))}
      </Section>

      <Section
        title={`In corso (${inProgress.length})`}
        empty="Nessuna task in corso."
        accent="blue"
      >
        {inProgress.map((t) => (
          <TaskLine key={t.id} task={t} />
        ))}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = 'slate',
}: {
  label: string;
  value: number;
  accent?: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose';
}) {
  const ringClass: Record<string, string> = {
    slate: 'border-slate-200',
    blue: 'border-blue-200',
    amber: 'border-amber-200',
    emerald: 'border-emerald-200',
    rose: 'border-rose-200',
  };
  return (
    <div className={`card p-4 ${ringClass[accent]}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Section({
  title,
  empty,
  accent,
  children,
}: {
  title: string;
  empty: string;
  accent: 'rose' | 'amber' | 'blue';
  children: React.ReactNode;
}) {
  const dot: Record<typeof accent, string> = {
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  };
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.filter(Boolean).length === 0;
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-semibold mb-3">
        <span className={`h-2 w-2 rounded-full ${dot[accent]}`} aria-hidden />
        {title}
      </h2>
      {isEmpty ? (
        <div className="card p-4 text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function TaskLine({
  task,
}: {
  task: {
    id: string;
    title: string;
    status: keyof typeof STATUS_LABELS;
    priority: keyof typeof PRIORITY_LABELS;
    deadline: Date | null;
    project: { id: string; name: string; color: string };
    assignee: { id: string; name: string } | null;
  };
}) {
  return (
    <Link
      href={`/admin/projects/${task.project.id}#task-${task.id}`}
      className="card p-3 flex flex-wrap items-center gap-2 hover:bg-slate-50"
    >
      <span className={`badge ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
      <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>
        {PRIORITY_LABELS[task.priority]}
      </span>
      <span className="font-medium truncate">{task.title}</span>
      <span className="text-xs text-slate-500 flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
        {task.project.name}
      </span>
      {task.assignee && <span className="text-xs text-slate-500">→ {task.assignee.name}</span>}
      {task.deadline && (
        <span className="ml-auto text-xs text-slate-500">{formatDate(task.deadline)}</span>
      )}
    </Link>
  );
}
