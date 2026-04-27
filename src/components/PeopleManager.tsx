"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  Link as LinkIcon,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Crown,
  X,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { Modal } from "./ProjectDialog";
import { cn } from "@/lib/utils";

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  color: string;
  token: string;
  openTasks: number;
};

export function PeopleManager({ users, meId, appUrl }: { users: Person[]; meId: string; appUrl: string }) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [shareLink, setShareLink] = useState<{ user: Person; url: string } | null>(null);

  const linkFor = (token: string) => `${appUrl || (typeof window !== "undefined" ? window.location.origin : "")}/?t=${token}`;

  const rotate = async (id: string) => {
    if (!confirm("Vuoi rigenerare il link? Il vecchio non funzionerà più.")) return;
    const res = await fetch(`/api/users/${id}?action=rotate`, { method: "POST" });
    if (res.ok) {
      const { user, loginUrl } = await res.json();
      setShareLink({ user, url: loginUrl });
      router.refresh();
    }
  };

  const resend = async (id: string) => {
    const res = await fetch(`/api/users/${id}?action=resend`, { method: "POST" });
    if (res.ok) alert("Email re-inviata.");
    else alert("Errore: " + (await res.text()));
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare questo utente? Le sue task non saranno più assegnate.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else alert("Errore: " + (await res.text()));
  };

  const admins = users.filter((u) => u.role === "ADMIN");
  const collaborators = users.filter((u) => u.role === "COLLABORATOR");

  return (
    <div className="px-5 lg:px-10 py-8 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Persone</h1>
          <p className="text-slate-600 mt-1">Invita collaboratori e gestisci i loro link di accesso.</p>
        </div>
        <button onClick={() => setInviting(true)} className="btn-primary">
          <UserPlus size={16} />
          Invita persona
        </button>
      </div>

      {admins.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Crown size={14} /> Amministratori
          </h2>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {admins.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                isMe={u.id === meId}
                linkFor={linkFor}
                onCopy={(url) => setShareLink({ user: u, url })}
                onRotate={() => rotate(u.id)}
                onResend={() => resend(u.id)}
                onDelete={() => remove(u.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Collaboratori ({collaborators.length})</h2>
        {collaborators.length === 0 ? (
          <div className="card p-12 text-center">
            <UserPlus className="mx-auto mb-4 text-slate-400" size={36} />
            <p className="text-sm text-slate-500 mb-4">Nessun collaboratore. Invitane uno per iniziare.</p>
            <button onClick={() => setInviting(true)} className="btn-primary">
              <UserPlus size={16} />
              Invita persona
            </button>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {collaborators.map((u) => (
              <PersonRow
                key={u.id}
                user={u}
                isMe={u.id === meId}
                linkFor={linkFor}
                onCopy={(url) => setShareLink({ user: u, url })}
                onRotate={() => rotate(u.id)}
                onResend={() => resend(u.id)}
                onDelete={() => remove(u.id)}
              />
            ))}
          </div>
        )}
      </div>

      {inviting && (
        <InviteDialog
          appUrl={appUrl}
          onClose={() => setInviting(false)}
          onInvited={(loginUrl, user) => {
            setInviting(false);
            setShareLink({ user, url: loginUrl });
            router.refresh();
          }}
        />
      )}

      {shareLink && (
        <ShareLinkDialog user={shareLink.user} url={shareLink.url} onClose={() => setShareLink(null)} />
      )}
    </div>
  );
}

function PersonRow({
  user,
  isMe,
  linkFor,
  onCopy,
  onRotate,
  onResend,
  onDelete,
}: {
  user: Person;
  isMe: boolean;
  linkFor: (token: string) => string;
  onCopy: (url: string) => void;
  onRotate: () => void;
  onResend: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Avatar name={user.name} color={user.color} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{user.name}</span>
          {isMe && <span className="chip bg-slate-100 text-slate-600 border-slate-200 text-[10px]">Tu</span>}
          {user.role === "ADMIN" && (
            <span className="chip bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
              <Crown size={10} /> Admin
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 truncate">{user.email}</div>
      </div>
      <span className="hidden sm:inline-flex chip bg-slate-50 text-slate-600 border-slate-200 text-[10px]">
        {user.openTasks} {user.openTasks === 1 ? "task" : "task"}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onCopy(linkFor(user.token))} className="btn-ghost p-2" title="Mostra link di accesso">
          <LinkIcon size={15} />
        </button>
        <button onClick={onResend} className="btn-ghost p-2" title="Re-invia email di benvenuto">
          <Mail size={15} />
        </button>
        <button onClick={onRotate} className="btn-ghost p-2" title="Rigenera link">
          <RefreshCw size={15} />
        </button>
        {!isMe && (
          <button onClick={onDelete} className="btn-ghost p-2 text-red-600 hover:bg-red-50" title="Elimina">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function InviteDialog({
  appUrl,
  onClose,
  onInvited,
}: {
  appUrl: string;
  onClose: () => void;
  onInvited: (loginUrl: string, user: Person) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "COLLABORATOR">("COLLABORATOR");
  const [sendInvite, setSendInvite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, sendInvite }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt.includes("email_taken") ? "Email già in uso" : txt);
      }
      const { user, loginUrl } = await res.json();
      onInvited(loginUrl, { ...user, openTasks: 0 });
    } catch (err) {
      setError(String((err as Error).message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Invita una persona" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nome e cognome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mario Rossi" required autoFocus />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mario@esempio.it"
            required
          />
        </div>
        <div>
          <label className="label">Ruolo</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("COLLABORATOR")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                role === "COLLABORATOR" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="font-semibold text-sm">Collaboratore</div>
              <div className="text-xs text-slate-500 mt-0.5">Vede solo le proprie task</div>
            </button>
            <button
              type="button"
              onClick={() => setRole("ADMIN")}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                role === "ADMIN" ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="font-semibold text-sm flex items-center gap-1">
                <Crown size={12} /> Admin
              </div>
              <div className="text-xs text-slate-500 mt-0.5">Gestisce progetti e persone</div>
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={sendInvite}
            onChange={(e) => setSendInvite(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Invia email di benvenuto con il link di accesso
            {!process.env.NEXT_PUBLIC_APP_URL && (
              <span className="block text-xs text-amber-600 mt-1">
                Se RESEND_API_KEY non è configurata, l'email non parte ma puoi copiare il link manualmente.
              </span>
            )}
          </span>
        </label>

        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
            Annulla
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim() || !email}>
            {saving ? "Invito..." : "Invita"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ShareLinkDialog({ user, url, onClose }: { user: Person; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Modal title="Link di accesso" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <Avatar name={user.name} color={user.color} size="md" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{user.name}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Condividi questo link con <strong>{user.name}</strong>: chi possiede il link accede direttamente all'area personale, senza password.
        </p>
        <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white">
          <code className="text-xs flex-1 truncate font-mono text-slate-700">{url}</code>
          <button onClick={copy} className="btn-secondary text-xs px-3 py-1.5">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copiato" : "Copia"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          ⚠️ Il link è equivalente a una password. Conservalo in modo sicuro. Se viene compromesso, rigeneralo dalla pagina Persone.
        </p>
        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-primary">
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  );
}
