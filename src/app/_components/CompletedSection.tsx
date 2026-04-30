// Collapsible CTA used to hide DONE tasks below an active list. Server
// component — relies on the native <details> element so it stays
// interactive without any extra JS.

export function CompletedSection({
  count,
  children,
  label = 'Vedi le task completate',
}: {
  count: number;
  children: React.ReactNode;
  label?: string;
}) {
  if (count === 0) return null;
  return (
    <details className="group pt-2">
      <summary className="cursor-pointer list-none inline-flex items-center gap-2 rounded-pill bg-cream-100 hover:bg-cream-200 text-ink-600 hover:text-ink-900 text-xs font-medium uppercase tracking-[0.18em] px-4 py-2.5 transition select-none">
        <span>
          {label} ({count})
        </span>
        <span className="transition-transform group-open:rotate-180" aria-hidden>
          ↓
        </span>
      </summary>
      <div className="mt-4 space-y-2">{children}</div>
    </details>
  );
}
