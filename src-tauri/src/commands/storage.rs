use std::fs;
use std::path::PathBuf;

use tauri::Manager;

/// 软件目录下的数据目录：优先使用可执行文件旁的 data 目录，
/// 不可写时回退到系统本地数据目录。
pub fn portable_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let dir = parent.join("data");
            if fs::create_dir_all(&dir).is_ok() {
                let probe = dir.join(".write-test");
                if fs::write(&probe, b"").is_ok() {
                    let _ = fs::remove_file(&probe);
                    return Ok(dir);
                }
            }
        }
    }

    let fallback = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("data");
    fs::create_dir_all(&fallback).map_err(|e| e.to_string())?;
    Ok(fallback)
}

/// 读取用户上次手动调整的窗口宽度；文件不存在或格式异常时返回 None。
pub fn read_saved_window_width(app: &tauri::AppHandle) -> Option<f64> {
    let dir = portable_data_dir(app).ok()?;
    let content = fs::read_to_string(dir.join("toolkit.json")).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;
    value.get("window:width").and_then(|width| width.as_f64())
}

/// 返回配置文件路径，并在首次启动时从旧的应用数据目录迁移。
#[tauri::command]
pub fn get_storage_path(app: tauri::AppHandle) -> Result<String, String> {
    let dir = portable_data_dir(&app)?;
    let target = dir.join("toolkit.json");

    if !target.exists() {
        if let Ok(legacy_dir) = app.path().app_data_dir() {
            let legacy = legacy_dir.join("toolkit.json");
            if legacy.exists() {
                let _ = fs::copy(legacy, &target);
            }
        }
    }

    Ok(target.to_string_lossy().to_string())
}
