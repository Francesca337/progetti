export function Logo({
  size = 'md',
  showSubmark = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  showSubmark?: boolean;
}) {
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  const dotPx = size === 'lg' ? 14 : size === 'sm' ? 8 : 11;

  return (
    <span className={`logo ${text} inline-flex items-baseline gap-1.5`}>
      <BrandDot px={dotPx} className="self-center" />
      <span className="leading-none">
        ex<span className="text-brand">d</span>
      </span>
      {showSubmark && (
        <span className="ml-2 text-ink-400 font-normal text-[0.7em] uppercase tracking-[0.2em] self-center">
          PM
        </span>
      )}
    </span>
  );
}

// The .exd brand dot — a solid teal circle.
export function BrandDot({
  px = 11,
  color = '#19A398',
  className = '',
}: {
  px?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${className}`}
      style={{ width: px, height: px, backgroundColor: color }}
      aria-hidden
    />
  );
}
