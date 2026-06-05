export type EntryStatus = "\u5f85\u6574\u7406" | "\u5df2\u6574\u7406" | "\u91cd\u70b9" | "\u5f52\u6863";
export type SourceType = "chatgpt" | "claude" | "gemini" | "manual";
export type ViewMode = "table" | "card";

export interface EntryRecord {
  id: number;
  customId: string;
  title: string;
  summary: string;
  url: string;
  sourceType: string;
  projectName: string | null;
  topic: string | null;
  tags: string[];
  conversationDate: string;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  status: string;
  favorite: boolean;
}

export interface EntryListItem extends EntryRecord {}

export interface CaptureInboxItem {
  id: number;
  title: string;
  summary: string;
  url: string;
  sourceType: string;
  projectName: string | null;
  topic: string | null;
  tags: string[];
  conversationDate: string;
  notes: string | null;
  status: string;
  favorite: boolean;
  sourceContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TagStat {
  name: string;
  count: number;
}

export interface ActivityLogItem {
  id: number;
  fileName: string;
  fileType: string;
  rows: number;
  createdAt: string;
  targetPath?: string | null;
}

export interface RecentAccessItem {
  entryId: number;
  customId: string;
  title: string;
  accessedAt: string;
}

export interface RecentSearchRecord {
  id: number;
  query: string;
  filtersJson?: string | null;
  createdAt: string;
}

export interface SavedFilterRecord {
  id: number;
  name: string;
  filterJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  totalEntries: number;
  favoriteEntries: number;
  recentEntries: EntryListItem[];
  tagStats: TagStat[];
  recentAccesses: RecentAccessItem[];
  importLogs: ActivityLogItem[];
  exportLogs: ActivityLogItem[];
}

export interface EntryFilters {
  query: string;
  dateFrom?: string;
  dateTo?: string;
  tags: string[];
  projectName?: string;
  status?: string;
  sourceType?: string;
  favoritesOnly: boolean;
  sortBy: "updated_at" | "conversation_date" | "created_at" | "title";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
  viewMode: ViewMode;
}

export interface EntryListResponse {
  items: EntryListItem[];
  total: number;
  page: number;
  pageSize: number;
  availableTags: string[];
  availableProjects: string[];
  statuses: string[];
  sourceTypes: string[];
}

export interface EntryFormMeta {
  suggestedCustomId: string;
  tags: string[];
  projects: string[];
  statuses: string[];
  sourceTypes: string[];
}

export interface AppSettingsPayload {
  exportDirectory?: string;
  dateFormat?: string;
  statuses?: string[];
  sourceTypes?: string[];
  aiEndpoint?: string;
  aiModel?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  title: string;
  url: string;
  projectName?: string;
  summary?: string;
  tags: string[];
  status?: string;
  conversationDate?: string;
  suspectedDuplicateUrl: boolean;
  suspectedDuplicateTitle: boolean;
  duplicateUrlMatch?: string;
  duplicateTitleMatch?: string;
  error?: string;
}

export interface ImportIssueRow {
  rowNumber: number;
  title: string;
  url: string;
  projectName?: string;
  status?: string;
  issueType: string;
  details: string;
  matchedValue?: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}
