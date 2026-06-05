import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { getDashboardOverview } from "@/services/api";
import type { DashboardOverview } from "@/types/models";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { StatCard } from "@/components/shared/stat-card";
import { displayTag, displayText, formatDate } from "@/lib/utils";

function fallback(value?: string | null) {
  return value?.trim() || "待补全";
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setData(await getDashboardOverview());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingPanel message="正在加载概览数据..." />;
  if (!data) return <LoadingPanel message="概览数据加载失败，请刷新后重试。" />;

  const pendingCount = data.recentEntries.filter((item) => !item.summary?.trim() || item.summary === "待补全" || !item.topic?.trim() || !item.tags.length).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">数据概览</h2>
          <p className="mt-2 text-sm text-muted-foreground">首页只保留必要指标：总量、最近新增、待补全提示和标签分布。详细维护进入索引列表。</p>
        </div>
        <Link to="/entries/new"><Button className="gap-2"><PlusCircle className="h-4 w-4" />新增条目</Button></Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <StatCard title="总条数" value={data.totalEntries} hint="本地 SQLite 存储，可搜索和导入导出。" />
        <StatCard title="待补全提示" value={pendingCount} hint="最近新增中缺少摘要、关键词或标签的记录。" />
        <StatCard title="标签数" value={data.tagStats.length} hint="只统计已有记录关联的标签。" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold">最近新增</h3>
            <Link to="/entries" className="text-sm text-primary">查看全部</Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentEntries.map((item) => (
              <Link key={item.id} to={`/entries/${item.id}`} className="block rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:border-primary/40 hover:bg-secondary/40">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{fallback(item.customId)} ? {fallback(item.projectName)} ? {fallback(item.topic)}</p>
                  </div>
                  <Badge>{item.status || "常规"}</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{fallback(item.summary)}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-display text-xl font-semibold">标签统计</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.tagStats.length ? data.tagStats.map((tag) => (
              <Badge key={tag.name} className="bg-primary/10 text-primary">
                <span>{displayTag(tag.name) || "???"}</span><span className="ml-1 rounded-full bg-primary/10 px-1.5 text-[11px]">{tag.count}</span>
              </Badge>
            )) : <span className="text-sm text-muted-foreground">暂无标签</span>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card><h3 className="font-display text-xl font-semibold">最近访问</h3><div className="mt-4 space-y-3 text-sm">{data.recentAccesses.map((item) => <Link key={`${item.entryId}-${item.accessedAt}`} to={`/entries/${item.entryId}`} className="block rounded-2xl bg-background/60 p-3 transition hover:bg-secondary/40"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.customId} ? {formatDate(item.accessedAt)}</p></Link>)}{!data.recentAccesses.length ? <p className="text-sm text-muted-foreground">暂无访问记录</p> : null}</div></Card>
        <Card><h3 className="font-display text-xl font-semibold">最近导入</h3><div className="mt-4 space-y-3 text-sm">{data.importLogs.map((item) => <div key={item.id} className="rounded-2xl bg-background/60 p-3"><p className="font-medium">{item.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{item.fileType.toUpperCase()} ? {item.rows} 行 ? {formatDate(item.createdAt)}</p></div>)}{!data.importLogs.length ? <p className="text-sm text-muted-foreground">暂无导入记录</p> : null}</div></Card>
        <Card><h3 className="font-display text-xl font-semibold">最近导出</h3><div className="mt-4 space-y-3 text-sm">{data.exportLogs.map((item) => <div key={item.id} className="rounded-2xl bg-background/60 p-3"><p className="font-medium">{item.fileName}</p><p className="mt-1 text-xs text-muted-foreground">{item.fileType.toUpperCase()} ? {item.rows} 行 ? {formatDate(item.createdAt)}</p></div>)}{!data.exportLogs.length ? <p className="text-sm text-muted-foreground">暂无导出记录</p> : null}</div></Card>
      </div>
    </div>
  );
}
