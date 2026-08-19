use std::path::Path;
use std::sync::{Mutex, OnceLock};
use thiserror::Error;

#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum WallpaperHostError {
  #[error("Wallpaper host initialization failed: {0}")]
  Initialization(String),
  #[error("Wallpaper host runtime error: {0}")]
  Runtime(String),
  #[error("Wallpaper host cleanup failed: {0}")]
  Cleanup(String),
  #[error("Wallpaper host received an invalid display id: {0}")]
  InvalidDisplay(String),
  #[error("Wallpaper host received an invalid wallpaper path: {0}")]
  InvalidWallpaperPath(String),
  #[error("Windows SystemParametersInfo API error: {0}")]
  WindowsSystemError(String),
  #[error("Live wallpaper window error: {0}")]
  LiveWindowError(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
#[allow(dead_code)]
pub enum WallpaperHostState {
  #[default]
  Idle,
  Hidden,
  Visible,
  LiveCanvas,
  LiveVideo,
  Error,
}

/// Information about the primary display
#[derive(Debug, Clone)]
pub struct DisplayResolution {
  pub width: u32,
  pub height: u32,
  pub scale: f64,
}

#[allow(dead_code)]
pub trait WallpaperHost: Send + Sync {
  fn new() -> Result<Self, WallpaperHostError>
  where
    Self: Sized;
  fn show(&mut self) -> Result<(), WallpaperHostError>;
  fn hide(&mut self) -> Result<(), WallpaperHostError>;
  fn move_to_display(&mut self, display_id: &str) -> Result<(), WallpaperHostError>;
  fn set_wallpaper(&mut self, wallpaper_path: &str) -> Result<(), WallpaperHostError>;
  fn cleanup(&mut self) -> Result<(), WallpaperHostError>;
  fn is_visible(&self) -> bool;
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct WindowsWallpaperHost {
  visible: bool,
  display_id: String,
  wallpaper_path: Option<String>,
  state: WallpaperHostState,
}

impl Default for WindowsWallpaperHost {
  fn default() -> Self {
    Self {
      visible: false,
      display_id: "primary".to_string(),
      wallpaper_path: None,
      state: WallpaperHostState::Hidden,
    }
  }
}

#[allow(dead_code)]
impl WindowsWallpaperHost {
  pub fn new() -> Result<Self, WallpaperHostError> {
    Ok(Self::default())
  }

  pub fn current_display(&self) -> &str {
    self.display_id.as_str()
  }

  pub fn wallpaper_path(&self) -> Option<&str> {
    self.wallpaper_path.as_deref()
  }

  pub fn state(&self) -> WallpaperHostState {
    self.state
  }
}

impl WallpaperHost for WindowsWallpaperHost {
  fn new() -> Result<Self, WallpaperHostError> {
    Ok(Self::default())
  }

  fn show(&mut self) -> Result<(), WallpaperHostError> {
    if self.display_id.trim().is_empty() {
      return Err(WallpaperHostError::InvalidDisplay(
        "Wallpaper host requires a non-empty display identifier".to_string(),
      ));
    }
    self.visible = true;
    self.state = WallpaperHostState::Visible;
    Ok(())
  }

  fn hide(&mut self) -> Result<(), WallpaperHostError> {
    self.visible = false;
    self.state = WallpaperHostState::Hidden;
    Ok(())
  }

  fn move_to_display(&mut self, display_id: &str) -> Result<(), WallpaperHostError> {
    let display_id = display_id.trim();
    if display_id.is_empty() {
      return Err(WallpaperHostError::InvalidDisplay(
        "Display id cannot be empty".to_string(),
      ));
    }
    self.display_id = display_id.to_string();
    self.state = if self.visible {
      WallpaperHostState::Visible
    } else {
      WallpaperHostState::Hidden
    };
    Ok(())
  }

  fn set_wallpaper(&mut self, wallpaper_path: &str) -> Result<(), WallpaperHostError> {
    let wallpaper_path = wallpaper_path.trim();
    if wallpaper_path.is_empty() {
      return Err(WallpaperHostError::InvalidWallpaperPath(
        "Wallpaper path cannot be empty".to_string(),
      ));
    }
    let path = Path::new(wallpaper_path);
    if path.components().next().is_none() {
      return Err(WallpaperHostError::InvalidWallpaperPath(
        format!("Wallpaper path is invalid: {wallpaper_path}"),
      ));
    }
    self.wallpaper_path = Some(wallpaper_path.to_string());
    if self.visible {
      self.state = WallpaperHostState::Visible;
    }
    Ok(())
  }

  fn cleanup(&mut self) -> Result<(), WallpaperHostError> {
    self.visible = false;
    self.wallpaper_path = None;
    self.state = WallpaperHostState::Idle;
    Ok(())
  }

  fn is_visible(&self) -> bool {
    self.visible
  }
}

static DEFAULT_HOST: OnceLock<Mutex<Option<WindowsWallpaperHost>>> = OnceLock::new();

pub fn start_default_host() -> Result<(), WallpaperHostError> {
  let mut host_slot = DEFAULT_HOST
    .get_or_init(|| Mutex::new(None))
    .lock()
    .map_err(|_| WallpaperHostError::Initialization("Wallpaper host mutex is poisoned".to_string()))?;

  if host_slot.is_none() {
    *host_slot = Some(WindowsWallpaperHost::new()?);
  }

  let host = host_slot.as_mut().ok_or_else(|| {
    WallpaperHostError::Initialization("Failed to initialize the default wallpaper host".to_string())
  })?;

  if host.is_visible() {
    return Ok(());
  }

  host.show()
}

pub fn stop_default_host() -> Result<(), WallpaperHostError> {
  let mut host_slot = DEFAULT_HOST
    .get_or_init(|| Mutex::new(None))
    .lock()
    .map_err(|_| WallpaperHostError::Initialization("Wallpaper host mutex is poisoned".to_string()))?;

  match host_slot.as_mut() {
    Some(host) => host.cleanup(),
    None => Ok(()),
  }
}

// ─── Display Resolution Query ────────────────────────────────────────────────

/// Get the primary display's physical pixel dimensions and DPI scale factor.
pub fn get_primary_display_resolution() -> DisplayResolution {
  #[cfg(target_os = "windows")]
  {
    use windows::Win32::UI::HiDpi::{
      GetAwarenessFromDpiAwarenessContext, GetDpiForSystem, GetThreadDpiAwarenessContext,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
      GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN,
    };

    unsafe {
      let width = GetSystemMetrics(SM_CXSCREEN) as u32;
      let height = GetSystemMetrics(SM_CYSCREEN) as u32;
      let dpi = GetDpiForSystem();
      let scale = dpi as f64 / 96.0;

      // GetSystemMetrics already returns physical pixels when the process is
      // DPI-aware (which Tauri apps are by default). Multiplying again would
      // over-size the wallpaper window on scaled displays (e.g. 125%/150%), so
      // only scale up when the process reports itself DPI-unaware.
      let awareness = GetAwarenessFromDpiAwarenessContext(GetThreadDpiAwarenessContext());
      let is_dpi_aware = awareness != windows::Win32::UI::HiDpi::DPI_AWARENESS_UNAWARE;
      let phys_width = if is_dpi_aware {
        width
      } else {
        (width as f64 * scale).round() as u32
      };
      let phys_height = if is_dpi_aware {
        height
      } else {
        (height as f64 * scale).round() as u32
      };

      DisplayResolution {
        width: if phys_width > 0 { phys_width } else { 1920 },
        height: if phys_height > 0 { phys_height } else { 1080 },
        scale,
      }
    }
  }

  #[cfg(not(target_os = "windows"))]
  {
    DisplayResolution {
      width: 1920,
      height: 1080,
      scale: 1.0,
    }
  }
}

// ─── Static Desktop Wallpaper (single frame) ─────────────────────────────────

/// Applies an image file directly to the Windows desktop background (static, single frame).
pub fn apply_system_wallpaper(path: &str) -> Result<String, WallpaperHostError> {
  let clean_path = path.trim();
  if clean_path.is_empty() {
    return Err(WallpaperHostError::InvalidWallpaperPath(
      "Wallpaper path cannot be empty".to_string(),
    ));
  }

  #[cfg(target_os = "windows")]
  unsafe {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::UI::WindowsAndMessaging::{
      SystemParametersInfoW, SPIF_SENDCHANGE, SPIF_UPDATEINIFILE, SPI_SETDESKWALLPAPER,
    };

    let normalized = clean_path.replace('/', "\\");
    let wide: Vec<u16> = OsStr::new(&normalized)
      .encode_wide()
      .chain(std::iter::once(0))
      .collect();

    let success = SystemParametersInfoW(
      SPI_SETDESKWALLPAPER,
      0,
      Some(wide.as_ptr() as *mut _),
      SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
    );

    match success {
      Ok(()) => Ok(format!("Desktop wallpaper set to {normalized}")),
      Err(err) => Err(WallpaperHostError::WindowsSystemError(
        format!("SystemParametersInfoW failed to set wallpaper: {err}"),
      )),
    }
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(format!("System wallpaper simulation on non-Windows: {clean_path}"))
  }
}

/// Decodes base64 image data and applies it to the Windows desktop background (single frame).
pub fn apply_wallpaper_from_base64(image_base64: &str) -> Result<String, WallpaperHostError> {
  let raw_data = if let Some(idx) = image_base64.find(',') {
    &image_base64[idx + 1..]
  } else {
    image_base64
  };

  let image_bytes = decode_base64(raw_data).map_err(|e| {
    WallpaperHostError::InvalidWallpaperPath(format!("Failed to decode base64 wallpaper: {e}"))
  })?;

  let temp_dir = std::env::temp_dir();
  let wallpaper_file = temp_dir.join("lumawall_desktop_wallpaper.png");

  std::fs::write(&wallpaper_file, &image_bytes).map_err(|e| {
    WallpaperHostError::WindowsSystemError(format!("Failed to write wallpaper image to temp: {e}"))
  })?;

  let file_path_str = wallpaper_file.to_string_lossy().to_string();
  apply_system_wallpaper(&file_path_str)
}

// ─── Live Wallpaper Window (WorkerW Native Hosting) ──────────────────────────

/// Start a LIVE animated canvas wallpaper by hosting it directly in the Windows WorkerW
/// desktop background layer behind desktop icons.
pub fn start_live_canvas_wallpaper(html_content: &str, width: u32, height: u32) -> Result<String, WallpaperHostError> {
  // Inject the correct resolution into the HTML
  let resolved_html = html_content
    .replace("__CANVAS_WIDTH__", &width.to_string())
    .replace("__CANVAS_HEIGHT__", &height.to_string());

  let temp_dir = std::env::temp_dir();
  let html_file = temp_dir.join("lumawall_live_canvas.html");
  let _ = std::fs::write(&html_file, resolved_html.as_bytes());

  #[cfg(target_os = "windows")]
  {
    let html_file_url = file_url_from_path(&html_file.to_string_lossy().replace('\\', "/"));
    crate::wallpaper_window::start_live_wallpaper_native(&html_file_url, false, width, height)
      .map_err(|e| WallpaperHostError::LiveWindowError(e))
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(format!("Live canvas wallpaper simulation on non-Windows at {width}x{height}"))
  }
}

/// Start a LIVE video wallpaper from a local file path inside the Windows WorkerW layer.
pub fn start_live_video_wallpaper(video_path: &str, width: u32, height: u32) -> Result<String, WallpaperHostError> {
  let video_path = video_path.trim();
  if video_path.is_empty() {
    return Err(WallpaperHostError::InvalidWallpaperPath(
      "Video path cannot be empty".to_string(),
    ));
  }

  // Normalize: if caller passed a file:// URL, strip it to get the raw Windows path
  let raw_path = if video_path.starts_with("file:///") {
    video_path[8..].replace('/', "\\")
  } else if video_path.starts_with("file://") {
    video_path[7..].replace('/', "\\")
  } else {
    video_path.to_string()
  };

  // Only do the exists-check for local filesystem paths (not blob: URLs)
  if !raw_path.starts_with("blob:") && !raw_path.starts_with("http") {
    let path = Path::new(&raw_path);
    if !path.exists() {
      return Err(WallpaperHostError::InvalidWallpaperPath(
        format!("Video file does not exist: {raw_path}"),
      ));
    }
  }


  // Generate a robust HTML5 video player embedded in WorkerW with autoplay, loop, and auto-recovery
  let normalized_path = raw_path.replace('\\', "/");
  let video_src = file_url_from_path(&normalized_path);
  let video_html = format!(r#"<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>LumaWall Live Video</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body, html {{ width: 100%; height: 100%; background: #000; overflow: hidden; }}
  video {{
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    position: fixed;
    top: 0;
    left: 0;
  }}
</style>
</head>
<body>
<video autoplay loop muted playsinline id="wp-video" src="{video_src}">
</video>
<script>
(function() {{
  var v = document.getElementById('wp-video');
  if (v) {{
    v.muted = true;
    v.loop = true;
    v.play().catch(function() {{
      // Retry playing until the video is actually playing
      setTimeout(function() {{ v.play(); }}, 250);
      setTimeout(function() {{ v.play(); }}, 1000);
    }});
    v.addEventListener('ended', function() {{
      v.currentTime = 0;
      v.play();
    }});
    v.addEventListener('error', function() {{
      // Re-request the frame in case the file was still being written
      setTimeout(function() {{ v.load(); v.play(); }}, 1000);
    }});
  }}
}})();
</script>
</body>
</html>"#);

  let temp_dir = std::env::temp_dir();
  let html_file = temp_dir.join("lumawall_live_video.html");
  let _ = std::fs::write(&html_file, video_html.as_bytes());

  #[cfg(target_os = "windows")]
  {
    let html_file_url = file_url_from_path(&html_file.to_string_lossy().replace('\\', "/"));
    crate::wallpaper_window::start_live_wallpaper_native(&html_file_url, false, width, height)
      .map_err(|e| WallpaperHostError::LiveWindowError(e))
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(format!("Live video wallpaper simulation on non-Windows: {video_path} at {width}x{height}"))
  }
}

// ─── URL Encoding ─────────────────────────────────────────────────────────────

/// Build a `file:///` URL from a Windows path (already using forward slashes).
/// Percent-encodes characters that would break the URL — spaces, `#`, `%`, `?`,
/// non-ASCII — while preserving the URL structural characters (`/`, `:`) so the
/// drive letter and separators survive.
pub(crate) fn file_url_from_path(path_with_forward_slashes: &str) -> String {
  let mut encoded = String::with_capacity(path_with_forward_slashes.len() + 16);
  for b in path_with_forward_slashes.bytes() {
    match b {
      b'A'..=b'Z'
      | b'a'..=b'z'
      | b'0'..=b'9'
      | b'-'
      | b'_'
      | b'.'
      | b'~'
      | b'/'
      | b':' => encoded.push(b as char),
      _ => {
        encoded.push('%');
        encoded.push_str(&format!("{:02X}", b));
      }
    }
  }
  format!("file:///{encoded}")
}

/// Stop the live wallpaper window and restore clean desktop.
pub fn stop_live_wallpaper() -> Result<String, WallpaperHostError> {
  #[cfg(target_os = "windows")]
  {
    crate::wallpaper_window::stop_live_wallpaper_native();
    terminate_live_wallpaper_process();
  }

  Ok("Live wallpaper stopped".to_string())
}

static LIVE_PID: OnceLock<Mutex<Option<u32>>> = OnceLock::new();

fn terminate_live_wallpaper_process() {
  if let Some(lock) = LIVE_PID.get() {
    if let Ok(mut guard) = lock.lock() {
      if let Some(pid) = guard.take() {
        #[cfg(target_os = "windows")]
        {
          let _ = std::process::Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string()])
            .output();
        }
      }
    }
  }
}

// ─── Pure-Rust Base64 Decoder ─────────────────────────────────────────────────

pub(crate) fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
  const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let mut lookup = [255u8; 256];
  for (i, &b) in TABLE.iter().enumerate() {
    lookup[b as usize] = i as u8;
  }

  let clean: Vec<u8> = input
    .bytes()
    .filter(|&b| b != b'=' && !b.is_ascii_whitespace())
    .collect();

  let mut out = Vec::with_capacity((clean.len() * 3) / 4);

  for chunk in clean.chunks(4) {
    let mut buf = 0u32;
    let mut bits = 0;
    for &b in chunk {
      let val = lookup[b as usize];
      if val == 255 {
        return Err("Invalid base64 character in input string".to_string());
      }
      buf = (buf << 6) | (val as u32);
      bits += 6;
    }
    while bits >= 8 {
      bits -= 8;
      out.push(((buf >> bits) & 0xFF) as u8);
    }
  }

  Ok(out)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_windows_wallpaper_host_lifecycle() {
    let mut host = WindowsWallpaperHost::new().expect("host creation should succeed");
    assert!(!host.is_visible());
    assert_eq!(host.current_display(), "primary");
    assert_eq!(host.wallpaper_path(), None);
    assert_eq!(host.state(), WallpaperHostState::Hidden);

    host.show().expect("show should succeed");
    assert!(host.is_visible());
    assert_eq!(host.state(), WallpaperHostState::Visible);

    host.move_to_display("display-1").expect("move should succeed");
    assert_eq!(host.current_display(), "display-1");

    host.set_wallpaper("C:\\Wallpapers\\sample.mp4").expect("set wallpaper should succeed");
    assert_eq!(host.wallpaper_path(), Some("C:\\Wallpapers\\sample.mp4"));

    host.hide().expect("hide should succeed");
    assert!(!host.is_visible());
    assert_eq!(host.state(), WallpaperHostState::Hidden);

    host.cleanup().expect("cleanup should succeed");
    assert!(!host.is_visible());
    assert_eq!(host.wallpaper_path(), None);
    assert_eq!(host.state(), WallpaperHostState::Idle);
  }

  #[test]
  fn test_windows_wallpaper_host_rejects_invalid_input() {
    let mut host = WindowsWallpaperHost::new().expect("host creation should succeed");
    assert!(host.move_to_display("   ").is_err());
    assert!(host.set_wallpaper("   ").is_err());
  }

  #[test]
  fn test_get_primary_display_resolution() {
    let res = get_primary_display_resolution();
    assert!(res.width >= 640, "Width should be at least 640px");
    assert!(res.height >= 480, "Height should be at least 480px");
    assert!(res.scale > 0.0, "Scale should be positive");
  }

  #[test]
  fn test_base64_decode() {
    let decoded = decode_base64("SGVsbG8=").expect("Base64 decode should succeed");
    assert_eq!(decoded, b"Hello");

    let sample_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    let decoded_png = decode_base64(sample_b64).expect("PNG base64 should decode");
    assert!(!decoded_png.is_empty());
  }

  #[test]
  fn test_apply_wallpaper_from_base64() {
    let sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    let res = apply_wallpaper_from_base64(sample_b64);
    assert!(res.is_ok());
  }

  #[test]
  fn test_start_live_canvas_wallpaper_writes_file() {
    let html = "<html><body><canvas id='c'></canvas></body></html>";
    // Should not error — writes to temp dir
    let result = start_live_canvas_wallpaper(html, 1920, 1080);
    // On non-Windows or CI it may succeed with a simulation message
    // We just verify it doesn't panic
    let _ = result;
  }

  #[test]
  fn test_stop_live_wallpaper() {
    let result = stop_live_wallpaper();
    assert!(result.is_ok());
  }

  #[test]
  #[ignore] // spawns a real WorkerW + WebView2 wallpaper window on the desktop
  fn repro_start_live_wallpaper() {
    eprintln!("REPRO: starting live wallpaper...");
    let html = "<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><canvas id='c'></canvas></body></html>";
    let start = std::time::Instant::now();
    let r = start_live_canvas_wallpaper(html, 1920, 1080);
    eprintln!("REPRO: start_live_canvas_wallpaper returned after {:?}: {:?}", start.elapsed(), r);
    std::thread::sleep(std::time::Duration::from_secs(3));
    let stop = stop_live_wallpaper();
    eprintln!("REPRO: stop_live_wallpaper: {:?}", stop);
  }

  #[test]
  fn test_file_url_from_path() {
    // Spaces, unicode, and URL-breaking characters must be percent-encoded.
    assert_eq!(
      file_url_from_path("C:/Users/MR. Ayush/AppData/Local/Temp/lumawall_live_video.html"),
      "file:///C:/Users/MR.%20Ayush/AppData/Local/Temp/lumawall_live_video.html"
    );
    assert_eq!(file_url_from_path("C:/videos/#1 - 100% final.mp4"), "file:///C:/videos/%231%20-%20100%25%20final.mp4");
    // Structural characters survive.
    assert_eq!(file_url_from_path("C:/videos/plain.mp4"), "file:///C:/videos/plain.mp4");
  }
}
