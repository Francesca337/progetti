export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <span className={`logo ${cls} inline-flex items-baseline`}>
      <span className="logo-dot">.</span>
      <span>ex</span>
      <span className="logo-accent">d</span>
      <span className="ml-2 text-ink-400 font-normal text-[0.7em] uppercase tracking-[0.2em]">PM</span>
    </span>
  );
}
