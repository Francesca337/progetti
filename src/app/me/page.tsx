import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { MyTasksView } from "@/components/MyTasksView";

export const dynamic = "force-dynamic";

export default async function MyTasksPage() {
  const user = await requireUser();

  const tasks = await prisma.task.findMany({
    where: { assigneeId: user.id },
    include: {
      project: true,
      _count: { select: { attachments: true } },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <MyTasksView
      userName={user.name}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        project: { id: t.project.id, name: t.project.name, color: t.project.color },
        attachmentsCount: t._count.attachments,
      }))}
    />
  );
}
