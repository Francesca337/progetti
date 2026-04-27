import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBlob, deleteBlob } from "@/lib/blob";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!att) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "ADMIN" && att.task.assigneeId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const data = await getBlob(att.blobKey);
  if (!data) return NextResponse.json({ error: "blob_missing" }, { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(att.filename)}"`,
      "Content-Length": String(att.size),
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: { task: true },
  });
  if (!att) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const canDelete = user.role === "ADMIN" || att.uploaderId === user.id;
  if (!canDelete) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    await deleteBlob(att.blobKey);
  } catch (e) {
    console.error("[blob] delete failed", e);
  }
  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
