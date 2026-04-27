"use client";

import { useState } from "react";
import { Modal } from "./ProjectDialog";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils";

type Member = { id: string; name: string; email: string; color: string };

type Props = {
  projectId: string;
  collaborators: Member[];
  defaultStatus?: string;
  onClose: () => void;
  onSaved: () => void;
};

export function TaskDialog({ projectId, collaborators, defaultStatus = "TODO", onClose, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState(defaultStatus);
  const [dueDate, setDueDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        projectId,
        title: title.trim(),
        description: description || null,
        assigneeId: assigneeId || null,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate + "T23:59:00").toISOString() : null,
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    <Modal title="Nuova task" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Titolo</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cosa va fatto?"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="label">Descrizione (opzionale)</label>
          <textarea
            className="input min-h-[88px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Aggiungi dettagli, contesto, link..."
            rows={3}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Assegna a</label>
            <select
              className="input"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">— Non assegnata —</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Scadenza</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Priorità</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Stato</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
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
          <button type="submit" className="btn-primary" disabled={saving || !title.trim()}>
            {saving ? "Creazione..." : "Crea task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
