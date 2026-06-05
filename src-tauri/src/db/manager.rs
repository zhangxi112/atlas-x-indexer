use crate::models::EntryPayload;
use anyhow::Result;
use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::Path;

pub struct DbManager {
    pub conn: Connection,
}

impl DbManager {
    pub fn initialize(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.execute_batch(include_str!("../../migrations/001_init.sql"))?;
        conn.execute_batch("INSERT INTO entries_fts(entries_fts) VALUES ('rebuild');")?;
        repair_legacy_text(&conn)?;
        seed_if_empty(&conn)?;
        Ok(Self { conn })
    }

    pub fn open(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        repair_legacy_text(&conn)?;
        Ok(Self { conn })
    }
}

fn seed_if_empty(conn: &Connection) -> Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    for item in demo_entries() {
        insert_demo_entry(conn, &item, &now)?;
    }

    conn.execute(
        "INSERT INTO recent_accesses (entry_id, accessed_at)
         SELECT id, ?1 FROM entries ORDER BY id LIMIT 2",
        params![chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string()],
    )?;

    Ok(())
}

fn repair_legacy_text(conn: &Connection) -> Result<()> {
    repair_setting_if_garbled(
        conn,
        "statuses",
        "\u{5e38}\u{89c4},\u{91cd}\u{70b9},\u{5f85}\u{8865}\u{5168},\u{5f52}\u{6863}",
    )?;
    repair_setting_if_garbled(conn, "sourceTypes", "chatgpt,claude,gemini,manual")?;
    repair_status_values(conn, "entries")?;
    repair_status_values(conn, "capture_inbox")?;
    repair_demo_entries(conn)?;
    repair_garbled_tags(conn)?;
    Ok(())
}

fn repair_setting_if_garbled(conn: &Connection, key: &str, fallback: &str) -> Result<()> {
    let current: Option<String> = conn
        .query_row("SELECT value FROM app_settings WHERE key = ?1", params![key], |row| row.get(0))
        .optional()?;

    if current.as_deref().is_none_or(looks_garbled) || current.as_deref() == Some("pending,done,key,archived") {
        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at)
             VALUES (?1, ?2, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, fallback],
        )?;
    }

    Ok(())
}

fn repair_status_values(conn: &Connection, table: &str) -> Result<()> {
    let replacements = [
        ("pending", "\u{5e38}\u{89c4}"),
        ("done", "\u{5e38}\u{89c4}"),
        ("key", "\u{91cd}\u{70b9}"),
        ("archived", "\u{5f52}\u{6863}"),
        ("\u{5be8}\u{546d}\u{6693}\u{942e}", "\u{5f85}\u{6574}\u{7406}"),
        ("\u{5bb8}\u{82cf}\u{66a3}\u{942e}", "\u{5df2}\u{6574}\u{7406}"),
        ("\u{95c3}\u{5db5}\u{5070}\u{942e}", "\u{91cd}\u{70b9}"),
        ("\u{8924}\u{63a2}\u{3002}", "\u{5f52}\u{6863}"),
    ];

    for (legacy, target) in replacements {
        let sql = format!("UPDATE {table} SET status = ?1 WHERE status = ?2");
        conn.execute(&sql, params![target, legacy])?;
    }

    let select_sql = format!("SELECT id, status FROM {table}");
    let mut stmt = conn.prepare(&select_sql)?;
    let rows = stmt
        .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    for (id, status) in rows {
        if looks_garbled(&status) {
            let update_sql = format!("UPDATE {table} SET status = ?1 WHERE id = ?2");
            conn.execute(&update_sql, params!["\u{5e38}\u{89c4}", id])?;
        }
    }

    Ok(())
}

fn repair_demo_entries(conn: &Connection) -> Result<()> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    let now = chrono::Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    for item in demo_entries() {
        let entry_id: Option<i64> = conn
            .query_row(
                "SELECT id FROM entries WHERE url = ?1 OR custom_id = ?2 ORDER BY CASE WHEN url = ?1 THEN 0 ELSE 1 END LIMIT 1",
                params![item.url.as_str(), item.custom_id.as_str()],
                |row| row.get(0),
            )
            .optional()?;

        if let Some(entry_id) = entry_id {
            conn.execute(
                "UPDATE entries
                 SET custom_id = ?1,
                     title = ?2,
                     summary = ?3,
                     url = ?4,
                     source_type = ?5,
                     project_name = ?6,
                     topic = ?7,
                     tags_cache = ?8,
                     conversation_date = COALESCE(NULLIF(conversation_date, ''), ?9),
                     updated_at = ?10,
                     notes = ?11,
                     status = ?12,
                     favorite = ?13
                 WHERE id = ?14",
                params![
                    item.custom_id,
                    item.title,
                    item.summary,
                    item.url,
                    item.source_type,
                    item.project_name,
                    item.topic,
                    item.tags.join(", "),
                    today,
                    now,
                    item.notes,
                    item.status,
                    if item.favorite { 1 } else { 0 },
                    entry_id,
                ],
            )?;
            sync_tags(conn, entry_id, &item.tags)?;
        }
    }

    Ok(())
}

fn repair_garbled_tags(conn: &Connection) -> Result<()> {
    let mut stmt = conn.prepare(
        "SELECT e.id,
                COALESCE(e.tags_cache, ''),
                COALESCE(GROUP_CONCAT(t.name, '||'), '')
         FROM entries e
         LEFT JOIN entry_tags et ON et.entry_id = e.id
         LEFT JOIN tags t ON t.id = et.tag_id
         GROUP BY e.id",
    )?;

    let rows = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    for (entry_id, tags_cache, joined_tags) in rows {
        if !looks_garbled(&tags_cache) && !looks_garbled(&joined_tags) {
            continue;
        }

        let tags = split_tag_text(&tags_cache);
        if tags.is_empty() || tags.iter().any(|tag| looks_garbled(tag)) {
            continue;
        }
        sync_tags(conn, entry_id, &tags)?;
    }

    conn.execute(
        "DELETE FROM tags
         WHERE id NOT IN (SELECT DISTINCT tag_id FROM entry_tags)",
        [],
    )?;

    Ok(())
}

fn split_tag_text(value: &str) -> Vec<String> {
    value
        .split(|ch| [',', ';', '|', '\u{FF0C}', '\u{FF1B}', '\u{3001}'].contains(&ch))
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(str::to_string)
        .collect()
}

fn insert_demo_entry(conn: &Connection, item: &EntryPayload, now: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO entries (custom_id, title, summary, url, source_type, project_name, topic, tags_cache, conversation_date, created_at, updated_at, notes, status, favorite)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11, ?12, ?13)",
        params![
            item.custom_id,
            item.title,
            item.summary,
            item.url,
            item.source_type,
            item.project_name,
            item.topic,
            item.tags.join(", "),
            item.conversation_date,
            now,
            item.notes,
            item.status,
            if item.favorite { 1 } else { 0 },
        ],
    )?;

    let entry_id = conn.last_insert_rowid();
    sync_tags(conn, entry_id, &item.tags)?;
    Ok(())
}

fn sync_tags(conn: &Connection, entry_id: i64, tags: &[String]) -> Result<()> {
    conn.execute("DELETE FROM entry_tags WHERE entry_id = ?1", params![entry_id])?;

    for tag in tags.iter().map(|item| item.trim()).filter(|item| !item.is_empty()) {
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", params![tag])?;
        let tag_id: i64 = conn.query_row("SELECT id FROM tags WHERE name = ?1", params![tag], |row| row.get(0))?;
        conn.execute(
            "INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?1, ?2)",
            params![entry_id, tag_id],
        )?;
    }

    Ok(())
}

fn looks_garbled(value: &str) -> bool {
    value.contains('\u{fffd}')
        || value.contains("\u{951f}")
        || value.contains("\u{5be8}")
        || value.contains("\u{95c3}")
        || value.contains("\u{6d7c}")
        || value.contains("\u{7481}")
        || value.contains("\u{59d8}")
        || value.contains("\u{942e}")
}

fn demo_entries() -> Vec<EntryPayload> {
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    vec![
        EntryPayload {
            custom_id: "I001".to_string(),
            title: "\u{41}tlas-X Indexer MVP \u{62c6}\u{5206}\u{8ba1}\u{5212}".to_string(),
            summary: "\u{628a}\u{539f}\u{5148}\u{7ef4}\u{62a4}\u{5728}\u{804a}\u{5929}\u{7a97}\u{53e3}\u{91cc}\u{7684}\u{8d85}\u{957f}\u{7d22}\u{5f15}\u{8868}\u{8fc1}\u{79fb}\u{5230}\u{672c}\u{5730}\u{684c}\u{9762}\u{5e94}\u{7528}\u{ff0c}\u{4f18}\u{5148}\u{5b8c}\u{6210} SQLite\u{3001}\u{5217}\u{8868}\u{9875}\u{3001}\u{5f55}\u{5165}\u{9875}\u{548c}\u{641c}\u{7d22}\u{94fe}\u{8def}\u{3002}".to_string(),
            url: "https://chatgpt.com/share/atlas-x-demo-001".to_string(),
            source_type: "chatgpt".to_string(),
            project_name: Some("Atlas-X Index".to_string()),
            topic: Some("\u{4ea7}\u{54c1}\u{67b6}\u{6784}".to_string()),
            tags: vec!["MVP".to_string(), "\u{67b6}\u{6784}".to_string()],
            conversation_date: today.clone(),
            notes: Some("\u{8fd9}\u{662f}\u{521d}\u{59cb}\u{5316}\u{6837}\u{4f8b}\u{6570}\u{636e}\u{ff0c}\u{7528}\u{6765}\u{9a8c}\u{8bc1}\u{5217}\u{8868}\u{3001}\u{6807}\u{7b7e}\u{3001}\u{641c}\u{7d22}\u{548c}\u{8be6}\u{60c5}\u{94fe}\u{8def}\u{662f}\u{5426}\u{6b63}\u{5e38}\u{3002}".to_string()),
            status: "\u{91cd}\u{70b9}".to_string(),
            favorite: true,
        },
        EntryPayload {
            custom_id: "I002".to_string(),
            title: "ChatGPT \u{5386}\u{53f2}\u{7d22}\u{5f15}\u{5b57}\u{6bb5}\u{89c4}\u{8303}".to_string(),
            summary: "\u{7edf}\u{4e00} title\u{3001}summary\u{3001}project\u{3001}topic\u{3001}tags \u{7684}\u{586b}\u{5199}\u{65b9}\u{5f0f}\u{ff0c}\u{51cf}\u{5c11}\u{540e}\u{7eed}\u{68c0}\u{7d22}\u{548c}\u{5bfc}\u{5165}\u{65f6}\u{7684}\u{6e05}\u{6d17}\u{6210}\u{672c}\u{3002}".to_string(),
            url: "https://chatgpt.com/share/atlas-x-demo-002".to_string(),
            source_type: "chatgpt".to_string(),
            project_name: Some("\u{77e5}\u{8bc6}\u{6c89}\u{6dc0}".to_string()),
            topic: Some("\u{6574}\u{7406}\u{89c4}\u{8303}".to_string()),
            tags: vec!["\u{89c4}\u{8303}".to_string(), "\u{6807}\u{7b7e}".to_string()],
            conversation_date: today.clone(),
            notes: Some("\u{9002}\u{5408}\u{4f5c}\u{4e3a}\u{540e}\u{7eed}\u{6279}\u{91cf}\u{6574}\u{7406}\u{65f6}\u{7684}\u{547d}\u{540d}\u{4e0e}\u{6807}\u{7b7e}\u{53c2}\u{8003}\u{3002}".to_string()),
            status: "\u{5f85}\u{6574}\u{7406}".to_string(),
            favorite: false,
        },
        EntryPayload {
            custom_id: "I003".to_string(),
            title: "\u{5bfc}\u{5165}\u{5bfc}\u{51fa}\u{5b57}\u{6bb5}\u{6620}\u{5c04}\u{8bf4}\u{660e}".to_string(),
            summary: "\u{652f}\u{6301} CSV\u{3001}Excel\u{3001}JSON \u{7684}\u{5b57}\u{6bb5}\u{6620}\u{5c04}\u{3001}\u{9884}\u{89c8}\u{3001}\u{5f02}\u{5e38}\u{62a5}\u{544a}\u{548c}\u{53bb}\u{91cd}\u{7b56}\u{7565}\u{ff0c}\u{9002}\u{914d}\u{5df2}\u{6709}\u{5916}\u{90e8}\u{8868}\u{683c}\u{3002}".to_string(),
            url: "https://chatgpt.com/share/atlas-x-demo-003".to_string(),
            source_type: "manual".to_string(),
            project_name: Some("Atlas-X Index".to_string()),
            topic: Some("\u{5bfc}\u{5165}\u{5bfc}\u{51fa}".to_string()),
            tags: vec!["\u{5bfc}\u{5165}".to_string(), "\u{6620}\u{5c04}".to_string()],
            conversation_date: today,
            notes: Some("\u{7528}\u{4e8e}\u{9a8c}\u{8bc1}\u{5916}\u{90e8} Excel \u{8868}\u{683c}\u{5bfc}\u{5165}\u{3001}\u{5f02}\u{5e38}\u{62a5}\u{544a}\u{5bfc}\u{51fa}\u{548c}\u{91cd}\u{590d}\u{63d0}\u{793a}\u{3002}".to_string()),
            status: "\u{5f85}\u{6574}\u{7406}".to_string(),
            favorite: false,
        },
    ]
}
