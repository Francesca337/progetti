import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { emailTaskAssigned, emailTaskCompleted, APP_URL } from "@/lib/email";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignee: true,
      creator: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const canAccess = user.role === "ADMIN" || task.assigneeId === user.id;
  if (!canAccess) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ task });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const existing = await prisma.task.findUnique({
    where: { id },
    include: { project: true, assignee: true, creator: true },
  });
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isAdmin = user.role === "ADMIN";
  const isAssignee = existing.assigneeId === user.id;
  if (!isAdmin && !isAssignee) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Collaborators can only change status
  if (!isAdmin) {
    const allowed: (keyof z.infer<typeof updateSchema>)[] = ["status"];
    for (const key of Object.keys(parsed.data) as (keyof z.infer<typeof updateSchema>)[]) {
      if (!allowed.includes(key)) {
        return NextResponse.json({ error: "forbidden_field", field: key }, { status: 403 });
      }
    }
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if ("dueDate" in parsed.data) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.status === "DONE" && existing.status !== "DONE") {
    data.completedAt = new Date();
  } else if (parsed.data.status && parsed.data.status !== "DONE" && existing.completedAt) {
    data.completedAt = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data,
    include: { project: true, assignee: true, creator: true },
  });

  // Notify assignee on (re)assignment
  if (parsed.data.assigneeId && parsed.data.assigneeId !== existing.assigneeId && updated.assignee) {
    const taskUrl = `${APP_URL()}/me/task/${updated.id}`;
    emailTaskAssigned({
      to: updated.assignee.email,
      assigneeName: updated.assignee.name,
      taskTitle: updated.title,
      projectName: updated.project.name,
      dueDate: updated.dueDate,
      assignerName: user.name,
      taskUrl,
    }).catch((e) => console.error("[email] assigned failed", e));
  }

  // Notify admin on completion
  if (parsed.data.status === "DONE" && existing.status !== "DONE") {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      if (admin.id === user.id) continue;
      const taskUrl = `${APP_URL()}/app/task/${updated.id}`;
      emailTaskCompleted({
        to: admin.email,
        adminName: admin.name,
        taskTitle: updated.title,
        projectName: updated.project.name,
        completedBy: user.name,
        taskUrl,
      }).catch((e) => console.error("[email] completed failed", e));
    }
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
