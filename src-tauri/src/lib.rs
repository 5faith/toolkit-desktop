pub mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::formatter::format_json,
            commands::formatter::format_xml,
            commands::formatter::validate_json,
            commands::formatter::validate_xml,
            commands::timestamp::get_system_timestamp,
            commands::timestamp::convert_timestamp,
            commands::diff::compute_diff,
            commands::flv::read_local_file,
            commands::fileshare::start_file_share,
            commands::fileshare::stop_file_share,
            commands::fileshare::get_local_ip,
            commands::fileshare::list_network_interfaces,
            commands::fileshare::get_file_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
