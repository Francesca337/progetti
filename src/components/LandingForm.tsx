"use client";

import { useState, useTransition } from "react";
import { CheckSquare, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

type Props = {
  setupNeeded: boolean;
  exchangeToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
};

export function LandingForm({ setupNeeded, exchangeToken }: Props) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await exchangeToken(token.trim());
      if (!res.ok) {
        setError(res.error || "Token non valido");
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <CheckSquare size={20} strokeWidth={2.5} />
          </div>
          <div className="font-bold text-xl tracking-tight">Progetti</div>
        </div>

        {setupNeeded ? (
          <SetupCard />
        ) : (
          <div className="card p-8 animate-slide-up">
            <h1 className="text-2xl font-bold mb-2">Accedi alla tua area</h1>
            <p className="text-sm text-slate-600 mb-6">
              Incolla qui sotto il tuo link di accesso o solo il codice token.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Token di accesso</label>
                <input
                  type="text"
                  className="input font-mono text-xs"
                  placeholder="es. https://...?t=ABC123 o solo ABC123"
                  value={token}
                  onChange={(e) => {
                    const v = e.target.value;
                    const match = v.match(/[?&]t=([A-Za-z0-9]+)/);
                    setToken(match ? match[1] : v);
                  }}
                  autoFocus
                  required
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="btn-primary w-full" disabled={isPending || !token}>
                {isPending ? "Verifica..." : "Entra"}
                <ArrowRight size={16} />
              </button>
            </form>

            <p className="text-xs text-slate-500 mt-6 leading-relaxed">
              Il link di accesso ti viene fornito via email quando vieni invitato. Conservalo in modo sicuro.
            </p>
          </div>
        )}

        <div className="text-center text-xs text-slate-400 mt-8">
          <Sparkles size={12} className="inline mr-1" />
          Progetti — gestione task per project manager
        </div>
      </div>
    </div>
  );
}

function SetupCard() {
  return (
    <div className="card p-8 animate-slide-up">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
        <Sparkles size={12} />
        Primo avvio
      </div>
      <h1 className="text-2xl font-bold mb-2">Crea il tuo account admin</h1>
      <p className="text-sm text-slate-600 mb-6">
        Non c'è ancora un amministratore. Vai su <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">/setup</code> usando
        il valore di <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">ADMIN_SETUP_TOKEN</code> per registrarti come project manager.
      </p>
      <a href="/setup" className="btn-primary w-full">
        Vai al setup
        <ArrowRight size={16} />
      </a>
    </div>
  );
}
