import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, generateToken } from "@/lib/auth";
import { emailWelcome, APP_URL } from "@/lib/email";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.email) data.email = parsed.data.email.toLowerCase();

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ user });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (id === me.id) return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Regenerate token (rotate access link) or resend invite
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (action === "rotate") {
    const newToken = generateToken();
    const user = await prisma.user.update({ where: { id }, data: { token: newToken } });
    return NextResponse.json({ user, loginUrl: `${APP_URL()}/?t=${newToken}` });
  }

  if (action === "resend") {
    const loginUrl = `${APP_URL()}/?t=${target.token}`;
    await emailWelcome({
      to: target.email,
      name: target.name,
      inviterName: me.name,
      loginUrl,
    });
    return NextResponse.json({ ok: true, loginUrl });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
