export function Logo({
  size = 'md',
  showSubmark = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  showSubmark?: boolean;
}) {
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  const dotPx = size === 'lg' ? 18 : size === 'sm' ? 11 : 14;

  return (
    <span className={`logo ${text} inline-flex items-baseline gap-1.5`}>
      <BrandDot px={dotPx} />
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

// Hand-drawn brushstroke dot — irregular, slightly wider than tall,
// matching the .exd brand mark.
export function BrandDot({ px = 14, color = '#19A398' }: { px?: number; color?: string }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 36 32"
      className="shrink-0 self-center"
      aria-hidden
    >
      <path
        fill={color}
        d="M19.4 1.2
           C24.8 1.6 30.6 4.0 33.4 8.9
           C36.2 13.7 35.4 19.6 31.6 23.9
           C27.6 28.3 21.2 30.8 15.4 30.0
           C9.7 29.2 4.0 25.4 1.6 20.0
           C-0.7 14.7 0.7 8.0 5.0 4.4
           C8.6 1.4 13.6 0.5 18.0 1.0
           Z"
      />
    </svg>
  );
}
