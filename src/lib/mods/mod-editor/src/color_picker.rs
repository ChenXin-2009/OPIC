use egui::Color32;

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8, u8, u8) {
    let s = s / 100.0;
    let l = l / 100.0;
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - (((h / 60.0) % 2.0) - 1.0).abs());
    let m = l - c / 2.0;
    let (r, g, b) = if h < 60.0 { (c, x, 0.0) }
    else if h < 120.0 { (x, c, 0.0) }
    else if h < 180.0 { (0.0, c, x) }
    else if h < 240.0 { (0.0, x, c) }
    else if h < 300.0 { (x, 0.0, c) }
    else { (c, 0.0, x) };
    (((r + m) * 255.0) as u8, ((g + m) * 255.0) as u8, ((b + m) * 255.0) as u8)
}

fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f32, f32, f32) {
    let rn = r as f32 / 255.0;
    let gn = g as f32 / 255.0;
    let bn = b as f32 / 255.0;
    let max = rn.max(gn).max(bn);
    let min = rn.min(gn).min(bn);
    let l = (max + min) / 2.0;
    if max == min { return (0.0, 0.0, l * 100.0); }
    let d = max - min;
    let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
    let h = if max == rn {
        ((gn - bn) / d + if gn < bn { 6.0 } else { 0.0 }) * 60.0
    } else if max == gn {
        ((bn - rn) / d + 2.0) * 60.0
    } else {
        ((rn - gn) / d + 4.0) * 60.0
    };
    (h, s * 100.0, l * 100.0)
}

fn rgb_to_hex(r: u8, g: u8, b: u8) -> String {
    format!("#{:02X}{:02X}{:02X}", r, g, b)
}

fn hex_to_rgb(hex: &str) -> Option<(u8, u8, u8)> {
    let s = hex.trim_start_matches('#');
    if s.len() != 6 { return None; }
    let val = u32::from_str_radix(s, 16).ok()?;
    Some(((val >> 16) as u8, ((val >> 8) & 0xFF) as u8, (val & 0xFF) as u8))
}

pub struct ColorPicker {
    pub open: bool,
    r: u8,
    g: u8,
    b: u8,
    h: f32,
    s: f32,
    l: f32,
    hex: String,
}

impl ColorPicker {
    pub fn new() -> Self {
        Self {
            open: false,
            r: 255, g: 255, b: 255,
            h: 0.0, s: 0.0, l: 100.0,
            hex: "#FFFFFF".to_string(),
        }
    }

    pub fn open_with(&mut self, color: Color32) {
        let r = color.r();
        let g = color.g();
        let b = color.b();
        self.r = r;
        self.g = g;
        self.b = b;
        let (h, s, l) = rgb_to_hsl(r, g, b);
        self.h = h;
        self.s = s;
        self.l = l;
        self.hex = rgb_to_hex(r, g, b);
        self.open = true;
    }

    /// Returns Some(Color32) if user confirmed, None if cancelled or still open
    pub fn show(&mut self, ctx: &egui::Context) -> Option<Color32> {
        let mut result = None;
        let mut open = self.open;
        egui::Window::new("调色板")
            .open(&mut open)
            .id(egui::Id::new("color_picker"))
            .collapsible(false)
            .resizable(false)
            .default_size(egui::vec2(280.0, 320.0))
            .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    // Preview
                    let preview_color = Color32::from_rgb(self.r, self.g, self.b);
                    let (rect, _) = ui.allocate_exact_size(egui::vec2(100.0, 40.0), egui::Sense::hover());
                    ui.painter().rect_filled(rect, 4.0, preview_color);
                    ui.add_space(8.0);

                    // RGB sliders
                    ui.horizontal(|ui| { ui.label("R:"); if ui.add(egui::Slider::new(&mut self.r, 0..=255).text("")).changed() { self.on_rgb_changed(); } });
                    ui.horizontal(|ui| { ui.label("G:"); if ui.add(egui::Slider::new(&mut self.g, 0..=255).text("")).changed() { self.on_rgb_changed(); } });
                    ui.horizontal(|ui| { ui.label("B:"); if ui.add(egui::Slider::new(&mut self.b, 0..=255).text("")).changed() { self.on_rgb_changed(); } });
                    ui.separator();

                    // HSL sliders
                    ui.horizontal(|ui| { ui.label("H:"); if ui.add(egui::Slider::new(&mut self.h, 0.0..=360.0).text("°")).changed() { self.on_hsl_changed(); } });
                    ui.horizontal(|ui| { ui.label("S:"); if ui.add(egui::Slider::new(&mut self.s, 0.0..=100.0).text("%")).changed() { self.on_hsl_changed(); } });
                    ui.horizontal(|ui| { ui.label("L:"); if ui.add(egui::Slider::new(&mut self.l, 0.0..=100.0).text("%")).changed() { self.on_hsl_changed(); } });
                    ui.separator();

                    // Hex input
                    ui.horizontal(|ui| {
                        ui.label("Hex:");
                        let prev = self.hex.clone();
                        let resp = ui.add(egui::TextEdit::singleline(&mut self.hex).desired_width(80.0));
                        if resp.changed() && self.hex.len() == 7 {
                            if let Some((r, g, b)) = hex_to_rgb(&self.hex) {
                                self.r = r; self.g = g; self.b = b;
                                let (h, s, l) = rgb_to_hsl(r, g, b);
                                self.h = h; self.s = s; self.l = l;
                            } else {
                                self.hex = prev;
                            }
                        }
                    });
                    ui.add_space(8.0);

                    // Buttons
                    ui.horizontal(|ui| {
                        if ui.button("取消").clicked() { self.open = false; }
                        if ui.button("确定").clicked() { result = Some(Color32::from_rgb(self.r, self.g, self.b)); self.open = false; }
                    });
                });
            });
        if !open { self.open = false; }
        result
    }

    fn on_rgb_changed(&mut self) {
        let (h, s, l) = rgb_to_hsl(self.r, self.g, self.b);
        self.h = h; self.s = s; self.l = l;
        self.hex = rgb_to_hex(self.r, self.g, self.b);
    }

    fn on_hsl_changed(&mut self) {
        let (r, g, b) = hsl_to_rgb(self.h, self.s, self.l);
        self.r = r; self.g = g; self.b = b;
        self.hex = rgb_to_hex(r, g, b);
    }
}
