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
    <div className="space-y-6">
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
        className="card p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
      >
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Aggiunta…' : 'Aggiungi'}
        </button>
        {error && <div className="sm:col-span-3 text-sm text-rose-700">{error}</div>}
      </form>

      <div className="space-y-2">
        {collaborators.length === 0 && (
          <div className="card p-4 text-sm text-slate-500">Nessun collaboratore ancora.</div>
        )}
        {collaborators.map((c) => {
          const link = `${appUrl || ''}/c/${c.accessToken}`;
          return (
            <div key={c.id} className="card p-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-slate-500 truncate">{c.email}</div>
                <div className="text-xs text-slate-500 mt-1">{c.taskCount} task assegnate</div>
                <div className="text-xs text-slate-500 mt-1 break-all">
                  <span className="font-mono">{link}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/collaborators/${c.id}`} className="btn-secondary text-xs">
                  Vedi task
                </Link>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => copyLink(c.accessToken, c.id)}
                >
                  {copiedId === c.id ? 'Copiato!' : 'Copia link'}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Rigenerare il link personale? Il vecchio non funzionerà più.')) return;
                    startTransition(async () => {
                      await rotateAccessToken(c.id);
                    });
                  }}
                >
                  Rigenera link
                </button>
                <button
                  type="button"
                  className="btn-danger text-xs"
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
