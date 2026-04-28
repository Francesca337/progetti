import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Logo } from './_components/Logo';

export default async function HomePage() {
  const session = await getCurrentUser();
  if (session?.role === 'ADMIN') redirect('/admin');

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero gradient blob */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[80vh] blob" aria-hidden />

      <header className="relative z-10 px-6 pt-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Logo />
          <Link href="/login" className="btn-primary">
            Accedi
          </Link>
        </div>
      </header>

      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-32 pb-24 text-center">
        <p className="eyebrow mb-6">Project management</p>
        <h1 className="display text-5xl sm:text-6xl md:text-7xl text-ink-900 leading-[0.95]">
          Progetti con{' '}
          <span className="serif-italic text-ink-900">direzione.</span>
        </h1>
        <p className="mt-8 text-ink-600 text-lg max-w-xl mx-auto">
          Lo spazio dove progetti, task e collaboratori stanno insieme. Niente caos, niente
          riunioni inutili: solo le cose da fare, in ordine.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/login" className="btn-dark">
            Accesso admin
          </Link>
        </div>
        <p className="mt-12 text-xs text-ink-500">
          Sei un collaboratore? Usa il link personale che hai ricevuto via email.
        </p>
      </section>
    </main>
  );
}
