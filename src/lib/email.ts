import { Resend } from 'resend';
import type { Task, User, Project } from '@prisma/client';

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function appUrl(path = ''): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}

function priorityLabel(p: Task['priority']): string {
  return { LOW: 'Bassa', MEDIUM: 'Media', HIGH: 'Alta' }[p];
}

function formatDeadline(d: Date | null): string {
  if (!d) return 'Nessuna deadline';
  return new Date(d).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function sendTaskAssignedEmail(args: {
  task: Task;
  project: Project;
  assignee: User;
}): Promise<{ ok: boolean; error?: string }> {
  const { task, project, assignee } = args;
  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL;
  if (!client || !from) {
    console.warn('[email] Resend not configured — skipping notification.');
    return { ok: false, error: 'Resend not configured' };
  }
  if (!assignee.accessToken) {
    return { ok: false, error: 'Assignee has no access token' };
  }
  const link = appUrl(`/c/${assignee.accessToken}`);
  const html = renderAssignmentEmail({
    name: assignee.name,
    taskTitle: task.title,
    taskDescription: task.description ?? '',
    projectName: project.name,
    priority: priorityLabel(task.priority),
    deadline: formatDeadline(task.deadline),
    link,
  });

  try {
    const { error } = await client.emails.send({
      from,
      to: assignee.email,
      subject: `Nuova task assegnata: ${task.title}`,
      html,
    });
    if (error) return { ok: false, error: String(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}

function renderAssignmentEmail(args: {
  name: string;
  taskTitle: string;
  taskDescription: string;
  projectName: string;
  priority: string;
  deadline: string;
  link: string;
}): string {
  return `<!doctype html>
<html><body style="font-family:Inter,Arial,sans-serif;background:#f6f7fb;padding:32px;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <h1 style="margin:0 0 8px;font-size:20px;">Ciao ${escapeHtml(args.name)},</h1>
    <p style="margin:0 0 20px;color:#475569;">Ti è stata assegnata una nuova task.</p>
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">${escapeHtml(args.projectName)}</div>
      <div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(args.taskTitle)}</div>
      ${args.taskDescription ? `<p style="margin:12px 0 0;color:#334155;white-space:pre-wrap;">${escapeHtml(args.taskDescription)}</p>` : ''}
      <div style="margin-top:16px;display:flex;gap:16px;font-size:14px;color:#475569;">
        <div><strong>Priorità:</strong> ${escapeHtml(args.priority)}</div>
        <div><strong>Deadline:</strong> ${escapeHtml(args.deadline)}</div>
      </div>
    </div>
    <a href="${args.link}" style="display:inline-block;background:#3566f5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Apri la task</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Questo link è personale: salvalo per accedere alle tue task in qualsiasi momento.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
