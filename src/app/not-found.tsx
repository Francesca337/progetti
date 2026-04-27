import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <h1 className="text-xl font-semibold">Pagina non trovata</h1>
        <p className="text-slate-600 mt-2">
          Il link che stai usando non è valido o è stato rigenerato.
        </p>
        <Link href="/" className="btn-secondary mt-6 inline-flex">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
