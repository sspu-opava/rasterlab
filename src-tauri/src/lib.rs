#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            files::save_project,
            files::load_project,
            files::write_export
        ])
        .run(tauri::generate_context!())
        .expect("error while running RasterLab");
}
mod files;
