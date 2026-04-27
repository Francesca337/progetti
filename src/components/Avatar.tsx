import { cn, getInitials } from "@/lib/utils";

type Props = {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-9 h-9 text-xs",
  lg: "w-12 h-12 text-sm",
};

export function Avatar({ name, color = "#6366f1", size = "sm", className }: Props) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white flex-shrink-0",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

export function AvatarStack({
  users,
  max = 3,
  size = "sm",
}: {
  users: { id: string; name: string; color: string }[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = users.slice(0, max);
  const extra = users.length - visible.length;
  const overlap = size === "xs" ? "-ml-1.5" : "-ml-2";
  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <Avatar
          key={u.id}
          name={u.name}
          color={u.color}
          size={size}
          className={cn(i > 0 && overlap, "ring-2 ring-white dark:ring-zinc-900")}
        />
      ))}
      {extra > 0 && (
        <div
          className={cn(
            SIZES[size === "md" ? "md" : "sm"],
            overlap,
            "rounded-full bg-slate-100 text-slate-600 ring-2 ring-white flex items-center justify-center font-semibold dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-900",
          )}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
