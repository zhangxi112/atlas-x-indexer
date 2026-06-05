import type { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/80 bg-card/90 p-5 shadow-soft backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
