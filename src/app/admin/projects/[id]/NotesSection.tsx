'use client';

import { useState, useTransition } from 'react';
import {
  createProjectNote,
  deleteProjectNote,
  updateProjectNote,
} from '../actions';

type Note = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export function NotesSection({
  projectId,
  notes,
}: {
  projectId: string;
  notes: Note[];
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="card p-6 space-y-4">
      <div className="flex items-baseline gap-3">
        <p className="eyebrow">I tuoi appunti</p>
        <span className="text-xs text-ink-400">
          solo per te · {notes.length}
        </span>
      </div>
      <p className="text-xs text-ink-500 -mt-1">
        Promemoria privati su questo progetto. I collaboratori non li vedono.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          const fd = new FormData();
          fd.set('projectId', projectId);
          fd.set('body', draft);
          setError(null);
          startTransition(async () => {
            const res = await createProjectNote(fd);
            if (res?.error) setError(res.error);
            else setDraft('');
          });
        }}
        className="space-y-2"
      >
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Scrivi qui un pensiero, un link, una cosa da non dimenticare…"
          className="textarea"
          maxLength={5000}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="btn-primary btn-xs"
            disabled={pending || !draft.trim()}
          >
            {pending ? 'Salvataggio…' : 'Aggiungi appunto'}
          </button>
          {error && <span className="text-xs text-brand">{error}</span>}
        </div>
      </form>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NoteItem({ note }: { note: Note }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className="rounded-2xl bg-cream-50 border border-ink-100 p-3 space-y-2">
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="textarea"
          maxLength={5000}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary btn-xs"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await updateProjectNote(note.id, draft);
                if (res?.error) setError(res.error);
                else setEditing(false);
              });
            }}
          >
            {pending ? 'Salvataggio…' : 'Salva'}
          </button>
          <button
            type="button"
            className="btn-ghost btn-xs"
            onClick={() => {
              setDraft(note.body);
              setEditing(false);
              setError(null);
            }}
          >
            Annulla
          </button>
          {error && <span className="text-xs text-brand">{error}</span>}
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-cream-50 border border-ink-100 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-800 whitespace-pre-wrap flex-1 min-w-0">
          {note.body}
        </p>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-ink-900 transition"
            onClick={() => setEditing(true)}
          >
            Modifica
          </button>
          <button
            type="button"
            className="text-xs text-ink-500 hover:text-brand transition"
            disabled={pending}
            onClick={() => {
              if (!confirm('Eliminare questo appunto?')) return;
              startTransition(async () => {
                await deleteProjectNote(note.id);
              });
            }}
          >
            Elimina
          </button>
        </div>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-400">
        {new Date(note.updatedAt).toLocaleString('it-IT', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </li>
  );
}
