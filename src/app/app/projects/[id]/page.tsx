import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ProjectBoard } from "@/components/ProjectBoard";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const [project, allCollaborators] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        tasks: {
          include: { assignee: true, _count: { select: { attachments: true } } },
          orderBy: [{ position: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.user.findMany({ where: { role: "COLLABORATOR" }, orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  return (
    <ProjectBoard
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        members: project.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, color: m.user.color })),
        tasks: project.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          assignee: t.assignee
            ? { id: t.assignee.id, name: t.assignee.name, color: t.assignee.color }
            : null,
          attachmentsCount: t._count.attachments,
        })),
      }}
      allCollaborators={allCollaborators.map((u) => ({ id: u.id, name: u.name, email: u.email, color: u.color }))}
    />
  );
}
