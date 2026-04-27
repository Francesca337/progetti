import type { Priority, TaskStatus } from '@prisma/client';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Da fare',
  IN_PROGRESS: 'In corso',
  IN_REVIEW: 'In revisione',
  DONE: 'Completata',
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Bassa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  IN_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  DONE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(deadline: Date | string | null | undefined): number | null {
  if (!deadline) return null;
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineSeverity(
  deadline: Date | string | null | undefined,
  status: TaskStatus,
): 'overdue' | 'due-soon' | 'normal' | 'none' {
  if (status === 'DONE') return 'normal';
  const d = daysUntil(deadline);
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d <= 3) return 'due-soon';
  return 'normal';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
