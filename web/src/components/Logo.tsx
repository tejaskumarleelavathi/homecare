import { cn } from "@/lib/utils";

const SIZES = {
  sm: { icon: "size-8", wordmark: "text-base", tagline: "text-[9px]", gap: "gap-2" },
  md: { icon: "size-11", wordmark: "text-2xl", tagline: "text-xs", gap: "gap-3" },
  lg: { icon: "size-14", wordmark: "text-3xl", tagline: "text-sm", gap: "gap-3" },
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  showTagline?: boolean;
  className?: string;
}

export function Logo({ size = "md", showTagline = true, className }: LogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <svg viewBox="0 0 40 40" className={cn(s.icon, "shrink-0")} aria-hidden="true">
        <circle cx="15" cy="20" r="11" fill="none" stroke="#10b981" strokeWidth="3.5" />
        <circle cx="25" cy="20" r="11" fill="none" stroke="#1e293b" strokeWidth="3.5" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-tight text-foreground", s.wordmark)}>ABC</span>
        {showTagline && (
          <span className={cn("font-medium tracking-wide text-muted-foreground uppercase", s.tagline)}>
            Home Care
          </span>
        )}
      </div>
    </div>
  );
}
