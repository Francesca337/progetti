import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function HomePage() {
  const session = await getCurrentUser();
  if (session?.role === 'ADMIN') redirect('/admin');

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">Project Manager</h1>
        <p className="text-slate-600 mb-6">
          Accedi come admin per gestire progetti e collaboratori, oppure usa il tuo link personale per
          vedere le tue task.
        </p>
        <Link href="/login" className="btn-primary w-full">
          Accesso admin
        </Link>
        <p className="mt-6 text-xs text-slate-500">
          Sei un collaboratore? Apri il link personale che ti è stato inviato via email.
        </p>
      </div>
    </main>
  );
}
