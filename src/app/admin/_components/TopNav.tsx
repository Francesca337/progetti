'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS: { href: string; label: string }[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/projects', label: 'Progetti' },
  { href: '/admin/collaborators', label: 'Collaboratori' },
  { href: '/admin/backlog', label: 'Backlog' },
];

export function TopNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-4 z-40 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <nav className="pill-nav">
          <Link
            href="/admin"
            className="logo text-base px-3 hidden sm:inline-flex items-baseline"
            aria-label="exd PM"
          >
            <span className="logo-dot">.</span>
            <span>ex</span>
            <span className="logo-accent">d</span>
          </Link>
          <span className="hidden sm:block w-px h-5 bg-ink-100 mx-1" aria-hidden />
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`pill-link ${active ? 'pill-link-active' : ''}`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            className="md:hidden pill-link"
            onClick={() => setOpen((v) => !v)}
            aria-label="Apri menu"
          >
            ☰
          </button>
        </nav>
        <div className="pill-nav">
          <span className="hidden sm:block px-3 text-sm text-ink-600 truncate max-w-[160px]">
            {adminName}
          </span>
          <form action="/logout" method="post">
            <button type="submit" className="pill-link" title="Esci">
              Esci
            </button>
          </form>
        </div>
      </div>
      {open && (
        <div className="md:hidden mt-2 max-w-6xl mx-auto card p-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block pill-link ${isActive(pathname, l.href) ? 'pill-link-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}
