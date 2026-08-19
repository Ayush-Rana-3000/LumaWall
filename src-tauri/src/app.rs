/// Application-level initialization and lifecycle management
#[derive(Debug, Clone, Default)]
#[allow(dead_code)]
pub struct AppState {
  pub is_running: bool,
}

#[allow(dead_code)]
impl AppState {
  pub fn new() -> Self {
    Self { is_running: true }
  }
}
