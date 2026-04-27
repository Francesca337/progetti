import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { TaskDetail } from "@/components/TaskDetail";

export const dynamic = "force-dynamic";

export default async function AdminTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const [task, collaborators] = await Promise.all([
    prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
        creator: true,
        attachments: { include: { uploader: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({ where: { role: "COLLABORATOR" }, orderBy: { name: "asc" } }),
  ]);

  if (!task) notFound();

  return (
    <TaskDetail
      mode="admin"
      backHref={`/app/projects/${task.projectId}`}
      task={{
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        completedAt: task.completedAt ? task.completedAt.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        project: { id: task.project.id, name: task.project.name, color: task.project.color },
        assignee: task.assignee
          ? { id: task.assignee.id, name: task.assignee.name, color: task.assignee.color }
          : null,
        creator: { id: task.creator.id, name: task.creator.name, color: task.creator.color },
        attachments: task.attachments.map((a) => ({
          id: a.id,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
          createdAt: a.createdAt.toISOString(),
          uploader: { id: a.uploader.id, name: a.uploader.name, color: a.uploader.color },
        })),
      }}
      collaborators={collaborators.map((c) => ({ id: c.id, name: c.name, email: c.email, color: c.color }))}
    />
  );
}
