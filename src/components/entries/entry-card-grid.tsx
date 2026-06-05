import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { EntryListItem } from "@/types/models";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { displayTag, displayText, formatDate } from "@/lib/utils";

const TEXT = {
  missing: "待补全",
  keywords: "关键问题 / 关键词",
  project: "项目名称",
  date: "日期",
  source: "来源",
  notes: "备注",
  normal: "常规",
  key: "重点",
  missingTags: "待补全标签",
  open: "打开链接",
  edit: "编辑",
};

function fallback(value?: string | null) {
  return displayText(value, TEXT.missing);
}

function TagBadges({ tags }: { tags: string[] }) {
  const normalized = tags.map(displayTag).filter(Boolean);
  if (!normalized.length) return <Badge>{TEXT.missingTags}</Badge>;
  return <>{normalized.map((tag) => <Badge key={tag}>{tag}</Badge>)}</>;
}

export function EntryCardGrid({ items, selectedIds, onToggle, onDelete }: {
  items: EntryListItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onDelete: (ids: number[]) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {items.map((item) => {
        const status = fallback(item.status) === TEXT.missing ? TEXT.normal : fallback(item.status);
        return (
          <Card key={item.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3"><input className="mt-1" type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} /><div><p className="font-mono text-xs text-muted-foreground">{fallback(item.customId)}</p><Link to={`/entries/${item.id}`} className="mt-1 block font-display text-lg font-semibold hover:text-primary">{fallback(item.title)}</Link></div></div>
              <Badge className={status === TEXT.key ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"}>{status}</Badge>
            </div>
            <p className="line-clamp-4 text-sm text-muted-foreground">{fallback(item.summary)}</p>
            <div className="rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground"><p>{TEXT.keywords}</p><p className="mt-1 text-foreground">{fallback(item.topic)}</p></div>
            <div className="flex flex-wrap gap-2"><TagBadges tags={item.tags} /></div>
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary/50 p-3 text-xs text-muted-foreground"><div><p>{TEXT.project}</p><p className="mt-1 text-foreground">{fallback(item.projectName)}</p></div><div><p>{TEXT.date}</p><p className="mt-1 text-foreground">{formatDate(item.conversationDate)}</p></div><div><p>{TEXT.source}</p><p className="mt-1 text-foreground">{displayText(item.sourceType, "manual")}</p></div><div><p>{TEXT.notes}</p><p className="mt-1 line-clamp-2 text-foreground">{fallback(item.notes)}</p></div></div>
            <div className="flex gap-2"><Button type="button" className="flex-1 gap-2" onClick={() => openUrl(item.url)}><ExternalLink className="h-4 w-4" />{TEXT.open}</Button><Link className="flex-1" to={`/entries/${item.id}/edit`}><Button type="button" variant="outline" className="w-full gap-2"><Pencil className="h-4 w-4" />{TEXT.edit}</Button></Link><Button type="button" variant="ghost" className="px-3 text-destructive" onClick={() => onDelete([item.id])}><Trash2 className="h-4 w-4" /></Button></div>
          </Card>
        );
      })}
    </div>
  );
}
