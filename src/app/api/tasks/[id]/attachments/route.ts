import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { putBlob } from "@/lib/blob";
import { nanoid } from "nanoid";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.role !== "ADMIN" && task.assigneeId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "too_large", maxSize: MAX_SIZE }, { status: 413 });
  }

  const blobKey = `${id}/${nanoid()}-${file.name}`;
  const buf = await file.arrayBuffer();

  try {
    await putBlob(blobKey, buf, {
      taskId: id,
      uploaderId: user.id,
      filename: file.name,
    });
  } catch (e) {
    console.error("[blob] upload failed", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const att = await prisma.attachment.create({
    data: {
      taskId: id,
      uploaderId: user.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      blobKey,
    },
  });

  return NextResponse.json({ attachment: att });
}
