mod capture_server;
mod commands;
mod db;
mod models;
mod repositories;

use anyhow::anyhow;
use capture_server::start_capture_server;
use commands::entry_commands::{
    approve_capture_inbox_item, backup_database, bulk_add_tags, bulk_update_status, create_entry,
    delete_entries, delete_saved_filter, discard_capture_inbox_items, get_app_settings,
    get_dashboard_overview, get_entry_by_id, get_entry_form_meta, import_entries,
    list_capture_inbox, list_entries, list_recent_searches, list_saved_filters, record_export_log,
    restore_database, save_app_settings, save_filter, track_recent_access, update_capture_inbox_item, update_entry, AppState,
};
use db::manager::DbManager;
use tauri::{Manager, WindowEvent};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use std::path::PathBuf;

fn portable_data_dir() -> Option<PathBuf> {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.join("data")))
}

fn initialize_database(app: &mut tauri::App) -> anyhow::Result<PathBuf> {
    let primary_path = app.path().app_data_dir()?.join("atlas-x-indexer.db");
    match DbManager::initialize(&primary_path) {
        Ok(_) => Ok(primary_path),
        Err(primary_error) => {
            let fallback_path = portable_data_dir()
                .ok_or_else(|| anyhow!("unable to resolve portable data directory"))?
                .join("atlas-x-indexer.db");
            DbManager::initialize(&fallback_path).map(|_| fallback_path.clone()).map_err(|fallback_error| {
                anyhow!(
                    "unable to initialize database at {} ({}) or {} ({})",
                    primary_path.display(),
                    primary_error,
                    fallback_path.display(),
                    fallback_error
                )
            })
        }
    }
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "\u{6253}\u{5f00}\u{4e3b}\u{754c}\u{9762}", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "\u{9690}\u{85cf}\u{5230}\u{6258}\u{76d8}", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "\u{9000}\u{51fa}", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;
    let icon = app.default_window_icon().cloned();

    let mut builder = TrayIconBuilder::new()
        .tooltip("Atlas-X Indexer")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = icon {
        builder = builder.icon(icon);
    }

    builder.build(app)?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = initialize_database(app)?;
            start_capture_server(db_path.clone());
            app.manage(AppState { db_path });
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            get_dashboard_overview,
            list_entries,
            get_entry_by_id,
            get_entry_form_meta,
            create_entry,
            update_entry,
            delete_entries,
            bulk_add_tags,
            bulk_update_status,
            track_recent_access,
            import_entries,
            record_export_log,
            list_saved_filters,
            save_filter,
            delete_saved_filter,
            list_recent_searches,
            backup_database,
            restore_database,
            get_app_settings,
            save_app_settings,
            list_capture_inbox,
            update_capture_inbox_item,
            approve_capture_inbox_item,
            discard_capture_inbox_items
        ])
        .run(tauri::generate_context!())
        .expect("error while running Atlas-X Indexer");
}

