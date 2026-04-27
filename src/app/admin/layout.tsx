import { requireAdmin } from '@/lib/auth';
import { TopNav } from './_components/TopNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-32 h-[60vh] blob-soft" aria-hidden />
      <TopNav adminName={admin.name} />
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
