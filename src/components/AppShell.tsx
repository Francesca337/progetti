"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CheckSquare, FolderKanban, Users, Home, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ADMIN_NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/projects", label: "Progetti", icon: FolderKanban },
  { href: "/app/people", label: "Persone", icon: Users },
];

const USER_NAV: NavItem[] = [{ href: "/me", label: "Le mie task", icon: CheckSquare }];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string; color: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = user.role === "ADMIN" ? ADMIN_NAV : USER_NAV;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen">
        <SidebarContent
          user={user}
          nav={nav}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Link href={user.role === "ADMIN" ? "/app" : "/me"} className="flex items-center gap-2 font-bold">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <CheckSquare size={14} strokeWidth={2.5} />
          </div>
          Progetti
        </Link>
        <button onClick={() => setOpen(true)} className="btn-ghost p-2" aria-label="Apri menu">
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col animate-slide-up">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 btn-ghost p-2" aria-label="Chiudi">
              <X size={18} />
            </button>
            <SidebarContent
              user={user}
              nav={nav}
              pathname={pathname}
              onLogout={handleLogout}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 lg:py-0 pt-14">{children}</main>
    </div>
  );
}

function SidebarContent({
  user,
  nav,
  pathname,
  onLogout,
  onNavigate,
}: {
  user: { name: string; email: string; role: string; color: string };
  nav: NavItem[];
  pathname: string;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-5 pt-6 pb-4">
        <Link href={user.role === "ADMIN" ? "/app" : "/me"} className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <CheckSquare size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-bold leading-none">Progetti</div>
            <div className="text-xs text-slate-500 mt-0.5">{user.role === "ADMIN" ? "Project Manager" : "Collaboratore"}</div>
          </div>
        </Link>
      </div>

      <nav className="px-3 flex-1">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/app" && item.href !== "/me" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user.name} color={user.color} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
          <button onClick={onLogout} className="btn-ghost p-2" title="Esci" aria-label="Esci">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
