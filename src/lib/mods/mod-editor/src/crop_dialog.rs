use egui::{Color32, Pos2, Rect, Vec2};
use egui::StrokeKind;

pub struct CropState {
    pub open: bool,
    pub source_image: Option<image::DynamicImage>,
    pub source_rgba: Option<egui::ColorImage>,
    pub texture: Option<egui::TextureHandle>,
    pub ratio: f32,
    pub target_w: u32,
    pub target_h: u32,
    pub offset: Vec2,
    pub zoom: f32,
    dragging: bool,
    drag_start: Option<Pos2>,
    pub output: Option<image::DynamicImage>,
    disp_size: Vec2,
}

impl CropState {
    pub fn new() -> Self {
        Self {
            open: false,
            source_image: None,
            source_rgba: None,
            texture: None,
            ratio: 1.0,
            target_w: 256,
            target_h: 256,
            offset: Vec2::ZERO,
            zoom: 1.0,
            dragging: false,
            drag_start: None,
            output: None,
            disp_size: Vec2::new(400.0, 400.0),
        }
    }

    pub fn open_for_icon(&mut self, img: image::DynamicImage) {
        self.open = true;
        self.ratio = 1.0;
        self.target_w = 256;
        self.target_h = 256;
        self.set_image(img);
    }

    pub fn open_for_screenshot(&mut self, img: image::DynamicImage) {
        self.open = true;
        self.ratio = 16.0 / 9.0;
        self.target_w = 1280;
        self.target_h = 720;
        self.set_image(img);
    }

    fn set_image(&mut self, img: image::DynamicImage) {
        let rgba = img.to_rgba8();
        let (w, h) = rgba.dimensions();
        let size = [w as usize, h as usize];
        let pixels = rgba.into_raw();
        self.source_rgba = Some(egui::ColorImage::from_rgba_unmultiplied(size, &pixels));
        self.source_image = Some(img);
        self.texture = None;
        self.offset = Vec2::ZERO;
        self.zoom = 1.0;
        let img_w = w as f32;
        let img_h = h as f32;
        let fit_scale = if img_w / img_h > self.ratio { img_h / (img_w / self.ratio) } else { 1.0 };
        self.zoom = fit_scale.min(1.0);
    }

    pub fn show(&mut self, ctx: &egui::Context) {
        let mut open = self.open;
        egui::Window::new("裁切图片")
            .open(&mut open)
            .id(egui::Id::new("crop_dialog"))
            .collapsible(false)
            .resizable(false)
            .default_size(egui::vec2(640.0, 520.0))
            .show(ctx, |ui| {
                egui::TopBottomPanel::bottom("crop_buttons").min_height(0.0).show_inside(ui, |ui| {
                    ui.horizontal(|ui| {
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.button("取消").clicked() { self.open = false; }
                            if ui.button("确认").clicked() { self.do_crop(); self.open = false; }
                        });
                    });
                });
                egui::CentralPanel::default().show_inside(ui, |ui| {
                    if let Some(color_img) = &self.source_rgba.clone() {
                        let (avail_w, avail_h) = (ui.available_width(), ui.available_height() - 40.0);
                        let crop_w = avail_w.min(avail_h * self.ratio);
                        let crop_h = crop_w / self.ratio;
                        let display_size = egui::vec2(crop_w, crop_h);
                        self.disp_size = display_size;
                        let (resp, painter) = ui.allocate_painter(display_size, egui::Sense::click_and_drag());

                        // Load texture if needed
                        if self.texture.is_none() {
                            let tex = ctx.load_texture("crop_img", color_img.clone(), egui::TextureOptions::LINEAR);
                            self.texture = Some(tex);
                        }

                        // Draw the image as a texture (preserve aspect ratio)
                        let img_w = color_img.width() as f32;
                        let img_h = color_img.height() as f32;
                        let avail_rect = resp.rect;
                        let scale = (crop_w / img_w).min(crop_h / img_h);
                        let draw_w = img_w * scale * self.zoom;
                        let draw_h = img_h * scale * self.zoom;
                        let img_rect = Rect::from_center_size(
                            avail_rect.center() + self.offset,
                            Vec2::new(draw_w, draw_h),
                        );
                        painter.rect_filled(avail_rect, 0.0, Color32::from_gray(30));

                        if let Some(tex) = &self.texture {
                            let uv = egui::Rect::from_min_max(egui::pos2(0.0, 0.0), egui::pos2(1.0, 1.0));
                            painter.image(tex.id(), img_rect, uv, Color32::WHITE);
                        }

                        // Crop overlay
                        let center = avail_rect.center() + self.offset;
                        let cw = crop_w * self.zoom;
                        let ch = crop_h * self.zoom;
                        let crop_rect = Rect::from_center_size(center, Vec2::new(cw, ch));
                        let overlay = Color32::from_black_alpha(160);
                        if crop_rect.top() > avail_rect.top() {
                            painter.rect_filled(Rect::from_min_max(avail_rect.left_top(), Pos2::new(avail_rect.right(), crop_rect.top())), 0.0, overlay);
                        }
                        if crop_rect.bottom() < avail_rect.bottom() {
                            painter.rect_filled(Rect::from_min_max(Pos2::new(avail_rect.left(), crop_rect.bottom()), avail_rect.right_bottom()), 0.0, overlay);
                        }
                        if crop_rect.left() > avail_rect.left() {
                            painter.rect_filled(Rect::from_min_max(Pos2::new(avail_rect.left(), avail_rect.top()), Pos2::new(crop_rect.left(), avail_rect.bottom())), 0.0, overlay);
                        }
                        if crop_rect.right() < avail_rect.right() {
                            painter.rect_filled(Rect::from_min_max(Pos2::new(crop_rect.right(), avail_rect.top()), avail_rect.right_bottom()), 0.0, overlay);
                        }
                        painter.rect_stroke(crop_rect, 0.0, egui::Stroke::new(2.0, Color32::WHITE), StrokeKind::Middle);
                        // Mouse handling
                        if resp.dragged_by(egui::PointerButton::Primary) { self.offset += resp.drag_delta(); }
                        if resp.hovered() {
                            let scroll = ctx.input(|i| i.events.iter().filter_map(|e| {
                                if let egui::Event::MouseWheel { delta, .. } = e { Some(delta.y) } else { None }
                            }).sum::<f32>());
                            if scroll != 0.0 { self.zoom = (self.zoom * (1.0 + scroll * 0.005)).clamp(0.1, 10.0); }
                        }
                        // Info
                        ui.horizontal(|ui| {
                            ui.label(format!("缩放: {:.1}x", self.zoom));
                            ui.label(format!("输出: {}x{}", self.target_w, self.target_h));
                            ui.label("鼠标拖拽移动 · 滚轮缩放");
                        });
                    }
                });
            });
        if !open { self.open = false; }
    }

    fn do_crop(&mut self) {
        let src = match &self.source_image { Some(s) => s, None => return };
        let (src_w, src_h) = (src.width(), src.height());
        let img_w = src_w as f32;
        let img_h = src_h as f32;
        let disp_w = self.disp_size.x.max(1.0);
        let disp_h = self.disp_size.y.max(1.0);
        // The image is drawn at scale * zoom within the display area
        let scale = (disp_w / img_w).min(disp_h / img_h);
        let draw_w = img_w * scale * self.zoom;
        let draw_h = img_h * scale * self.zoom;
        // Offset relative to image display origin (in display pixels)
        let ox = self.offset.x;
        let oy = self.offset.y;
        // Crop rect center in display coords = display center + offset
        let cx_disp = disp_w / 2.0 + ox;
        let cy_disp = disp_h / 2.0 + oy;
        // Map display coords to source coords
        let src_cx = (cx_disp / draw_w) * img_w;
        let src_cy = (cy_disp / draw_h) * img_h;
        // The crop window (display viewport) = disp_w x disp_h in display pixels
        // Map to source: (disp_w / draw_w) * img_w = img_w / (scale * zoom)
        let src_crop_w = img_w / (scale * self.zoom);
        let src_crop_h = img_h / (scale * self.zoom);
        let x = (src_cx - src_crop_w / 2.0).max(0.0) as u32;
        let y = (src_cy - src_crop_h / 2.0).max(0.0) as u32;
        let cw = (src_crop_w.min(img_w - x as f32)).max(1.0) as u32;
        let ch = (src_crop_h.min(img_h - y as f32)).max(1.0) as u32;
        let cropped = src.crop_imm(x, y, cw.min(src_w), ch.min(src_h));
        let filter = if self.zoom > 1.0 { image::imageops::FilterType::Nearest } else { image::imageops::FilterType::Lanczos3 };
        let resized = cropped.resize_exact(self.target_w, self.target_h, filter);
        self.output = Some(resized);
    }
}
