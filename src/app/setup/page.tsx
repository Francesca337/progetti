import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { CheckSquare, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

async function createAdmin(formData: FormData) {
  "use server";

  const setupToken = String(formData.get("setupToken") || "");
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!setupToken || !name || !email) {
    return { error: "Tutti i campi sono obbligatori" };
  }

  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) {
    return { error: "ADMIN_SETUP_TOKEN non è configurato sul server" };
  }
  if (setupToken !== expected) {
    return { error: "Token di setup non valido" };
  }

  const existingAdmin = await prisma.user.count({ where: { role: "ADMIN" } });
  if (existingAdmin > 0) {
    return { error: "Un admin esiste già" };
  }

  const userToken = generateToken();
  const user = await prisma.user.create({
    data: { name, email, role: "ADMIN", token: userToken, color: "#0f172a" },
  });

  const store = await cookies();
  store.set("session_token", user.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  redirect("/app");
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });

  if (adminCount > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <h1 className="text-xl font-bold mb-2">Setup già completato</h1>
          <p className="text-sm text-slate-600 mb-4">
            Un amministratore esiste già. Usa il tuo link di accesso personale.
          </p>
          <a href="/" className="btn-primary">Torna alla home</a>
        </div>
      </div>
    );
  }

  async function action(formData: FormData) {
    "use server";
    const result = await createAdmin(formData);
    if (result?.error) {
      redirect(`/setup?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <CheckSquare size={20} strokeWidth={2.5} />
          </div>
          <div className="font-bold text-xl tracking-tight">Progetti</div>
        </div>

        <div className="card p-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-4">
            <Sparkles size={12} />
            Primo avvio
          </div>
          <h1 className="text-2xl font-bold mb-2">Crea il tuo account admin</h1>
          <p className="text-sm text-slate-600 mb-6">
            Inserisci il valore di <code className="px-1.5 py-0.5 rounded bg-slate-100 text-xs">ADMIN_SETUP_TOKEN</code> dalle variabili d'ambiente per autorizzare la creazione del primo amministratore.
          </p>

          <form action={action} className="space-y-4">
            <div>
              <label className="label">Token di setup</label>
              <input name="setupToken" type="password" className="input font-mono text-xs" required />
            </div>
            <div>
              <label className="label">Il tuo nome</label>
              <input name="name" type="text" className="input" placeholder="Mario Rossi" required />
            </div>
            <div>
              <label className="label">La tua email</label>
              <input name="email" type="email" className="input" placeholder="mario@esempio.it" required />
            </div>

            {sp.error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {sp.error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full">
              Crea account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
