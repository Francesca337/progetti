import { requireAdmin } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role, color: user.color }}
    >
      {children}
    </AppShell>
  );
}
