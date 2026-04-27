type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const RESEND_API = "https://api.resend.com/emails";

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "Progetti <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to", payload.to);
    return { ok: false, error: "RESEND_API_KEY non configurata" };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[email] resend error", res.status, text);
      return { ok: false, error: text };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exception", err);
    return { ok: false, error: String(err) };
  }
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const wrap = (title: string, content: string) => `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border-radius:14px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <div style="font-size:13px;color:#6366f1;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Progetti</div>
      <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;line-height:1.3;">${title}</h1>
      ${content}
    </div>
    <div style="text-align:center;font-size:12px;color:#94a3b8;margin-top:24px;">Notifica automatica · non rispondere a questa email</div>
  </div>
</body></html>`;

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px;">${label}</a>`;

export function emailTaskAssigned(args: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  dueDate: Date | null;
  assignerName: string;
  taskUrl: string;
}) {
  const dueLine = args.dueDate
    ? `<p style="color:#475569;margin:0 0 8px;"><strong>Scadenza:</strong> ${args.dueDate.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>`
    : "";
  return sendEmail({
    to: args.to,
    subject: `Nuova task: ${args.taskTitle}`,
    html: wrap(
      `Hai una nuova task`,
      `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">Ciao ${args.assigneeName}, <strong>${args.assignerName}</strong> ti ha assegnato una task sul progetto <strong>${args.projectName}</strong>.</p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:16px;">
         <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:8px;">${args.taskTitle}</div>
         ${dueLine}
       </div>
       ${button(args.taskUrl, "Apri la task")}`
    ),
  });
}

export function emailTaskCompleted(args: {
  to: string;
  adminName: string;
  taskTitle: string;
  projectName: string;
  completedBy: string;
  taskUrl: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `Task completata: ${args.taskTitle}`,
    html: wrap(
      `Una task è stata completata`,
      `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">Ciao ${args.adminName}, <strong>${args.completedBy}</strong> ha completato la task <strong>"${args.taskTitle}"</strong> sul progetto <strong>${args.projectName}</strong>.</p>
       ${button(args.taskUrl, "Vedi dettagli")}`
    ),
  });
}

export function emailWelcome(args: {
  to: string;
  name: string;
  inviterName: string;
  loginUrl: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `Benvenuto su Progetti`,
    html: wrap(
      `Sei stato invitato`,
      `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">Ciao ${args.name}, <strong>${args.inviterName}</strong> ti ha invitato a collaborare su Progetti, lo strumento per gestire le task condivise.</p>
       <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">Apri il link qui sotto per accedere alla tua area personale. Salvalo: è il tuo accesso permanente.</p>
       ${button(args.loginUrl, "Apri la mia area")}
       <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin-top:24px;">Conserva questo link in modo sicuro: chi lo possiede può accedere alle tue task.</p>`
    ),
  });
}

export { APP_URL };
