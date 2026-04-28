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
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Apri la task' },
            url: link,
            style: 'primary',
          },
        ],
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
