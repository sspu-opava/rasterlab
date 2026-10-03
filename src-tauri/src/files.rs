use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const MAX_ASSET: usize = 100 * 1024 * 1024;
const MAX_PROJECT: usize = 300 * 1024 * 1024;

#[derive(Deserialize, Serialize)]
pub struct AssetBytes {
    id: String,
    bytes: Vec<u8>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct AssetEntry {
    id: String,
    mime_type: String,
    file: String,
    data_url: Option<String>,
}
#[derive(Deserialize)]
struct Manifest {
    format: String,
    version: u32,
    assets: Vec<AssetEntry>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedProject {
    project_json: String,
    assets: Vec<AssetBytes>,
}

fn manifest(json: &str) -> Result<Manifest, String> {
    if json.len() > MAX_PROJECT {
        return Err("Projekt je příliš velký.".into());
    }
    let manifest: Manifest = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if manifest.format != "rasterlab"
        || ![1, 2, 3].contains(&manifest.version)
        || manifest.assets.len() > 100
    {
        return Err("Nepodporovaný formát projektu.".into());
    }
    let mut ids = std::collections::HashSet::new();
    for asset in &manifest.assets {
        if asset.id.is_empty()
            || asset.id.len() > 80
            || !asset
                .id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-')
            || !ids.insert(&asset.id)
        {
            return Err("Neplatné ID assetu.".into());
        }
        let extension = match asset.mime_type.as_str() {
            "image/png" => "png",
            "image/jpeg" => "jpg",
            "image/webp" => "webp",
            _ => return Err("Neplatný formát assetu.".into()),
        };
        if asset.file != format!("assets/{}.{}", asset.id, extension) {
            return Err("Neplatná cesta assetu.".into());
        }
    }
    Ok(manifest)
}
fn project_root(path: &Path) -> Result<PathBuf, String> {
    if path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
        != Some("json".into())
    {
        return Err("Projekt musí mít příponu .json.".into());
    }
    path.parent()
        .ok_or("Chybí adresář projektu.")?
        .canonicalize()
        .map_err(|e| e.to_string())
}
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let temporary = path.with_extension(format!(
        "rasterlab-{}-{}.tmp",
        std::process::id(),
        timestamp
    ));
    let mut file = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| e.to_string())?;
    let result = (|| {
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project(
    path: String,
    project_json: String,
    assets: Vec<AssetBytes>,
) -> Result<(), String> {
    let parsed = manifest(&project_json)?;
    let destination = Path::new(&path);
    let root = project_root(destination)?;
    let directory = root.join("assets");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let canonical = directory.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(&root) {
        return Err("Adresář assets opouští projektovou složku.".into());
    }
    if assets.iter().map(|asset| asset.bytes.len()).sum::<usize>() > MAX_PROJECT {
        return Err("Projekt je příliš velký.".into());
    }
    for entry in &parsed.assets {
        let asset = assets
            .iter()
            .find(|asset| asset.id == entry.id)
            .ok_or("Chybí data obrázku.")?;
        if asset.bytes.len() > MAX_ASSET {
            return Err("Obrázek je příliš velký.".into());
        }
        let filename = root.join(&entry.file);
        if filename.exists() {
            if !filename
                .canonicalize()
                .map_err(|e| e.to_string())?
                .starts_with(&canonical)
            {
                return Err("Asset opouští projektovou složku.".into());
            }
            if fs::read(&filename).map_err(|e| e.to_string())? != asset.bytes {
                return Err("Kolize ID existujícího assetu.".into());
            }
        } else {
            atomic_write(&filename, &asset.bytes)?;
        }
    }
    // Commit the manifest last. Failed writes leave the previous project readable.
    atomic_write(destination, project_json.as_bytes())
}

#[tauri::command]
pub fn load_project(path: String) -> Result<LoadedProject, String> {
    let source = Path::new(&path);
    let root = project_root(source)?;
    if fs::metadata(source).map_err(|e| e.to_string())?.len() > MAX_PROJECT as u64 {
        return Err("Projekt je příliš velký.".into());
    }
    let project_json = fs::read_to_string(source).map_err(|e| e.to_string())?;
    let parsed = manifest(&project_json)?;
    let mut assets = Vec::new();
    let mut total = 0;
    for entry in parsed.assets {
        if entry.data_url.is_some() {
            continue;
        }
        let file = root
            .join(&entry.file)
            .canonicalize()
            .map_err(|e| format!("Chybí obrázek {}: {}", entry.id, e))?;
        let asset_directory = root
            .join("assets")
            .canonicalize()
            .map_err(|e| e.to_string())?;
        if !asset_directory.starts_with(&root) || !file.starts_with(asset_directory) {
            return Err("Asset opouští projektovou složku.".into());
        }
        let size = fs::metadata(&file).map_err(|e| e.to_string())?.len() as usize;
        total += size;
        if size > MAX_ASSET || total > MAX_PROJECT {
            return Err("Projekt je příliš velký.".into());
        }
        assets.push(AssetBytes {
            id: entry.id,
            bytes: fs::read(file).map_err(|e| e.to_string())?,
        });
    }
    Ok(LoadedProject {
        project_json,
        assets,
    })
}

#[tauri::command]
pub fn write_export(path: String, bytes: Vec<u8>) -> Result<(), String> {
    let destination = Path::new(&path);
    let extension = destination
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if !["png", "jpg", "jpeg", "webp"].contains(&extension.as_str()) || bytes.len() > MAX_PROJECT {
        return Err("Neplatný export.".into());
    }
    atomic_write(destination, &bytes)
}

#[tauri::command]
pub fn write_preset(path: String, preset_json: String) -> Result<(), String> {
    let destination = Path::new(&path);
    if !destination
        .extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("json"))
        || preset_json.len() > 1024 * 1024
    {
        return Err("Neplatná cesta nebo velikost presetu.".into());
    }
    let value: serde_json::Value =
        serde_json::from_str(&preset_json).map_err(|_| "Neplatný JSON presetu.".to_string())?;
    let effects = value.get("effects").and_then(|items| items.as_array());
    let roles = value.get("roles").and_then(|items| items.as_array());
    if value.get("format").and_then(|item| item.as_str()) != Some("rasterlab-preset")
        || value.get("version").and_then(|item| item.as_u64()) != Some(1)
        || !effects.is_some_and(|items| !items.is_empty() && items.len() <= 32)
        || !roles.is_some_and(|items| items.len() <= 32)
    {
        return Err("Nepodporovaný formát presetu.".into());
    }
    atomic_write(destination, preset_json.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_traversal_and_future_versions() {
        assert!(manifest(r#"{"format":"rasterlab","version":4,"assets":[]}"#).is_err());
        assert!(manifest(r#"{"format":"rasterlab","version":1,"assets":[{"id":"a","mimeType":"image/png","file":"../secret.png"}]}"#).is_err());
    }
    #[test]
    fn project_roundtrip_and_overwrite() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let directory = std::env::temp_dir().join(format!(
            "rasterlab-test-{}-{}",
            std::process::id(),
            timestamp
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory
            .join("project.json")
            .to_string_lossy()
            .into_owned();
        let json = r#"{"format":"rasterlab","version":1,"assets":[{"id":"a","mimeType":"image/png","file":"assets/a.png"}]}"#;
        for _ in 0..2 {
            save_project(
                path.clone(),
                json.into(),
                vec![AssetBytes {
                    id: "a".into(),
                    bytes: vec![1, 2, 3],
                }],
            )
            .unwrap();
        }
        let loaded = load_project(path).unwrap();
        assert_eq!(loaded.project_json, json);
        assert_eq!(loaded.assets[0].bytes, vec![1, 2, 3]);
        fs::remove_dir_all(directory).unwrap();
    }
    #[test]
    fn generated_v2_project_without_assets_roundtrips() {
        let directory = std::env::temp_dir().join(format!(
            "rasterlab-v2-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory
            .join("generated.json")
            .to_string_lossy()
            .into_owned();
        let json = r#"{"format":"rasterlab","version":2,"document":{"layers":[{"type":"generated","generatorId":"checker","parameters":{"cellSize":32}}]},"assets":[]}"#;
        save_project(path.clone(), json.into(), vec![]).unwrap();
        let loaded = load_project(path).unwrap();
        assert_eq!(loaded.project_json, json);
        assert!(loaded.assets.is_empty());
        fs::remove_dir_all(directory).unwrap();
    }
    #[test]
    fn masked_v3_roundtrip_rejects_future_without_overwrite() {
        let directory = std::env::temp_dir().join(format!(
            "rasterlab-v3-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory.join("masked.json").to_string_lossy().into_owned();
        let json = r#"{"format":"rasterlab","version":3,"document":{"layers":[{"id":"target","type":"generated","generatorId":"noise","mask":{"sourceId":"source","enabled":true,"mode":"alpha","invert":false,"strength":1,"feather":8}},{"id":"source","type":"generated","generatorId":"checker"}]},"assets":[]}"#;
        save_project(path.clone(), json.into(), vec![]).unwrap();
        assert!(save_project(
            path.clone(),
            json.replace("\"version\":3", "\"version\":4"),
            vec![]
        )
        .is_err());
        let loaded = load_project(path).unwrap();
        assert_eq!(loaded.project_json, json);
        assert!(loaded.assets.is_empty());
        fs::remove_dir_all(directory).unwrap();
    }
    #[test]
    fn preset_write_overwrite_and_rejection_preserve_original() {
        let directory = std::env::temp_dir().join(format!(
            "rasterlab-preset-test-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory
            .join("experiment.preset.json")
            .to_string_lossy()
            .into_owned();
        let valid = r#"{"format":"rasterlab-preset","version":1,"effects":[{}],"roles":[]}"#;
        write_preset(path.clone(), valid.into()).unwrap();
        write_preset(path.clone(), valid.into()).unwrap();
        assert!(write_preset(
            path.clone(),
            valid.replace("\"version\":1", "\"version\":2")
        )
        .is_err());
        assert!(write_preset(
            directory.join("bad.exe").to_string_lossy().into_owned(),
            valid.into()
        )
        .is_err());
        assert!(write_preset(path.clone(), " ".repeat(1024 * 1024 + 1)).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), valid);
        fs::remove_dir_all(directory).unwrap();
    }
}
