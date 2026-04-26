use std::fs;
use std::path::Path;

fn main() {
    // Source-of-truth game data lives in `<repo>/docs/`. Mirror it into
    // `src-tauri/resources/` at build time so Tauri's resource bundler can
    // ship it inside the binary. The mirror is a build artifact (gitignored).
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR");
    let crate_dir = Path::new(&manifest_dir);
    let docs_dir = crate_dir
        .parent()
        .expect("expected src-tauri/ to have a parent")
        .join("docs");
    let resources_dir = crate_dir.join("resources");

    println!("cargo:rerun-if-changed={}", docs_dir.display());

    let _ = fs::remove_dir_all(&resources_dir);
    fs::create_dir_all(&resources_dir).expect("create resources dir");
    copy_dir(&docs_dir.join("data"), &resources_dir.join("data"))
        .expect("mirror docs/data");
    copy_dir(&docs_dir.join("rules"), &resources_dir.join("rules"))
        .expect("mirror docs/rules");

    tauri_build::build()
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir(&entry.path(), &dst_path)?;
        } else if file_type.is_file() {
            fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}
