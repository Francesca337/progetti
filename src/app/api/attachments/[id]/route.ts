import { NextResponse } from 'next/server';
import { getAdminUser, getCollaboratorByToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAttachmentBuffer } from '@/lib/storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get('t') ?? '';

  const admin = await getAdminUser();
  const collab = admin ? null : token ? await getCollaboratorByToken(token) : null;
  if (!admin && !collab) return new NextResponse('Unauthorized', { status: 401 });

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { task: { select: { assignees: { select: { id: true } } } } },
  });
  if (!attachment) return new NextResponse('Not found', { status: 404 });

  if (!admin) {
    const allowed = attachment.task.assignees.some((a) => a.id === collab!.id);
    if (!allowed) return new NextResponse('Forbidden', { status: 403 });
  }

  const blob = await getAttachmentBuffer(attachment.blobKey);
  if (!blob) return new NextResponse('File not found in storage', { status: 404 });

  return new NextResponse(blob.data, {
    status: 200,
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.filename)}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
