import { ChevronDown, ChevronUp, Equal, Flame } from "lucide-react";
import { cn, PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/utils";

const ICONS = {
  LOW: ChevronDown,
  MEDIUM: Equal,
  HIGH: ChevronUp,
  URGENT: Flame,
};

export function PriorityIcon({ priority, withLabel = false, className }: { priority: string; withLabel?: boolean; className?: string }) {
  const Icon = ICONS[priority as keyof typeof ICONS] ?? Equal;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", PRIORITY_COLORS[priority], className)}
      title={`Priorità ${PRIORITY_LABELS[priority]}`}
    >
      <Icon size={14} strokeWidth={2.5} />
      {withLabel && <span>{PRIORITY_LABELS[priority]}</span>}
    </span>
  );
}
