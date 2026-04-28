import Link from 'next/link';
import { prisma } from '@/lib/db';
import {
  STATUS_CHIP,
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
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
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
    <div className="space-y-16">
      <header className="pt-6">
        <p className="eyebrow mb-4">Dashboard</p>
        <h1 className="display text-4xl sm:text-5xl">
          Le cose da fare,{' '}
          <span className="serif-italic">oggi.</span>
        </h1>
        <p className="mt-4 text-ink-500 max-w-xl">
          Cosa è scivolato un po', cosa si sta avvicinando, cosa è già in mano a qualcuno.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Da fare" value={statusCount.TODO ?? 0} />
        <Stat label="In corso" value={statusCount.IN_PROGRESS ?? 0} accent />
        <Stat label="In revisione" value={statusCount.IN_REVIEW ?? 0} />
        <Stat label="Completate" value={statusCount.DONE ?? 0} />
      </section>

      <Section
        eyebrow="Oltre la deadline"
        title="Da"
        italic="riprendere in mano."
        empty="Nessuna in ritardo. Tutto sotto controllo."
      >
        {overdue.map((t) => (
          <TaskLine key={t.id} task={t} severity="overdue" />
        ))}
      </Section>

      <Section
        eyebrow="Prossimi 7 giorni"
        title="Quasi alla"
        italic="deadline."
        empty="Niente in scadenza questa settimana."
      >
        {dueSoon.map((t) => (
          <TaskLine key={t.id} task={t} severity="due-soon" />
        ))}
      </Section>

      <Section
        eyebrow="In corso"
        title="Già"
        italic="partite."
        empty="Niente in corso, per ora."
      >
        {inProgress.map((t) => (
          <TaskLine key={t.id} task={t} />
        ))}
      </Section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? 'bg-ink-900 text-cream border-ink-900' : ''}`}>
      <div className={`text-[11px] uppercase tracking-[0.18em] ${accent ? 'text-cream-200' : 'text-ink-500'}`}>
        {label}
      </div>
      <div className="display text-4xl mt-2">{value}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  italic,
  empty,
  children,
}: {
  eyebrow: string;
  title: string;
  italic: string;
  empty: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.filter(Boolean).length === 0;
  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="display text-2xl sm:text-3xl">
          {title} <span className="serif-italic">{italic}</span>
        </h2>
      </div>
      {isEmpty ? (
        <div className="card-flat p-6 text-sm text-ink-500">{empty}</div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function TaskLine({
  task,
  severity,
}: {
  task: {
    id: string;
    title: string;
    status: keyof typeof STATUS_LABELS;
    deadline: Date | null;
    project: { id: string; name: string; color: string };
    assignee: { id: string; name: string } | null;
  };
  severity?: 'overdue' | 'due-soon';
}) {
  return (
    <Link
      href={`/admin/projects/${task.project.id}#task-${task.id}`}
      className="card-flat block px-4 py-3 hover:border-ink-200 hover:shadow-soft transition group"
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`badge ${STATUS_CHIP[task.status]}`}>{STATUS_LABELS[task.status]}</span>
        <span className="font-medium text-ink-900 truncate">{task.title}</span>
        <span className="text-xs text-ink-500 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.project.color }} />
          {task.project.name}
        </span>
        {task.assignee && (
          <span className="text-xs text-ink-500">→ {task.assignee.name}</span>
        )}
        {task.deadline && (
          <span
            className={`ml-auto text-xs ${
              severity === 'overdue'
                ? 'text-brand'
                : severity === 'due-soon'
                  ? 'text-amber-700'
                  : 'text-ink-500'
            }`}
          >
            {formatDate(task.deadline)}
          </span>
        )}
      </div>
    </Link>
  );
}
