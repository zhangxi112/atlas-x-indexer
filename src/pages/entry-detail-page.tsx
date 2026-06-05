import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowLeft, ExternalLink, Pencil, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { deleteEntries, getEntryById, trackRecentAccess } from "@/services/api";
import type { EntryRecord } from "@/types/models";
import { formatDate } from "@/lib/utils";
import { useNoticeStore } from "@/stores/notice-store";

function DetailBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-2 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function EntryDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const showNotice = useNoticeStore((state) => state.show);
  const [entry, setEntry] = useState<EntryRecord | null>(null);

  useEffect(() => {
    if (!params.id) return;
    void (async () => {
      const data = await getEntryById(Number(params.id));
      setEntry(data);
      await trackRecentAccess(data.id);
    })();
  }, [params.id]);

  async function handleDelete() {
    if (!entry) return;
    if (!window.confirm(`确认删除 ${entry.title} 吗？`)) return;
    await deleteEntries([entry.id]);
    showNotice({ type: "success", message: "索引已删除" });
    navigate("/entries");
  }

  async function handleCopy() {
    if (!entry) return;
    await navigator.clipboard.writeText(entry.url);
    showNotice({ type: "success", message: "链接已复制" });
  }

  if (!entry) {
    return <LoadingPanel message="正在加载详情..." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleCopy}>
            复制链接
          </Button>
          <Button className="gap-2" onClick={() => openUrl(entry.url)}>
            <ExternalLink className="h-4 w-4" />
            打开原始链接
          </Button>
          <Link to={`/entries/${entry.id}/edit`}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              编辑
            </Button>
          </Link>
          <Button variant="ghost" className="gap-2 text-destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      <Card className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground">{entry.customId}</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{entry.title}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-muted-foreground">{entry.summary}</p>
          </div>
          {entry.favorite ? <Star className="h-6 w-6 fill-amber-400 text-amber-400" /> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag) => (
            <Badge key={tag} className="bg-primary/10 text-primary">{tag}</Badge>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <DetailBlock label="来源类型" value={entry.sourceType} />
          <DetailBlock label="项目" value={entry.projectName ?? "未指定"} />
          <DetailBlock label="主题" value={entry.topic ?? "未指定"} />
          <DetailBlock label="状态" value={entry.status} />
          <DetailBlock label="对话日期" value={formatDate(entry.conversationDate)} />
          <DetailBlock label="链接" value={<span className="break-all">{entry.url}</span>} />
          <DetailBlock label="创建时间" value={formatDate(entry.createdAt)} />
          <DetailBlock label="更新时间" value={formatDate(entry.updatedAt)} />
          <DetailBlock label="修改历史预留" value="已预留 entry_history 表和接口位置，后续可接审计记录。" />
        </div>

        <DetailBlock label="备注" value={entry.notes || "暂无备注"} />
      </Card>
    </div>
  );
}
