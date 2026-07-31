use similar::{ChangeTag, TextDiff};

#[tauri::command]
pub fn compute_diff(left: &str, right: &str) -> Result<String, String> {
    let diff = TextDiff::from_lines(left, right);

    let mut result = String::new();
    for change in diff.iter_all_changes() {
        let sign = match change.tag() {
            ChangeTag::Delete => "-",
            ChangeTag::Insert => "+",
            ChangeTag::Equal => " ",
        };
        result.push_str(&format!("{}{}", sign, change));
    }

    Ok(result)
}
