use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
use std::sync::mpsc::{channel, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;
use windows::core::{w, PCWSTR};
use windows::Win32::Foundation::{COLORREF, HMODULE, HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
use windows::Win32::Graphics::Gdi::CreateSolidBrush;
use windows::Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::UI::WindowsAndMessaging::{
  CreateWindowExW, DefWindowProcW, DestroyWindow, GetCursorPos, GetWindowRect, PostMessageW,
  PostQuitMessage, RegisterClassExW, SetParent, SetTimer, SetWindowPos, ShowWindow,
  CS_HREDRAW, CS_VREDRAW, HWND_BOTTOM, SWP_NOACTIVATE, SWP_SHOWWINDOW, SW_SHOW, WNDCLASSEXW,
  WS_CHILD, WS_CLIPCHILDREN, WS_CLIPSIBLINGS, WS_VISIBLE, WM_CLOSE, WM_DESTROY, WM_TIMER,
};

use webview2_com::Microsoft::Web::WebView2::Win32::*;
use webview2_com::{
  CreateCoreWebView2ControllerCompletedHandler, CreateCoreWebView2EnvironmentCompletedHandler,
  ExecuteScriptCompletedHandler,
};

use crate::workerw::WorkerWManager;

static WINDOW_CLASS_REGISTERED: OnceLock<bool> = OnceLock::new();
static HOST_WINDOW_HWND: AtomicIsize = AtomicIsize::new(0);

/// Timer id for the global-cursor poller that keeps interactive wallpapers
/// reacting to the mouse even behind the desktop icons.
const CURSOR_TIMER_ID: usize = 1;

/// Set when a stop was requested, so a host thread that is still creating its
/// window can close it immediately instead of leaking.
static STOP_REQUESTED: AtomicBool = AtomicBool::new(false);

/// Set once the previous host thread has fully destroyed its window/controller.
/// `start` waits on this before spawning a new host thread so two WebView2
/// environments never overlap on the same user-data folder.
static TEARDOWN_DONE: AtomicBool = AtomicBool::new(true);

/// WebView2 browser flags that keep the live wallpaper rendering even though its
/// window sits occluded behind the desktop icons. Without these, Chromium
/// throttles requestAnimationFrame / timers in backgrounded windows, which makes
/// an animated wallpaper appear frozen ("static").
///
/// `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` is read when the browser process is
/// spawned, so this must be set before the first environment creation.
const WEBVIEW2_BROWSER_ARGS: &str = "--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --autoplay-policy=no-user-gesture-required";

pub fn ensure_webview2_browser_args() {
  // Idempotent; the env var is only read once at browser-process startup.
  if std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_err() {
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", WEBVIEW2_BROWSER_ARGS);
  }
}

/// The window proc runs on the WebView2 host thread, which is also the thread
/// that created the window and the WebView2 controller. All teardown therefore
/// happens here — never from the Tauri main thread.
unsafe extern "system" fn window_proc(
  hwnd: HWND,
  msg: u32,
  wparam: WPARAM,
  lparam: LPARAM,
) -> LRESULT {
  if msg == WM_CLOSE {
    HOST_WINDOW_HWND.store(0, Ordering::SeqCst);
    // Close the WebView2 controller on its own thread before destroying the window.
    if let Ok(mut store) = active_window_store().lock() {
      if let Some(arc) = store.take() {
        if let Ok(mut win) = arc.lock() {
          if let Some(ctrl) = win.controller.take() {
            let _ = ctrl.Close();
          }
          win.webview = None;
        }
      }
    }
    // DestroyWindow synchronously posts WM_DESTROY to this same thread, which
    // marks teardown complete and quits the message loop.
    let _ = DestroyWindow(hwnd);
    return LRESULT(0);
  }
  if msg == WM_DESTROY {
    TEARDOWN_DONE.store(true, Ordering::SeqCst);
    PostQuitMessage(0);
    return LRESULT(0);
  }
  if msg == WM_TIMER && wparam.0 as usize == CURSOR_TIMER_ID {
    push_cursor_position();
    return LRESULT(0);
  }
  DefWindowProcW(hwnd, msg, wparam, lparam)
}

/// Read the global cursor position and push it into the wallpaper page as
/// normalized coordinates (`window.__lw_mx` / `window.__lw_my`, both 0..1). The
/// generated HTML reads these every frame and smoothly follows the cursor, which
/// makes interactive engines respond to the mouse even though the wallpaper
/// window sits behind the desktop icons and never receives mouse messages itself.
fn push_cursor_position() {
  let Ok(store) = active_window_store().lock() else {
    return;
  };
  let Some(arc) = store.as_ref() else {
    return;
  };
  let Ok(win) = arc.lock() else {
    return;
  };
  let Some(webview) = win.webview.as_ref() else {
    return;
  };

  let mut pt = POINT::default();
  let mut rect = RECT::default();
  unsafe {
    if GetCursorPos(&mut pt).is_err() {
      return;
    }
    let _ = GetWindowRect(win.hwnd, &mut rect);
  }

  let width = (rect.right - rect.left).max(1) as f64;
  let height = (rect.bottom - rect.top).max(1) as f64;
  let nx = ((pt.x as f64 - rect.left as f64) / width).clamp(0.0, 1.0);
  let ny = ((pt.y as f64 - rect.top as f64) / height).clamp(0.0, 1.0);
  let js = format!("window.__lw_mx = {:.6}; window.__lw_my = {:.6};", nx, ny);
  let wide: Vec<u16> = js.encode_utf16().collect();

  unsafe {
    let handler = ExecuteScriptCompletedHandler::create(Box::new(|res, _| {
      let _ = res;
      Ok(())
    }));
    let _ = webview.ExecuteScript(PCWSTR(wide.as_ptr()), &handler);
  }
}

fn ensure_window_class() {
  WINDOW_CLASS_REGISTERED.get_or_init(|| {
    unsafe {
      let hinstance = GetModuleHandleW(None).unwrap_or(HMODULE(0));
      let black_brush = CreateSolidBrush(COLORREF(0));

      let wc = WNDCLASSEXW {
        cbSize: std::mem::size_of::<WNDCLASSEXW>() as u32,
        style: CS_HREDRAW | CS_VREDRAW,
        lpfnWndProc: Some(window_proc),
        cbClsExtra: 0,
        cbWndExtra: 0,
        hInstance: hinstance.into(),
        hIcon: windows::Win32::UI::WindowsAndMessaging::HICON(0),
        hCursor: windows::Win32::UI::WindowsAndMessaging::HCURSOR(0),
        hbrBackground: black_brush,
        lpszMenuName: PCWSTR::null(),
        lpszClassName: w!("LumaWallHostClass"),
        hIconSm: windows::Win32::UI::WindowsAndMessaging::HICON(0),
      };

      let _ = RegisterClassExW(&wc);
      true
    }
  });
}

pub struct LiveWallpaperWindow {
  hwnd: HWND,
  controller: Option<ICoreWebView2Controller>,
  webview: Option<ICoreWebView2>,
}

unsafe impl Send for LiveWallpaperWindow {}
unsafe impl Sync for LiveWallpaperWindow {}

static ACTIVE_WINDOW: OnceLock<Mutex<Option<Arc<Mutex<LiveWallpaperWindow>>>>> = OnceLock::new();

fn active_window_store() -> &'static Mutex<Option<Arc<Mutex<LiveWallpaperWindow>>>> {
  ACTIVE_WINDOW.get_or_init(|| Mutex::new(None))
}

pub fn start_live_wallpaper_native(
  url_or_html: &str,
  is_html_content: bool,
  width: u32,
  height: u32,
) -> std::result::Result<String, String> {
  // Make sure the WebView2 browser process is launched with throttling disabled.
  ensure_webview2_browser_args();

  // Stop any previous live wallpaper. This only posts WM_CLOSE; the old host
  // thread performs its own teardown (controller + window) on its own thread.
  stop_live_wallpaper_native();

  // Wait briefly for the previous host thread to finish so two WebView2
  // environments never overlap on the same user-data folder.
  for _ in 0..50 {
    if TEARDOWN_DONE.load(Ordering::SeqCst) {
      break;
    }
    std::thread::sleep(Duration::from_millis(40));
  }
  STOP_REQUESTED.store(false, Ordering::SeqCst);

  ensure_window_class();

  // Find or create WorkerW desktop handle
  let workerw = WorkerWManager::get_or_create_workerw()
    .ok_or_else(|| "Could not locate or spawn the Windows WorkerW desktop background window".to_string())?;

  let (tx, rx) = channel::<std::result::Result<(), String>>();
  let content = url_or_html.to_string();

  // Spawn dedicated thread with COM message loop for WebView2
  std::thread::spawn(move || {
    unsafe {
      let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);

      let hinstance = GetModuleHandleW(None).unwrap_or(HMODULE(0));

      // Create child window
      let child_hwnd = CreateWindowExW(
        windows::Win32::UI::WindowsAndMessaging::WINDOW_EX_STYLE(0),
        w!("LumaWallHostClass"),
        w!("LumaWall Background Host"),
        WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS,
        0,
        0,
        width as i32,
        height as i32,
        workerw,
        windows::Win32::UI::WindowsAndMessaging::HMENU(0),
        hinstance,
        None,
      );

      if child_hwnd.0 == 0 {
        let err = format!("Failed to create host window for WorkerW: {:?}", windows::core::Error::from_win32());
        let _ = tx.send(Err(err));
        return;
      }

      // Ensure it is set as child of WorkerW and stays behind everything else.
      let _ = SetParent(child_hwnd, workerw);
      let _ = SetWindowPos(
        child_hwnd,
        HWND_BOTTOM,
        0,
        0,
        width as i32,
        height as i32,
        SWP_SHOWWINDOW | SWP_NOACTIVATE,
      );
      let _ = ShowWindow(child_hwnd, SW_SHOW);

      HOST_WINDOW_HWND.store(child_hwnd.0, Ordering::SeqCst);

      // If a stop was requested while we were still creating the window, close it now.
      if STOP_REQUESTED.load(Ordering::SeqCst) {
        let _ = PostMessageW(child_hwnd, WM_CLOSE, WPARAM(0), LPARAM(0));
      }

      // Create WebView2 on the child window
      let handler_tx: Sender<std::result::Result<(), String>> = tx.clone();
      let create_env_handler = CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(
        move |res, env| {
          if let Err(e) = res {
            let _ = handler_tx.send(Err(format!("WebView2 environment creation error: {e}")));
            return Ok(());
          }

          let env = match env {
            Some(e) => e,
            None => {
              let _ = handler_tx.send(Err("WebView2 environment is null".to_string()));
              return Ok(());
            }
          };

          let inner_tx = handler_tx.clone();
          let content_clone = content.clone();

          let controller_handler = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
            move |res, controller| {
              if let Err(e) = res {
                let _ = inner_tx.send(Err(format!("WebView2 controller creation error: {e}")));
                return Ok(());
              }

              let controller = match controller {
                Some(c) => c,
                None => {
                  let _ = inner_tx.send(Err("WebView2 controller is null".to_string()));
                  return Ok(());
                }
              };

              let bounds = RECT {
                left: 0,
                top: 0,
                right: width as i32,
                bottom: height as i32,
              };
              let _ = controller.SetBounds(bounds);
              let _ = controller.SetIsVisible(true);

              if let Ok(webview) = controller.CoreWebView2() {
                // Tune the wallpaper WebView: no UI chrome, no throttling.
                if let Ok(settings) = webview.Settings() {
                  let _ = settings.SetAreDefaultContextMenusEnabled(false);
                  let _ = settings.SetIsZoomControlEnabled(false);
                  let _ = settings.SetAreDevToolsEnabled(false);
                  let _ = settings.SetIsStatusBarEnabled(false);
                }

                if is_html_content {
                  let wide_html: Vec<u16> = content_clone.encode_utf16().chain(std::iter::once(0)).collect();
                  let _ = webview.NavigateToString(PCWSTR(wide_html.as_ptr()));
                } else {
                  let wide_url: Vec<u16> = content_clone.encode_utf16().chain(std::iter::once(0)).collect();
                  let _ = webview.Navigate(PCWSTR(wide_url.as_ptr()));
                }

                let live_win = LiveWallpaperWindow {
                  hwnd: child_hwnd,
                  controller: Some(controller),
                  webview: Some(webview),
                };

                if let Ok(mut store) = active_window_store().lock() {
                  *store = Some(Arc::new(Mutex::new(live_win)));
                }

                // Start the global-cursor poller (fires on the host thread's
                // message loop, which owns the WebView2 — no cross-thread calls).
                // 100ms interval (10fps) is sufficient for smooth parallax —
                // the JS side interpolates, so higher poll rates waste CPU.
                let _ = SetTimer(child_hwnd, CURSOR_TIMER_ID, 100, None);

                let _ = inner_tx.send(Ok(()));
              } else {
                let _ = inner_tx.send(Err("Failed to get CoreWebView2".to_string()));
              }
              Ok(())
            },
          ));

          if let Err(e) = env.CreateCoreWebView2Controller(child_hwnd, &controller_handler) {
            let _ = handler_tx.send(Err(format!("CreateCoreWebView2Controller failed: {e}")));
          }
          Ok(())
        },
      ));

      let user_data_dir = std::env::temp_dir().join("lumawall_webview2");
      let user_data_str = user_data_dir.to_string_lossy().to_string();
      let user_data_wide: Vec<u16> = user_data_str.encode_utf16().chain(std::iter::once(0)).collect();

      if let Err(e) = CreateCoreWebView2EnvironmentWithOptions(
        PCWSTR::null(),
        PCWSTR(user_data_wide.as_ptr()),
        None,
        &create_env_handler,
      ) {
        let _ = tx.send(Err(format!("CreateCoreWebView2EnvironmentWithOptions failed: {e}")));
        return;
      }

      // Windows message loop to keep WebView2 alive. GetMessageW returns 0 when
      // WM_QUIT is posted (from our WM_DESTROY handler), which exits the loop.
      let mut msg = windows::Win32::UI::WindowsAndMessaging::MSG::default();
      while windows::Win32::UI::WindowsAndMessaging::GetMessageW(&mut msg, HWND(0), 0, 0).as_bool() {
        let _ = windows::Win32::UI::WindowsAndMessaging::TranslateMessage(&msg);
        windows::Win32::UI::WindowsAndMessaging::DispatchMessageW(&msg);

        // Safety net: exit if the window was destroyed elsewhere.
        let curr = HOST_WINDOW_HWND.load(Ordering::SeqCst);
        if curr == 0 {
          break;
        }
      }

      CoUninitialize();
    }
  });

  // Wait for a definitive signal from the init chain. The completion callbacks
  // run on the spawned thread's message loop, so a timeout genuinely means the
  // WebView2 initialization stalled (e.g. runtime not installed) — report it
  // honestly instead of pretending the wallpaper started.
  match rx.recv_timeout(Duration::from_secs(30)) {
    Ok(Ok(())) => Ok("Native WorkerW live wallpaper started successfully".to_string()),
    Ok(Err(e)) => Err(e),
    Err(_) => Err(
      "Timed out while initializing the live wallpaper window (30s). \
       The WebView2 runtime may be missing — install it from \
       https://developer.microsoft.com/microsoft-edge/webview2/ and try again."
        .to_string(),
    ),
  }
}

/// Returns true when a live wallpaper window exists and is likely still alive.
pub fn is_live_wallpaper_running() -> bool {
  let hwnd_val = HOST_WINDOW_HWND.load(Ordering::SeqCst);
  if hwnd_val == 0 {
    return false;
  }
  unsafe { windows::Win32::UI::WindowsAndMessaging::IsWindow(HWND(hwnd_val)).as_bool() }
}

/// Request the live wallpaper window to close. This only posts WM_CLOSE — the
/// host thread performs all WebView2/window teardown itself, which avoids the
/// cross-thread destruction races that crashed the app.
pub fn stop_live_wallpaper_native() {
  STOP_REQUESTED.store(true, Ordering::SeqCst);

  let old_hwnd = HOST_WINDOW_HWND.swap(0, Ordering::SeqCst);
  if old_hwnd != 0 {
    TEARDOWN_DONE.store(false, Ordering::SeqCst);
    unsafe {
      let _ = PostMessageW(HWND(old_hwnd), WM_CLOSE, WPARAM(0), LPARAM(0));
    }
  }
}
