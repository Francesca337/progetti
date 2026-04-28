import type { Project, Task, User } from '@prisma/client';

function appUrl(path = ''): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}

function formatDeadline(d: Date | null): string {
  if (!d) return 'Nessuna deadline';
  return new Date(d).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Builds a Google Calendar "Add to calendar" URL that opens a pre-filled
// event template. Click in Slack → Google Calendar opens in the user's
// own account with everything ready to confirm.
function googleCalendarUrl(args: {
  taskTitle: string;
  projectName: string;
  deadline: Date;
  taskLink: string;
}): string {
  const yyyymmdd = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(
      d.getUTCDate(),
    ).padStart(2, '0')}`;
  const start = new Date(args.deadline);
  const end = new Date(args.deadline);
  end.setUTCDate(end.getUTCDate() + 1); // Google all-day events use exclusive end.

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Deadline | ${args.projectName}`,
    dates: `${yyyymmdd(start)}/${yyyymmdd(end)}`,
    details: `${args.taskTitle}\n\nApri la task: ${args.taskLink}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export async function sendTaskAssignedSlack(args: {
  task: Task;
  project: Project;
  assignee: User;
}): Promise<{ ok: boolean; error?: string }> {
  const { task, project, assignee } = args;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN not set' };
  if (!assignee.slackUserId) return { ok: false, error: 'Assignee has no Slack ID' };
  if (!assignee.accessToken) return { ok: false, error: 'Assignee has no access token' };

  const link = appUrl(`/c/${assignee.accessToken}`);
  const deadline = formatDeadline(task.deadline);

  const actions: Array<Record<string, unknown>> = [
    {
      type: 'button',
      text: { type: 'plain_text', text: 'Apri la task' },
      url: link,
      style: 'primary',
    },
  ];
  if (task.deadline) {
    actions.push({
      type: 'button',
      text: { type: 'plain_text', text: '📅 Aggiungi al calendario' },
      url: googleCalendarUrl({
        taskTitle: task.title,
        projectName: project.name,
        deadline: task.deadline,
        taskLink: link,
      }),
    });
  }

  const payload = {
    channel: assignee.slackUserId,
    // Fallback text shown in notifications / when blocks aren't supported.
    text: `Nuova task: ${task.title}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Ciao *${assignee.name}*, ti ho assegnato una task in *${project.name}*.`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${task.title}*${task.description ? `\n${task.description}` : ''}`,
        },
      },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `🗓 Deadline: *${deadline}*` }],
      },
      {
        type: 'actions',
        elements: actions,
      },
    ],
  };

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!json.ok) return { ok: false, error: json.error ?? 'unknown_error' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
