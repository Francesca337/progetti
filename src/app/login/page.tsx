import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  authenticateAdmin,
  createAdminSession,
  getAdminUser,
} from '@/lib/auth';
import { Logo } from '../_components/Logo';

async function login(formData: FormData): Promise<void> {
  'use server';
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const admin = await authenticateAdmin(email, password);
  if (!admin) {
    redirect('/login?error=1');
  }
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
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[80vh] blob-soft" aria-hidden />

      <header className="relative z-10 px-6 pt-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex items-center justify-center px-6 py-20">
        <form action={login} className="card w-full max-w-md p-10 space-y-6">
          <div>
            <p className="eyebrow mb-3">Accesso</p>
            <h1 className="display text-3xl">
              Welcome <span className="serif-italic">back.</span>
            </h1>
            <p className="text-sm text-ink-500 mt-2">Inserisci le credenziali admin.</p>
          </div>

          {error && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              Credenziali non valide.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="input" autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">
            Accedi
          </button>
        </form>
      </div>
    </main>
  );
}
