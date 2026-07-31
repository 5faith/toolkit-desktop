use chrono::{DateTime, Utc};

#[tauri::command]
pub fn get_system_timestamp() -> Result<u64, String> {
    Ok(Utc::now().timestamp_millis() as u64)
}

#[tauri::command]
pub fn convert_timestamp(ts: u64, tz: &str) -> Result<String, String> {
    let datetime = DateTime::from_timestamp_millis(ts as i64).ok_or("Invalid timestamp")?;

    if tz == "UTC" {
        return Ok(datetime.format("%Y-%m-%d %H:%M:%S").to_string());
    }

    Ok(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
}
