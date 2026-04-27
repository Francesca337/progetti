import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { TaskDetail } from "@/components/TaskDetail";

export const dynamic = "force-dynamic";

export default async function MyTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: true,
      assignee: true,
      creator: true,
      attachments: { include: { uploader: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) notFound();
  if (task.assigneeId !== user.id) redirect("/me");

  return (
    <TaskDetail
      mode="collaborator"
      backHref="/me"
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
    />
  );
}
