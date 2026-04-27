import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  const [collaborators, projects] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'COLLABORATOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { archived: false, isPersonalBacklog: false },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, color: true },
    }),
  ]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:w-64 bg-white border-r lg:min-h-screen">
        <div className="p-4 border-b">
          <div className="text-xs uppercase tracking-wide text-slate-500">Admin</div>
          <div className="font-semibold truncate">{admin.name}</div>
          <div className="text-xs text-slate-500 truncate">{admin.email}</div>
        </div>
        <nav className="p-3 space-y-1 text-sm">
          <NavLink href="/admin">Dashboard</NavLink>
          <NavLink href="/admin/projects">Progetti</NavLink>
          <NavLink href="/admin/collaborators">Collaboratori</NavLink>
          <NavLink href="/admin/backlog">Backlog personale</NavLink>

          {collaborators.length > 0 && (
            <div className="pt-4">
              <div className="px-2 text-xs uppercase tracking-wide text-slate-400 mb-1">
                Per collaboratore
              </div>
              {collaborators.map((c) => (
                <NavLink key={c.id} href={`/admin/collaborators/${c.id}`}>
                  {c.name}
                </NavLink>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className="pt-4">
              <div className="px-2 text-xs uppercase tracking-wide text-slate-400 mb-1">
                Progetti
              </div>
              {projects.map((p) => (
                <NavLink key={p.id} href={`/admin/projects/${p.id}`}>
                  <span
                    className="inline-block h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: p.color }}
                    aria-hidden
                  />
                  {p.name}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        <div className="p-3 border-t mt-auto">
          <form action="/logout" method="post">
            <button type="submit" className="btn-secondary w-full">
              Esci
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 lg:p-8 max-w-6xl">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100"
    >
      {children}
    </Link>
  );
}
