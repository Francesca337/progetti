import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PeopleManager } from "@/components/PeopleManager";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: { _count: { select: { assignedTasks: { where: { status: { not: "DONE" } } } } } },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <PeopleManager
      meId={me.id}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        color: u.color,
        token: u.token,
        openTasks: u._count.assignedTasks,
      }))}
      appUrl={appUrl}
    />
  );
}
