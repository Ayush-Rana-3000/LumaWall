// Tauri entry point for LumaWall
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

mod app;
mod commands;
mod display;
mod library;
mod system;
mod wallpaper_host;
pub mod wallpaper_window;
pub mod workerw;

use tauri::Emitter;
use tracing::{info, warn};

fn main() {
  // Initialize structured logging
  tracing_subscriber::fmt()
    .with_max_level(tracing::Level::INFO)
    .with_target(false)
    .with_thread_ids(true)
    .init();

  info!("LumaWall starting up");

  // Keep the live wallpaper rendering at full speed even though its WebView2
  // window is occluded behind the desktop icons (prevents a frozen/static look).
  wallpaper_window::ensure_webview2_browser_args();
  info!("WebView2 browser args configured");

  tauri::Builder::default()
    .plugin(tauri_plugin_updater::Builder::new().build())
    .manage(std::sync::Mutex::new(app::AppState::new()))
    .invoke_handler(tauri::generate_handler![
      commands::get_displays,
      commands::detect_displays,
      commands::monitor_display_changes,
      commands::start_wallpaper_host,
      commands::stop_wallpaper_host,
      commands::set_system_wallpaper,
      commands::set_wallpaper_from_canvas,
      commands::get_primary_display_info,
      commands::start_live_canvas_wallpaper,
      commands::start_live_video_wallpaper,
      commands::stop_live_wallpaper,
      commands::pick_video_file,
      commands::import_video_bytes,
      commands::start_video_upload,
      commands::append_video_upload,
      commands::cancel_video_upload,
      commands::get_performance_metrics,
      commands::scan_library,
      commands::pick_image_file,
      commands::import_wallpaper_file,
      commands::save_thumbnail,
      commands::save_wallpaper_state,
      commands::load_wallpaper_state,
      commands::is_wallpaper_running,
      commands::save_display_assignment,
      commands::save_display_mode,
      commands::validate_lumawall_package,
      commands::install_lumawall_package,
    ])
    .setup(|app| {
      let handle = app.handle().clone();

      // Start the default wallpaper host window behind desktop icons
      match wallpaper_host::start_default_host() {
        Ok(()) => info!("Wallpaper host started successfully"),
        Err(e) => warn!("Wallpaper host start failed (non-fatal): {}", e),
      }

      // Detect displays on startup
      match crate::display::detect_displays() {
        Ok(displays) => info!("Detected {} display(s)", displays.len()),
        Err(e) => warn!("Display detection failed on startup: {}", e),
      }

      // Monitor display connect/disconnect events
      tauri::async_runtime::spawn(async move {
        loop {
          match crate::display::monitor_display_changes() {
            Ok(Some(change)) => {
              info!("Display configuration changed, notifying frontend");
              let _ = handle.emit("display_change", &change);
            }
            Ok(None) => {}
            Err(e) => {
              warn!("Display monitoring error (will retry): {}", e);
            }
          }
          tokio::time::sleep(std::time::Duration::from_secs(5)).await;
        }
      });

      info!("LumaWall startup complete");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
