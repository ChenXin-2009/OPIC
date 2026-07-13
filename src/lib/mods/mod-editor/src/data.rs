use std::path::PathBuf;

use crate::types::{ModInfo, ModMeta};

const MODS_DIR: &str = "../";
const PUBLIC_DIR: &str = "../../../../public/mods";

pub fn discover_mods() -> Vec<ModInfo> {
    let mods_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(MODS_DIR);
    let mut mods = Vec::new();
    let entries = match std::fs::read_dir(&mods_root) {
        Ok(e) => e,
        Err(_) => return mods,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() { continue; }
        let dir_name = path.file_name().unwrap().to_string_lossy().to_string();
        if dir_name.starts_with('.') || dir_name == "mod-editor" || dir_name == "__tests__" || dir_name == "flight-renderer" { continue; }
        let manifest_path = path.join("manifest.ts");
        if !manifest_path.exists() { continue; }

        let meta = load_meta(&dir_name);
        let (name_zh, name_en, desc_zh, desc_en, version, author) = parse_manifest(&manifest_path);

        mods.push(ModInfo {
            id: dir_name,
            name_zh,
            name_en,
            description_zh: desc_zh,
            description_en: desc_en,
            version,
            author,
            meta,
        });
    }
    mods.sort_by(|a, b| a.display_name().cmp(b.display_name()));
    mods
}

fn parse_manifest(path: &PathBuf) -> (String, String, String, String, String, String) {
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return (String::new(), String::new(), String::new(), String::new(), String::new(), String::new()),
    };
    let mut name_zh = String::new();
    let mut name_en = String::new();
    let mut desc_zh = String::new();
    let mut desc_en = String::new();
    let mut version = String::new();
    let mut author = String::new();

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("nameZh:") {
            name_zh = extract_string(trimmed, "nameZh:");
        } else if trimmed.starts_with("name:") && !trimmed.contains("nameZh") {
            name_en = extract_string(trimmed, "name:");
        } else if trimmed.starts_with("descriptionZh:") {
            desc_zh = extract_string(trimmed, "descriptionZh:");
        } else if trimmed.starts_with("description:") && !trimmed.contains("descriptionZh") {
            desc_en = extract_string(trimmed, "description:");
        } else if trimmed.starts_with("version:") {
            version = extract_string(trimmed, "version:");
        } else if trimmed.starts_with("author:") {
            author = extract_string(trimmed, "author:");
        }
    }
    (name_zh, name_en, desc_zh, desc_en, version, author)
}

fn extract_string(s: &str, prefix: &str) -> String {
    let after = s.strip_prefix(prefix).unwrap_or("").trim();
    after.trim_matches('\'').trim_matches('"').trim().to_string()
}

fn meta_path(mod_id: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(MODS_DIR).join(mod_id).join("meta.json")
}

pub fn load_meta(mod_id: &str) -> ModMeta {
    let path = meta_path(mod_id);
    if path.exists() {
        std::fs::read_to_string(&path).ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        ModMeta::default()
    }
}

pub fn save_meta(mod_id: &str, meta: &ModMeta) -> Result<(), String> {
    let path = meta_path(mod_id);
    let json = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn image_output_dir(mod_id: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(PUBLIC_DIR).join(mod_id)
}

pub fn icon_output_path(mod_id: &str) -> PathBuf {
    image_output_dir(mod_id).join("icon.webp")
}

pub fn screenshot_output_path(mod_id: &str, index: usize) -> PathBuf {
    image_output_dir(mod_id).join(format!("screenshot-{}.jpg", index + 1))
}
