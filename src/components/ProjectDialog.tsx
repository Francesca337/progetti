"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn, PALETTE } from "@/lib/utils";

type Member = { id: string; name: string; color: string };

type Props = {
  project?: { id: string; name: string; description: string | null; color: string; members: Member[] };
  collaborators: Member[];
  onClose: () => void;
  onSaved: () => void;
};

export function ProjectDialog({ project, collaborators, onClose, onSaved }: Props) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? PALETTE[0]);
  const [memberIds, setMemberIds] = useState<string[]>(project?.members.map((m) => m.id) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = project ? `/api/projects/${project.id}` : "/api/projects";
      const method = project ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || null, color, memberIds }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={project ? "Modifica progetto" : "Nuovo progetto"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="es. Sito web, Lancio prodotto..."
            autoFocus
            required
          />
        </div>
        <div>
          <label className="label">Descrizione (opzionale)</label>
          <textarea
            className="input min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A cosa serve questo progetto..."
            rows={3}
          />
        </div>
        <div>
          <label className="label">Colore</label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "w-8 h-8 rounded-lg transition-transform",
                  color === c ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "hover:scale-105",
                )}
                style={{ background: c }}
                aria-label={`Colore ${c}`}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="label">Membri del progetto</label>
          {collaborators.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Nessun collaboratore. Invitane uno dalla pagina Persone.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {collaborators.map((c) => {
                const selected = memberIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setMemberIds((ids) =>
                        ids.includes(c.id) ? ids.filter((i) => i !== c.id) : [...ids, c.id],
                      );
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                      selected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: selected ? "white" : c.color }}
                    />
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            Annulla
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Salvataggio..." : project ? "Salva" : "Crea progetto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative w-full bg-white rounded-t-2xl sm:rounded-2xl shadow-card-hover animate-slide-up max-h-[92vh] overflow-y-auto",
          size === "md" ? "sm:max-w-lg" : "sm:max-w-3xl",
        )}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Chiudi">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
