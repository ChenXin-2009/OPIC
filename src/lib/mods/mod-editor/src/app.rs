use std::path::PathBuf;
use std::collections::HashMap;

use egui::{self, Color32};

use crate::canvas::CanvasState;
use crate::crop_dialog::CropState;
use crate::data;
use crate::types::*;

pub struct ModEditorApp {
    mods: Vec<ModInfo>,
    selected_idx: usize,
    active_tab: Tab,
    canvas: CanvasState,
    crop: CropState,
    textures: HashMap<String, egui::TextureHandle>,
    has_changes: bool,
    crop_slot: Option<ImageSlot>,
}

enum Tab { Images, Info, Preview }

impl Default for ModEditorApp {
    fn default() -> Self {
        let mods = data::discover_mods();
        Self {
            selected_idx: 0,
            mods,
            active_tab: Tab::Images,
            canvas: CanvasState::new(),
            crop: CropState::new(),
            textures: HashMap::new(),
            has_changes: false,
            crop_slot: None,
        }
    }
}

impl ModEditorApp {
    fn selected_mod(&self) -> Option<&ModInfo> { self.mods.get(self.selected_idx) }
    fn selected_mod_mut(&mut self) -> Option<&mut ModInfo> { self.mods.get_mut(self.selected_idx) }

    fn load_color_image(path: &PathBuf) -> Option<egui::ColorImage> {
        let img = image::ImageReader::open(path).ok()?.decode().ok()?;
        let rgba = img.to_rgba8();
        let (w, h) = rgba.dimensions();
        Some(egui::ColorImage::from_rgba_unmultiplied([w as usize, h as usize], &rgba.into_raw()))
    }

    fn get_or_load_texture(&mut self, ctx: &egui::Context, rel_path: &str) -> Option<egui::TextureId> {
        if rel_path.is_empty() { return None; }
        if let Some(tex) = self.textures.get(rel_path) { return Some(tex.id()); }
        let clean = rel_path.strip_prefix('/').unwrap_or(rel_path);
        let abs_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../../../public").join(clean);
        if !abs_path.exists() { return None; }
        if let Some(color_img) = Self::load_color_image(&abs_path) {
            let tex = ctx.load_texture(rel_path, color_img, egui::TextureOptions::LINEAR);
            let id = tex.id();
            self.textures.insert(rel_path.to_string(), tex);
            Some(id)
        } else { None }
    }

    fn paste_image(&mut self) -> Option<image::DynamicImage> {
        let mut clipboard = arboard::Clipboard::new().ok()?;
        let image_data = clipboard.get_image().ok()?;
        let w = image_data.width as u32;
        let h = image_data.height as u32;
        let bytes: Vec<u8> = image_data.bytes.into_owned();
        let rgba = image::RgbaImage::from_raw(w, h, bytes)?;
        Some(image::DynamicImage::ImageRgba8(rgba))
    }

    fn pick_file(&self) -> Option<image::DynamicImage> {
        let file = rfd::FileDialog::new().add_filter("图片", &["png", "jpg", "jpeg", "webp", "bmp"]).pick_file()?;
        image::ImageReader::open(&file).ok()?.decode().ok()
    }

    fn save_icon_from_canvas(&mut self) {
        let mod_id = self.selected_mod().map(|m| m.id.clone());
        let output = self.canvas.output.take();
        if let (Some(mod_id), Some(pixels)) = (mod_id, output) {
            let size = self.canvas.size;
            let mut img = image::RgbaImage::new(size, size);
            for y in 0..size { for x in 0..size {
                let idx = (y as usize) * size as usize + (x as usize);
                let c = pixels.get(idx).copied().unwrap_or(Color32::TRANSPARENT);
                let a = c.a() as u32;
                let (r, g, b) = if a > 0 {
                    ((c.r() as u32 * 255 / a).min(255) as u8,
                     (c.g() as u32 * 255 / a).min(255) as u8,
                     (c.b() as u32 * 255 / a).min(255) as u8)
                } else { (0, 0, 0) };
                img.put_pixel(x, y, image::Rgba([r, g, b, c.a()]));
            }}
            let _ = std::fs::create_dir_all(data::image_output_dir(&mod_id));
            let out_path = data::icon_output_path(&mod_id);
            if save_webp(&img, &out_path, 60).is_ok() {
                if let Some(m) = self.selected_mod_mut() {
                    m.meta.icon_image = format!("/mods/{}/icon.webp", mod_id);
                    let _ = data::save_meta(&mod_id, &m.meta);
                }
                self.textures.remove(&format!("/mods/{}/icon.webp", mod_id));
                self.has_changes = true;
            }
        }
    }

    fn handle_image_upload(&mut self, slot: &ImageSlot) {
        if let Some(img) = self.pick_file() {
            self.crop_slot = Some(*slot);
            match slot { ImageSlot::Icon => self.crop.open_for_icon(img), ImageSlot::Screenshot(_) => self.crop.open_for_screenshot(img) }
        }
    }

    fn handle_image_paste(&mut self, slot: &ImageSlot) {
        if let Some(img) = self.paste_image() {
            self.crop_slot = Some(*slot);
            match slot { ImageSlot::Icon => self.crop.open_for_icon(img), ImageSlot::Screenshot(_) => self.crop.open_for_screenshot(img) }
        }
    }

    fn handle_image_draw(&mut self) {
        let mod_id = match self.selected_mod() { Some(m) => m.id.clone(), None => return };
        let existing = data::icon_output_path(&mod_id);
        let (pixels, size) = if existing.exists() {
            if let Some(Ok(img)) = image::ImageReader::open(&existing).map(|r| r.decode()).ok() {
                let rgba = img.to_rgba8();
                let (w, h) = rgba.dimensions();
                if w == h && w > 0 {
                    let pixels: Vec<Color32> = rgba.into_raw().chunks(4).map(|c| Color32::from_rgba_unmultiplied(c[0], c[1], c[2], c[3])).collect();
                    (Some(pixels), w)
                } else { (None, 256) }
            } else { (None, 256) }
        } else { (None, 256) };
        self.canvas.open_with_image(pixels.as_deref(), size);
    }

    fn process_crop_output(&mut self) {
        let mod_id = match self.selected_mod() { Some(m) => m.id.clone(), None => return };
        let slot = match self.crop_slot.take() { Some(s) => s, None => return };
        let _ = std::fs::create_dir_all(data::image_output_dir(&mod_id));
        if let Some(img) = self.crop.output.take() {
            match slot {
                ImageSlot::Icon => {
                    let out_path = data::icon_output_path(&mod_id);
                    if save_webp(&img.to_rgba8(), &out_path, 60).is_ok() {
                        if let Some(m) = self.selected_mod_mut() {
                            m.meta.icon_image = format!("/mods/{}/icon.webp", mod_id);
                            let _ = data::save_meta(&mod_id, &m.meta);
                        }
                        self.textures.remove(&format!("/mods/{}/icon.webp", mod_id));
                    }
                }
                ImageSlot::Screenshot(idx) => {
                    let out_path = data::screenshot_output_path(&mod_id, idx);
                    if save_jpeg(&img.to_rgb8(), &out_path, 60).is_ok() {
                        if let Some(m) = self.selected_mod_mut() {
                            let path_str = format!("/mods/{}/screenshot-{}.jpg", mod_id, idx + 1);
                            if idx >= m.meta.screenshots.len() { m.meta.screenshots.resize(idx + 1, String::new()); }
                            m.meta.screenshots[idx] = path_str;
                            let _ = data::save_meta(&mod_id, &m.meta);
                        }
                        self.textures.remove(&format!("/mods/{}/screenshot-{}.jpg", mod_id, idx + 1));
                    }
                }
            }
            self.has_changes = true;
        }
    }

}

fn save_webp(img: &image::RgbaImage, path: &PathBuf, _quality: u8) -> Result<(), String> {
    use std::io::BufWriter;
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let w = BufWriter::new(file);
    let encoder = image::codecs::webp::WebPEncoder::new_lossless(w);
    img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
    Ok(())
}

fn save_jpeg(img: &image::RgbImage, path: &PathBuf, quality: u8) -> Result<(), String> {
    let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let w = std::io::BufWriter::new(file);
    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(w, quality);
    img.write_with_encoder(encoder).map_err(|e| e.to_string())?;
    Ok(())
}

impl eframe::App for ModEditorApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        ctx.set_visuals(egui::Visuals::dark());

        // Keyboard shortcuts for canvas
        if self.canvas.open {
            if ctx.input_mut(|i| i.consume_key(egui::Modifiers::CTRL, egui::Key::Z)) { self.canvas.undo(); }
            if ctx.input_mut(|i| i.consume_key(egui::Modifiers::CTRL, egui::Key::Y)) { self.canvas.redo(); }
            if self.canvas.selected_tool == crate::canvas::Tool::Pen && self.canvas.pen_has_nodes() {
                if ctx.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Enter)) { self.canvas.commit_pen_path(); }
                if ctx.input_mut(|i| i.consume_key(egui::Modifiers::NONE, egui::Key::Escape)) { self.canvas.cancel_pen_path(); }
            }
        }

        if !self.crop.open && self.crop.output.is_some() { self.process_crop_output(); }
        if self.canvas.open { self.canvas.show(ctx); if !self.canvas.open && self.canvas.output.is_some() { self.save_icon_from_canvas(); } }
        if self.crop.open { self.crop.show(ctx); }

        egui::SidePanel::left("mod_list").resizable(true).default_width(200.0).min_width(140.0).show(ctx, |ui| {
            ui.heading("MOD 列表"); ui.separator();
            egui::ScrollArea::vertical().show(ui, |ui| {
                for (i, m) in self.mods.iter().enumerate() {
                    if ui.selectable_label(self.selected_idx == i, m.display_name()).clicked() { self.selected_idx = i; }
                }
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            if self.mods.is_empty() { ui.label("未找到任何 MOD"); return; }
            let mod_info = match self.selected_mod().cloned() { Some(m) => m, None => return };

            ui.horizontal(|ui| {
                macro_rules! tab_btn { ($label:expr, $variant:ident) => {
                    if ui.selectable_label(matches!(self.active_tab, Tab::$variant), $label).clicked() { self.active_tab = Tab::$variant; }
                };}
                tab_btn!("图片", Images); tab_btn!("信息", Info); tab_btn!("预览", Preview);
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    if ui.button("保存所有更改").clicked() {
                        if let Some(m) = self.selected_mod() { let _ = data::save_meta(&m.id, &m.meta); self.has_changes = false; }
                    }
                    if self.has_changes { ui.label("⚠ 有未保存更改"); }
                });
                ui.separator();
                ui.label(format!("{} v{}", mod_info.display_name(), mod_info.version));
            });
            ui.separator();
            match self.active_tab { Tab::Images => self.show_images_tab(ui, ctx), Tab::Info => self.show_info_tab(ui, &mod_info), Tab::Preview => self.show_preview_tab(ui, ctx, &mod_info) }
        });
    }
}

impl ModEditorApp {
    fn show_images_tab(&mut self, ui: &mut egui::Ui, ctx: &egui::Context) {
        ui.vertical(|ui| {
            ui.horizontal(|ui| { ui.label("图标: 256×256 WebP (质量60)"); ui.separator(); ui.label("效果图: 1280×720 JPG (质量60)"); });
            ui.add_space(10.0);
            let mod_info = match self.selected_mod().cloned() { Some(m) => m, None => return };
            let icon_path = mod_info.meta.icon_image.clone();
            let ss0 = mod_info.meta.screenshots.get(0).cloned().unwrap_or_default();
            let ss1 = mod_info.meta.screenshots.get(1).cloned().unwrap_or_default();
            let ss2 = mod_info.meta.screenshots.get(2).cloned().unwrap_or_default();

            egui::Grid::new("img_grid").num_columns(2).spacing([10.0, 10.0]).show(ui, |ui| {
                self.image_slot(ui, ctx, "Icon", &icon_path, &ImageSlot::Icon, egui::vec2(140.0, 140.0));
                self.image_slot(ui, ctx, "效果图 1", &ss0, &ImageSlot::Screenshot(0), egui::vec2(200.0, 113.0));
                ui.end_row();
                self.image_slot(ui, ctx, "效果图 2", &ss1, &ImageSlot::Screenshot(1), egui::vec2(200.0, 113.0));
                self.image_slot(ui, ctx, "效果图 3", &ss2, &ImageSlot::Screenshot(2), egui::vec2(200.0, 113.0));
                ui.end_row();
            });
        });
    }

    fn image_slot(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, label: &str, path: &str, slot: &ImageSlot, size: egui::Vec2) {
        ui.group(|ui| {
            ui.vertical_centered(|ui| {
                ui.label(label);
                let (rect, _) = ui.allocate_exact_size(size, egui::Sense::hover());
                if !path.is_empty() {
                    if let Some(tex_id) = self.get_or_load_texture(ctx, path) {
                        let img = egui::Image::new(egui::load::SizedTexture::new(tex_id, size)).fit_to_exact_size(size);
                        ui.add(img);
                    }
                } else {
                    ui.painter().rect_filled(rect, 4.0, Color32::from_gray(30));
                    ui.painter().text(rect.center(), egui::Align2::CENTER_CENTER, "空", egui::FontId::proportional(14.0), Color32::GRAY);
                }
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    if ui.button("粘贴").clicked() { self.handle_image_paste(slot); }
                    if ui.button("上传").clicked() { self.handle_image_upload(slot); }
                    if matches!(slot, ImageSlot::Icon) && ui.button("绘制").clicked() { self.handle_image_draw(); }
                });
            });
        });
    }

    fn show_info_tab(&mut self, ui: &mut egui::Ui, m: &ModInfo) {
        egui::Grid::new("info").striped(true).show(ui, |ui| {
            ui.label("ID:"); ui.label(&m.id); ui.end_row();
            ui.label("英文名:"); ui.label(&m.name_en); ui.end_row();
            ui.label("中文名:"); ui.label(&m.name_zh); ui.end_row();
            ui.label("版本:"); ui.label(&m.version); ui.end_row();
            ui.label("作者:"); ui.label(&m.author); ui.end_row();
        });
        ui.add_space(8.0);
        ui.label("当前图片:");
        ui.label(format!("  Icon: {}", m.meta.icon_image));
        for (i, ss) in m.meta.screenshots.iter().enumerate() { ui.label(format!("  Screenshot {}: {}", i + 1, ss)); }
    }

    fn show_preview_tab(&mut self, ui: &mut egui::Ui, ctx: &egui::Context, m: &ModInfo) {
        ui.group(|ui| {
            ui.horizontal(|ui| {
                let icon_path = &m.meta.icon_image;
                if !icon_path.is_empty() {
                    if let Some(tex_id) = self.get_or_load_texture(ctx, icon_path) {
                        ui.add(egui::Image::new(egui::load::SizedTexture::new(tex_id, egui::vec2(64.0, 64.0))).fit_to_exact_size(egui::vec2(64.0, 64.0)));
                    }
                } else {
                    ui.allocate_space(egui::vec2(64.0, 64.0));
                }
                ui.add_space(8.0);
                ui.vertical(|ui| {
                    ui.heading(m.display_name());
                    ui.label(format!("v{} · {}", m.version, m.author));
                    let desc = if m.description_zh.is_empty() { &m.description_en } else { &m.description_zh };
                    ui.label(desc);
                });
            });
        });
        ui.add_space(8.0);
        ui.label("效果图预览:");
        ui.horizontal(|ui| {
            for ss in &m.meta.screenshots {
                if ss.is_empty() {
                    let (rect, _) = ui.allocate_exact_size(egui::vec2(200.0, 113.0), egui::Sense::hover());
                    ui.painter().rect_filled(rect, 4.0, Color32::from_gray(30));
                    ui.painter().text(rect.center(), egui::Align2::CENTER_CENTER, "空", egui::FontId::proportional(14.0), Color32::GRAY);
                } else if let Some(tex_id) = self.get_or_load_texture(ctx, ss) {
                    ui.add(egui::Image::new(egui::load::SizedTexture::new(tex_id, egui::vec2(200.0, 113.0))).fit_to_exact_size(egui::vec2(200.0, 113.0)));
                }
                ui.add_space(5.0);
            }
        });
    }
}
