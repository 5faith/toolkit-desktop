pub mod commands;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::formatter::format_json,
            commands::formatter::format_xml,
            commands::formatter::validate_json,
            commands::formatter::validate_xml,
            commands::timestamp::get_system_timestamp,
            commands::timestamp::convert_timestamp,
            commands::diff::compute_diff,
            commands::flv::read_local_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
