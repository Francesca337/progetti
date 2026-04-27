import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateToken } from "@/lib/auth";
import { emailWelcome, APP_URL } from "@/lib/email";
import { pickColor } from "@/lib/utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { assignedTasks: true } } },
  });

  // Hide tokens to non-admin
  if (user.role !== "ADMIN") {
    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, color: u.color })),
    });
  }

  return NextResponse.json({ users });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "COLLABORATOR"]).default("COLLABORATOR"),
  sendInvite: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "email_taken" }, { status: 409 });

  const token = generateToken();
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      token,
      color: pickColor(email),
    },
  });

  const loginUrl = `${APP_URL()}/?t=${token}`;

  if (parsed.data.sendInvite) {
    emailWelcome({
      to: created.email,
      name: created.name,
      inviterName: user.name,
      loginUrl,
    }).catch((e) => console.error("[email] welcome failed", e));
  }

  return NextResponse.json({ user: created, loginUrl });
}
