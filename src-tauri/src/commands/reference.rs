//! Serves the bundled Wares Blade reference data (YAML) and rule chapters
//! (Markdown) to the frontend.
//!
//! In debug builds the files are read directly from `docs/` next to the
//! src-tauri crate so that edits hot-reload without a Rust rebuild. In release
//! builds they are read from the Tauri resource directory.

use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const DATA_FILES: &[&str] = &[
    "classes.yaml",
    "skills.yaml",
    "weapons.yaml",
    "armor.yaml",
    "general-goods.yaml",
    "ryude-units.yaml",
    "ryude-equipment.yaml",
    "beastiary.yaml",
    "tables.yaml",
    "techniques/word-casting-gateless.yaml",
    "techniques/word-casting-sun.yaml",
    "techniques/word-casting-metal.yaml",
    "techniques/word-casting-fire.yaml",
    "techniques/word-casting-wood.yaml",
    "techniques/word-casting-moon.yaml",
    "techniques/word-casting-wind.yaml",
    "techniques/word-casting-water.yaml",
    "techniques/word-casting-earth.yaml",
    "techniques/numetic-arts.yaml",
    "techniques/invocations.yaml",
];

const RULE_FILES: &[&str] = &[
    "01-introduction.md",
    "02-world-of-ahan.md",
    "03-character-creation.md",
    "04-attributes-and-derived.md",
    "05-skills.md",
    "06-equipment.md",
    "07-action-rolls.md",
    "08-combat.md",
    "09-damage-and-healing.md",
    "10-advancement.md",
    "11-word-casting.md",
    "12-numetic-arts.md",
    "13-invocations.md",
    "14-ryude.md",
    "15-units-and-glossary.md",
];

/// Whether to look in `docs/` (dev) or in the bundled resource dir (release).
fn dev_docs_root() -> Option<PathBuf> {
    // Compile-time constant pointing at the src-tauri crate dir; works during
    // dev because the binary runs from the source tree.
    let manifest = env!("CARGO_MANIFEST_DIR");
    let docs = Path::new(manifest).parent()?.join("docs");
    if docs.exists() {
        Some(docs)
    } else {
        None
    }
}

fn resolve(app: &AppHandle, kind: &str, relative: &str) -> Result<PathBuf, String> {
    if cfg!(debug_assertions) {
        if let Some(root) = dev_docs_root() {
            let path = root.join(kind).join(relative);
            if path.exists() {
                return Ok(path);
            }
        }
    }
    app.path()
        .resolve(
            format!("resources/{}/{}", kind, relative),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|e| format!("resolve {}/{}: {}", kind, relative, e))
}

fn validate(allowed: &[&str], relative: &str) -> Result<(), String> {
    let normalized = relative.replace('\\', "/");
    if !allowed.iter().any(|f| *f == normalized) {
        return Err(format!("not an allowed reference file: {}", relative));
    }
    if normalized.contains("..") {
        return Err(format!("path traversal blocked: {}", relative));
    }
    Ok(())
}

#[tauri::command]
pub async fn list_data_files() -> Vec<String> {
    DATA_FILES.iter().map(|s| s.to_string()).collect()
}

#[tauri::command]
pub async fn list_rule_files() -> Vec<String> {
    RULE_FILES.iter().map(|s| s.to_string()).collect()
}

#[tauri::command]
pub async fn read_data_file(app: AppHandle, relative: String) -> Result<String, String> {
    validate(DATA_FILES, &relative)?;
    let path = resolve(&app, "data", &relative)?;
    std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {}", path.display(), e))
}

#[tauri::command]
pub async fn read_rule_file(app: AppHandle, relative: String) -> Result<String, String> {
    validate(RULE_FILES, &relative)?;
    let path = resolve(&app, "rules", &relative)?;
    std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {}", path.display(), e))
}
