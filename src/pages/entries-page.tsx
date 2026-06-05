import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, LayoutGrid, List, PlusCircle, Tags, Upload } from "lucide-react";
import {
  bulkAddTags,
  bulkUpdateStatus,
  deleteEntries,
  deleteSavedFilter,
  getAppSettings,
  listEntries,
  listRecentSearches,
  listSavedFilters,
  recordExportLog,
  saveFilter,
} from "@/services/api";
import { exportEntriesFile } from "@/services/import-export";
import { Badge } from "@/components/shared/badge";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/shared/input";
import { LoadingPanel } from "@/components/shared/loading-panel";
import { EntryCardGrid } from "@/components/entries/entry-card-grid";
import { EntryFiltersPanel } from "@/components/entries/entry-filters";
import { EntryTable } from "@/components/entries/entry-table";
import { useEntryFilterStore } from "@/stores/filter-store";
import { useNoticeStore } from "@/stores/notice-store";
import type { EntryFilters, EntryListResponse, RecentSearchRecord, SavedFilterRecord } from "@/types/models";

function parseSavedFilter(record: SavedFilterRecord) {
  return JSON.parse(record.filterJson) as EntryFilters;
}

export function EntriesPage() {
  const { filters, setFilters, resetFilters } = useEntryFilterStore();
  const [data, setData] = useState<EntryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilterRecord[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchRecord[]>([]);
  const [bulkTag, setBulkTag] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [exportDirectory, setExportDirectory] = useState("");
  const showNotice = useNoticeStore((state) => state.show);

  async function load() {
    setLoading(true);
    try {
      const [entries, filtersData, searchesData, settings] = await Promise.all([
        listEntries(filters),
        listSavedFilters(),
        listRecentSearches(),
        getAppSettings(),
      ]);
      setData(entries);
      setSavedFilters(filtersData);
      setRecentSearches(searchesData);
      setExportDirectory(settings.exportDirectory ?? "");
      setSelectedIds((prev) => prev.filter((id) => entries.items.some((item) => item.id === id)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [
    filters.page,
    filters.pageSize,
    filters.query,
    filters.projectName,
    filters.status,
    filters.tags,
    filters.dateFrom,
    filters.dateTo,
    filters.favoritesOnly,
    filters.sortBy,
    filters.sortOrder,
    filters.sourceType,
  ]);

  async function handleDelete(ids: number[]) {
    if (!window.confirm(`确认删除 ${ids.length} 条记录吗？此操作不可撤销。`)) return;
    await deleteEntries(ids);
    showNotice({ type: "success", message: `已删除 ${ids.length} 条记录` });
    setSelectedIds([]);
    await load();
  }

  async function handleExport(format: "csv" | "xlsx" | "json", ids?: number[]) {
    if (!data?.items.length) return;
    const exportItems = ids?.length
      ? data.items.filter((item) => ids.includes(item.id))
      : (await listEntries({ ...filters, page: 1, pageSize: 5000 })).items;
    const savedPath = await exportEntriesFile(exportItems, format, exportDirectory);
    if (!savedPath) return;
    await recordExportLog({
      fileName: savedPath.split(/[/\\]/).pop() ?? savedPath,
      fileType: format,
      rows: exportItems.length,
      targetPath: savedPath,
    });
    showNotice({ type: "success", message: `导出完成：${savedPath}` });
  }

  async function handleSaveFilter() {
    const name = window.prompt("请输入筛选器名称", filters.query ? `关键词：${filters.query}` : "我的筛选器");
    if (!name?.trim()) return;
    await saveFilter(name.trim(), filters);
    showNotice({ type: "success", message: `已保存筛选器：${name}` });
    await load();
  }

  async function handleBulkAddTag() {
    const tags = bulkTag
      .split(/[;,，]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!selectedIds.length || !tags.length) return;
    await bulkAddTags(selectedIds, tags);
    showNotice({ type: "success", message: `已为 ${selectedIds.length} 条记录追加标签` });
    setBulkTag("");
    await load();
  }

  async function handleBulkStatus() {
    if (!selectedIds.length || !bulkStatus) return;
    await bulkUpdateStatus(selectedIds, bulkStatus);
    showNotice({ type: "success", message: `已更新 ${selectedIds.length} 条记录的状态` });
    setBulkStatus("");
    await load();
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? data?.items.map((item) => item.id) ?? [] : []);
  }

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">索引列表</h2>
          <p className="mt-1 text-sm text-muted-foreground">支持分页、组合筛选、批量操作、快速导出，优先保证 1 万条规模下的日常维护效率。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExport("csv")}>导出 CSV</Button>
          <Button variant="outline" onClick={() => handleExport("xlsx")}>导出 Excel</Button>
          <Link to="/import-export">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              导入导出
            </Button>
          </Link>
          <Link to="/entries/new">
            <Button className="gap-2">
              <PlusCircle className="h-4 w-4" />
              新增条目
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <EntryFiltersPanel
          filters={filters}
          tags={data?.availableTags ?? []}
          projects={data?.availableProjects ?? []}
          statuses={data?.statuses ?? []}
          sourceTypes={data?.sourceTypes ?? []}
          onChange={setFilters}
          onReset={resetFilters}
        />
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">搜索与筛选</h3>
            <Button variant="outline" className="gap-2" onClick={handleSaveFilter}>
              <BookmarkPlus className="h-4 w-4" />
              保存当前筛选
            </Button>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">最近搜索</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 6).map((item) => (
                <button key={item.id} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary" onClick={() => setFilters({ query: item.query, page: 1 })}>
                  {item.query}
                </button>
              ))}
              {!recentSearches.length ? <span className="text-sm text-muted-foreground">还没有最近搜索记录</span> : null}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">已保存筛选器</p>
            <div className="space-y-2">
              {savedFilters.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/60 px-3 py-2">
                  <button className="flex-1 text-left text-sm hover:text-primary" onClick={() => setFilters({ ...parseSavedFilter(item), page: 1 })}>
                    {item.name}
                  </button>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-destructive"
                    onClick={async () => {
                      await deleteSavedFilter(item.id);
                      showNotice({ type: "success", message: `已删除筛选器：${item.name}` });
                      await load();
                    }}
                  >
                    删除
                  </Button>
                </div>
              ))}
              {!savedFilters.length ? <span className="text-sm text-muted-foreground">还没有保存的筛选器</span> : null}
            </div>
          </div>
        </Card>
      </div>

      {selectedIds.length > 0 ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-primary/10 text-primary">已选 {selectedIds.length} 条</Badge>
            <Input className="max-w-xs" value={bulkTag} onChange={(event) => setBulkTag(event.target.value)} placeholder="批量追加标签，支持逗号分隔" />
            <Button variant="outline" className="gap-2" onClick={handleBulkAddTag}>
              <Tags className="h-4 w-4" />
              批量加标签
            </Button>
            <select className="h-10 rounded-xl border bg-background px-3 text-sm" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
              <option value="">选择目标状态</option>
              {(data?.statuses ?? []).map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <Button variant="outline" onClick={handleBulkStatus}>应用状态</Button>
            <Button variant="outline" onClick={() => handleExport("xlsx", selectedIds)}>导出选中项</Button>
            <Button variant="destructive" onClick={() => handleDelete(selectedIds)}>批量删除</Button>
          </div>
        </Card>
      ) : null}

      <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3">
        <p className="text-sm text-muted-foreground">共 {data?.total ?? 0} 条记录</p>
        <div className="flex gap-2">
          <Button variant={filters.viewMode === "table" ? "primary" : "outline"} className="h-9 px-3" onClick={() => setFilters({ viewMode: "table" })}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={filters.viewMode === "card" ? "primary" : "outline"} className="h-9 px-3" onClick={() => setFilters({ viewMode: "card" })}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? <LoadingPanel message="正在查询索引数据..." /> : null}

      {!loading && data && data.items.length === 0 ? (
        <EmptyState
          title="没有匹配的索引"
          description="试试调整关键词或筛选条件，或者直接新增第一条索引记录。"
          action={<Link to="/entries/new"><Button>新增条目</Button></Link>}
        />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        filters.viewMode === "table" ? (
          <EntryTable items={data.items} selectedIds={selectedIds} onToggle={toggleSelect} onToggleAll={toggleSelectAll} onDelete={handleDelete} />
        ) : (
          <EntryCardGrid items={data.items} selectedIds={selectedIds} onToggle={toggleSelect} onDelete={handleDelete} />
        )
      ) : null}

      <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm">
        <p className="text-muted-foreground">第 {data?.page ?? 1} / {totalPages} 页</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={(data?.page ?? 1) <= 1} onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}>上一页</Button>
          <Button variant="outline" disabled={(data?.page ?? 1) >= totalPages} onClick={() => setFilters({ page: Math.min(totalPages, filters.page + 1) })}>下一页</Button>
        </div>
      </div>
    </div>
  );
}
