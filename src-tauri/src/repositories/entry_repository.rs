use crate::models::{
    ActivityLogItem, BulkStatusPayload, BulkTagPayload, CaptureInboxItem, DashboardOverview,
    EntryFilters, EntryFormMeta, EntryListItem, EntryListResponse, EntryPayload, EntryRecord,
    ExportLogPayload, ImportPayload, ImportResult, RecentAccessItem, RecentSearchRecord,
    SaveFilterPayload, SavedFilterRecord, SettingsPayload, TagStat,
};
use anyhow::{anyhow, Result};
use chrono::Local;
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension, Row, Transaction};

pub struct EntryRepository;

impl EntryRepository {
    pub fn get_dashboard_overview(conn: &Connection) -> Result<DashboardOverview> {
        let total_entries = conn.query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))?;
        let favorite_entries = conn.query_row(
            "SELECT COUNT(*) FROM entries WHERE favorite = 1",
            [],
            |row| row.get(0),
        )?;

        let recent_entries = Self::fetch_entries_by_sql(
            conn,
            "SELECT e.id, e.custom_id, e.title, e.summary, e.url, e.source_type, e.project_name, e.topic,
                    e.conversation_date, e.created_at, e.updated_at, e.notes, e.status, e.favorite,
                    COALESCE(GROUP_CONCAT(t.name, '||'), '') AS tags
             FROM entries e
             LEFT JOIN entry_tags et ON et.entry_id = e.id
             LEFT JOIN tags t ON t.id = et.tag_id
             GROUP BY e.id
             ORDER BY e.created_at DESC
             LIMIT 6",
            &[],
        )?;

        let mut tag_stmt = conn.prepare(
            "SELECT t.name, COUNT(et.entry_id) AS count
             FROM tags t
             LEFT JOIN entry_tags et ON et.tag_id = t.id
             GROUP BY t.id
             HAVING COUNT(et.entry_id) > 0
             ORDER BY count DESC, t.name ASC
             LIMIT 12",
        )?;
        let tag_stats = tag_stmt
            .query_map([], |row| {
                Ok(TagStat {
                    name: row.get(0)?,
                    count: row.get(1)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        let mut recent_access_stmt = conn.prepare(
            "SELECT ra.entry_id, e.custom_id, e.title, ra.accessed_at
             FROM recent_accesses ra
             JOIN entries e ON e.id = ra.entry_id
             ORDER BY ra.accessed_at DESC
             LIMIT 8",
        )?;
        let recent_accesses = recent_access_stmt
            .query_map([], |row| {
                Ok(RecentAccessItem {
                    entry_id: row.get(0)?,
                    custom_id: row.get(1)?,
                    title: row.get(2)?,
                    accessed_at: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        let import_logs = Self::get_activity_logs(conn, "import_logs", false)?;
        let export_logs = Self::get_activity_logs(conn, "export_logs", true)?;

        Ok(DashboardOverview {
            total_entries,
            favorite_entries,
            recent_entries,
            tag_stats,
            recent_accesses,
            import_logs,
            export_logs,
        })
    }

    pub fn list_entries(conn: &Connection, filters: &EntryFilters) -> Result<EntryListResponse> {
        let mut conditions = vec!["1 = 1".to_string()];
        let mut params: Vec<Value> = Vec::new();

        if !filters.query.trim().is_empty() {
            conditions.push(
                "e.id IN (SELECT rowid FROM entries_fts WHERE entries_fts MATCH ?)"
                    .to_string(),
            );
            params.push(Value::Text(Self::to_match_query(&filters.query)));
            Self::store_recent_search(conn, filters)?;
        }

        if let Some(project_name) = filters.project_name.as_ref().filter(|value| !value.is_empty()) {
            conditions.push("COALESCE(e.project_name, '') = ?".to_string());
            params.push(Value::Text(project_name.clone()));
        }

        if let Some(status) = filters.status.as_ref().filter(|value| !value.is_empty()) {
            conditions.push("e.status = ?".to_string());
            params.push(Value::Text(status.clone()));
        }

        if let Some(source_type) = filters.source_type.as_ref().filter(|value| !value.is_empty()) {
            conditions.push("e.source_type = ?".to_string());
            params.push(Value::Text(source_type.clone()));
        }

        if let Some(date_from) = filters.date_from.as_ref().filter(|value| !value.is_empty()) {
            conditions.push("e.conversation_date >= ?".to_string());
            params.push(Value::Text(date_from.clone()));
        }

        if let Some(date_to) = filters.date_to.as_ref().filter(|value| !value.is_empty()) {
            conditions.push("e.conversation_date <= ?".to_string());
            params.push(Value::Text(date_to.clone()));
        }

        if filters.favorites_only {
            conditions.push("e.favorite = 1".to_string());
        }

        if let Some(tag) = filters.tags.first().filter(|value| !value.is_empty()) {
            conditions.push(
                "EXISTS (
                    SELECT 1 FROM entry_tags et
                    JOIN tags t ON t.id = et.tag_id
                    WHERE et.entry_id = e.id AND t.name = ?
                )"
                .replace('\n', " "),
            );
            params.push(Value::Text(tag.clone()));
        }

        let sort_by = match filters.sort_by.as_str() {
            "conversation_date" => "e.conversation_date",
            "created_at" => "e.created_at",
            "title" => "e.title COLLATE NOCASE",
            _ => "e.updated_at",
        };
        let sort_order = if filters.sort_order.eq_ignore_ascii_case("asc") {
            "ASC"
        } else {
            "DESC"
        };
        let offset = (filters.page.max(1) - 1) * filters.page_size.max(1);
        let where_sql = conditions.join(" AND ");

        let total_sql = format!("SELECT COUNT(*) FROM entries e WHERE {where_sql}");
        let total = conn.query_row(&total_sql, params_from_iter(params.clone()), |row| row.get(0))?;

        let list_sql = format!(
            "SELECT e.id, e.custom_id, e.title, e.summary, e.url, e.source_type, e.project_name, e.topic,
                    e.conversation_date, e.created_at, e.updated_at, e.notes, e.status, e.favorite,
                    COALESCE(GROUP_CONCAT(t.name, '||'), '') AS tags
             FROM entries e
             LEFT JOIN entry_tags et ON et.entry_id = e.id
             LEFT JOIN tags t ON t.id = et.tag_id
             WHERE {where_sql}
             GROUP BY e.id
             ORDER BY {sort_by} {sort_order}
             LIMIT ? OFFSET ?"
        );
        params.push(Value::Integer(filters.page_size.max(1)));
        params.push(Value::Integer(offset));

        let items = Self::fetch_entries_by_sql(conn, &list_sql, &params)?;

        Ok(EntryListResponse {
            items,
            total,
            page: filters.page.max(1),
            page_size: filters.page_size.max(1),
            available_tags: Self::fetch_string_list(conn, "SELECT name FROM tags ORDER BY name COLLATE NOCASE")?,
            available_projects: Self::fetch_string_list(conn, "SELECT name FROM projects ORDER BY name COLLATE NOCASE")?,
            statuses: Self::get_setting_list(conn, "statuses")?,
            source_types: Self::get_setting_list(conn, "sourceTypes")?,
        })
    }

    pub fn get_entry_by_id(conn: &Connection, id: i64) -> Result<EntryRecord> {
        let sql = "SELECT e.id, e.custom_id, e.title, e.summary, e.url, e.source_type, e.project_name, e.topic,
                          e.conversation_date, e.created_at, e.updated_at, e.notes, e.status, e.favorite,
                          COALESCE(GROUP_CONCAT(t.name, '||'), '') AS tags
                   FROM entries e
                   LEFT JOIN entry_tags et ON et.entry_id = e.id
                   LEFT JOIN tags t ON t.id = et.tag_id
                   WHERE e.id = ?1
                   GROUP BY e.id";

        Self::fetch_entries_by_sql(conn, sql, &[Value::Integer(id)])?
            .into_iter()
            .next()
            .ok_or_else(|| anyhow!("entry not found"))
    }

    pub fn get_entry_form_meta(conn: &Connection) -> Result<EntryFormMeta> {
        Ok(EntryFormMeta {
            suggested_custom_id: Self::next_custom_id(conn)?,
            tags: Self::fetch_string_list(conn, "SELECT name FROM tags ORDER BY name COLLATE NOCASE")?,
            projects: Self::fetch_string_list(conn, "SELECT name FROM projects ORDER BY name COLLATE NOCASE")?,
            statuses: Self::get_setting_list(conn, "statuses")?,
            source_types: Self::get_setting_list(conn, "sourceTypes")?,
        })
    }

    pub fn create_entry(conn: &mut Connection, payload: &EntryPayload) -> Result<EntryRecord> {
        let requested_custom_id = if payload.custom_id.trim().is_empty() { Self::next_custom_id(conn)? } else { normalize_custom_id(&payload.custom_id) };
        let summary = default_summary(&payload.summary);
        let title = default_title(&payload.title);
        let source_type = default_source_type(&payload.source_type);
        let status = default_status(&payload.status);
        let tx = conn.transaction()?;
        Self::ensure_project(&tx, payload.project_name.as_deref())?;
        shift_custom_ids_for_insert(&tx, &requested_custom_id, None)?;
        let tags_cache = payload.tags.join(", ");
        let now = now_string();
        tx.execute(
            "INSERT INTO entries (custom_id, title, summary, url, source_type, project_name, topic, tags_cache, conversation_date, created_at, updated_at, notes, status, favorite)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11, ?12, ?13)",
            params![
                requested_custom_id,
                title.as_str(),
                summary.as_str(),
                payload.url.trim(),
                source_type.as_str(),
                payload.project_name.as_deref().map(str::trim),
                payload.topic.as_deref().map(str::trim),
                tags_cache,
                payload.conversation_date.trim(),
                now,
                payload.notes.as_deref().map(str::trim),
                status.as_str(),
                if status == "\u{91cd}\u{70b9}" || payload.favorite { 1 } else { 0 },
            ],
        )?;
        let entry_id = tx.last_insert_rowid();
        Self::sync_tags(&tx, entry_id, &payload.tags)?;
        Self::append_history(&tx, entry_id, "created", payload)?;
        tx.commit()?;
        Self::get_entry_by_id(conn, entry_id)
    }

    pub fn update_entry(conn: &mut Connection, id: i64, payload: &EntryPayload) -> Result<EntryRecord> {
        let current_custom_id: String = conn.query_row("SELECT custom_id FROM entries WHERE id = ?1", params![id], |row| row.get(0))?;
        let requested_custom_id = if payload.custom_id.trim().is_empty() { current_custom_id.clone() } else { normalize_custom_id(&payload.custom_id) };
        let summary = default_summary(&payload.summary);
        let title = default_title(&payload.title);
        let source_type = default_source_type(&payload.source_type);
        let status = default_status(&payload.status);
        let tx = conn.transaction()?;
        Self::ensure_project(&tx, payload.project_name.as_deref())?;
        if requested_custom_id != current_custom_id {
            tx.execute("UPDATE entries SET custom_id = ?1 WHERE id = ?2", params![format!("__MOVING__{}", id), id])?;
            shift_custom_ids_for_insert(&tx, &requested_custom_id, Some(id))?;
        }
        let tags_cache = payload.tags.join(", ");
        tx.execute(
            "UPDATE entries
             SET custom_id = ?1,
                 title = ?2,
                 summary = ?3,
                 url = ?4,
                 source_type = ?5,
                 project_name = ?6,
                 topic = ?7,
                 tags_cache = ?8,
                 conversation_date = ?9,
                 updated_at = ?10,
                 notes = ?11,
                 status = ?12,
                 favorite = ?13
             WHERE id = ?14",
            params![
                requested_custom_id,
                title.as_str(),
                summary.as_str(),
                payload.url.trim(),
                source_type.as_str(),
                payload.project_name.as_deref().map(str::trim),
                payload.topic.as_deref().map(str::trim),
                tags_cache,
                payload.conversation_date.trim(),
                now_string(),
                payload.notes.as_deref().map(str::trim),
                status.as_str(),
                if status == "\u{91cd}\u{70b9}" || payload.favorite { 1 } else { 0 },
                id,
            ],
        )?;
        Self::sync_tags(&tx, id, &payload.tags)?;
        Self::append_history(&tx, id, "updated", payload)?;
        tx.commit()?;
        Self::get_entry_by_id(conn, id)
    }

    pub fn delete_entries(conn: &mut Connection, ids: &[i64]) -> Result<i64> {
        if ids.is_empty() {
            return Ok(0);
        }
        let tx = conn.transaction()?;
        for id in ids {
            tx.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
        }
        tx.commit()?;
        Ok(ids.len() as i64)
    }

    pub fn bulk_add_tags(conn: &mut Connection, payload: &BulkTagPayload) -> Result<i64> {
        if payload.ids.is_empty() || payload.tags.is_empty() {
            return Ok(0);
        }
        let tx = conn.transaction()?;
        for id in &payload.ids {
            for tag in payload.tags.iter().map(|item| item.trim()).filter(|item| !item.is_empty()) {
                tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![tag])?;
                let tag_id: i64 = tx.query_row("SELECT id FROM tags WHERE name = ?1", params![tag], |row| row.get(0))?;
                tx.execute(
                    "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?1, ?2)",
                    params![id, tag_id],
                )?;
            }
            Self::refresh_tags_cache(&tx, *id)?;
        }
        tx.commit()?;
        Ok(payload.ids.len() as i64)
    }

    pub fn bulk_update_status(conn: &mut Connection, payload: &BulkStatusPayload) -> Result<i64> {
        if payload.ids.is_empty() {
            return Ok(0);
        }
        let tx = conn.transaction()?;
        for id in &payload.ids {
            tx.execute(
                "UPDATE entries SET status = ?1, updated_at = ?2 WHERE id = ?3",
                params![payload.status.trim(), now_string(), id],
            )?;
        }
        tx.commit()?;
        Ok(payload.ids.len() as i64)
    }

    pub fn list_capture_inbox(conn: &Connection) -> Result<Vec<CaptureInboxItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, summary, url, source_type, project_name, topic, tags_json,
                    conversation_date, notes, status, favorite, source_context, created_at, updated_at
             FROM capture_inbox
             ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = stmt
            .query_map([], map_capture_inbox_row)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn upsert_capture_inbox(
        conn: &mut Connection,
        payload: &EntryPayload,
        source_context: Option<&str>,
    ) -> Result<CaptureInboxItem> {
        let tx = conn.transaction()?;
        Self::ensure_project(&tx, payload.project_name.as_deref())?;

        let tags_json = serde_json::to_string(&payload.tags)?;
        let url = payload.url.trim();
        let now = now_string();

        let existing_id: Option<i64> = tx
            .query_row(
                "SELECT id FROM capture_inbox WHERE url = ?1",
                params![url],
                |row| row.get(0),
            )
            .optional()?;

        let inbox_id = if let Some(id) = existing_id {
            tx.execute(
                "UPDATE capture_inbox
                 SET title = ?1,
                     summary = ?2,
                     source_type = ?3,
                     project_name = ?4,
                     topic = ?5,
                     tags_json = ?6,
                     conversation_date = ?7,
                     notes = ?8,
                     status = ?9,
                     favorite = ?10,
                     source_context = ?11,
                     updated_at = ?12
                 WHERE id = ?13",
                params![
                    payload.title.trim(),
                    payload.summary.trim(),
                    payload.source_type.trim(),
                    payload.project_name.as_deref().map(str::trim),
                    payload.topic.as_deref().map(str::trim),
                    tags_json,
                    payload.conversation_date.trim(),
                    payload.notes.as_deref().map(str::trim),
                    payload.status.trim(),
                    if payload.favorite { 1 } else { 0 },
                    source_context.map(str::trim).filter(|value| !value.is_empty()),
                    now,
                    id,
                ],
            )?;
            id
        } else {
            tx.execute(
                "INSERT INTO capture_inbox (title, summary, url, source_type, project_name, topic, tags_json, conversation_date, notes, status, favorite, source_context, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13)",
                params![
                    payload.title.trim(),
                    payload.summary.trim(),
                    url,
                    payload.source_type.trim(),
                    payload.project_name.as_deref().map(str::trim),
                    payload.topic.as_deref().map(str::trim),
                    tags_json,
                    payload.conversation_date.trim(),
                    payload.notes.as_deref().map(str::trim),
                    payload.status.trim(),
                    if payload.favorite { 1 } else { 0 },
                    source_context.map(str::trim).filter(|value| !value.is_empty()),
                    now,
                ],
            )?;
            tx.last_insert_rowid()
        };

        tx.commit()?;
        Self::get_capture_inbox_item_by_id(conn, inbox_id)
    }

    pub fn update_capture_inbox_item(conn: &mut Connection, id: i64, payload: &EntryPayload) -> Result<CaptureInboxItem> {
        let tx = conn.transaction()?;
        Self::ensure_project(&tx, payload.project_name.as_deref())?;
        let tags_json = serde_json::to_string(&payload.tags)?;
        tx.execute(
            "UPDATE capture_inbox
             SET title = ?1,
                 summary = ?2,
                 url = ?3,
                 source_type = ?4,
                 project_name = ?5,
                 topic = ?6,
                 tags_json = ?7,
                 conversation_date = ?8,
                 notes = ?9,
                 status = ?10,
                 favorite = ?11,
                 updated_at = ?12
             WHERE id = ?13",
            params![
                payload.title.trim(),
                payload.summary.trim(),
                payload.url.trim(),
                payload.source_type.trim(),
                payload.project_name.as_deref().map(str::trim),
                payload.topic.as_deref().map(str::trim),
                tags_json,
                payload.conversation_date.trim(),
                payload.notes.as_deref().map(str::trim),
                payload.status.trim(),
                if payload.favorite { 1 } else { 0 },
                now_string(),
                id,
            ],
        )?;
        tx.commit()?;
        Self::get_capture_inbox_item_by_id(conn, id)
    }

    pub fn approve_capture_inbox_item(conn: &mut Connection, id: i64) -> Result<EntryRecord> {
        let item = Self::get_capture_inbox_item_by_id(conn, id)?;
        let existing_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM entries WHERE url = ?1",
                params![item.url.trim()],
                |row| row.get(0),
            )
            .optional()?;

        let custom_id = if let Some(entry_id) = existing_id {
            Self::get_entry_by_id(conn, entry_id)?.custom_id
        } else {
            Self::next_custom_id(conn)?
        };

        let payload = EntryPayload {
            custom_id,
            title: item.title.clone(),
            summary: item.summary.clone(),
            url: item.url.clone(),
            source_type: item.source_type.clone(),
            project_name: item.project_name.clone(),
            topic: item.topic.clone(),
            tags: item.tags.clone(),
            conversation_date: item.conversation_date.clone(),
            notes: item.notes.clone(),
            status: item.status.clone(),
            favorite: item.favorite,
        };

        let record = if let Some(entry_id) = existing_id {
            Self::update_entry(conn, entry_id, &payload)?
        } else {
            Self::create_entry(conn, &payload)?
        };

        conn.execute("DELETE FROM capture_inbox WHERE id = ?1", params![id])?;
        Ok(record)
    }

    pub fn discard_capture_inbox_items(conn: &Connection, ids: &[i64]) -> Result<i64> {
        if ids.is_empty() {
            return Ok(0);
        }
        for id in ids {
            conn.execute("DELETE FROM capture_inbox WHERE id = ?1", params![id])?;
        }
        Ok(ids.len() as i64)
    }

    pub fn track_recent_access(conn: &Connection, entry_id: i64) -> Result<()> {
        conn.execute(
            "INSERT INTO recent_accesses (entry_id, accessed_at) VALUES (?1, ?2)",
            params![entry_id, now_string()],
        )?;
        conn.execute(
            "DELETE FROM recent_accesses WHERE id NOT IN (
                SELECT id FROM recent_accesses ORDER BY accessed_at DESC LIMIT 30
            )",
            [],
        )?;
        Ok(())
    }

    pub fn import_entries(conn: &mut Connection, payload: &ImportPayload) -> Result<ImportResult> {
        let mut imported = 0;
        let mut skipped = 0;
        let mut errors = Vec::new();

        for entry in &payload.entries {
            match conn
                .query_row(
                    "SELECT id FROM entries WHERE url = ?1",
                    params![entry.url.trim()],
                    |row| row.get::<_, i64>(0),
                )
                .optional()?
            {
                Some(existing_id) if payload.dedupe_strategy == "overwrite" => {
                    if let Err(error) = Self::update_entry(conn, existing_id, entry) {
                        errors.push(format!("{}: {}", entry.title, error));
                    } else {
                        imported += 1;
                    }
                }
                Some(_) => skipped += 1,
                None => match Self::create_entry(conn, entry) {
                    Ok(_) => imported += 1,
                    Err(error) => errors.push(format!("{}: {}", entry.title, error)),
                },
            }
        }

        conn.execute(
            "INSERT INTO import_logs (file_name, file_type, rows, skipped_rows, error_report, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                payload.source_file_name.as_str(),
                payload.file_type.as_str(),
                imported,
                skipped,
                if errors.is_empty() { None::<String> } else { Some(errors.join("\n")) },
                now_string(),
            ],
        )?;

        Ok(ImportResult {
            imported,
            skipped,
            errors,
        })
    }

    pub fn record_export_log(conn: &Connection, payload: &ExportLogPayload) -> Result<ActivityLogItem> {
        let created_at = now_string();
        conn.execute(
            "INSERT INTO export_logs (file_name, file_type, rows, target_path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                payload.file_name.as_str(),
                payload.file_type.as_str(),
                payload.rows,
                payload.target_path.as_str(),
                created_at,
            ],
        )?;
        let id = conn.last_insert_rowid();
        Ok(ActivityLogItem {
            id,
            file_name: payload.file_name.clone(),
            file_type: payload.file_type.clone(),
            rows: payload.rows,
            target_path: Some(payload.target_path.clone()),
            created_at: now_string(),
        })
    }

    pub fn list_saved_filters(conn: &Connection) -> Result<Vec<SavedFilterRecord>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, filter_json, created_at, updated_at
             FROM saved_filters
             ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(SavedFilterRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    filter_json: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn save_filter(conn: &Connection, payload: &SaveFilterPayload) -> Result<SavedFilterRecord> {
        let now = now_string();
        let filter_json = serde_json::to_string(&payload.filters)?;
        conn.execute(
            "INSERT INTO saved_filters (name, filter_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?3)",
            params![payload.name.trim(), filter_json.as_str(), now.as_str()],
        )?;
        let id = conn.last_insert_rowid();
        Ok(SavedFilterRecord {
            id,
            name: payload.name.trim().to_string(),
            filter_json,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn delete_saved_filter(conn: &Connection, id: i64) -> Result<()> {
        conn.execute("DELETE FROM saved_filters WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn list_recent_searches(conn: &Connection) -> Result<Vec<RecentSearchRecord>> {
        let mut stmt = conn.prepare(
            "SELECT id, query, filters_json, created_at
             FROM recent_searches
             ORDER BY created_at DESC
             LIMIT 12",
        )?;
        let rows = stmt
            .query_map([], |row| {
                Ok(RecentSearchRecord {
                    id: row.get(0)?,
                    query: row.get(1)?,
                    filters_json: row.get(2)?,
                    created_at: row.get(3)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    pub fn get_app_settings(conn: &Connection) -> Result<SettingsPayload> {
        let mut stmt = conn.prepare("SELECT key, value FROM app_settings ORDER BY key")?;
        let mut map = SettingsPayload::new();
        let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?;
        for row in rows {
            let (key, value) = row?;
            map.insert(key, value);
        }
        Ok(map)
    }

    pub fn save_app_settings(conn: &Connection, payload: &SettingsPayload) -> Result<()> {
        for (key, value) in payload {
            conn.execute(
                "INSERT INTO app_settings (key, value, updated_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                params![key, value, now_string()],
            )?;
        }
        Ok(())
    }

    fn get_capture_inbox_item_by_id(conn: &Connection, id: i64) -> Result<CaptureInboxItem> {
        let mut stmt = conn.prepare(
            "SELECT id, title, summary, url, source_type, project_name, topic, tags_json,
                    conversation_date, notes, status, favorite, source_context, created_at, updated_at
             FROM capture_inbox
             WHERE id = ?1",
        )?;
        stmt.query_row(params![id], map_capture_inbox_row)
            .map_err(|error| anyhow!(error))
    }

    fn sync_tags(tx: &Transaction<'_>, entry_id: i64, tags: &[String]) -> Result<()> {
        tx.execute("DELETE FROM entry_tags WHERE entry_id = ?1", params![entry_id])?;
        for tag in tags.iter().map(|item| item.trim()).filter(|item| !item.is_empty()) {
            tx.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![tag])?;
            let tag_id: i64 = tx.query_row("SELECT id FROM tags WHERE name = ?1", params![tag], |row| row.get(0))?;
            tx.execute(
                "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?1, ?2)",
                params![entry_id, tag_id],
            )?;
        }
        Ok(())
    }

    fn refresh_tags_cache(tx: &Transaction<'_>, entry_id: i64) -> Result<()> {
        tx.execute(
            "UPDATE entries
             SET tags_cache = COALESCE((
                 SELECT GROUP_CONCAT(t.name, ', ')
                 FROM entry_tags et
                 JOIN tags t ON t.id = et.tag_id
                 WHERE et.entry_id = ?1
             ), ''), updated_at = ?2
             WHERE id = ?1",
            params![entry_id, now_string()],
        )?;
        Ok(())
    }

    fn append_history(tx: &Transaction<'_>, entry_id: i64, action: &str, payload: &EntryPayload) -> Result<()> {
        tx.execute(
            "INSERT INTO entry_history (entry_id, action, snapshot_json, created_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![entry_id, action, serde_json::to_string(payload)?, now_string()],
        )?;
        Ok(())
    }

    fn ensure_project(tx: &Transaction<'_>, project_name: Option<&str>) -> Result<()> {
        if let Some(project_name) = project_name.map(str::trim).filter(|value| !value.is_empty()) {
            tx.execute("INSERT OR IGNORE INTO projects (name) VALUES (?1)", params![project_name])?;
        }
        Ok(())
    }

    fn get_activity_logs(conn: &Connection, table: &str, has_path: bool) -> Result<Vec<ActivityLogItem>> {
        let select_path = if has_path { "target_path" } else { "NULL AS target_path" };
        let sql = format!(
            "SELECT id, file_name, file_type, rows, created_at, {select_path} FROM {table} ORDER BY created_at DESC LIMIT 6"
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt
            .query_map([], |row| {
                Ok(ActivityLogItem {
                    id: row.get(0)?,
                    file_name: row.get(1)?,
                    file_type: row.get(2)?,
                    rows: row.get(3)?,
                    created_at: row.get(4)?,
                    target_path: row.get(5)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    fn fetch_entries_by_sql(conn: &Connection, sql: &str, params: &[Value]) -> Result<Vec<EntryListItem>> {
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt
            .query_map(params_from_iter(params.iter().cloned()), map_entry_row)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    fn fetch_string_list(conn: &Connection, sql: &str) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt
            .query_map([], |row| row.get::<_, String>(0))?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        Ok(rows)
    }

    fn next_custom_id(conn: &Connection) -> Result<String> {
        let next_id: i64 = conn.query_row("SELECT COALESCE(MAX(id), 0) + 1 FROM entries", [], |row| row.get(0))?;
        Ok(format!("I{:03}", next_id))
    }

    fn get_setting_list(conn: &Connection, key: &str) -> Result<Vec<String>> {
        let value: Option<String> = conn
            .query_row("SELECT value FROM app_settings WHERE key = ?1", params![key], |row| row.get(0))
            .optional()?;
        Ok(value
            .unwrap_or_default()
            .split(',')
            .map(str::trim)
            .filter(|item| !item.is_empty())
            .map(ToString::to_string)
            .collect())
    }

    fn store_recent_search(conn: &Connection, filters: &EntryFilters) -> Result<()> {
        conn.execute(
            "INSERT INTO recent_searches (query, filters_json, created_at) VALUES (?1, ?2, ?3)",
            params![filters.query.trim(), serde_json::to_string(filters)?, now_string()],
        )?;
        conn.execute(
            "DELETE FROM recent_searches WHERE id NOT IN (
                SELECT id FROM recent_searches ORDER BY created_at DESC LIMIT 20
            )",
            [],
        )?;
        Ok(())
    }

    fn to_match_query(raw: &str) -> String {
        let tokens = raw
            .split_whitespace()
            .map(|token| token.trim_matches(|c: char| c == '"' || c == '\'' || c == ','))
            .filter(|token| !token.is_empty())
            .map(|token| format!("{}*", token.replace(':', " ")))
            .collect::<Vec<_>>();
        if tokens.is_empty() {
            raw.trim().to_string()
        } else {
            tokens.join(" AND ")
        }
    }
}

fn map_entry_row(row: &Row<'_>) -> rusqlite::Result<EntryRecord> {
    let tags: String = row.get(14)?;
    Ok(EntryRecord {
        id: row.get(0)?,
        custom_id: row.get(1)?,
        title: row.get(2)?,
        summary: row.get(3)?,
        url: row.get(4)?,
        source_type: row.get(5)?,
        project_name: row.get(6)?,
        topic: row.get(7)?,
        conversation_date: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
        notes: row.get(11)?,
        status: row.get(12)?,
        favorite: row.get::<_, i64>(13)? == 1,
        tags: tags
            .split("||")
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToString::to_string)
            .collect(),
    })
}

fn map_capture_inbox_row(row: &Row<'_>) -> rusqlite::Result<CaptureInboxItem> {
    let tags_json: String = row.get(7)?;
    let tags = serde_json::from_str::<Vec<String>>(&tags_json).unwrap_or_default();
    Ok(CaptureInboxItem {
        id: row.get(0)?,
        title: row.get(1)?,
        summary: row.get(2)?,
        url: row.get(3)?,
        source_type: row.get(4)?,
        project_name: row.get(5)?,
        topic: row.get(6)?,
        tags,
        conversation_date: row.get(8)?,
        notes: row.get(9)?,
        status: row.get(10)?,
        favorite: row.get::<_, i64>(11)? == 1,
        source_context: row.get(12)?,
        created_at: row.get(13)?,
        updated_at: row.get(14)?,
    })
}

fn parse_custom_id(value: &str) -> Option<(String, usize, i64)> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let digit_start = trimmed
        .char_indices()
        .find(|(_, ch)| ch.is_ascii_digit())
        .map(|(index, _)| index)?;
    let (prefix, digits) = trimmed.split_at(digit_start);
    if prefix.is_empty() || digits.is_empty() || !digits.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }
    let number = digits.parse::<i64>().ok()?;
    Some((prefix.to_string(), digits.len(), number))
}

fn shift_custom_ids_for_insert(tx: &Transaction<'_>, requested_custom_id: &str, exclude_id: Option<i64>) -> Result<()> {
    let Some((prefix, width, target_number)) = parse_custom_id(requested_custom_id) else {
        let existing: Option<i64> = tx
            .query_row(
                "SELECT id FROM entries WHERE custom_id = ?1 AND (?2 IS NULL OR id != ?2) LIMIT 1",
                params![requested_custom_id, exclude_id],
                |row| row.get(0),
            )
            .optional()?;
        if existing.is_some() {
            return Err(anyhow!("custom id already exists and cannot be shifted: {}", requested_custom_id));
        }
        return Ok(());
    };

    let like_pattern = format!("{}%", prefix);
    let mut stmt = tx.prepare(
        "SELECT id, custom_id FROM entries WHERE custom_id LIKE ?1 AND (?2 IS NULL OR id != ?2) ORDER BY id DESC",
    )?;
    let rows = stmt
        .query_map(params![like_pattern, exclude_id], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut affected = rows
        .into_iter()
        .filter_map(|(id, custom_id)| {
            parse_custom_id(&custom_id).and_then(|(item_prefix, item_width, item_number)| {
                if item_prefix == prefix && item_width == width && item_number >= target_number {
                    Some((id, item_number))
                } else {
                    None
                }
            })
        })
        .collect::<Vec<_>>();
    affected.sort_by(|left, right| right.1.cmp(&left.1));

    for (id, _) in &affected {
        tx.execute("UPDATE entries SET custom_id = ?1 WHERE id = ?2", params![format!("__SHIFT__{}", id), id])?;
    }
    for (id, number) in affected {
        let shifted = format!("{}{:0width$}", prefix, number + 1, width = width);
        tx.execute("UPDATE entries SET custom_id = ?1 WHERE id = ?2", params![shifted, id])?;
    }

    Ok(())
}


fn default_title(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() { "\u{5f85}\u{8865}\u{5168}".to_string() } else { trimmed.to_string() }
}

fn default_summary(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() { "\u{5f85}\u{8865}\u{5168}".to_string() } else { trimmed.to_string() }
}

fn default_status(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() { "\u{5e38}\u{89c4}".to_string() } else { trimmed.to_string() }
}

fn default_source_type(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() { "manual".to_string() } else { trimmed.to_string() }
}

fn now_string() -> String {
    Local::now().format("%Y-%m-%dT%H:%M:%S").to_string()
}

fn normalize_custom_id(value: &str) -> String {
    value.trim().to_uppercase()
}


