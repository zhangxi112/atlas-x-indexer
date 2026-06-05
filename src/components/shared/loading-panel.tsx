import { LoaderCircle } from "lucide-react";

export function LoadingPanel({ message = "\u6b63\u5728\u52a0\u8f7d\u6570\u636e..." }: { message?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/70">
      <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}