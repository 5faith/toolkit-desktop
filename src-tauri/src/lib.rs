pub mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_mpv::init())
        .invoke_handler(tauri::generate_handler![
            commands::formatter::format_json,
            commands::formatter::format_xml,
            commands::formatter::validate_json,
            commands::formatter::validate_xml,
            commands::timestamp::get_system_timestamp,
            commands::timestamp::convert_timestamp,
            commands::diff::compute_diff,
            commands::exif::read_image_exif,
            commands::flv::read_local_file,
            commands::fileshare::start_file_share,
            commands::fileshare::stop_file_share,
            commands::fileshare::get_local_ip,
            commands::fileshare::list_network_interfaces,
            commands::fileshare::get_file_info,
            commands::fileshare::open_folder,
            commands::fileshare::save_text_file,
            commands::fileshare::copy_file_to_upload_dir,
            commands::fileshare::register_shared_file,
            commands::fileshare::unregister_shared_file,
            commands::fileshare::clear_shared_files_registry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
