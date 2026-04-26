//! Vault bootstrap commands. The vault is a plaintext folder on disk that
//! holds the user's campaigns, characters, and (later) templates and
//! portraits. Default location is `~/Documents/WareMaster/`, configurable
//! via Settings.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct VaultInfo {
    pub root: String,
    pub created: bool,
}

fn default_vault_path(app: &AppHandle) -> Result<PathBuf, String> {
    let docs = app
        .path()
        .document_dir()
        .map_err(|e| format!("document dir: {}", e))?;
    Ok(docs.join("WareMaster"))
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let cfg = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("app config dir: {}", e))?;
    Ok(cfg.join("waremaster.json"))
}

#[derive(serde::Serialize, serde::Deserialize, Default)]
struct AppConfig {
    vault_root: Option<String>,
}

fn read_config(app: &AppHandle) -> AppConfig {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(_) => return AppConfig::default(),
    };
    match std::fs::read_to_string(&path) {
        Ok(text) => serde_json::from_str(&text).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

fn write_config(app: &AppHandle, cfg: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {}", parent.display(), e))?;
    }
    let text = serde_json::to_string_pretty(cfg).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| format!("write {}: {}", path.display(), e))?;
    log::info!("wrote app config: {}", path.display());
    Ok(())
}

fn ensure_vault_layout(root: &PathBuf) -> Result<bool, String> {
    let already = root.exists();
    std::fs::create_dir_all(root).map_err(|e| format!("mkdir {}: {}", root.display(), e))?;
    for sub in ["campaigns", "templates", "portraits"] {
        std::fs::create_dir_all(root.join(sub))
            .map_err(|e| format!("mkdir {}: {}", root.join(sub).display(), e))?;
    }
    let metadata = root.join("waremaster.json");
    if !metadata.exists() {
        let text = r#"{
  "schema_version": 1,
  "kind": "waremaster-vault"
}
"#;
        std::fs::write(&metadata, text)
            .map_err(|e| format!("write {}: {}", metadata.display(), e))?;
    }
    Ok(!already)
}

#[tauri::command]
pub async fn vault_get_root(app: AppHandle) -> Result<Option<String>, String> {
    let cfg = read_config(&app);
    if let Some(r) = cfg.vault_root.as_ref() {
        log::info!("vault_get_root from config: {}", r);
    } else {
        log::info!(
            "vault_get_root: no saved root in {}",
            config_path(&app)
                .map(|p| p.display().to_string())
                .unwrap_or_else(|e| e)
        );
    }
    Ok(cfg.vault_root)
}

#[tauri::command]
pub async fn vault_get_default_root(app: AppHandle) -> Result<String, String> {
    let p = default_vault_path(&app)?;
    Ok(p.to_string_lossy().to_string())
}

/// Returns the default vault path **only if** an existing vault is detected
/// there (i.e. `waremaster.json` is present). Used as a fallback when the
/// app config is missing — the user shouldn't have to re-pick the vault on
/// every launch.
#[tauri::command]
pub async fn vault_detect_existing(app: AppHandle) -> Result<Option<String>, String> {
    let p = default_vault_path(&app)?;
    let marker = p.join("waremaster.json");
    if marker.exists() {
        Ok(Some(p.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn vault_initialize(app: AppHandle, root: String) -> Result<VaultInfo, String> {
    let path = PathBuf::from(&root);
    let created = ensure_vault_layout(&path)?;
    let mut cfg = read_config(&app);
    cfg.vault_root = Some(root.clone());
    write_config(&app, &cfg)?;
    Ok(VaultInfo { root, created })
}

/// Resolve a vault-relative path under the configured vault root, blocking
/// path traversal and absolute paths. Returns the absolute path on the host.
fn resolve_in_vault(app: &AppHandle, relative: &str) -> Result<PathBuf, String> {
    let cfg = read_config(app);
    let root = cfg
        .vault_root
        .ok_or_else(|| "vault root not configured".to_string())?;
    let root = PathBuf::from(root);
    let normalized = relative.replace('\\', "/");
    if normalized.starts_with('/') || normalized.contains("..") {
        return Err(format!("disallowed vault path: {}", relative));
    }
    Ok(root.join(normalized))
}

#[tauri::command]
pub async fn vault_read_text(app: AppHandle, relative: String) -> Result<String, String> {
    let path = resolve_in_vault(&app, &relative)?;
    std::fs::read_to_string(&path).map_err(|e| format!("read {}: {}", path.display(), e))
}

#[tauri::command]
pub async fn vault_write_text(
    app: AppHandle,
    relative: String,
    contents: String,
) -> Result<(), String> {
    let path = resolve_in_vault(&app, &relative)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("mkdir {}: {}", parent.display(), e))?;
    }
    std::fs::write(&path, contents).map_err(|e| format!("write {}: {}", path.display(), e))
}

#[tauri::command]
pub async fn vault_mkdir(app: AppHandle, relative: String) -> Result<(), String> {
    let path = resolve_in_vault(&app, &relative)?;
    std::fs::create_dir_all(&path).map_err(|e| format!("mkdir {}: {}", path.display(), e))
}

#[tauri::command]
pub async fn vault_remove(app: AppHandle, relative: String) -> Result<(), String> {
    let path = resolve_in_vault(&app, &relative)?;
    if !path.exists() {
        return Ok(());
    }
    if path.is_dir() {
        std::fs::remove_dir_all(&path)
            .map_err(|e| format!("rm -r {}: {}", path.display(), e))
    } else {
        std::fs::remove_file(&path).map_err(|e| format!("rm {}: {}", path.display(), e))
    }
}

#[tauri::command]
pub async fn vault_exists(app: AppHandle, relative: String) -> Result<bool, String> {
    let path = resolve_in_vault(&app, &relative)?;
    Ok(path.exists())
}

#[tauri::command]
pub async fn vault_list_dir(app: AppHandle, relative: String) -> Result<Vec<String>, String> {
    let path = resolve_in_vault(&app, &relative)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let mut entries = Vec::new();
    for entry in std::fs::read_dir(&path)
        .map_err(|e| format!("readdir {}: {}", path.display(), e))?
    {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            entries.push(name.to_string());
        }
    }
    entries.sort();
    Ok(entries)
}

const MAX_PORTRAIT_BYTES: u64 = 5 * 1024 * 1024;
const ALLOWED_PORTRAIT_EXTS: &[&str] = &["png", "jpg", "jpeg", "webp"];

/// Copy a user-picked image file into the vault. Source path is absolute (the
/// dialog plugin returns an arbitrary host path — outside the vault scope by
/// design); destination is vault-relative and goes through `resolve_in_vault`
/// for path-traversal safety. Validates extension and size before writing.
#[tauri::command]
pub async fn vault_copy_file(
    app: AppHandle,
    source_abs: String,
    relative_dest: String,
) -> Result<(), String> {
    let src = PathBuf::from(&source_abs);
    if !src.exists() {
        return Err(format!("source not found: {}", source_abs));
    }
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    if !ALLOWED_PORTRAIT_EXTS.contains(&ext.as_str()) {
        return Err(format!(
            "unsupported image format \"{}\" (allowed: {})",
            ext,
            ALLOWED_PORTRAIT_EXTS.join(", ")
        ));
    }
    let metadata = std::fs::metadata(&src)
        .map_err(|e| format!("stat {}: {}", src.display(), e))?;
    if metadata.len() > MAX_PORTRAIT_BYTES {
        return Err(format!(
            "image is {} bytes; max {} bytes (~5 MB)",
            metadata.len(),
            MAX_PORTRAIT_BYTES
        ));
    }
    let dest = resolve_in_vault(&app, &relative_dest)?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("mkdir {}: {}", parent.display(), e))?;
    }
    std::fs::copy(&src, &dest)
        .map_err(|e| format!("copy {} → {}: {}", src.display(), dest.display(), e))?;
    log::info!("copied portrait: {} → {}", src.display(), dest.display());
    Ok(())
}
