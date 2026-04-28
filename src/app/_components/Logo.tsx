import Image from 'next/image';

// Approximate aspect ratio of the .exd logo asset (8244 × 3411 ≈ 2.42:1).
const LOGO_ASPECT = 2.418;

export function Logo({
  size = 'md',
  showSubmark = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  showSubmark?: boolean;
}) {
  const height = size === 'lg' ? 36 : size === 'sm' ? 18 : 24;
  const width = Math.round(height * LOGO_ASPECT);
  const submarkSize =
    size === 'lg' ? 'text-xs' : size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span className="inline-flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="exd"
        width={width}
        height={height}
        priority
        className="h-auto w-auto"
        style={{ height, width }}
      />
      {showSubmark && (
        <span
          className={`text-ink-400 font-normal uppercase tracking-[0.2em] ${submarkSize}`}
        >
          PM
        </span>
      )}
    </span>
  );
}

// Solid teal dot — used for small UI accents (status indicators, etc.)
// when you want the brand color without the full logo.
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
