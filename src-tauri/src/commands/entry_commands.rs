use crate::db::manager::DbManager;
use crate::models::{
    BulkStatusPayload, BulkTagPayload, EntryFilters, EntryPayload, ExportLogPayload, ImportPayload,
    SaveFilterPayload, SettingsPayload,
};
use crate::repositories::entry_repository::EntryRepository;
use std::fs;
use std::path::PathBuf;
use tauri::State;

pub struct AppState {
    pub db_path: PathBuf,
}

fn open_db(state: &State<'_, AppState>) -> Result<DbManager, String> {
    DbManager::open(&state.db_path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_dashboard_overview(state: State<'_, AppState>) -> Result<crate::models::DashboardOverview, String> {
    let db = open_db(&state)?;
    EntryRepository::get_dashboard_overview(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_entries(state: State<'_, AppState>, filters: EntryFilters) -> Result<crate::models::EntryListResponse, String> {
    let db = open_db(&state)?;
    EntryRepository::list_entries(&db.conn, &filters).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_entry_by_id(state: State<'_, AppState>, id: i64) -> Result<crate::models::EntryRecord, String> {
    let db = open_db(&state)?;
    EntryRepository::get_entry_by_id(&db.conn, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_entry_form_meta(state: State<'_, AppState>) -> Result<crate::models::EntryFormMeta, String> {
    let db = open_db(&state)?;
    EntryRepository::get_entry_form_meta(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_entry(state: State<'_, AppState>, payload: EntryPayload) -> Result<crate::models::EntryRecord, String> {
    let mut db = open_db(&state)?;
    EntryRepository::create_entry(&mut db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_entry(state: State<'_, AppState>, id: i64, payload: EntryPayload) -> Result<crate::models::EntryRecord, String> {
    let mut db = open_db(&state)?;
    EntryRepository::update_entry(&mut db.conn, id, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_entries(state: State<'_, AppState>, ids: Vec<i64>) -> Result<i64, String> {
    let mut db = open_db(&state)?;
    EntryRepository::delete_entries(&mut db.conn, &ids).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn bulk_add_tags(state: State<'_, AppState>, payload: BulkTagPayload) -> Result<i64, String> {
    let mut db = open_db(&state)?;
    EntryRepository::bulk_add_tags(&mut db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn bulk_update_status(state: State<'_, AppState>, payload: BulkStatusPayload) -> Result<i64, String> {
    let mut db = open_db(&state)?;
    EntryRepository::bulk_update_status(&mut db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn track_recent_access(state: State<'_, AppState>, entry_id: i64) -> Result<(), String> {
    let db = open_db(&state)?;
    EntryRepository::track_recent_access(&db.conn, entry_id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn import_entries(state: State<'_, AppState>, payload: ImportPayload) -> Result<crate::models::ImportResult, String> {
    let mut db = open_db(&state)?;
    EntryRepository::import_entries(&mut db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn record_export_log(state: State<'_, AppState>, payload: ExportLogPayload) -> Result<crate::models::ActivityLogItem, String> {
    let db = open_db(&state)?;
    EntryRepository::record_export_log(&db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_saved_filters(state: State<'_, AppState>) -> Result<Vec<crate::models::SavedFilterRecord>, String> {
    let db = open_db(&state)?;
    EntryRepository::list_saved_filters(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_filter(state: State<'_, AppState>, payload: SaveFilterPayload) -> Result<crate::models::SavedFilterRecord, String> {
    let db = open_db(&state)?;
    EntryRepository::save_filter(&db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_saved_filter(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let db = open_db(&state)?;
    EntryRepository::delete_saved_filter(&db.conn, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_recent_searches(state: State<'_, AppState>) -> Result<Vec<crate::models::RecentSearchRecord>, String> {
    let db = open_db(&state)?;
    EntryRepository::list_recent_searches(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn backup_database(state: State<'_, AppState>, destination_path: String) -> Result<String, String> {
    fs::copy(&state.db_path, &destination_path).map_err(|error| error.to_string())?;
    Ok(destination_path)
}

#[tauri::command]
pub fn restore_database(state: State<'_, AppState>, source_path: String) -> Result<(), String> {
    fs::copy(&source_path, &state.db_path).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> Result<SettingsPayload, String> {
    let db = open_db(&state)?;
    EntryRepository::get_app_settings(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn save_app_settings(state: State<'_, AppState>, payload: SettingsPayload) -> Result<(), String> {
    let db = open_db(&state)?;
    EntryRepository::save_app_settings(&db.conn, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn list_capture_inbox(state: State<'_, AppState>) -> Result<Vec<crate::models::CaptureInboxItem>, String> {
    let db = open_db(&state)?;
    EntryRepository::list_capture_inbox(&db.conn).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn approve_capture_inbox_item(state: State<'_, AppState>, id: i64) -> Result<crate::models::EntryRecord, String> {
    let mut db = open_db(&state)?;
    EntryRepository::approve_capture_inbox_item(&mut db.conn, id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_capture_inbox_item(
    state: State<'_, AppState>,
    id: i64,
    payload: EntryPayload,
) -> Result<crate::models::CaptureInboxItem, String> {
    let mut db = open_db(&state)?;
    EntryRepository::update_capture_inbox_item(&mut db.conn, id, &payload).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn discard_capture_inbox_items(state: State<'_, AppState>, ids: Vec<i64>) -> Result<i64, String> {
    let db = open_db(&state)?;
    EntryRepository::discard_capture_inbox_items(&db.conn, &ids).map_err(|error| error.to_string())
}