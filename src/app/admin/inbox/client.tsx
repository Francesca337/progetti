'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { Project, User } from '@prisma/client';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/format';
import {
  archiveInboxItem,
  convertInboxItemToTask,
  disconnectGmail,
  setGmailLabel,
  syncGmailInbox,
  unarchiveInboxItem,
} from './actions';

type Item = {
  id: string;
  source: 'GMAIL' | 'SLACK';
  title: string;
  description: string | null;
  sender: string | null;
  link: string | null;
  status: 'PENDING' | 'ARCHIVED' | 'CONVERTED';
  createdAt: string;
};

type Integration = {
  email: string;
  labelName: string;
  lastSyncAt: string | null;
};

const ERROR_LABELS: Record<string, string> = {
  state_mismatch: 'Sessione OAuth scaduta. Riprova.',
  no_refresh_token: 'Google non ha rilasciato il refresh token. Disconnetti e riprova.',
  exchange_failed: 'Errore durante lo scambio del token con Google.',
  missing_params: 'Parametri OAuth mancanti.',
  access_denied: 'Hai negato l’autorizzazione.',
};

export function InboxClient({
  me,
  integration,
  items,
  projects,
  collaborators,
  showArchived,
  flash,
}: {
  me: Pick<User, 'id' | 'name'>;
  integration: Integration | null;
  items: Item[];
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  showArchived: boolean;
  flash: { connected: boolean; error: string | null };
}) {
  return (
    <div className="space-y-8">
      {flash.connected && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-500">
          Gmail collegato. Clicca "Aggiorna inbox" per sincronizzare.
        </div>
      )}
      {flash.error && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {ERROR_LABELS[flash.error] ?? `Errore: ${flash.error}`}
        </div>
      )}

      <ConnectionPanel integration={integration} />

      {integration && (
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/admin/inbox"
            className={`pill-link ${!showArchived ? 'pill-link-active' : ''}`}
          >
            Da triare ({showArchived ? '—' : items.length})
          </Link>
          <Link
            href="/admin/inbox?show=archived"
            className={`pill-link ${showArchived ? 'pill-link-active' : ''}`}
          >
            Archiviate
          </Link>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card-flat p-8 text-center text-ink-500 text-sm">
          {showArchived
            ? 'Niente in archivio.'
            : integration
              ? 'Niente da triare. Marca delle email in Gmail con la label e clicca "Aggiorna inbox".'
              : 'Collega Gmail per iniziare.'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxItemCard
              key={item.id}
              item={item}
              me={me}
              projects={projects}
              collaborators={collaborators}
              isArchive={showArchived}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionPanel({ integration }: { integration: Integration | null }) {
  const [pending, startTransition] = useTransition();
  const [editingLabel, setEditingLabel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!integration) {
    return (
      <div className="card p-6">
        <p className="eyebrow mb-3">Sorgenti</p>
        <h2 className="display text-2xl mb-3">
          Collega <span className="serif-italic">Gmail.</span>
        </h2>
        <p className="text-sm text-ink-500 mb-5 max-w-xl">
          Autorizza l’app a leggere solo le email con una specifica label. Default:{' '}
          <span className="font-mono">PM-todo</span>. Crea la label in Gmail (Settings →
          Labels → Create new) prima di collegare.
        </p>
        <a href="/api/gmail/oauth/start" className="btn-dark">
          Collega Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Gmail collegato</p>
          <div className="text-sm font-semibold text-ink-900">{integration.email}</div>
          <div className="text-xs text-ink-500 mt-1">
            Label:{' '}
            {editingLabel ? (
              <form
                className="inline-flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const value = String(fd.get('labelName') ?? '');
                  setError(null);
                  startTransition(async () => {
                    const res = await setGmailLabel(value);
                    if (res?.error) setError(res.error);
                    else setEditingLabel(false);
                  });
                }}
              >
                <input
                  name="labelName"
                  defaultValue={integration.labelName}
                  className="input font-mono text-xs py-1 px-2 w-44"
                  autoFocus
                />
                <button type="submit" className="btn-primary btn-xs" disabled={pending}>
                  Salva
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-xs"
                  onClick={() => setEditingLabel(false)}
                >
                  Annulla
                </button>
              </form>
            ) : (
              <>
                <span className="font-mono text-ink-700">{integration.labelName}</span>{' '}
                <button
                  type="button"
                  className="text-brand hover:underline ml-1"
                  onClick={() => setEditingLabel(true)}
                >
                  Modifica
                </button>
              </>
            )}
          </div>
          {integration.lastSyncAt && (
            <div className="text-xs text-ink-400 mt-1">
              Ultimo sync: {new Date(integration.lastSyncAt).toLocaleString('it-IT')}
            </div>
          )}
          {syncResult && (
            <div className="text-xs text-teal-500 mt-2">{syncResult}</div>
          )}
          {error && <div className="text-xs text-brand mt-2">{error}</div>}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => {
              setError(null);
              setSyncResult(null);
              startTransition(async () => {
                const res = await syncGmailInbox();
                if (res.error) setError(res.error);
                else
                  setSyncResult(
                    `Importate ${res.imported}, già presenti ${res.skipped}.`,
                  );
              });
            }}
          >
            {pending ? 'Sync…' : 'Aggiorna inbox'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-xs"
            disabled={pending}
            onClick={() => {
              if (
                !confirm(
                  'Disconnettere Gmail? Gli item già in inbox restano, ma non potrai sincronizzare di nuovo finché non riconnetti.',
                )
              )
                return;
              startTransition(async () => {
                await disconnectGmail();
              });
            }}
          >
            Disconnetti
          </button>
        </div>
      </div>
    </div>
  );
}

function InboxItemCard({
  item,
  me,
  projects,
  collaborators,
  isArchive,
}: {
  item: Item;
  me: Pick<User, 'id' | 'name'>;
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  isArchive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (converting) {
    return (
      <article className="card p-5">
        <ConvertForm
          item={item}
          me={me}
          projects={projects}
          collaborators={collaborators}
          onCancel={() => setConverting(false)}
        />
      </article>
    );
  }

  return (
    <article className="card-flat p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 mb-1">
            <span className="badge bg-cream-100 text-ink-600">📨 Gmail</span>
            {item.sender && <span className="truncate max-w-xs">{item.sender}</span>}
            <span className="text-ink-400">·</span>
            <span>{new Date(item.createdAt).toLocaleString('it-IT')}</span>
          </div>
          <h3 className="font-semibold text-ink-900">{item.title}</h3>
          {item.description && (
            <p className="mt-1 text-sm text-ink-600 whitespace-pre-wrap line-clamp-3">
              {item.description}
            </p>
          )}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex text-xs text-brand hover:underline"
            >
              Apri in Gmail ↗
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!isArchive && (
            <>
              <button
                type="button"
                className="btn-primary btn-xs"
                onClick={() => {
                  setError(null);
                  setConverting(true);
                }}
              >
                → Crea task
              </button>
              <button
                type="button"
                className="btn-ghost btn-xs"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await archiveInboxItem(item.id);
                  });
                }}
              >
                Archivia
              </button>
            </>
          )}
          {isArchive && (
            <button
              type="button"
              className="btn-ghost btn-xs"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await unarchiveInboxItem(item.id);
                });
              }}
            >
              Ripristina
            </button>
          )}
        </div>
      </div>
      {error && <div className="mt-2 text-xs text-brand">{error}</div>}
    </article>
  );
}

function ConvertForm({
  item,
  me,
  projects,
  collaborators,
  onCancel,
}: {
  item: Item;
  me: Pick<User, 'id' | 'name'>;
  projects: Pick<Project, 'id' | 'name' | 'isPersonalBacklog'>[];
  collaborators: Pick<User, 'id' | 'name'>[];
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(() => new Set([me.id]));
  const selectedProject = projects.find((p) => p.id === projectId);
  const isBacklog = selectedProject?.isPersonalBacklog ?? false;

  const toggleAssignee = (id: string) =>
    setAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set('itemId', item.id);
        setError(null);
        startTransition(async () => {
          const res = await convertInboxItemToTask(fd);
          if (res?.error) setError(res.error);
        });
      }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="eyebrow">Crea una task da questa email</p>
        <button type="button" className="btn-ghost btn-xs" onClick={onCancel}>
          Chiudi
        </button>
      </div>
      <div>
        <label className="label" htmlFor={`title-${item.id}`}>Titolo</label>
        <input
          id={`title-${item.id}`}
          name="title"
          required
          maxLength={200}
          defaultValue={item.title}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor={`desc-${item.id}`}>Descrizione</label>
        <textarea
          id={`desc-${item.id}`}
          name="description"
          rows={3}
          defaultValue={item.description ?? ''}
          className="textarea"
        />
        <p className="mt-1 text-xs text-ink-400">
          Il link al thread Gmail viene aggiunto automaticamente in coda.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`proj-${item.id}`}>Progetto</label>
          <select
            id={`proj-${item.id}`}
            name="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
            className="select"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Assegnata a</span>
          {isBacklog ? (
            <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-500">
              Backlog — nessun assegnatario
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-200 bg-white/80 px-3 py-2 space-y-1.5 max-h-40 overflow-y-auto">
              <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-cream-50 rounded-xl px-2 py-1.5 transition">
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={me.id}
                  checked={assigneeIds.has(me.id)}
                  onChange={() => toggleAssignee(me.id)}
                  className="accent-brand"
                />
                <span className="font-medium">{me.name} (tu)</span>
              </label>
              {collaborators.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-cream-50 rounded-xl px-2 py-1.5 transition"
                >
                  <input
                    type="checkbox"
                    name="assigneeIds"
                    value={c.id}
                    checked={assigneeIds.has(c.id)}
                    onChange={() => toggleAssignee(c.id)}
                    className="accent-brand"
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={`status-${item.id}`}>Stato</label>
          <select id={`status-${item.id}`} name="status" defaultValue="TODO" className="select">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`dl-${item.id}`}>Deadline</label>
          <input
            id={`dl-${item.id}`}
            name="deadline"
            type="date"
            className="input"
          />
        </div>
      </div>
      {error && <div className="text-sm text-brand">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Creazione…' : 'Crea task'}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </form>
  );
}
