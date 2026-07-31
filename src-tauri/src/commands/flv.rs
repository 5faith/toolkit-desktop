use std::fs;

#[tauri::command]
pub fn read_local_file(path: &str) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|e| e.to_string())
}
