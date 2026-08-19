//! LumaWall content library — filesystem discovery and user imports.
//!
//! Wallpapers are content: a folder with a `metadata.json` (plus image/depth/
//! scene files). `scan_library_dir` walks a root, parses every valid scene, and
//! resolves absolute file paths. The filesystem remains the source of truth;
//! there is no database to corrupt.
//!
//! Layout:
//!   <resource_dir>/library/builtin/wallpapers/<category>/<id>/
//!   <resource_dir>/library/builtin/scenes/<id>/
//!   <APPDATA>/LumaWall/library/user/<id>/

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Asset file names inside a wallpaper folder.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFileMap {
  pub image: Option<String>,
  pub depth: Option<String>,
  pub thumbnail: Option<String>,
  pub preview: Option<String>,
  pub scene: Option<String>,
}

/// On-disk wallpaper scene — mirrors `metadata.json` plus resolved paths.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryScene {
  pub id: String,
  pub title: String,
  pub description: Option<String>,
  pub author: String,
  pub category: String,
  pub tags: Vec<String>,
  pub r#type: String,
  pub source: String,
  pub files: LibraryFileMap,
  pub resolution: Option<String>,
  pub aspect_ratio: Option<String>,
  pub fps: Option<u32>,
  pub interactive: Option<bool>,
  pub audio: Option<bool>,
  pub featured: Option<bool>,
  pub recommended: Option<bool>,
  pub favorite: Option<bool>,
  pub version: Option<String>,
  pub created_at: Option<String>,
  pub interaction: Option<serde_json::Value>,
  pub settings: Option<serde_json::Value>,
  pub perf_estimate: Option<String>,
  pub base_path: Option<String>,
}

#[allow(dead_code)]
/// Default customization controls for a photo scene (used when the scene's
/// metadata declares no `settings` array).
pub fn default_photo_settings() -> serde_json::Value {
  serde_json::json!([
    { "id": "motion", "type": "slider", "label": "Motion", "min": 0, "max": 100, "step": 1, "default": 35 },
    { "id": "parallax", "type": "slider", "label": "Depth Parallax", "min": 0, "max": 100, "step": 1, "default": 45 },
    { "id": "zoom", "type": "slider", "label": "Cinematic Zoom", "min": 0, "max": 30, "step": 1, "default": 8 },
    { "id": "atmosphere", "type": "slider", "label": "Atmosphere", "min": 0, "max": 100, "step": 1, "default": 20 },
    { "id": "particles", "type": "select", "label": "Particles", "default": "none",
      "options": [
        { "value": "none", "label": "None" },
        { "value": "dust", "label": "Floating Dust" },
        { "value": "snow", "label": "Snowfall" },
        { "value": "rain", "label": "Rain" }
      ]},
    { "id": "lightRays", "type": "boolean", "label": "Light Rays", "default": false },
    { "id": "vignette", "type": "boolean", "label": "Vignette", "default": true },
    { "id": "warmth", "type": "slider", "label": "Warmth", "min": -30, "max": 30, "step": 1, "default": 0 }
  ])
}

/// Built-in content root (ships with the app inside the resource dir).
pub fn builtin_library_root(resource_dir: &Path) -> PathBuf {
  resource_dir.join("library").join("builtin")
}

/// User content root — never touched by application updates.
pub fn user_library_root() -> PathBuf {
  std::env::var("APPDATA")
    .map(PathBuf::from)
    .unwrap_or_else(|_| std::env::temp_dir())
    .join("LumaWall")
    .join("library")
    .join("user")
}

/// Recursively find every directory containing a `metadata.json`.
fn find_scene_dirs(root: &Path) -> Vec<PathBuf> {
  let mut out = Vec::new();
  let Ok(entries) = std::fs::read_dir(root) else {
    return out;
  };
  for entry in entries.flatten() {
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }
    if path.join("metadata.json").exists() {
      out.push(path);
    } else {
      out.extend(find_scene_dirs(&path));
    }
  }
  out
}

fn read_scene(dir: &Path, source: &str) -> Option<LibraryScene> {
  let meta_path = dir.join("metadata.json");
  let raw = std::fs::read_to_string(&meta_path).ok()?;
  let mut scene: LibraryScene = serde_json::from_str(&raw).ok()?;

  let resolve = |name: Option<String>| -> Option<String> {
    name.and_then(|n| {
      let p = dir.join(&n);
      p.exists().then(|| p.to_string_lossy().to_string())
    })
  };

  scene.files = LibraryFileMap {
    image: resolve(scene.files.image),
    depth: resolve(scene.files.depth),
    thumbnail: resolve(scene.files.thumbnail),
    preview: resolve(scene.files.preview),
    scene: resolve(scene.files.scene),
  };
  scene.source = source.to_string();
  scene.base_path = Some(dir.to_string_lossy().to_string());
  Some(scene)
}

/// Scan a library root for valid scenes.
pub fn scan_library_dir(root: &Path, source: &str) -> Vec<LibraryScene> {
  find_scene_dirs(root)
    .iter()
    .filter_map(|dir| read_scene(dir, source))
    .collect()
}

/// Scan built-in + user content and merge (user wins on duplicate id).
pub fn scan_all(resource_dir: &Path) -> Vec<LibraryScene> {
  let builtin = scan_library_dir(&builtin_library_root(resource_dir), "builtin");
  let mut user = scan_library_dir(&user_library_root(), "user");

  let builtin_ids: std::collections::HashSet<String> =
    builtin.iter().map(|s| s.id.clone()).collect();
  user.retain(|s| !builtin_ids.contains(&s.id));

  let mut all = builtin;
  all.extend(user);
  all
}

fn sanitize_name(name: &str) -> String {
  let mut slug = String::new();
  let mut prev_dash = false;
  for c in name.chars() {
    if c.is_alphanumeric() || c == '_' {
      slug.push(c.to_ascii_lowercase());
      prev_dash = false;
    } else if c == '-' || c == ' ' {
      if !prev_dash && !slug.is_empty() {
        slug.push('-');
        prev_dash = true;
      }
    } else if !prev_dash && !slug.is_empty() {
      slug.push('-');
      prev_dash = true;
    }
  }
  let slug = slug.trim_matches('-').to_string();
  if slug.is_empty() {
    "imported".to_string()
  } else {
    slug
  }
}

/// Copy an image into the user library and write its metadata.json.
/// Returns the imported scene with absolute paths.
pub fn import_image(source_path: &Path, title: Option<String>) -> Result<LibraryScene, String> {
  let ext = source_path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("png")
    .to_lowercase();
  let stem = source_path
    .file_stem()
    .and_then(|s| s.to_str())
    .unwrap_or("imported");
  let id = sanitize_name(stem);

  let user_root = user_library_root();
  let dir = user_root.join(&id);
  std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create library folder: {e}"))?;

  let image_name = format!("image.{ext}");
  let image_path = dir.join(&image_name);
  std::fs::copy(source_path, &image_path)
    .map_err(|e| format!("Failed to copy image into library: {e}"))?;

  let title = title.unwrap_or_else(|| stem.replace(['-', '_'], " "));
  let meta = serde_json::json!({
    "id": id,
    "title": title,
    "description": "Imported photograph, animated with cinematic motion.",
    "author": "You (Imported)",
    "category": "User",
    "tags": ["imported", "photo", "user"],
    "type": "photo",
    "source": "user",
    "files": { "image": image_name },
    "resolution": null,
    "aspectRatio": null,
    "interactive": true,
    "audio": false,
    "featured": false,
    "recommended": false,
    "version": "1.0.0",
    "createdAt": chrono_now_rfc3339(),
    "interaction": { "mouseParallax": true, "mouseGlow": false, "clickEffects": false, "audioReactive": false },
    "perfEstimate": "medium",
    "settings": serde_json::Value::Null
  });

  std::fs::write(dir.join("metadata.json"), serde_json::to_string_pretty(&meta).unwrap_or_default())
    .map_err(|e| format!("Failed to write metadata: {e}"))?;

  read_scene(&dir, "user").ok_or_else(|| "Imported scene failed to parse".to_string())
}

/// Write a base64 thumbnail next to a library asset (e.g. <dir>/thumbnail.jpg).
pub fn save_thumbnail(image_path: &str, data_base64: &str) -> Result<String, String> {
  let raw = if let Some(idx) = data_base64.find(',') {
    &data_base64[idx + 1..]
  } else {
    data_base64
  };
  let bytes = crate::wallpaper_host::decode_base64(raw)
    .map_err(|e| format!("Failed to decode thumbnail: {e}"))?;

  let dir = Path::new(image_path)
    .parent()
    .ok_or_else(|| "Invalid image path".to_string())?;
  let thumb_path = dir.join("thumbnail.jpg");
  std::fs::write(&thumb_path, bytes).map_err(|e| format!("Failed to save thumbnail: {e}"))?;
  Ok(thumb_path.to_string_lossy().to_string())
}

fn chrono_now_rfc3339() -> String {
  // Avoid pulling in a chrono dependency for one timestamp.
  let secs = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map(|d| d.as_secs())
    .unwrap_or(0);
  // RFC3339-ish UTC timestamp (no sub-second precision needed).
  let days = secs / 86_400;
  let (y, m, d) = civil_from_days(days as i64);
  let h = (secs % 86_400) / 3600;
  let mi = (secs % 3600) / 60;
  let s = secs % 60;
  format!("{y:04}-{m:02}-{d:02}T{h:02}:{mi:02}:{s:02}Z")
}

/// Convert days since 1970-01-01 to (year, month, day).
fn civil_from_days(z: i64) -> (i64, u32, u32) {
  let z = z + 719_468;
  let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
  let doe = (z - era * 146_097) as u64;
  let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
  let y = yoe as i64 + era * 400;
  let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  let mp = (5 * doy + 2) / 153;
  let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
  let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
  (if m <= 2 { y + 1 } else { y }, m, d)
}

/// Install a validated .lumawall package into the user library.
/// Copies the extracted package contents into `user_library_root/<package_id>/`.
pub fn install_package(
  src_dir: &Path,
  package_id: &str,
  _manifest: &serde_json::Value,
) -> Result<LibraryScene, String> {
  let user_root = user_library_root();
  let dest_dir = user_root.join(sanitize_name(package_id));

  // Atomic installation: copy to temp dir first, then rename
  let temp_dir = user_root.join(format!(".installing_{package_id}"));
  if temp_dir.exists() {
    std::fs::remove_dir_all(&temp_dir)
      .map_err(|e| format!("Failed to clean temp dir: {e}"))?;
  }
  std::fs::create_dir_all(&temp_dir)
    .map_err(|e| format!("Failed to create temp install dir: {e}"))?;

  // Copy all files from source to temp
  if let Err(e) = copy_dir_recursive(src_dir, &temp_dir) {
    let _ = std::fs::remove_dir_all(&temp_dir);
    return Err(format!("Failed to copy package files: {e}"));
  }

  // Atomically move from temp to final destination
  if dest_dir.exists() {
    std::fs::remove_dir_all(&dest_dir)
      .map_err(|e| format!("Failed to remove existing package: {e}"))?;
  }
  std::fs::rename(&temp_dir, &dest_dir)
    .map_err(|e| {
      let _ = std::fs::remove_dir_all(&temp_dir);
      format!("Failed to finalize installation: {e}")
    })?;

  // Read the installed scene
  read_scene(&dest_dir, "user")
    .ok_or_else(|| "Installed package failed to parse as a valid scene".to_string())
}

/// Recursively copy a directory.
fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
  std::fs::create_dir_all(dst)
    .map_err(|e| format!("Failed to create directory {}: {e}", dst.display()))?;
  for entry in std::fs::read_dir(src)
    .map_err(|e| format!("Failed to read dir {}: {e}", src.display()))?
  {
    let entry = entry.map_err(|e| e.to_string())?;
    let src_path = entry.path();
    let dst_path = dst.join(entry.file_name());
    if src_path.is_dir() {
      copy_dir_recursive(&src_path, &dst_path)?;
    } else {
      std::fs::copy(&src_path, &dst_path)
        .map_err(|e| format!("Failed to copy {}: {e}", src_path.display()))?;
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_civil_from_days() {
    // 1970-01-01
    assert_eq!(civil_from_days(0), (1970, 1, 1));
    // 2026-08-18 ≈ days since epoch
    let secs = 1_786_000_000u64 / 86_400;
    let (y, m, d) = civil_from_days(secs as i64);
    assert_eq!(y, 2026);
    assert!(m >= 7 && m <= 9);
    assert!(d >= 1 && d <= 31);
  }

  #[test]
  fn test_sanitize_name() {
    assert_eq!(sanitize_name("My Photo (2).jpg"), "my-photo-2-jpg");
    assert_eq!(sanitize_name("..."), "imported");
  }

  #[test]
  fn test_default_photo_settings() {
    let v = default_photo_settings();
    assert!(v.is_array());
    let arr = v.as_array().unwrap();
    let ids: Vec<&str> = arr
      .iter()
      .filter_map(|s| s.get("id").and_then(|i| i.as_str()))
      .collect();
    assert!(ids.contains(&"parallax"));
    assert!(ids.contains(&"particles"));
  }
}
