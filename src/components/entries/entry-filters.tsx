import { RotateCcw, Search } from "lucide-react";
import type { EntryFilters } from "@/types/models";
import { Button } from "@/components/shared/button";
import { Input } from "@/components/shared/input";
import { Select } from "@/components/shared/select";

export function EntryFiltersPanel({ filters, tags, projects, statuses, sourceTypes, onChange, onReset }: {
  filters: EntryFilters;
  tags: string[];
  projects: string[];
  statuses: string[];
  sourceTypes: string[];
  onChange: (next: Partial<EntryFilters>) => void;
  onReset: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-3xl border border-border bg-background/50 p-4 lg:grid-cols-12">
      <div className="lg:col-span-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="pl-10" placeholder="搜索标题、简要说明、关键词、标签、备注..." value={filters.query} onChange={(event) => onChange({ query: event.target.value, page: 1 })} /></div></div>
      <div className="lg:col-span-2"><Select value={filters.status ?? ""} onChange={(event) => onChange({ status: event.target.value || undefined, page: 1 })}><option value="">全部状态</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select></div>
      <div className="lg:col-span-2"><Select value={filters.sourceType ?? ""} onChange={(event) => onChange({ sourceType: event.target.value || undefined, page: 1 })}><option value="">全部来源</option>{sourceTypes.map((sourceType) => <option key={sourceType} value={sourceType}>{sourceType}</option>)}</Select></div>
      <div className="lg:col-span-2"><Select value={filters.projectName ?? ""} onChange={(event) => onChange({ projectName: event.target.value || undefined, page: 1 })}><option value="">全部项目</option>{projects.map((project) => <option key={project} value={project}>{project}</option>)}</Select></div>
      <div className="flex gap-2 lg:col-span-2"><Button variant="outline" className="flex-1 gap-2" onClick={onReset}><RotateCcw className="h-4 w-4" />重置</Button></div>
      <div className="lg:col-span-2"><Input type="date" value={filters.dateFrom ?? ""} onChange={(event) => onChange({ dateFrom: event.target.value || undefined, page: 1 })} /></div>
      <div className="lg:col-span-2"><Input type="date" value={filters.dateTo ?? ""} onChange={(event) => onChange({ dateTo: event.target.value || undefined, page: 1 })} /></div>
      <div className="lg:col-span-3"><Select value={filters.tags[0] ?? ""} onChange={(event) => onChange({ tags: event.target.value ? [event.target.value] : [], page: 1 })}><option value="">全部标签</option>{tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</Select></div>
      <div className="lg:col-span-2"><Select value={filters.sortBy} onChange={(event) => onChange({ sortBy: event.target.value as EntryFilters["sortBy"] })}><option value="updated_at">按更新时间</option><option value="conversation_date">按日期</option><option value="created_at">按创建时间</option><option value="title">按标题</option></Select></div>
      <div className="lg:col-span-1"><Select value={filters.sortOrder} onChange={(event) => onChange({ sortOrder: event.target.value as EntryFilters["sortOrder"] })}><option value="desc">降序</option><option value="asc">升序</option></Select></div>
    </div>
  );
}
