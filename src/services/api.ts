import { invoke } from "@tauri-apps/api/core";
import type {
  ActivityLogItem,
  CaptureInboxItem,
  DashboardOverview,
  EntryFilters,
  EntryFormMeta,
  EntryListResponse,
  EntryRecord,
  ImportResult,
  RecentSearchRecord,
  SavedFilterRecord,
} from "@/types/models";
import type { EntryFormValues } from "@/schemas/entry-schema";

export async function getDashboardOverview() {
  return invoke<DashboardOverview>("get_dashboard_overview");
}

export async function listEntries(filters: EntryFilters) {
  return invoke<EntryListResponse>("list_entries", { filters });
}

export async function getEntryById(id: number) {
  return invoke<EntryRecord>("get_entry_by_id", { id });
}

export async function getEntryFormMeta() {
  return invoke<EntryFormMeta>("get_entry_form_meta");
}

export async function createEntry(payload: EntryFormValues) {
  return invoke<EntryRecord>("create_entry", { payload });
}

export async function updateEntry(id: number, payload: EntryFormValues) {
  return invoke<EntryRecord>("update_entry", { id, payload });
}

export async function deleteEntries(ids: number[]) {
  return invoke<number>("delete_entries", { ids });
}

export async function bulkAddTags(ids: number[], tags: string[]) {
  return invoke<number>("bulk_add_tags", { payload: { ids, tags } });
}

export async function bulkUpdateStatus(ids: number[], status: string) {
  return invoke<number>("bulk_update_status", { payload: { ids, status } });
}

export async function trackRecentAccess(entryId: number) {
  return invoke<void>("track_recent_access", { entryId });
}

export async function importEntries(payload: {
  sourceFileName: string;
  fileType: string;
  dedupeStrategy: "skip" | "overwrite";
  entries: EntryFormValues[];
}) {
  return invoke<ImportResult>("import_entries", { payload });
}

export async function recordExportLog(payload: {
  fileName: string;
  fileType: string;
  rows: number;
  targetPath: string;
}) {
  return invoke<ActivityLogItem>("record_export_log", { payload });
}

export async function listSavedFilters() {
  return invoke<SavedFilterRecord[]>("list_saved_filters");
}

export async function saveFilter(name: string, filters: EntryFilters) {
  return invoke<SavedFilterRecord>("save_filter", { payload: { name, filters } });
}

export async function deleteSavedFilter(id: number) {
  return invoke<void>("delete_saved_filter", { id });
}

export async function listRecentSearches() {
  return invoke<RecentSearchRecord[]>("list_recent_searches");
}

export async function backupDatabase(destinationPath: string) {
  return invoke<string>("backup_database", { destinationPath });
}

export async function restoreDatabase(sourcePath: string) {
  return invoke<void>("restore_database", { sourcePath });
}

export async function getAppSettings() {
  return invoke<Record<string, string>>("get_app_settings");
}

export async function saveAppSettings(payload: Record<string, string>) {
  return invoke<void>("save_app_settings", { payload });
}

export async function listCaptureInbox() {
  return invoke<CaptureInboxItem[]>("list_capture_inbox");
}

export async function approveCaptureInboxItem(id: number) {
  return invoke<EntryRecord>("approve_capture_inbox_item", { id });
}

export async function updateCaptureInboxItem(id: number, payload: EntryFormValues) {
  return invoke<CaptureInboxItem>("update_capture_inbox_item", { id, payload });
}

export async function discardCaptureInboxItems(ids: number[]) {
  return invoke<number>("discard_capture_inbox_items", { ids });
}