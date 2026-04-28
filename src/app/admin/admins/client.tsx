'use client';

import { useState, useTransition } from 'react';
import { changeAdminPassword, createAdmin, removeAdmin } from './actions';

type AdminItem = {
  id: string;
  name: string;
  email: string;
  isPrincipal: boolean;
  isMe: boolean;
  hasPassword: boolean;
  createdAt: string;
};

export function AdminsClient({
  meId,
  admins,
}: {
  meId: string;
  admins: AdminItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const fd = new FormData(form);
          setError(null);
          setSuccess(null);
          startTransition(async () => {
            try {
              await createAdmin(fd);
              const name = String(fd.get('name') ?? '');
              setSuccess(`${name} è stato aggiunto come admin.`);
              form.reset();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Errore');
            }
          });
        }}
        className="card p-6"
      >
        <p className="eyebrow mb-4">Aggiungi admin</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              className="input"
              placeholder="Min 8 caratteri"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-ink-500 max-w-md">
            Passa le credenziali a voce, o tramite un messaggio cifrato. La password si può
            cambiare quando vuoi, da qui.
          </p>
          <button type="submit" className="btn-dark" disabled={pending}>
            {pending ? 'Aggiunta…' : 'Aggiungi'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-brand">{error}</div>}
        {success && <div className="mt-3 text-sm text-teal-500">{success}</div>}
      </form>

      <div className="space-y-3">
        {admins.map((a) => (
          <AdminRow key={a.id} admin={a} pending={pending} startTransition={startTransition} />
        ))}
      </div>
    </div>
  );
}

function AdminRow({
  admin,
  pending,
  startTransition,
}: {
  admin: AdminItem;
  pending: boolean;
  startTransition: (cb: () => void) => void;
}) {
  const [editingPwd, setEditingPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card-flat p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-ink-900 text-cream flex items-center justify-center font-semibold text-sm shrink-0">
          {initials(admin.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-900">{admin.name}</span>
            {admin.isMe && <span className="badge bg-brand-50 text-brand-700">tu</span>}
            {admin.isPrincipal && (
              <span className="badge bg-cream-100 text-ink-700" title="Credenziali nelle env vars di Netlify">
                Admin principale
              </span>
            )}
          </div>
          <div className="text-sm text-ink-500 truncate">{admin.email}</div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!admin.isPrincipal && (
            <button
              type="button"
              className="btn-ghost btn-xs"
              onClick={() => {
                setEditingPwd((v) => !v);
                setError(null);
              }}
            >
              {editingPwd ? 'Chiudi' : 'Cambia password'}
            </button>
          )}
          {!admin.isMe && !admin.isPrincipal && (
            <button
              type="button"
              className="btn-danger btn-xs"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Rimuovere ${admin.name} dagli admin?`)) return;
                startTransition(async () => {
                  try {
                    await removeAdmin(admin.id);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Errore');
                  }
                });
              }}
            >
              Rimuovi
            </button>
          )}
        </div>
      </div>

      {editingPwd && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            setError(null);
            startTransition(async () => {
              try {
                await changeAdminPassword(admin.id, fd);
                form.reset();
                setEditingPwd(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Errore');
              }
            });
          }}
          className="mt-4 pt-4 border-t border-ink-100 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="label" htmlFor={`pwd-${admin.id}`}>Nuova password</label>
            <input
              id={`pwd-${admin.id}`}
              name="password"
              type="text"
              required
              minLength={8}
              className="input"
              placeholder="Min 8 caratteri"
            />
          </div>
          <button type="submit" className="btn-primary btn-xs" disabled={pending}>
            {pending ? 'Salvataggio…' : 'Salva password'}
          </button>
        </form>
      )}

      {error && <div className="mt-3 text-sm text-brand">{error}</div>}
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
