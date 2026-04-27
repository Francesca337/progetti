import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  archived: z.boolean().optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: true } },
      tasks: {
        include: { assignee: true, _count: { select: { attachments: true } } },
        orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      },
    },
  });
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const canAccess = user.role === "ADMIN" || project.ownerId === user.id || project.members.some((m) => m.userId === user.id);
  if (!canAccess) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ project });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { memberIds, ...data } = parsed.data;

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      ...(memberIds && {
        members: {
          deleteMany: {},
          create: memberIds.map((userId) => ({ userId })),
        },
      }),
    },
    include: { members: { include: { user: true } } },
  });

  return NextResponse.json({ project });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
