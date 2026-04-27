//! Bundled portrait serving (Phase 4).
//!
//! Bundled placeholder portraits live under `src-tauri/resources/portraits/`
//! and are served via the Tauri asset protocol. The frontend calls
//! `bundled_portrait_url(kind, key)` to get an absolute host path, then wraps
//! it with `convertFileSrc()` to render in `<img>`. Mirrors the dev-vs-prod
//! resolver pattern from `reference.rs`.

use std::path::{Path, PathBuf};
use base64::Engine as _;
use serde::Serialize;
use tauri::{AppHandle, Manager};

const KINDS: &[&str] = &["classes", "monsters", "ryude", "npc"];

const CLASS_KEYS: &[&str] = &["warrior", "word-caster", "spiritualist", "tradesfolk"];

const MONSTER_KEYS: &[&str] = &[
    "rank-A",
    "rank-B",
    "rank-C",
    "rank-D",
    "rank-E",
    "unknown",
    "tusktooth",
    "old-fang",
    "metal-chimaera",
    "magu-draph",
    "metal-chimaera-4-armed",
    "giant-mantis-shrimp",
    "skeleton",
];

const RYUDE_KEYS: &[&str] = &[
    "footman",
    "courser",
    "maledictor",
    "unknown",
    "az-cude",
    "maltu-ragorsu",
    "gisah-sharukann",
];

const NPC_KEYS: &[&str] = &[
    "merchant",
    "courtier",
    "bystander",
    "envoy",
    "retainer",
    "laborer",
    "beast",
    "full-character",
    "unknown",
];

#[derive(Serialize, Clone)]
pub struct BundledPortrait {
    pub key: String,
    pub label: String,
}

fn dev_resources_root() -> Option<PathBuf> {
    let manifest = env!("CARGO_MANIFEST_DIR");
    let resources = Path::new(manifest).join("resources");
    if resources.exists() {
        Some(resources)
    } else {
        None
    }
}

fn allowlist_for(kind: &str) -> Result<&'static [&'static str], String> {
    match kind {
        "classes" => Ok(CLASS_KEYS),
        "monsters" => Ok(MONSTER_KEYS),
        "ryude" => Ok(RYUDE_KEYS),
        "npc" => Ok(NPC_KEYS),
        _ => Err(format!("unknown portrait kind: {}", kind)),
    }
}

fn validate(kind: &str, key: &str) -> Result<(), String> {
    let normalized = key.replace('\\', "/");
    if normalized.contains("..") || normalized.contains('/') {
        return Err(format!("path traversal blocked: {}", key));
    }
    let allowed = allowlist_for(kind)?;
    if !allowed.iter().any(|k| *k == normalized) {
        return Err(format!("not an allowed portrait key: {}/{}", kind, key));
    }
    Ok(())
}

fn resolve_portrait(app: &AppHandle, kind: &str, key: &str) -> Result<PathBuf, String> {
    let relative = format!("portraits/{}/{}.png", kind, key);
    if cfg!(debug_assertions) {
        if let Some(root) = dev_resources_root() {
            let path = root.join(&relative);
            if path.exists() {
                return Ok(path);
            }
        }
    }
    app.path()
        .resolve(
            format!("resources/{}", relative),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| format!("resolve {}: {}", relative, e))
}

fn humanize(key: &str) -> String {
    key.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Load a bundled portrait and return it as a base64 data URL
/// (`data:image/png;base64,...`). The frontend can use the result directly as
/// an `<img src>` without going through the Tauri asset protocol, which avoids
/// scope-mismatch issues between dev and production resource paths.
#[tauri::command]
pub async fn bundled_portrait_url(
    app: AppHandle,
    kind: String,
    key: String,
) -> Result<String, String> {
    validate(&kind, &key)?;
    let path = resolve_portrait(&app, &kind, &key)?;
    if !path.exists() {
        return Err(format!("bundled portrait not found: {}/{}", kind, key));
    }
    let bytes = std::fs::read(&path)
        .map_err(|e| format!("read portrait {}/{}: {}", kind, key, e))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

/// List the bundled portraits available for a given kind so the picker UI
/// can offer a "choose a default" alternative to file upload.
#[tauri::command]
pub async fn list_bundled_portraits(kind: String) -> Result<Vec<BundledPortrait>, String> {
    let keys = allowlist_for(&kind)?;
    Ok(keys
        .iter()
        .map(|k| BundledPortrait {
            key: k.to_string(),
            label: humanize(k),
        })
        .collect())
}

/// List the supported portrait kinds.
#[tauri::command]
pub async fn list_portrait_kinds() -> Vec<String> {
    KINDS.iter().map(|s| s.to_string()).collect()
}
