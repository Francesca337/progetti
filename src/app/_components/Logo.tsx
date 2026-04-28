export function Logo({ size = 'md', showSubmark = true }: { size?: 'sm' | 'md' | 'lg'; showSubmark?: boolean }) {
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  const dot = size === 'lg' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';

  return (
    <span className={`logo ${text} inline-flex items-center gap-1.5`}>
      <span
        className={`${dot} rounded-full bg-teal-400 inline-block shrink-0`}
        aria-hidden
      />
      <span className="leading-none">
        ex<span className="text-brand">d</span>
      </span>
      {showSubmark && (
        <span className="ml-2 text-ink-400 font-normal text-[0.7em] uppercase tracking-[0.2em]">
          PM
        </span>
      )}
    </span>
  );
}
