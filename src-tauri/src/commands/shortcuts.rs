use serde::Serialize;

#[cfg(windows)]
use windows::Win32::Foundation::ERROR_HOTKEY_ALREADY_REGISTERED;
#[cfg(windows)]
use windows::Win32::UI::Input::KeyboardAndMouse::{
    RegisterHotKey, UnregisterHotKey, HOT_KEY_MODIFIERS, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT,
    MOD_SHIFT,
};

#[derive(Serialize)]
pub struct ShortcutConflict {
    pub shortcut: String,
    pub reason: String,
}

/// 通过临时注册全局热键判断组合是否已被系统或其他软件占用。
#[cfg(windows)]
#[tauri::command]
pub fn check_shortcut_conflicts(shortcuts: Vec<String>) -> Vec<ShortcutConflict> {
    let mut conflicts = Vec::new();

    for (index, shortcut) in shortcuts.iter().enumerate() {
        let Some((modifiers, vk)) = parse_shortcut(shortcut) else {
            continue;
        };

        let id = 0xB000 + index as i32;
        match unsafe { RegisterHotKey(None, id, modifiers | MOD_NOREPEAT, vk) } {
            Ok(()) => unsafe {
                let _ = UnregisterHotKey(None, id);
            },
            Err(err) => {
                let code = err.code().0 as u32;
                let reason = if code & 0xFFFF == ERROR_HOTKEY_ALREADY_REGISTERED.0 {
                    "已被系统或其他软件占用"
                } else {
                    "系统不支持该组合"
                };
                conflicts.push(ShortcutConflict {
                    shortcut: shortcut.clone(),
                    reason: reason.to_string(),
                });
            }
        }
    }

    conflicts
}

#[cfg(not(windows))]
#[tauri::command]
pub fn check_shortcut_conflicts(_shortcuts: Vec<String>) -> Vec<ShortcutConflict> {
    Vec::new()
}

#[cfg(windows)]
fn parse_shortcut(value: &str) -> Option<(HOT_KEY_MODIFIERS, u32)> {
    let mut modifiers = HOT_KEY_MODIFIERS(0);
    let mut key = None;

    for part in value
        .split('+')
        .map(str::trim)
        .filter(|part| !part.is_empty())
    {
        match part.to_ascii_lowercase().as_str() {
            "ctrl" | "control" => modifiers |= MOD_CONTROL,
            "shift" => modifiers |= MOD_SHIFT,
            "alt" => modifiers |= MOD_ALT,
            _ => {
                if key.is_some() {
                    return None;
                }
                key = Some(vk_from_key(part)?);
            }
        }
    }

    Some((modifiers, key?))
}

#[cfg(windows)]
fn vk_from_key(key: &str) -> Option<u32> {
    let upper = key.to_ascii_uppercase();

    let special = match upper.as_str() {
        "BACKSPACE" => 0x08,
        "TAB" => 0x09,
        "ENTER" => 0x0D,
        "ESC" | "ESCAPE" => 0x1B,
        "SPACE" => 0x20,
        "PAGEUP" => 0x21,
        "PAGEDOWN" => 0x22,
        "END" => 0x23,
        "HOME" => 0x24,
        "LEFT" | "ARROWLEFT" => 0x25,
        "UP" | "ARROWUP" => 0x26,
        "RIGHT" | "ARROWRIGHT" => 0x27,
        "DOWN" | "ARROWDOWN" => 0x28,
        "PRINTSCREEN" | "PRTSC" => 0x2C,
        "INSERT" => 0x2D,
        "DELETE" | "DEL" => 0x2E,
        "/" => 0xBF,
        "-" => 0xBD,
        "=" => 0xBB,
        "[" => 0xDB,
        "]" => 0xDD,
        ";" => 0xBA,
        "'" => 0xDE,
        "," => 0xBC,
        "." => 0xBE,
        "`" => 0xC0,
        "\\" => 0xDC,
        _ => 0,
    };

    if special != 0 {
        return Some(special);
    }

    if upper.len() == 1 {
        let ch = upper.as_bytes()[0];
        if ch.is_ascii_alphanumeric() {
            return Some(ch as u32);
        }
    }

    if let Some(number) = upper.strip_prefix('F').and_then(|n| n.parse::<u32>().ok()) {
        if (1..=24).contains(&number) {
            return Some(0x70 + number - 1);
        }
    }

    None
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        RegisterHotKey, UnregisterHotKey, MOD_CONTROL, MOD_SHIFT,
    };

    #[test]
    fn parses_common_shortcuts() {
        for shortcut in ["Ctrl+Shift+D", "Ctrl+/", "Ctrl+PageDown", "Ctrl+1", "F12"] {
            assert!(parse_shortcut(shortcut).is_some(), "{shortcut}");
        }
    }

    #[test]
    fn reports_registered_hotkey() {
        let id = 0x7F01;
        let modifiers = MOD_CONTROL | MOD_SHIFT;
        unsafe { RegisterHotKey(None, id, modifiers, 0x87) }.unwrap();

        let conflicts = check_shortcut_conflicts(vec!["Ctrl+Shift+F24".into()]);
        unsafe {
            let _ = UnregisterHotKey(None, id);
        }

        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].shortcut, "Ctrl+Shift+F24");
    }
}
