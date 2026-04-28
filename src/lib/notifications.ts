import type { Project, Task, User } from '@prisma/client';
import { sendTaskAssignedEmail } from './email';
import { sendTaskAssignedSlack } from './slack';

// Pick the right channel for a "task assigned" notification.
// Slack first when both the bot is configured and the assignee has a Slack ID.
// Falls back to Resend email if configured. Otherwise no-op (logged).
export async function notifyTaskAssigned(args: {
  task: Task;
  project: Project;
  assignee: User;
}): Promise<{ ok: boolean; channel: 'slack' | 'email' | 'none'; error?: string }> {
  const slackReady = !!process.env.SLACK_BOT_TOKEN && !!args.assignee.slackUserId;
  if (slackReady) {
    const res = await sendTaskAssignedSlack(args);
    return { ...res, channel: 'slack' };
  }

  const emailReady = !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
  if (emailReady) {
    const res = await sendTaskAssignedEmail(args);
    return { ...res, channel: 'email' };
  }

  console.warn(
    `[notify] No channel available for ${args.assignee.email} (slackUserId=${
      args.assignee.slackUserId ?? 'null'
    })`,
  );
  return { ok: false, channel: 'none', error: 'No notification channel configured' };
}
