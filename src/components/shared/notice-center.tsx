import { useEffect } from "react";
import { CircleAlert, CircleCheckBig, Info, X } from "lucide-react";
import { useNoticeStore } from "@/stores/notice-store";
import { Button } from "@/components/shared/button";
import { cn } from "@/lib/utils";

const iconMap = {
  success: CircleCheckBig,
  error: CircleAlert,
  info: Info,
};

export function NoticeCenter() {
  const { notice, clear } = useNoticeStore();

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clear, 3200);
    return () => window.clearTimeout(timer);
  }, [notice, clear]);

  if (!notice) return null;

  const Icon = iconMap[notice.type];

  return (
    <div className="pointer-events-none fixed right-6 top-6 z-50">
      <div
        className={cn(
          "pointer-events-auto flex min-w-[280px] items-start gap-3 rounded-2xl border bg-card/95 p-4 shadow-panel backdrop-blur",
          notice.type === "error" ? "border-destructive/30" : "border-border",
        )}
      >
        <Icon className="mt-0.5 h-5 w-5 text-primary" />
        <p className="flex-1 text-sm text-foreground">{notice.message}</p>
        <Button variant="ghost" className="h-8 px-2" onClick={clear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
