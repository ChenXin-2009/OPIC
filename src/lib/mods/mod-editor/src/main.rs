mod app;
mod canvas;
mod color_picker;
mod crop_dialog;
mod data;
mod types;

use std::sync::Arc;
use eframe::NativeOptions;
use app::ModEditorApp;

fn main() -> eframe::Result {
    let options = NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size(egui::vec2(960.0, 640.0))
            .with_title("OPIC Mod 编辑器"),
        ..Default::default()
    };
    eframe::run_native(
        "OPIC Mod 编辑器",
        options,
        Box::new(|cc| {
            cc.egui_ctx.set_visuals(egui::Visuals::dark());
            let mut fonts = egui::FontDefinitions::default();
            // Try system Chinese fonts; fall back gracefully
            let candidates = [
                ("msyh.ttc", "C:\\Windows\\Fonts\\msyh.ttc"),
                ("msyhbd.ttc", "C:\\Windows\\Fonts\\msyhbd.ttc"),
                ("simsun.ttc", "C:\\Windows\\Fonts\\simsun.ttc"),
                ("simsun.ttf", "C:\\Windows\\Fonts\\simsun.ttf"),
                ("msyh.ttf", "C:\\Windows\\Fonts\\msyh.ttf"),
                ("yahei.ttf", "C:\\Windows\\Fonts\\Microsoft YaHei UI\\msyh.ttc"),
                ("yahei.ttc", "C:\\Windows\\Fonts\\Microsoft YaHei\\msyh.ttc"),
                ("PingFang.ttc", "/System/Library/Fonts/PingFang.ttc"),
                ("NotoSansCJK-Regular.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
                ("wqy-zenhei.ttf", "/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc"),
            ];
            let mut loaded = false;
            for (name, path) in &candidates {
                if let Ok(data) = std::fs::read(path) {
                    eprintln!("[mod-editor] Loaded font: {} ({})", name, path);
                    fonts.font_data.insert(
                        "cjk".to_string(),
                        Arc::new(egui::FontData::from_owned(data.into())),
                    );
                    if let Some(prop) = fonts.families.get_mut(&egui::FontFamily::Proportional) {
                        prop.insert(0, "cjk".to_string());
                    }
                    if let Some(mono) = fonts.families.get_mut(&egui::FontFamily::Monospace) {
                        mono.insert(0, "cjk".to_string());
                    }
                    loaded = true;
                    break;
                }
            }
            if !loaded {
                eprintln!("[mod-editor] WARNING: No CJK font found, Chinese text may show as boxes");
            }
            cc.egui_ctx.set_fonts(fonts);
            Ok(Box::new(ModEditorApp::default()))
        }),
    )
}
