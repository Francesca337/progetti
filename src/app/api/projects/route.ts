import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const where = user.role === "ADMIN"
    ? {}
    : { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }] };

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true } },
      members: { include: { user: true } },
    },
    orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { memberIds = [], ...rest } = parsed.data;

  const project = await prisma.project.create({
    data: {
      ...rest,
      description: rest.description ?? null,
      ownerId: user.id,
      members: {
        create: memberIds.map((userId) => ({ userId })),
      },
    },
    include: {
      _count: { select: { tasks: true } },
      members: { include: { user: true } },
    },
  });

  return NextResponse.json({ project });
}
