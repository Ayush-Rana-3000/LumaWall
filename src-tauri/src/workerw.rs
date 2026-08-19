use std::sync::atomic::{AtomicIsize, Ordering};
use std::time::Duration;
use tracing::{debug, error, info, warn};
use windows::core::w;
use windows::Win32::Foundation::{BOOL, HWND, LPARAM, WPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
  EnumWindows, FindWindowExW, FindWindowW, IsWindow, SendMessageTimeoutW, SMTO_NORMAL,
};

static WORKERW_HWND: AtomicIsize = AtomicIsize::new(0);

/// WorkerW helper to find and manage the desktop layer for drawing behind desktop icons.
pub struct WorkerWManager;

impl WorkerWManager {
  /// Find Progman and trigger Windows Explorer to create the WorkerW window behind desktop icons.
  pub fn get_or_create_workerw() -> Option<HWND> {
    // 1. Check if we already have a cached valid WorkerW
    let cached = WORKERW_HWND.load(Ordering::SeqCst);
    if cached != 0 {
      let hwnd = HWND(cached);
      if unsafe { IsWindow(hwnd).as_bool() } {
        return Some(hwnd);
      }
    }

    unsafe {
      // 2. Find Program Manager window
      let progman = FindWindowW(w!("Progman"), None);
      if progman.0 == 0 {
        error!("Progman window not found — the desktop background layer is unavailable");
        return None;
      }
      info!("Found Progman window: {:?}", progman);

      // 3. Send undocumented 0x052C message to Progman to create WorkerW.
      //    Explorer processes this asynchronously, so we retry the lookup below.
      let mut result: usize = 0;
      let _ = SendMessageTimeoutW(
        progman,
        0x052C,
        WPARAM(0x0000000D),
        LPARAM(0),
        SMTO_NORMAL,
        1000,
        Some(&mut result),
      );
      let _ = SendMessageTimeoutW(
        progman,
        0x052C,
        WPARAM(0x0000000D),
        LPARAM(1),
        SMTO_NORMAL,
        1000,
        Some(&mut result),
      );

      // 4. Explorer creates the WorkerW and reparents SHELLDLL_DefView asynchronously.
      //    Poll briefly instead of giving up after a single immediate lookup.
      for attempt in 0..15 {
        if let Some(hwnd) = find_wallpaper_workerw(progman) {
          info!("Successfully found desktop WorkerW window: {:?}", hwnd);
          WORKERW_HWND.store(hwnd.0, Ordering::SeqCst);
          return Some(hwnd);
        }
        if attempt < 14 {
          debug!("WorkerW not ready yet (attempt {}), retrying...", attempt + 1);
          std::thread::sleep(Duration::from_millis(120));
        }
      }

      warn!("Failed to find target WorkerW window after retries");
      None
    }
  }

  /// Reset cached WorkerW handle (e.g. after explorer restart)
  pub fn reset() {
    WORKERW_HWND.store(0, Ordering::SeqCst);
  }
}

/// Locate the WorkerW window that sits *behind* the desktop icons.
unsafe fn find_wallpaper_workerw(progman: HWND) -> Option<HWND> {
  // Primary strategy: after 0x052C, SHELLDLL_DefView (the icons layer) is hosted
  // inside a WorkerW; the NEXT WorkerW sibling in Z-order is the wallpaper layer
  // that renders directly behind the icons.
  let mut target: HWND = HWND(0);

  unsafe extern "system" fn enum_windows_proc(top_hwnd: HWND, lparam: LPARAM) -> BOOL {
    let defview = FindWindowExW(top_hwnd, HWND(0), w!("SHELLDLL_DefView"), None);
    if defview.0 != 0 {
      // Found the window hosting the desktop icons; the next WorkerW sibling is our target.
      let workerw = FindWindowExW(HWND(0), top_hwnd, w!("WorkerW"), None);
      if workerw.0 != 0 {
        let out_ptr = lparam.0 as *mut HWND;
        *out_ptr = workerw;
        return BOOL(0); // Stop enumeration
      }
    }
    BOOL(1) // Continue enumeration
  }

  let _ = EnumWindows(
    Some(enum_windows_proc),
    LPARAM(&mut target as *mut _ as isize),
  );

  if target.0 != 0 {
    // Sanity check: never host inside the WorkerW that contains the icons layer itself.
    if FindWindowExW(target, HWND(0), w!("SHELLDLL_DefView"), None).0 == 0 {
      return Some(target);
    }
    debug!("Sibling WorkerW lookup hit the icons container, ignoring it");
  }

  // Fallback: enumerate WorkerW children of Progman and pick the first one that
  // does NOT host SHELLDLL_DefView (i.e. the wallpaper layer, not the icons layer).
  let mut after = HWND(0);
  loop {
    let workerw = FindWindowExW(progman, after, w!("WorkerW"), None);
    if workerw.0 == 0 {
      break;
    }
    if FindWindowExW(workerw, HWND(0), w!("SHELLDLL_DefView"), None).0 == 0 {
      return Some(workerw);
    }
    after = workerw;
  }

  None
}
