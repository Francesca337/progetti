import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { emailTaskAssigned, APP_URL } from "@/lib/email";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const assigneeId = url.searchParams.get("assigneeId");
  const status = url.searchParams.get("status");
  const mine = url.searchParams.get("mine") === "1";

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (mine || user.role !== "ADMIN") where.assigneeId = user.id;
  else if (assigneeId) where.assigneeId = assigneeId;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: true,
      assignee: true,
      _count: { select: { attachments: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  projectId: z.string(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dueDate, assigneeId, ...rest } = parsed.data;

  const task = await prisma.task.create({
    data: {
      ...rest,
      description: rest.description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      assigneeId: assigneeId || null,
      creatorId: user.id,
    },
    include: { project: true, assignee: true },
  });

  // Notify assignee
  if (task.assignee && task.assignee.id !== user.id) {
    const taskUrl = `${APP_URL()}/me/task/${task.id}`;
    emailTaskAssigned({
      to: task.assignee.email,
      assigneeName: task.assignee.name,
      taskTitle: task.title,
      projectName: task.project.name,
      dueDate: task.dueDate,
      assignerName: user.name,
      taskUrl,
    }).catch((e) => console.error("[email] assigned failed", e));
  }

  return NextResponse.json({ task });
}
