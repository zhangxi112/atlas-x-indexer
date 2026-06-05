use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryRecord {
    pub id: i64,
    pub custom_id: String,
    pub title: String,
    pub summary: String,
    pub url: String,
    pub source_type: String,
    pub project_name: Option<String>,
    pub topic: Option<String>,
    pub tags: Vec<String>,
    pub conversation_date: String,
    pub created_at: String,
    pub updated_at: String,
    pub notes: Option<String>,
    pub status: String,
    pub favorite: bool,
}

pub type EntryListItem = EntryRecord;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CaptureInboxItem {
    pub id: i64,
    pub title: String,
    pub summary: String,
    pub url: String,
    pub source_type: String,
    pub project_name: Option<String>,
    pub topic: Option<String>,
    pub tags: Vec<String>,
    pub conversation_date: String,
    pub notes: Option<String>,
    pub status: String,
    pub favorite: bool,
    pub source_context: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagStat {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityLogItem {
    pub id: i64,
    pub file_name: String,
    pub file_type: String,
    pub rows: i64,
    pub created_at: String,
    pub target_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentAccessItem {
    pub entry_id: i64,
    pub custom_id: String,
    pub title: String,
    pub accessed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardOverview {
    pub total_entries: i64,
    pub favorite_entries: i64,
    pub recent_entries: Vec<EntryListItem>,
    pub tag_stats: Vec<TagStat>,
    pub recent_accesses: Vec<RecentAccessItem>,
    pub import_logs: Vec<ActivityLogItem>,
    pub export_logs: Vec<ActivityLogItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryFilters {
    pub query: String,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub tags: Vec<String>,
    pub project_name: Option<String>,
    pub status: Option<String>,
    pub source_type: Option<String>,
    pub favorites_only: bool,
    pub sort_by: String,
    pub sort_order: String,
    pub page: i64,
    pub page_size: i64,
    pub view_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryListResponse {
    pub items: Vec<EntryListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
    pub available_tags: Vec<String>,
    pub available_projects: Vec<String>,
    pub statuses: Vec<String>,
    pub source_types: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedFilterRecord {
    pub id: i64,
    pub name: String,
    pub filter_json: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentSearchRecord {
    pub id: i64,
    pub query: String,
    pub filters_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryFormMeta {
    pub suggested_custom_id: String,
    pub tags: Vec<String>,
    pub projects: Vec<String>,
    pub statuses: Vec<String>,
    pub source_types: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryPayload {
    pub custom_id: String,
    pub title: String,
    pub summary: String,
    pub url: String,
    pub source_type: String,
    pub project_name: Option<String>,
    pub topic: Option<String>,
    pub tags: Vec<String>,
    pub conversation_date: String,
    pub notes: Option<String>,
    pub status: String,
    pub favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPayload {
    pub source_file_name: String,
    pub file_type: String,
    pub dedupe_strategy: String,
    pub entries: Vec<EntryPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub imported: i64,
    pub skipped: i64,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportLogPayload {
    pub file_name: String,
    pub file_type: String,
    pub rows: i64,
    pub target_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFilterPayload {
    pub name: String,
    pub filters: EntryFilters,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkTagPayload {
    pub ids: Vec<i64>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkStatusPayload {
    pub ids: Vec<i64>,
    pub status: String,
}

pub type SettingsPayload = HashMap<String, String>;