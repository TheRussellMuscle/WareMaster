mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::reference::list_data_files,
            commands::reference::list_rule_files,
            commands::reference::read_data_file,
            commands::reference::read_rule_file,
            commands::vault::vault_get_root,
            commands::vault::vault_get_default_root,
            commands::vault::vault_detect_existing,
            commands::vault::vault_initialize,
            commands::vault::vault_read_text,
            commands::vault::vault_write_text,
            commands::vault::vault_mkdir,
            commands::vault::vault_remove,
            commands::vault::vault_exists,
            commands::vault::vault_list_dir,
            commands::vault::vault_copy_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
