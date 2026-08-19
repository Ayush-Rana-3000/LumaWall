/// Windows display detection and management
///
/// This module handles detection of connected displays/monitors on Windows.
/// It uses Windows native APIs through the `windows` crate.

use crate::commands::{DisplayChange, DisplayInfo};
use std::sync::{Mutex, OnceLock};
use thiserror::Error;

#[cfg(target_os = "windows")]
use windows::{
  core::PCWSTR,
  Win32::Foundation::{BOOL, LPARAM, RECT},
  Win32::Graphics::Gdi::{
    EnumDisplayMonitors, EnumDisplaySettingsExW, GetMonitorInfoW, DEVMODEW, HDC, HMONITOR, MONITORINFO,
    MONITORINFOEXW, ENUM_CURRENT_SETTINGS, ENUM_DISPLAY_SETTINGS_FLAGS,
  },
  Win32::UI::HiDpi::GetDpiForMonitor,
};

#[derive(Debug, Error)]
pub enum DisplayError {
  #[error("Failed to detect displays: {0}")]
  DetectionFailed(String),
  #[error("Windows API error: {0}")]
  WindowsApiError(String),
}

#[cfg(target_os = "windows")]
fn rect_width(rect: &RECT) -> u32 {
  let width = (rect.right - rect.left).max(0) as u32;
  width.max(1)
}

#[cfg(target_os = "windows")]
fn rect_height(rect: &RECT) -> u32 {
  let height = (rect.bottom - rect.top).max(0) as u32;
  height.max(1)
}

#[cfg(target_os = "windows")]
fn orientation_for(width: u32, height: u32) -> String {
  if width >= height {
    "landscape".to_string()
  } else {
    "portrait".to_string()
  }
}

#[cfg(target_os = "windows")]
fn normalize_device_name(name: &[u16]) -> String {
  let end = name.iter().position(|n| *n == 0).unwrap_or(name.len());
  String::from_utf16_lossy(&name[..end]).trim().to_string()
}

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_monitors(
  hmonitor: HMONITOR,
  _hdc: HDC,
  _rect: *mut RECT,
  data: LPARAM,
) -> BOOL {
  let monitors: &mut Vec<DisplayInfo> = &mut *(data.0 as *mut Vec<DisplayInfo>);

  let mut monitor_info = MONITORINFOEXW::default();
  monitor_info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

  if GetMonitorInfoW(hmonitor, &mut monitor_info.monitorInfo as *mut MONITORINFO).as_bool() {
    let rect = &monitor_info.monitorInfo.rcMonitor;
    let width = rect_width(rect);
    let height = rect_height(rect);
    let device_name = normalize_device_name(&monitor_info.szDevice);
    let mut dpi_x = 96u32;
    let mut dpi_y = 96u32;
    let mut refresh_rate = None;

    if GetDpiForMonitor(hmonitor, windows::Win32::UI::HiDpi::MDT_EFFECTIVE_DPI, &mut dpi_x, &mut dpi_y)
      .is_ok()
    {
      // DPI is already captured above.
    }

    let mut dev_mode = DEVMODEW::default();
    dev_mode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;
    let device_name_pcwstr = PCWSTR::from_raw(monitor_info.szDevice.as_ptr());
    if EnumDisplaySettingsExW(device_name_pcwstr, ENUM_CURRENT_SETTINGS, &mut dev_mode, ENUM_DISPLAY_SETTINGS_FLAGS(0)).as_bool() {
      let mode_frequency = dev_mode.dmDisplayFrequency as u32;
      if mode_frequency > 0 {
        refresh_rate = Some(mode_frequency);
      }
    }

    monitors.push(DisplayInfo {
      id: format!("display-{}", monitors.len()),
      name: if device_name.is_empty() {
        format!("Display {}", monitors.len() + 1)
      } else {
        device_name
      },
      width,
      height,
      x: rect.left,
      y: rect.top,
      scale: (dpi_x as f32 / 96.0).max(1.0),
      dpi: dpi_x,
      is_primary: monitor_info.monitorInfo.dwFlags != 0,
      orientation: orientation_for(width, height),
      refresh_rate,
    });
  }

  BOOL(1)
}

/// Detect all connected displays on the system
#[cfg(target_os = "windows")]
pub fn detect_displays() -> Result<Vec<DisplayInfo>, DisplayError> {
  let mut displays: Vec<DisplayInfo> = Vec::new();

  unsafe {
    let ok = EnumDisplayMonitors(HDC::default(), None, Some(enum_monitors), LPARAM(&mut displays as *mut Vec<DisplayInfo> as isize));
    if !ok.as_bool() {
      return Err(DisplayError::WindowsApiError(
        "EnumDisplayMonitors failed while detecting displays".to_string(),
      ));
    }
  }

  if displays.is_empty() {
    return Err(DisplayError::DetectionFailed(
      "No connected displays were detected on the system".to_string(),
    ));
  }

  let primary_count = displays.iter().filter(|d| d.is_primary).count();
  if primary_count == 0 && !displays.is_empty() {
    if let Some(first) = displays.first_mut() {
      first.is_primary = true;
    }
  }

  Ok(displays)
}

#[cfg(not(target_os = "windows"))]
pub fn detect_displays() -> Result<Vec<DisplayInfo>, DisplayError> {
  Err(DisplayError::DetectionFailed(
    "Display detection requires Windows".to_string(),
  ))
}

/// Poll for display configuration changes and emit a DisplayChange when the
/// monitor layout changes. This is a lightweight equivalent to WM_DISPLAYCHANGE.
pub fn monitor_display_changes() -> Result<Option<DisplayChange>, DisplayError> {
  static LAST_DISPLAYS: OnceLock<Mutex<Vec<DisplayInfo>>> = OnceLock::new();
  let current = detect_displays()?;

  let mut last = LAST_DISPLAYS
    .get_or_init(|| Mutex::new(Vec::new()))
    .lock()
    .map_err(|_| DisplayError::DetectionFailed("Display change lock poisoned".to_string()))?;

  if last.is_empty() {
    *last = current.clone();
    return Ok(None);
  }

  if *last != current {
    let change = DisplayChange {
      kind: if current.len() > last.len() {
        "added".to_string()
      } else if current.len() < last.len() {
        "removed".to_string()
      } else {
        "changed".to_string()
      },
      displays: current.clone(),
      timestamp: std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64,
    };
    *last = current;
    return Ok(Some(change));
  }

  Ok(None)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_detect_displays_returns_structured_result() {
    let result = detect_displays();

    #[cfg(target_os = "windows")]
    {
      let displays = result.expect("Windows display detection should succeed");
      assert!(!displays.is_empty());
      assert!(displays.iter().any(|d| d.is_primary));
    }

    #[cfg(not(target_os = "windows"))]
    {
      assert!(matches!(result, Err(DisplayError::DetectionFailed(_))));
    }
  }

  #[test]
  fn test_monitor_display_changes_returns_ok() {
    let result = monitor_display_changes();
    assert!(result.is_ok());
  }
}
