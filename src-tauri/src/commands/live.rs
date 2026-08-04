#[tauri::command]
pub async fn start_stream_proxy(url: String, protocol: String) -> Result<u16, String> {
    crate::stream::proxy::start_proxy(url, protocol).await
}

#[tauri::command]
pub async fn stop_stream_proxy() -> Result<(), String> {
    crate::stream::proxy::stop_proxy().await
}
