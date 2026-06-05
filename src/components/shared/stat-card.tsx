import { Card } from "@/components/shared/card";

export function StatCard({ title, value, hint }: { title: string; value: string | number; hint: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-cyan-500 to-amber-500" />
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}
