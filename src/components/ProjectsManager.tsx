"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderKanban, Archive, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { AvatarStack } from "./Avatar";
import { ProjectDialog } from "./ProjectDialog";
import { cn, PALETTE } from "@/lib/utils";

type Member = { id: string; name: string; color: string };
type Project = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archived: boolean;
  members: Member[];
  totalTasks: number;
  doneTasks: number;
};

export function ProjectsManager({
  initialProjects,
  collaborators,
}: {
  initialProjects: Project[];
  collaborators: Member[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const active = initialProjects.filter((p) => !p.archived);
  const archived = initialProjects.filter((p) => p.archived);

  const archive = async (id: string, archived: boolean) => {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Eliminare il progetto e tutte le sue task?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="px-5 lg:px-10 py-8 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Progetti</h1>
          <p className="text-slate-600 mt-1">Crea e gestisci i tuoi progetti.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={16} />
          Nuovo progetto
        </button>
      </div>

      {active.length === 0 && archived.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="mx-auto mb-4 text-slate-400" size={40} />
          <h2 className="font-bold text-lg mb-1">Nessun progetto ancora</h2>
          <p className="text-sm text-slate-500 mb-4">Crea il tuo primo progetto per iniziare ad assegnare task.</p>
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus size={16} />
            Nuovo progetto
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onEdit={() => setEditing(p)}
                onArchive={() => archive(p.id, true)}
                onDelete={() => remove(p.id)}
                menuOpen={menuOpenId === p.id}
                setMenuOpen={(o) => setMenuOpenId(o ? p.id : null)}
              />
            ))}
          </div>

          {archived.length > 0 && (
            <details className="mt-10">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-2">
                <Archive size={14} />
                Archiviati ({archived.length})
              </summary>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 opacity-70">
                {archived.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onEdit={() => setEditing(p)}
                    onArchive={() => archive(p.id, false)}
                    onDelete={() => remove(p.id)}
                    menuOpen={menuOpenId === p.id}
                    setMenuOpen={(o) => setMenuOpenId(o ? p.id : null)}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {creating && (
        <ProjectDialog
          collaborators={collaborators}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <ProjectDialog
          project={editing}
          collaborators={collaborators}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onArchive,
  onDelete,
  menuOpen,
  setMenuOpen,
}: {
  project: Project;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  menuOpen: boolean;
  setMenuOpen: (o: boolean) => void;
}) {
  const progress = project.totalTasks === 0 ? 0 : Math.round((project.doneTasks / project.totalTasks) * 100);
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow group relative">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Link href={`/app/projects/${project.id}`} className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${project.color}20`, color: project.color }}
          >
            <FolderKanban size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold truncate group-hover:text-indigo-600 transition-colors">{project.name}</h3>
            {project.description && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{project.description}</p>}
          </div>
        </Link>
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              setMenuOpen(!menuOpen);
            }}
            className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Azioni"
          >
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 card p-1 z-20 shadow-card-hover">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100"
                >
                  <Edit3 size={14} />
                  Modifica
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-slate-100"
                >
                  <Archive size={14} />
                  {project.archived ? "Ripristina" : "Archivia"}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 text-red-600"
                >
                  <Trash2 size={14} />
                  Elimina
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Link href={`/app/projects/${project.id}`} className="block">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500">
            {project.doneTasks}/{project.totalTasks} task
          </span>
          <span className="font-semibold text-slate-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: project.color }}
          />
        </div>
        <div className="flex items-center justify-between">
          {project.members.length > 0 ? (
            <AvatarStack users={project.members} size="sm" />
          ) : (
            <span className="text-xs text-slate-400">Nessun membro</span>
          )}
          <span className={cn("chip", "bg-slate-50 text-slate-600 border-slate-200")}>Apri →</span>
        </div>
      </Link>
    </div>
  );
}
