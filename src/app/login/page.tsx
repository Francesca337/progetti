import { redirect } from 'next/navigation';
import {
  createAdminSession,
  ensureAdminUser,
  getAdminUser,
  verifyAdminCredentials,
} from '@/lib/auth';

async function login(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const ok = await verifyAdminCredentials(email, password);
  if (!ok) {
    redirect('/login?error=1');
  }
  const admin = await ensureAdminUser();
  await createAdminSession(admin.id);
  redirect('/admin');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const existing = await getAdminUser();
  if (existing) redirect('/admin');
  const params = await searchParams;
  const error = params.error === '1';

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form action={login} className="card max-w-sm w-full p-8 space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Accesso admin</h1>
          <p className="text-sm text-slate-600">Inserisci le tue credenziali.</p>
        </div>
        {error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Credenziali non valide.
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          Accedi
        </button>
      </form>
    </main>
  );
}
