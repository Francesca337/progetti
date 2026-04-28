'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  createCollaborator,
  deleteCollaborator,
  rotateAccessToken,
  updateCollaboratorSlackId,
} from '../actions';

type Item = {
  id: string;
  name: string;
  email: string;
  accessToken: string;
  slackUserId: string;
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
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="slackUserId">Slack ID (opzionale)</label>
            <input
              id="slackUserId"
              name="slackUserId"
              placeholder="U01ABCDEF"
              className="input font-mono text-xs"
            />
          </div>
          <button type="submit" className="btn-dark" disabled={pending}>
            {pending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-brand">{error}</div>}
        <p className="mt-3 text-xs text-ink-500">
          Lo Slack ID si trova in Slack, sul profilo di una persona, dal menu ⋮ → "Copy member ID".
          Serve per inviare le notifiche di assegnazione via DM Slack.
        </p>
      </form>

      <div className="space-y-3">
        {collaborators.length === 0 && (
          <div className="card-flat p-8 text-center text-ink-500 text-sm">
            Ancora nessuno. Aggiungi la prima persona quando vuoi.
          </div>
        )}
        {collaborators.map((c) => (
          <CollaboratorCard
            key={c.id}
            c={c}
            appUrl={appUrl}
            copiedId={copiedId}
            copyLink={copyLink}
            pending={pending}
            startTransition={startTransition}
          />
        ))}
      </div>
    </div>
  );
}

function CollaboratorCard({
  c,
  appUrl,
  copiedId,
  copyLink,
  pending,
  startTransition,
}: {
  c: Item;
  appUrl: string;
  copiedId: string | null;
  copyLink: (token: string, id: string) => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [editingSlack, setEditingSlack] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const link = `${appUrl || ''}/c/${c.accessToken}`;

  return (
    <div className="card-flat p-5">
      <div className="flex flex-wrap items-center gap-4">
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
          <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-ink-500">
              {c.taskCount} {c.taskCount === 1 ? 'task assegnata' : 'task assegnate'}
            </span>
            <span className="text-ink-300">·</span>
            {c.slackUserId ? (
              <span className="text-ink-500">
                Slack: <span className="font-mono text-ink-700">{c.slackUserId}</span>
              </span>
            ) : (
              <span className="text-ink-400">Slack ID non impostato</span>
            )}
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => {
                setLocalError(null);
                setEditingSlack((v) => !v);
              }}
            >
              {editingSlack ? 'Chiudi' : c.slackUserId ? 'Modifica' : 'Imposta'}
            </button>
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

      {editingSlack && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            const value = String(fd.get('slackUserId') ?? '');
            setLocalError(null);
            startTransition(async () => {
              try {
                await updateCollaboratorSlackId(c.id, value);
                setEditingSlack(false);
              } catch (err) {
                setLocalError(err instanceof Error ? err.message : 'Errore');
              }
            });
          }}
          className="mt-4 pt-4 border-t border-ink-100 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[180px]">
            <label className="label" htmlFor={`slack-${c.id}`}>Slack ID</label>
            <input
              id={`slack-${c.id}`}
              name="slackUserId"
              defaultValue={c.slackUserId}
              placeholder="U01ABCDEF (lascia vuoto per rimuovere)"
              className="input font-mono text-xs"
            />
          </div>
          <button type="submit" className="btn-primary btn-xs" disabled={pending}>
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          {localError && <div className="w-full text-xs text-brand">{localError}</div>}
        </form>
      )}
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
