import { cn, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("chip", STATUS_COLORS[status], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {STATUS_LABELS[status]}
    </span>
  );
}
