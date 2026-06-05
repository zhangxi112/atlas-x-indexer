import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { EntryListItem } from "@/types/models";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { displayTag, displayText, formatDate } from "@/lib/utils";

const TEXT = {
  missing: "待补全",
  id: "编号",
  titleSummary: "主题 / 标题 / 简要说明",
  keywords: "关键问题 / 关键词",
  url: "对话链接",
  date: "日期",
  tags: "标签",
  notes: "备注",
  source: "来源",
  status: "状态",
  project: "项目名称",
  actions: "操作",
  normal: "常规",
  key: "重点",
  open: "打开链接",
  edit: "编辑",
  delete: "删除",
};

function EmptyText({ value }: { value?: string | null }) {
  const text = displayText(value, TEXT.missing);
  return text === TEXT.missing ? <span className="text-muted-foreground">{text}</span> : <>{text}</>;
}

function renderTags(tags: string[]) {
  const normalized = tags.map(displayTag).filter(Boolean).slice(0, 6);
  if (!normalized.length) return <span className="text-xs text-muted-foreground">{TEXT.missing}</span>;
  return normalized.map((tag) => <Badge key={tag}>{tag}</Badge>);
}

export function EntryTable({ items, selectedIds, onToggle, onToggleAll, onDelete }: {
  items: EntryListItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  onDelete: (ids: number[]) => void;
}) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  return (
    <div className="overflow-hidden rounded-3xl border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-[1180px] divide-y divide-border text-sm">
          <thead className="bg-secondary/60 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium"><input type="checkbox" checked={allSelected} onChange={(event) => onToggleAll(event.target.checked)} /></th>
              <th className="px-4 py-3 font-medium">{TEXT.id}</th>
              <th className="px-4 py-3 font-medium">{TEXT.titleSummary}</th>
              <th className="px-4 py-3 font-medium">{TEXT.keywords}</th>
              <th className="px-4 py-3 font-medium">{TEXT.url}</th>
              <th className="px-4 py-3 font-medium">{TEXT.date}</th>
              <th className="px-4 py-3 font-medium">{TEXT.tags}</th>
              <th className="px-4 py-3 font-medium">{TEXT.notes}</th>
              <th className="px-4 py-3 font-medium">{TEXT.source}</th>
              <th className="px-4 py-3 font-medium">{TEXT.status}</th>
              <th className="px-4 py-3 font-medium">{TEXT.project}</th>
              <th className="px-4 py-3 font-medium text-right">{TEXT.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 bg-card/50">
            {items.map((item) => {
              const status = displayText(item.status, TEXT.normal);
              const title = displayText(item.title, TEXT.missing);
              return (
                <tr key={item.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-4 align-top"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} /></td>
                  <td className="px-4 py-4 align-top font-mono text-xs text-muted-foreground">{displayText(item.customId, TEXT.missing)}</td>
                  <td className="max-w-[360px] px-4 py-4 align-top">
                    <Link to={`/entries/${item.id}`} className="font-medium text-foreground hover:text-primary">{title}</Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground"><EmptyText value={item.summary} /></p>
                  </td>
                  <td className="max-w-[180px] px-4 py-4 align-top text-muted-foreground"><EmptyText value={item.topic} /></td>
                  <td className="max-w-[210px] px-4 py-4 align-top"><button type="button" className="line-clamp-2 break-all text-left text-xs text-primary hover:underline" onClick={() => openUrl(item.url)}>{item.url}</button></td>
                  <td className="px-4 py-4 align-top text-muted-foreground">{formatDate(item.conversationDate)}</td>
                  <td className="max-w-[220px] px-4 py-4 align-top"><div className="flex flex-wrap gap-1.5">{renderTags(item.tags)}</div></td>
                  <td className="max-w-[180px] px-4 py-4 align-top text-xs text-muted-foreground"><EmptyText value={item.notes} /></td>
                  <td className="px-4 py-4 align-top text-muted-foreground">{displayText(item.sourceType, "manual")}</td>
                  <td className="px-4 py-4 align-top"><Badge className={status === TEXT.key ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"}>{status}</Badge></td>
                  <td className="max-w-[160px] px-4 py-4 align-top text-muted-foreground"><EmptyText value={item.projectName} /></td>
                  <td className="px-4 py-4 align-top"><div className="flex justify-end gap-2"><Button type="button" variant="ghost" className="h-9 px-3" title={TEXT.open} onClick={() => openUrl(item.url)}><ExternalLink className="h-4 w-4" /></Button><Link to={`/entries/${item.id}/edit`}><Button type="button" variant="ghost" className="h-9 px-3" title={TEXT.edit}><Pencil className="h-4 w-4" /></Button></Link><Button type="button" variant="ghost" className="h-9 px-3 text-destructive" title={TEXT.delete} onClick={() => onDelete([item.id])}><Trash2 className="h-4 w-4" /></Button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
