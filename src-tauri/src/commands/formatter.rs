use serde_json::Value;

#[tauri::command]
pub fn format_json(input: &str, indent: usize) -> Result<String, String> {
    let parsed: Value = serde_json::from_str(input).map_err(|e| e.to_string())?;
    if indent == 0 {
        serde_json::to_string(&parsed).map_err(|e| e.to_string())
    } else {
        serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn format_xml(input: &str) -> Result<String, String> {
    let mut reader = quick_xml::Reader::from_str(input);
    let mut writer = quick_xml::Writer::new_with_indent(Vec::new(), b' ', 2);
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Eof) => break,
            Ok(event) => {
                writer.write_event(event).map_err(|e| e.to_string())?;
            }
            Err(e) => return Err(e.to_string()),
        }
        buf.clear();
    }

    String::from_utf8(writer.into_inner()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn validate_json(input: &str) -> Result<bool, String> {
    match serde_json::from_str::<Value>(input) {
        Ok(_) => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn validate_xml(input: &str) -> Result<bool, String> {
    let mut reader = quick_xml::Reader::from_str(input);
    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(quick_xml::events::Event::Eof) => return Ok(true),
            Ok(_) => {}
            Err(e) => return Err(e.to_string()),
        }
        buf.clear();
    }
}
