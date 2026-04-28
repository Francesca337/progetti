'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createCollaborator, deleteCollaborator, rotateAccessToken } from '../actions';

type Item = {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  taskCount: number;
};

export function CollaboratorsClient({
  appUrl,
  collaborators,
}: {
  appUrl: string;
  collaborators: Item[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyLink(token: string, id: string) {
    const url = `${appUrl || window.location.origin}/c/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1500);
    });
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setError(null);
          startTransition(async () => {
            try {
              await createCollaborator(fd);
              form.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Errore');
            }
          });
        }}
        className="card p-6"
      >
        <p className="eyebrow mb-4">Aggiungi</p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <button type="submit" className="btn-dark" disabled={pending}>
            {pending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-brand">{error}</div>}
      </form>

      <div className="space-y-3">
        {collaborators.length === 0 && (
          <div className="card-flat p-8 text-center text-ink-500 text-sm">
            Ancora nessun collaboratore. Aggiungine uno qui sopra.
          </div>
        )}
        {collaborators.map((c) => {
          const link = `${appUrl || ''}/c/${c.accessToken}`;
          return (
            <div key={c.id} className="card-flat p-5 flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-ink-900 text-cream flex items-center justify-center font-semibold text-sm shrink-0">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-900">{c.name}</div>
                    <div className="text-sm text-ink-500 truncate">{c.email}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-ink-500 break-all">
                  <span className="font-mono">{link}</span>
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {c.taskCount} {c.taskCount === 1 ? 'task assegnata' : 'task assegnate'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/collaborators/${c.id}`} className="btn-secondary btn-xs">
                  Vedi task
                </Link>
                <button
                  type="button"
                  className="btn-secondary btn-xs"
                  onClick={() => copyLink(c.accessToken, c.id)}
                >
                  {copiedId === c.id ? 'Copiato!' : 'Copia link'}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-xs"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Rigenerare il link personale? Il vecchio non funzionerà più.')) return;
                    startTransition(async () => {
                      await rotateAccessToken(c.id);
                    });
                  }}
                >
                  Rigenera
                </button>
                <button
                  type="button"
                  className="btn-danger btn-xs"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Eliminare ${c.name}? Le task verranno conservate ma senza assegnatario.`)) return;
                    startTransition(async () => {
                      await deleteCollaborator(c.id);
                    });
                  }}
                >
                  Elimina
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}
