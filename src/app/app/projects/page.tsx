import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ProjectsManager } from "@/components/ProjectsManager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireAdmin();
  const [projects, users] = await Promise.all([
    prisma.project.findMany({
      include: {
        _count: { select: { tasks: true } },
        members: { include: { user: true } },
        tasks: { select: { status: true } },
      },
      orderBy: [{ archived: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({ where: { role: "COLLABORATOR" }, orderBy: { name: "asc" } }),
  ]);

  const data = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    archived: p.archived,
    members: p.members.map((m) => ({ id: m.user.id, name: m.user.name, color: m.user.color })),
    totalTasks: p.tasks.length,
    doneTasks: p.tasks.filter((t) => t.status === "DONE").length,
  }));

  return <ProjectsManager initialProjects={data} collaborators={users.map((u) => ({ id: u.id, name: u.name, color: u.color }))} />;
}
