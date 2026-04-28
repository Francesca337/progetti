import Link from 'next/link';
import { Logo } from './_components/Logo';

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-[60vh] blob-soft" aria-hidden />
      <header className="relative z-10 px-6 pt-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>
      <div className="relative z-10 flex flex-col items-center justify-center px-6 pt-32 text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="display text-5xl">
          Pagina <span className="serif-italic">non trovata.</span>
        </h1>
        <p className="text-ink-500 mt-4 max-w-md">
          Il link non è valido o è stato rigenerato.
        </p>
        <Link href="/" className="btn-secondary mt-8">
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
