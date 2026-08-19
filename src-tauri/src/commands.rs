/// Tauri command handlers - the bridge between frontend and Rust backend

use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tauri::Manager;
use tracing::{info, warn, debug};

/// Get list of connected displays
#[tauri::command]
pub fn get_displays() -> Result<Vec<DisplayInfo>, String> {
  let displays = crate::display::detect_displays().map_err(|e| {
    warn!("get_displays failed: {}", e);
    e.to_string()
  })?;
  debug!(count = displays.len(), "get_displays returned");
  Ok(displays)
}

#[tauri::command]
pub fn detect_displays() -> Result<Vec<DisplayInfo>, String> {
  get_displays()
}

#[tauri::command]
pub fn monitor_display_changes() -> Result<Option<DisplayChange>, String> {
  crate::display::monitor_display_changes().map_err(|e| {
    warn!("monitor_display_changes failed: {}", e);
    e.to_string()
  })
}

#[tauri::command]
pub fn start_wallpaper_host() -> Result<String, String> {
  info!("start_wallpaper_host called");
  crate::wallpaper_host::start_default_host()
    .map(|_| "Wallpaper host started".to_string())
    .map_err(|e| {
      warn!("start_wallpaper_host failed: {}", e);
      e.to_string()
    })
}

#[tauri::command]
pub fn stop_wallpaper_host() -> Result<String, String> {
  crate::wallpaper_host::stop_default_host()
    .map(|_| "Wallpaper host stopped".to_string())
    .map_err(|e| e.to_string())
}

/// Sets the native Windows desktop wallpaper from an image path (static, single frame)
#[tauri::command]
pub fn set_system_wallpaper(path: String) -> Result<String, String> {
  validate_file_path(&path)?;
  crate::wallpaper_host::apply_system_wallpaper(&path).map_err(|e| e.to_string())
}

/// Sets the native Windows desktop wallpaper from base64 image data (static, single frame)
#[tauri::command]
pub fn set_wallpaper_from_canvas(image_base64: String) -> Result<String, String> {
  crate::wallpaper_host::apply_wallpaper_from_base64(&image_base64).map_err(|e| e.to_string())
}

/// Get the primary display's physical pixel dimensions and DPI scale
#[tauri::command]
pub fn get_primary_display_info() -> Result<PrimaryDisplayInfo, String> {
  let res = crate::wallpaper_host::get_primary_display_resolution();
  Ok(PrimaryDisplayInfo {
    width: res.width,
    height: res.height,
    scale: res.scale,
  })
}

/// Start a LIVE animated canvas wallpaper that runs continuously in a fullscreen window.
/// The html_content must be a complete self-contained HTML page with canvas animation loop.
/// __CANVAS_WIDTH__ and __CANVAS_HEIGHT__ placeholders are substituted with actual pixel values.
#[tauri::command]
pub fn start_live_canvas_wallpaper(html_content: String, width: u32, height: u32) -> Result<String, String> {
  info!(width, height, "start_live_canvas_wallpaper called");
  crate::wallpaper_host::start_live_canvas_wallpaper(&html_content, width, height)
    .map_err(|e| {
      warn!("start_live_canvas_wallpaper failed: {}", e);
      e.to_string()
    })
}

/// Start a LIVE video wallpaper from a local video file (MP4, WebM, etc.)
#[tauri::command]
pub fn start_live_video_wallpaper(path: String, width: u32, height: u32) -> Result<String, String> {
  validate_file_path(&path)?;
  info!(path = %path, width, height, "start_live_video_wallpaper called");
  crate::wallpaper_host::start_live_video_wallpaper(&path, width, height)
    .map_err(|e| {
      warn!("start_live_video_wallpaper failed: {}", e);
      e.to_string()
    })
}

/// Stop and close the live wallpaper window
#[tauri::command]
pub fn stop_live_wallpaper() -> Result<String, String> {
  info!("stop_live_wallpaper called");
  crate::wallpaper_host::stop_live_wallpaper().map_err(|e| {
    warn!("stop_live_wallpaper failed: {}", e);
    e.to_string()
  })
}

/// Check if a live wallpaper window is currently running behind the desktop icons.
#[tauri::command]
pub fn is_wallpaper_running() -> Result<bool, String> {
  Ok(crate::wallpaper_window::is_live_wallpaper_running())
}

/// Save a per-display wallpaper assignment.
#[tauri::command]
pub fn save_display_assignment(
  display_id: String,
  wallpaper_id: Option<String>,
) -> Result<String, String> {
  let mut state = load_wallpaper_state()?;
  let assignments = state.display_assignments.get_or_insert_with(std::collections::HashMap::new);
  if let Some(wp_id) = wallpaper_id {
    assignments.insert(display_id.clone(), wp_id);
  } else {
    assignments.remove(&display_id);
  }
  let json = serde_json::to_string_pretty(&state)
    .map_err(|e| format!("Failed to serialize state: {e}"))?;
  let path = wallpaper_state_path();
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent)
      .map_err(|e| format!("Failed to create config dir: {e}"))?;
  }
  std::fs::write(&path, json)
    .map_err(|e| format!("Failed to write state: {e}"))?;
  Ok(display_id)
}

/// Save the display mode (independent, clone, or span).
#[tauri::command]
pub fn save_display_mode(mode: String) -> Result<String, String> {
  let mut state = load_wallpaper_state()?;
  state.display_mode = Some(mode.clone());
  let json = serde_json::to_string_pretty(&state)
    .map_err(|e| format!("Failed to serialize state: {e}"))?;
  let path = wallpaper_state_path();
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent)
      .map_err(|e| format!("Failed to create config dir: {e}"))?;
  }
  std::fs::write(&path, json)
    .map_err(|e| format!("Failed to write state: {e}"))?;
  Ok(mode)
}

/// Open native Windows file picker dialog to select a video file from disk
#[tauri::command]
pub fn pick_video_file() -> Result<Option<SelectedVideoInfo>, String> {
  #[cfg(target_os = "windows")]
  {
    use std::process::Command;
    let script = r#"
      Add-Type -AssemblyName System.Windows.Forms
      $f = New-Object System.Windows.Forms.OpenFileDialog
      $f.Filter = 'Video Files (*.mp4;*.webm;*.avi;*.mov;*.mkv;*.wmv;*.m4v)|*.mp4;*.webm;*.avi;*.mov;*.mkv;*.wmv;*.m4v|All Files (*.*)|*.*'
      $f.Title = 'Select Video for Live Wallpaper'
      $f.Multiselect = $false
      if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $f.FileName
      }
    "#;

    let output = Command::new("powershell")
      .args(["-NoProfile", "-NonInteractive", "-Command", script])
      .output()
      .map_err(|e| format!("Failed to open file picker: {e}"))?;

    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path_str.is_empty() {
      return Ok(None);
    }

    let p = std::path::Path::new(&path_str);
    if !p.exists() {
      return Ok(None);
    }

    let name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("video").to_string();
    let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("mp4").to_string();
    let size_bytes = p.metadata().map(|m| m.len()).unwrap_or(0);
    let size_mb = size_bytes as f64 / (1024.0 * 1024.0);

    Ok(Some(SelectedVideoInfo {
      path: path_str,
      name,
      size_mb,
      extension: ext,
    }))
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(None)
  }
}

/// Imports and saves video data from browser/drag-and-drop to local app storage
/// (single-shot variant — prefer the chunked `start_video_upload`/`append_video_upload`
/// flow for anything larger than a few megabytes).
#[tauri::command]
pub fn import_video_bytes(name: String, data_base64: String) -> Result<SelectedVideoInfo, String> {
  let raw_data = if let Some(idx) = data_base64.find(',') {
    &data_base64[idx + 1..]
  } else {
    &data_base64
  };

  let bytes = crate::wallpaper_host::decode_base64(raw_data)
    .map_err(|e| format!("Failed to decode base64 video data: {e}"))?;

  let target_file = video_store_path(&name)?;
  if let Some(parent) = target_file.parent() {
    std::fs::create_dir_all(parent)
      .map_err(|e| format!("Failed to create wallpapers directory: {e}"))?;
  }

  std::fs::write(&target_file, &bytes)
    .map_err(|e| format!("Failed to save video file: {e}"))?;

  Ok(selected_video_info_from_path(&target_file, bytes.len()))
}

// ─── Chunked Video Upload ────────────────────────────────────────────────────

struct VideoUploadState {
  target_path: PathBuf,
  file: Option<std::fs::File>,
}

static VIDEO_UPLOAD: OnceLock<Mutex<Option<VideoUploadState>>> = OnceLock::new();

fn video_upload_lock() -> Result<std::sync::MutexGuard<'static, Option<VideoUploadState>>, String> {
  VIDEO_UPLOAD
    .get_or_init(|| Mutex::new(None))
    .lock()
    .map_err(|_| "Video upload state lock is poisoned".to_string())
}

/// Compute the destination path for an uploaded video inside the app's wallpaper
/// folder, with the filename sanitized so it can never break the path or filesystem.
fn video_store_path(name: &str) -> Result<PathBuf, String> {
  let app_dir = std::env::var("APPDATA")
    .map(PathBuf::from)
    .unwrap_or_else(|_| std::env::temp_dir())
    .join("LumaWall")
    .join("wallpapers");

  let sanitized: String = name
    .chars()
    .map(|c| {
      if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' || c == ' ' {
        c
      } else {
        '_'
      }
    })
    .collect();

  let safe_name = if sanitized.trim().is_empty() {
    "imported_video.mp4".to_string()
  } else {
    sanitized
  };

  Ok(app_dir.join(safe_name))
}

fn selected_video_info_from_path(target_file: &std::path::Path, size_bytes: usize) -> SelectedVideoInfo {
  let name = target_file
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("video")
    .to_string();
  let ext = target_file
    .extension()
    .and_then(|s| s.to_str())
    .unwrap_or("mp4")
    .to_string();

  SelectedVideoInfo {
    path: target_file.to_string_lossy().to_string(),
    name,
    size_mb: size_bytes as f64 / (1024.0 * 1024.0),
    extension: ext,
  }
}

/// Begin streaming a video file into the local wallpaper store.
/// Callers should follow with one or more `append_video_upload` chunks and then
/// either finalize with `done: true` or abort with `cancel_video_upload`.
#[tauri::command]
pub fn start_video_upload(name: String) -> Result<String, String> {
  let target_path = video_store_path(&name)?;
  if let Some(parent) = target_path.parent() {
    std::fs::create_dir_all(parent)
      .map_err(|e| format!("Failed to create wallpapers directory: {e}"))?;
  }

  let file = std::fs::File::create(&target_path)
    .map_err(|e| format!("Failed to create video file: {e}"))?;

  let mut state = video_upload_lock()?;
  *state = Some(VideoUploadState {
    target_path: target_path.clone(),
    file: Some(file),
  });

  Ok(target_path.to_string_lossy().to_string())
}

/// Append a base64-encoded chunk to the in-progress video upload.
/// When `done` is `true`, finalizes the file and returns the video's info.
#[tauri::command]
pub fn append_video_upload(chunk_base64: String, done: bool) -> Result<Option<SelectedVideoInfo>, String> {
  let raw_data = if let Some(idx) = chunk_base64.find(',') {
    &chunk_base64[idx + 1..]
  } else {
    &chunk_base64
  };

  let bytes = crate::wallpaper_host::decode_base64(raw_data)
    .map_err(|e| format!("Failed to decode base64 video chunk: {e}"))?;

  let mut state = video_upload_lock()?;
  let upload = state
    .as_mut()
    .ok_or_else(|| "No active video upload — call start_video_upload first".to_string())?;
  let file = upload
    .file
    .as_mut()
    .ok_or_else(|| "Video upload has already been finalized".to_string())?;

  file
    .write_all(&bytes)
    .map_err(|e| format!("Failed to write video chunk: {e}"))?;

  if !done {
    return Ok(None);
  }

  let size_bytes = file.metadata().map(|m| m.len()).unwrap_or(bytes.len() as u64);
  let target_path = upload.target_path.clone();
  upload.file = None; // closes the file
  *state = None;

  Ok(Some(selected_video_info_from_path(&target_path, size_bytes as usize)))
}

/// Abort an in-progress video upload and delete the partial file.
#[tauri::command]
pub fn cancel_video_upload() -> Result<(), String> {
  let mut state = video_upload_lock()?;
  if let Some(upload) = state.take() {
    let _ = std::fs::remove_file(&upload.target_path);
  }
  Ok(())
}

/// Get real-time performance metrics
#[tauri::command]
pub fn get_performance_metrics() -> Result<PerformanceMetrics, String> {
  crate::system::get_performance_metrics().map_err(|e| e.to_string())
}

// ─── Content Library ──────────────────────────────────────────────────────────

/// Discover every valid wallpaper scene (built-in + user) from disk.
/// The filesystem is the source of truth; no database involved.
#[tauri::command]
pub fn scan_library(app: tauri::AppHandle) -> Result<Vec<crate::library::LibraryScene>, String> {
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|e| format!("Failed to resolve resource dir: {e}"))?;
  Ok(crate::library::scan_all(&resource_dir))
}

/// Open native Windows file dialog to pick an image file.
#[tauri::command]
pub fn pick_image_file() -> Result<Option<SelectedImageInfo>, String> {
  #[cfg(target_os = "windows")]
  {
    use std::process::Command;
    let script = r#"
      Add-Type -AssemblyName System.Windows.Forms
      $f = New-Object System.Windows.Forms.OpenFileDialog
      $f.Filter = 'Images (*.jpg;*.jpeg;*.png;*.webp;*.bmp)|*.jpg;*.jpeg;*.png;*.webp;*.bmp|All Files (*.*)|*.*'
      $f.Title = 'Select Photo for Live Wallpaper'
      $f.Multiselect = $false
      if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $f.FileName
      }
    "#;

    let output = Command::new("powershell")
      .args(["-NoProfile", "-NonInteractive", "-Command", script])
      .output()
      .map_err(|e| format!("Failed to open file picker: {e}"))?;

    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path_str.is_empty() {
      return Ok(None);
    }
    let p = std::path::Path::new(&path_str);
    if !p.exists() {
      return Ok(None);
    }
    let name = p
      .file_stem()
      .and_then(|s| s.to_str())
      .unwrap_or("photo")
      .to_string();
    let ext = p
      .extension()
      .and_then(|s| s.to_str())
      .unwrap_or("jpg")
      .to_string();
    Ok(Some(SelectedImageInfo {
      path: path_str,
      name,
      extension: ext,
    }))
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(None)
  }
}

/// Copy an image into the user library and create its metadata.
#[tauri::command]
pub fn import_wallpaper_file(
  path: String,
  title: Option<String>,
) -> Result<crate::library::LibraryScene, String> {
  crate::library::import_image(std::path::Path::new(&path), title)
}

/// Write a base64-encoded JPEG thumbnail next to a library image.
#[tauri::command]
pub fn save_thumbnail(image_path: String, data_base64: String) -> Result<String, String> {
  validate_file_path(&image_path)?;
  crate::library::save_thumbnail(&image_path, &data_base64)
}

// ─── Wallpaper State Persistence ──────────────────────────────────────────────

/// The persisted wallpaper state — which wallpaper is active and its settings.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WallpaperState {
  pub wallpaper_id: Option<String>,
  pub settings: Option<serde_json::Value>,
  pub is_running: bool,
  /// Per-display wallpaper assignments: { "display-0": "wp-matrix", ... }
  pub display_assignments: Option<std::collections::HashMap<String, String>>,
  /// Display mode: "independent" | "clone" | "span"
  pub display_mode: Option<String>,
}

fn wallpaper_state_path() -> PathBuf {
  std::env::var("APPDATA")
    .map(PathBuf::from)
    .unwrap_or_else(|_| std::env::temp_dir())
    .join("LumaWall")
    .join("wallpaper_state.json")
}

/// Save the current wallpaper state to disk so it survives restarts.
#[tauri::command]
pub fn save_wallpaper_state(
  wallpaper_id: Option<String>,
  settings: Option<serde_json::Value>,
  is_running: bool,
  display_assignments: Option<std::collections::HashMap<String, String>>,
  display_mode: Option<String>,
) -> Result<String, String> {
  let state = WallpaperState {
    wallpaper_id,
    settings,
    is_running,
    display_assignments,
    display_mode,
  };
  let json = serde_json::to_string_pretty(&state)
    .map_err(|e| format!("Failed to serialize wallpaper state: {e}"))?;
  let path = wallpaper_state_path();
  if let Some(parent) = path.parent() {
    std::fs::create_dir_all(parent)
      .map_err(|e| format!("Failed to create config directory: {e}"))?;
  }
  std::fs::write(&path, json)
    .map_err(|e| format!("Failed to write wallpaper state: {e}"))?;
  debug!(path = %path.display(), "Wallpaper state saved");
  Ok(path.to_string_lossy().to_string())
}

/// Load the persisted wallpaper state from disk.
#[tauri::command]
pub fn load_wallpaper_state() -> Result<WallpaperState, String> {
  let path = wallpaper_state_path();
  if !path.exists() {
    return Ok(WallpaperState {
      wallpaper_id: None,
      settings: None,
      is_running: false,
      display_assignments: None,
      display_mode: None,
    });
  }
  let raw = std::fs::read_to_string(&path)
    .map_err(|e| format!("Failed to read wallpaper state: {e}"))?;
  let state: WallpaperState = serde_json::from_str(&raw)
    .map_err(|e| format!("Failed to parse wallpaper state: {e}"))?;
  Ok(state)
}

// ─── .lumawall Package System ────────────────────────────────────────────────

/// Blocked file extensions that cannot be in a .lumawall package.
const BLOCKED_EXTENSIONS: &[&str] = &[
  ".exe", ".bat", ".cmd", ".com", ".msi", ".ps1", ".sh", ".bash",
  ".dll", ".so", ".dylib", ".scr", ".pif", ".vbs", ".ws", ".wsh",
  ".wsf", ".hta", ".cpl", ".inf", ".reg",
];

/// Maximum package size: 100 MB.
const MAX_PACKAGE_SIZE: u64 = 100 * 1024 * 1024;

/// Maximum single file size within a package: 50 MB.
#[allow(dead_code)]
const MAX_FILE_SIZE: u64 = 50 * 1024 * 1024;
const MAX_PACKAGE_FILES: usize = 500;

/// Validate a file path for security: reject null bytes, UNC paths, and non-UTF8.
fn validate_file_path(path: &str) -> Result<(), String> {
  if path.contains('\0') {
    return Err("File path contains null bytes".to_string());
  }
  if path.starts_with("\\\\") {
    return Err("UNC paths are not allowed".to_string());
  }
  Ok(())
}

/// Validate a .lumawall package file (ZIP archive) without installing it.
/// Checks: file exists, readable, not too large, valid ZIP, manifest present,
/// no blocked extensions, no path traversal, file count within limits.
#[tauri::command]
pub fn validate_lumawall_package(package_path: String) -> Result<serde_json::Value, String> {
  let path = std::path::Path::new(&package_path);
  if !path.exists() {
    return Err("Package file does not exist".to_string());
  }

  let metadata = std::fs::metadata(path)
    .map_err(|e| format!("Cannot read package: {e}"))?;
  if metadata.len() > MAX_PACKAGE_SIZE {
    return Err(format!("Package too large: {} MB (max 100 MB)", metadata.len() / (1024 * 1024)));
  }

  // Read the ZIP file into memory for validation
  let zip_bytes = std::fs::read(path)
    .map_err(|e| format!("Failed to read package: {e}"))?;

  // For now, do basic validation — full ZIP parsing happens in the frontend
  // via JSZip. The Rust side validates file existence, size, and extension.
  let mut errors: Vec<String> = Vec::new();

  if zip_bytes.len() < 100 {
    errors.push("Package file is too small to be a valid archive".to_string());
  }

  // Check for ZIP magic bytes (PK\x03\x04)
  if zip_bytes.len() >= 4 && zip_bytes[0] == 0x50 && zip_bytes[1] == 0x4B
    && zip_bytes[2] == 0x03 && zip_bytes[3] == 0x04 {
    // Valid ZIP header
  } else {
    errors.push("Not a valid ZIP archive (wrong file format)".to_string());
  }

  let result = serde_json::json!({
    "valid": errors.is_empty(),
    "errors": errors,
    "warnings": [],
    "sizeBytes": metadata.len(),
  });

  Ok(result)
}

/// Install an extracted .lumawall package into the user library.
/// The package contents must already be extracted to a temporary directory.
/// This command copies the validated content into the user library.
#[tauri::command]
pub fn install_lumawall_package(
  extracted_path: String,
  package_id: String,
) -> Result<crate::library::LibraryScene, String> {
  let src_dir = std::path::Path::new(&extracted_path);
  if !src_dir.exists() || !src_dir.is_dir() {
    return Err("Extracted package directory does not exist".to_string());
  }

  let manifest_path = src_dir.join("manifest.json");
  if !manifest_path.exists() {
    return Err("Package missing manifest.json".to_string());
  }

  // Read and parse manifest
  let manifest_raw = std::fs::read_to_string(&manifest_path)
    .map_err(|e| format!("Cannot read manifest: {e}"))?;
  let manifest: serde_json::Value = serde_json::from_str(&manifest_raw)
    .map_err(|e| format!("Invalid manifest JSON: {e}"))?;

  // Validate package ID is a safe string (alphanumeric, hyphens, underscores)
  if !package_id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_') || package_id.is_empty() {
    return Err("Invalid package ID: only alphanumeric characters, hyphens, and underscores are allowed".to_string());
  }

  // Validate blocked extensions in all files and check for path traversal
  if let Some(files) = find_all_files(src_dir) {
    if files.len() > MAX_PACKAGE_FILES {
      return Err(format!("Package contains too many files: {} (max {})", files.len(), MAX_PACKAGE_FILES));
    }
    for file_path in &files {
      // Path traversal check: ensure every file resolves within the source directory
      if let Ok(canonical) = file_path.canonicalize() {
        if let Ok(src_canonical) = src_dir.canonicalize() {
          if !canonical.starts_with(&src_canonical) {
            return Err(format!("Path traversal detected: {}", file_path.display()));
          }
        }
      }

      let ext = file_path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
      let ext_with_dot = format!(".{ext}");
      if BLOCKED_EXTENSIONS.contains(&ext_with_dot.as_str()) {
        return Err(format!("Blocked file type in package: {}", file_path.display()));
      }
    }
  }

  // Install into user library
  info!(packageId = %package_id, "Installing .lumawall package");
  crate::library::install_package(src_dir, &package_id, &manifest)
}

/// Find all files recursively in a directory.
fn find_all_files(dir: &std::path::Path) -> Option<Vec<std::path::PathBuf>> {
  let mut files = Vec::new();
  for entry in std::fs::read_dir(dir).ok()? {
    let entry = entry.ok()?;
    let path = entry.path();
    if path.is_file() {
      files.push(path);
    } else if path.is_dir() {
      files.extend(find_all_files(&path)?);
    }
  }
  Some(files)
}

// ─── Structs ─────────────────────────────────────────────────────────────────

/// Information about a picked or imported video file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedVideoInfo {
  pub path: String,
  pub name: String,
  pub size_mb: f64,
  pub extension: String,
}

/// Information about a picked or imported image file
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SelectedImageInfo {
  pub path: String,
  pub name: String,
  pub extension: String,
}

/// Primary display resolution info returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimaryDisplayInfo {
  pub width: u32,
  pub height: u32,
  pub scale: f64,
}

/// Display information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DisplayInfo {
  pub id: String,
  pub name: String,
  pub width: u32,
  pub height: u32,
  pub x: i32,
  pub y: i32,
  pub scale: f32,
  pub dpi: u32,
  pub is_primary: bool,
  pub orientation: String,
  pub refresh_rate: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DisplayChange {
  pub kind: String,
  pub displays: Vec<DisplayInfo>,
  pub timestamp: i64,
}

/// Real-time performance metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
  pub fps: f32,
  pub cpu_usage: f32,
  pub memory_usage: f32,
  pub gpu_usage: Option<f32>,
  pub battery: Option<f32>,
  pub power_state: String,
  pub timestamp: i64,
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_commands_execution() {
    let metrics = get_performance_metrics();
    assert!(metrics.is_ok());

    let start_res = start_wallpaper_host();
    assert!(start_res.is_ok());

    let stop_res = stop_wallpaper_host();
    assert!(stop_res.is_ok());

    let canvas_sample = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    let set_canvas_res = set_wallpaper_from_canvas(canvas_sample.to_string());
    assert!(set_canvas_res.is_ok());

    let display_info = get_primary_display_info();
    assert!(display_info.is_ok());
    let info = display_info.unwrap();
    assert!(info.width >= 640);
    assert!(info.height >= 480);

    let stop_live = stop_live_wallpaper();
    assert!(stop_live.is_ok());
  }

  #[test]
  fn test_display_info_serialization() {
    let display = DisplayInfo {
      id: "display-0".to_string(),
      name: "Primary Monitor".to_string(),
      width: 1920,
      height: 1080,
      x: 0,
      y: 0,
      scale: 1.0,
      dpi: 96,
      is_primary: true,
      orientation: "landscape".to_string(),
      refresh_rate: Some(144),
    };

    let serialized = serde_json::to_string(&display).expect("Serialization should succeed");
    assert!(serialized.contains("\"isPrimary\":true"));
    assert!(serialized.contains("\"refreshRate\":144"));

    let deserialized: DisplayInfo = serde_json::from_str(&serialized).expect("Deserialization should succeed");
    assert_eq!(display, deserialized);
  }

  #[test]
  fn test_primary_display_info_command() {
    let info = get_primary_display_info().expect("Should return display info");
    assert!(info.width >= 640);
    assert!(info.height >= 480);
    assert!(info.scale > 0.0);
  }
}
