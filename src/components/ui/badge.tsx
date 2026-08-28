import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Badge({
  className,
  tone = "muted",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "muted" | "accent" | "hemi-l" | "hemi-r" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-medium tracking-wide text-xs",
        tone === "muted" && "bg-surface-2 text-muted",
        tone === "accent" && "bg-accent/15 text-accent",
        tone === "hemi-l" && "bg-hemi-l/15 text-hemi-l",
        tone === "hemi-r" && "bg-hemi-r/15 text-hemi-r",
        tone === "warn" && "bg-warn/15 text-warn",
        className,
      )}
      {...props}
    />
  );
}
