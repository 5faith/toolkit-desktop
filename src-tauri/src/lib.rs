pub mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_mpv::init())
        .setup(|app| {
            let data_dir = commands::storage::portable_data_dir(app.handle())
                .map_err(std::io::Error::other)?;

            let config = app
                .config()
                .app
                .windows
                .first()
                .ok_or_else(|| std::io::Error::other("missing main window config"))?;

            let mut builder = tauri::WebviewWindowBuilder::from_config(app.handle(), config)?
                .data_directory(data_dir.join("webview"));

            if let Some(width) = commands::storage::read_saved_window_width(app.handle()) {
                builder = builder.inner_size(width.clamp(800.0, 3840.0), config.height);
            }

            let window = builder.build()?;

            // 关闭 WebView2 内置浏览器加速键（Ctrl+P、Ctrl+F、F5、Ctrl+R 等），
            // 避免窗口获得焦点时吞掉系统/第三方全局快捷键。
            #[cfg(windows)]
            {
                use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
                use windows_core::Interface;

                let _ = window.with_webview(|webview| unsafe {
                    let controller = webview.controller();
                    let Ok(core) = controller.CoreWebView2() else {
                        return;
                    };
                    let Ok(settings) = core.Settings() else {
                        return;
                    };
                    let Ok(settings3) = settings.cast::<ICoreWebView2Settings3>() else {
                        return;
                    };
                    let _ = settings3.SetAreBrowserAcceleratorKeysEnabled(false);
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::formatter::format_json,
            commands::formatter::format_xml,
            commands::formatter::format_yaml,
            commands::formatter::validate_json,
            commands::formatter::validate_xml,
            commands::formatter::validate_yaml,
            commands::timestamp::get_system_timestamp,
            commands::timestamp::convert_timestamp,
            commands::diff::compute_diff,
            commands::exif::read_image_exif,
            commands::exif::read_image_exif_bytes,
            commands::exif::decode_image_preview,
            commands::flv::read_local_file,
            commands::fileshare::start_file_share,
            commands::fileshare::stop_file_share,
            commands::fileshare::shutdown_residual_file_share,
            commands::fileshare::get_local_ip,
            commands::fileshare::list_network_interfaces,
            commands::fileshare::get_file_info,
            commands::fileshare::open_folder,
            commands::fileshare::save_text_file,
            commands::fileshare::copy_file_to_upload_dir,
            commands::fileshare::register_shared_file,
            commands::fileshare::unregister_shared_file,
            commands::fileshare::clear_shared_files_registry,
            commands::fileshare::list_directory_files,
            commands::storage::get_storage_path,
            commands::shortcuts::check_shortcut_conflicts,
            commands::app::open_devtools,
            commands::app::get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
