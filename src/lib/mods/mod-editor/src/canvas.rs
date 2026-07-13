use egui::{Color32, Pos2, Rect, Vec2};
use egui::StrokeKind;

use crate::color_picker::ColorPicker;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Tool {
    Brush,
    Pen,
    Rectangle,
    Ellipse,
    Line,
    Eraser,
    Fill,
    MagicEraser,
}

#[derive(Debug, Clone)]
struct PenNode {
    pos: (f32, f32),
    handle_back: Option<(f32, f32)>,
    handle_fwd: Option<(f32, f32)>,
}

#[derive(Debug, Clone)]
struct PenState {
    nodes: Vec<PenNode>,
    active: bool,
    selected: Option<usize>,
    dragging_node: bool,
    dragging_handle: Option<(usize, bool)>, // (index, is_fwd)
}

pub struct CanvasState {
    pub open: bool,
    pub size: u32,
    pub pixels: Vec<Color32>,
    pub background: BackgroundMode,
    pub selected_tool: Tool,
    pub brush_color: Color32,
    pub brush_size: f32,
    pub hardness: f32,
    pub undo_stack: Vec<Vec<Color32>>,
    pub redo_stack: Vec<Vec<Color32>>,
    pub output: Option<Vec<Color32>>,
    drawing: bool,
    last_pos: Option<Pos2>,
    start_pos: Option<Pos2>,
    pub zoom: f32,
    pan: Vec2,
    pen_state: PenState,
    pub color_picker: ColorPicker,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BackgroundMode {
    Transparent,
    Black,
    White,
}

impl CanvasState {
    pub fn new() -> Self {
        let size = 256;
        Self {
            open: false,
            size,
            pixels: vec![Color32::TRANSPARENT; (size * size) as usize],
            background: BackgroundMode::Transparent,
            selected_tool: Tool::Brush,
            brush_color: Color32::WHITE,
            brush_size: 5.0,
            hardness: 1.0,
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
            output: None,
            drawing: false,
            last_pos: None,
            start_pos: None,
            zoom: 2.0,
            pan: Vec2::ZERO,
            pen_state: PenState { nodes: Vec::new(), active: false, selected: None, dragging_node: false, dragging_handle: None },
            color_picker: ColorPicker::new(),
        }
    }

    pub fn open_with_image(&mut self, existing: Option<&[Color32]>, existing_size: u32) {
        self.open = true;
        self.pen_state = PenState { nodes: Vec::new(), active: false, selected: None, dragging_node: false, dragging_handle: None };
        if let Some(pixels) = existing {
            if existing_size as usize * existing_size as usize == pixels.len() {
                self.size = existing_size;
                self.pixels = pixels.to_vec();
                return;
            }
        }
        self.size = 256;
        self.pixels = vec![Color32::TRANSPARENT; 256 * 256];
        self.undo_stack.clear();
        self.redo_stack.clear();
        self.zoom = 2.0;
        self.pan = Vec2::ZERO;
    }

    fn push_undo(&mut self) {
        self.undo_stack.push(self.pixels.clone());
        if self.undo_stack.len() > 64 { self.undo_stack.remove(0); }
        self.redo_stack.clear();
    }

    pub fn undo(&mut self) {
        if let Some(state) = self.undo_stack.pop() {
            self.redo_stack.push(std::mem::replace(&mut self.pixels, state));
        }
    }

    pub fn redo(&mut self) {
        if let Some(state) = self.redo_stack.pop() {
            self.undo_stack.push(std::mem::replace(&mut self.pixels, state));
        }
    }

    fn get_pixel(&self, x: i32, y: i32) -> Option<Color32> {
        if x < 0 || y < 0 || x >= self.size as i32 || y >= self.size as i32 { return None; }
        self.pixels.get((y as usize) * self.size as usize + (x as usize)).copied()
    }

    fn set_pixel(&mut self, x: i32, y: i32, color: Color32) {
        if x < 0 || y < 0 || x >= self.size as i32 || y >= self.size as i32 { return; }
        let idx = (y as usize) * self.size as usize + (x as usize);
        if let Some(p) = self.pixels.get_mut(idx) { *p = color; }
    }

    fn blend_pixel(&mut self, x: i32, y: i32, src: Color32, alpha: f32) {
        if alpha <= 0.0 { return; }
        if alpha >= 1.0 { self.set_pixel(x, y, src); return; }
        let dst = match self.get_pixel(x, y) { Some(c) => c, None => return };
        if dst == src && src.a() == 255 { return; }
        // Premultiplied "over" operator: result = src * alpha + dst * (1 - alpha)
        let sr = src.r() as f32 / 255.0;
        let sg = src.g() as f32 / 255.0;
        let sb = src.b() as f32 / 255.0;
        let sa = src.a() as f32 / 255.0;
        let dr = dst.r() as f32 / 255.0;
        let dg = dst.g() as f32 / 255.0;
        let db = dst.b() as f32 / 255.0;
        let da = dst.a() as f32 / 255.0;
        let ra = sa * alpha + da * (1.0 - alpha);
        if ra <= 0.0001 { self.set_pixel(x, y, Color32::TRANSPARENT); return; }
        let rr = sr * alpha + dr * (1.0 - alpha);
        let rg = sg * alpha + dg * (1.0 - alpha);
        let rb = sb * alpha + db * (1.0 - alpha);
        self.set_pixel(x, y, Color32::from_rgba_premultiplied(
            (rr * 255.0) as u8, (rg * 255.0) as u8, (rb * 255.0) as u8, (ra * 255.0) as u8,
        ));
    }

    fn flood_fill(&mut self, x: i32, y: i32, fill_color: Color32) {
        let target = match self.get_pixel(x, y) { Some(c) => c, None => return };
        if target == fill_color { return; }
        let mut stack = vec![(x, y)];
        while let Some((px, py)) = stack.pop() {
            let cur = match self.get_pixel(px, py) { Some(c) => c, None => continue };
            if cur != target { continue; }
            self.set_pixel(px, py, fill_color);
            stack.push((px + 1, py)); stack.push((px - 1, py));
            stack.push((px, py + 1)); stack.push((px, py - 1));
        }
    }

    fn draw_line(&mut self, x0: i32, y0: i32, x1: i32, y1: i32) {
        let dx = (x1 - x0).abs();
        let dy = -(y1 - y0).abs();
        let sx = if x0 < x1 { 1 } else { -1 };
        let sy = if y0 < y1 { 1 } else { -1 };
        let mut err = dx + dy;
        let mut x = x0; let mut y = y0;
        loop {
            self.draw_dot(x, y);
            if x == x1 && y == y1 { break; }
            let e2 = 2 * err;
            if e2 >= dy { err += dy; x += sx; }
            if e2 <= dx { err += dx; y += sy; }
        }
    }

    fn draw_dot(&mut self, cx: i32, cy: i32) {
        let r = (self.brush_size / 2.0).ceil() as i32;
        let color = match self.selected_tool {
            Tool::Eraser | Tool::MagicEraser => Color32::TRANSPARENT,
            _ => self.brush_color,
        };
        let h = self.hardness.max(0.01);
        for dy in -r..=r {
            for dx in -r..=r {
                let dist = ((dx * dx + dy * dy) as f32).sqrt();
                let max_dist = r as f32;
                if dist <= max_dist {
                    let alpha = if dist <= max_dist * h {
                        1.0
                    } else {
                        let fade = (dist - max_dist * h) / (max_dist * (1.0 - h));
                        (1.0 - fade).clamp(0.0, 1.0)
                    };
                    self.blend_pixel(cx + dx, cy + dy, color, alpha);
                }
            }
        }
    }

    // ---- Pen tool bezier ----
    pub fn pen_has_nodes(&self) -> bool {
        self.pen_state.nodes.len() >= 2
    }

    pub fn cancel_pen_path(&mut self) {
        self.pen_state = PenState { nodes: Vec::new(), active: false, selected: None, dragging_node: false, dragging_handle: None };
    }

    pub fn commit_pen_path(&mut self) {
        if self.pen_state.nodes.len() < 2 { return; }
        self.push_undo();
        let color = self.brush_color;
        let thickness = self.brush_size;
        let h = self.hardness;
        // Draw bezier segments between each consecutive pair of nodes
        for i in 0..self.pen_state.nodes.len() - 1 {
            let p0 = self.pen_state.nodes[i].pos;
            let p3 = self.pen_state.nodes[i + 1].pos;
            let p1 = self.pen_state.nodes[i].handle_fwd.unwrap_or(p0);
            let p2 = self.pen_state.nodes[i + 1].handle_back.unwrap_or(p3);
            self.flatten_bezier(p0, p1, p2, p3, thickness, h, color);
        }
        self.pen_state = PenState { nodes: Vec::new(), active: false, selected: None, dragging_node: false, dragging_handle: None };
    }

    fn flatten_bezier(&mut self, p0: (f32, f32), p1: (f32, f32), p2: (f32, f32), p3: (f32, f32), thickness: f32, hardness: f32, color: Color32) {
        // Estimate flatness: distance of midpoints
        let mid = ((p0.0 + p3.0) / 2.0, (p0.1 + p3.1) / 2.0);
        let (bx, by) = eval_bezier(p0, p1, p2, p3, 0.5);
        let dx = mid.0 - bx;
        let dy = mid.1 - by;
        if dx * dx + dy * dy < 1.0 {
            self.draw_line_pixels(p0, p3, thickness, hardness, color);
        } else {
            // Split at t=0.5 using de Casteljau
            let mid1 = lerp(p0, p1, 0.5);
            let mid2 = lerp(p1, p2, 0.5);
            let mid3 = lerp(p2, p3, 0.5);
            let mid12 = lerp(mid1, mid2, 0.5);
            let mid23 = lerp(mid2, mid3, 0.5);
            let split = lerp(mid12, mid23, 0.5);
            self.flatten_bezier(p0, mid1, mid12, split, thickness, hardness, color);
            self.flatten_bezier(split, mid23, mid3, p3, thickness, hardness, color);
        }
    }

    fn draw_line_pixels(&mut self, a: (f32, f32), b: (f32, f32), _thickness: f32, _hardness: f32, _color: Color32) {
        let dx = b.0 - a.0;
        let dy = b.1 - a.1;
        let len = (dx * dx + dy * dy).sqrt().max(0.001);
        let steps = (len / 0.5).ceil() as i32;
        for i in 0..=steps {
            let t = i as f32 / steps as f32;
            let x = (a.0 + dx * t).round() as i32;
            let y = (a.1 + dy * t).round() as i32;
            if x >= 0 && y >= 0 && x < self.size as i32 && y < self.size as i32 {
                self.draw_dot(x, y);
            }
        }
    }

    fn pen_hit_test(&self, mx: f32, my: f32) -> Option<(usize, bool, bool)> {
        let threshold = 8.0;
        for (i, node) in self.pen_state.nodes.iter().enumerate() {
            if let Some(hf) = node.handle_fwd {
                let d = ((mx - hf.0).powi(2) + (my - hf.1).powi(2)).sqrt();
                if d < threshold { return Some((i, true, true)); }
            }
            if let Some(hb) = node.handle_back {
                let d = ((mx - hb.0).powi(2) + (my - hb.1).powi(2)).sqrt();
                if d < threshold { return Some((i, true, false)); }
            }
            let d = ((mx - node.pos.0).powi(2) + (my - node.pos.1).powi(2)).sqrt();
            if d < threshold { return Some((i, false, false)); }
        }
        None
    }

    pub fn show(&mut self, ctx: &egui::Context) {
        let mut open = self.open;

        // Color picker window (shown on top of canvas)
        if self.color_picker.open {
            if let Some(color) = self.color_picker.show(ctx) {
                self.brush_color = color;
            }
        }

        egui::Window::new(format!("绘制 Icon - {}x{}", self.size, self.size))
            .open(&mut open)
            .id(egui::Id::new("canvas_window"))
            .collapsible(false)
            .resizable(true)
            .default_size(egui::vec2(800.0, 580.0))
            .show(ctx, |ui| {
                egui::TopBottomPanel::bottom("canvas_buttons").min_height(0.0).show_inside(ui, |ui| {
                    ui.horizontal(|ui| {
                        if ui.button("清空画布").clicked() { self.push_undo(); self.pixels = vec![Color32::TRANSPARENT; (self.size * self.size) as usize]; }
                        ui.separator();
                        if ui.button("撤销 (Ctrl+Z)").clicked() { self.undo(); }
                        if ui.button("重做 (Ctrl+Y)").clicked() { self.redo(); }
                        ui.separator();
                        if self.selected_tool == Tool::Pen && self.pen_state.nodes.len() >= 2 {
                            if ui.button("✓ 启用路径").clicked() { self.commit_pen_path(); }
                            if ui.button("✗ 取消路径").clicked() {
                                self.pen_state = PenState { nodes: Vec::new(), active: false, selected: None, dragging_node: false, dragging_handle: None };
                            }
                        }
                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            if ui.button("取消").clicked() { self.open = false; }
                            if ui.button("确定").clicked() { self.output = Some(self.pixels.clone()); self.open = false; }
                        });
                    });
                });

                egui::SidePanel::left("canvas_tools").resizable(false).min_width(60.0).show_inside(ui, |ui| {
                    ui.vertical_centered(|ui| {
                        ui.label("工具"); ui.separator();
                        let tools = [
                            (Tool::Brush, "画笔"),
                            (Tool::Pen, "钢笔"),
                            (Tool::Rectangle, "矩形"),
                            (Tool::Ellipse, "椭圆"),
                            (Tool::Line, "直线"),
                            (Tool::Eraser, "橡皮"),
                            (Tool::Fill, "填充"),
                            (Tool::MagicEraser, "魔擦"),
                        ];
                        for (tool, label) in &tools {
                            if ui.selectable_label(self.selected_tool == *tool, *label).clicked() {
                                if self.selected_tool == Tool::Pen && *tool != Tool::Pen && self.pen_state.nodes.len() >= 2 {
                                    // Auto-commit when switching away from pen
                                    self.commit_pen_path();
                                }
                                self.selected_tool = *tool;
                            }
                        }
                    });
                });

                egui::SidePanel::right("canvas_color").resizable(false).min_width(60.0).show_inside(ui, |ui| {
                    ui.vertical_centered(|ui| {
                        ui.label("颜色"); ui.separator();
                        let colors = [
                            Color32::WHITE, Color32::LIGHT_GRAY, Color32::GRAY, Color32::DARK_GRAY, Color32::BLACK,
                            Color32::RED, Color32::GREEN, Color32::BLUE, Color32::YELLOW, Color32::ORANGE,
                            Color32::from_rgb(255, 0, 255), Color32::from_rgb(0, 255, 255),
                        ];
                        for c in &colors {
                            let size = egui::vec2(24.0, 24.0);
                            let (rect, resp) = ui.allocate_exact_size(size, egui::Sense::click());
                            ui.painter().rect_filled(rect, 2.0, *c);
                            if self.brush_color == *c { ui.painter().rect_stroke(rect, 2.0, egui::Stroke::new(2.0, Color32::WHITE), StrokeKind::Middle); }
                            if resp.clicked() { self.brush_color = *c; }
                        }
                        ui.add_space(4.0);
                        if ui.button("调色板").clicked() { self.color_picker.open_with(self.brush_color); }
                        ui.add_space(6.0);
                        ui.label("当前颜色:");
                        let (preview_rect, _) = ui.allocate_exact_size(egui::vec2(40.0, 20.0), egui::Sense::hover());
                        ui.painter().rect_filled(preview_rect, 3.0, self.brush_color);
                        let hex = format!("#{:02X}{:02X}{:02X}", self.brush_color.r(), self.brush_color.g(), self.brush_color.b());
                        ui.label(hex);
                    });
                });

                egui::CentralPanel::default().show_inside(ui, |ui| {
                    if self.selected_tool == Tool::Pen {
                        ui.horizontal(|ui| {
                            ui.colored_label(Color32::CYAN, "✎ 点击添加锚点 · 拖拽贝塞尔手柄 · Enter启用路径 · Esc取消");
                        });
                    }
                    ui.horizontal(|ui| {
                        ui.label("背景:");
                        let modes = [(BackgroundMode::Transparent, "透明"), (BackgroundMode::Black, "黑"), (BackgroundMode::White, "白")];
                        for (mode, label) in &modes {
                            if ui.selectable_label(self.background == *mode, *label).clicked() { self.background = *mode; }
                        }
                        ui.separator();
                        ui.label("笔触:");
                        ui.add(egui::Slider::new(&mut self.brush_size, 1.0..=50.0).text("px"));
                        ui.separator();
                        ui.label("硬度:");
                        ui.add(egui::Slider::new(&mut self.hardness, 0.0..=1.0).text(""));
                    });
                    let avail = ui.available_size();
                    let max_zoom = (avail.x / self.size as f32 * 2.0).max(4.0);
                    if self.zoom > max_zoom { self.zoom = max_zoom; }
                    let pixel_size = self.zoom.max(0.5);
                    let (resp, painter) = ui.allocate_painter(egui::vec2(avail.x, avail.y), egui::Sense::click_and_drag());
                    let canvas_rect = resp.rect;
                    let origin = Pos2::new(
                        canvas_rect.center().x - (self.size as f32 * pixel_size) / 2.0 + self.pan.x,
                        canvas_rect.center().y - (self.size as f32 * pixel_size) / 2.0 + self.pan.y,
                    );
                    // Draw pixels
                    let overlap = if pixel_size < 3.0 { 0.5 } else { 0.0 };
                    for y in 0..self.size {
                        for x in 0..self.size {
                            let idx = (y as usize) * self.size as usize + (x as usize);
                            let color = self.pixels[idx];
                            let px = origin.x + x as f32 * pixel_size;
                            let py = origin.y + y as f32 * pixel_size;
                            let sz = pixel_size + overlap;
                            if color == Color32::TRANSPARENT {
                                if self.background == BackgroundMode::Black {
                                    painter.rect_filled(Rect::from_min_size(Pos2::new(px, py), Vec2::new(sz, sz)), 0.0, Color32::BLACK);
                                } else if self.background == BackgroundMode::White {
                                    painter.rect_filled(Rect::from_min_size(Pos2::new(px, py), Vec2::new(sz, sz)), 0.0, Color32::WHITE);
                                } else {
                                    let checker = if (x + y) % 2 == 0 { Color32::from_gray(40) } else { Color32::from_gray(60) };
                                    painter.rect_filled(Rect::from_min_size(Pos2::new(px, py), Vec2::new(sz, sz)), 0.0, checker);
                                }
                            } else {
                                painter.rect_filled(Rect::from_min_size(Pos2::new(px, py), Vec2::new(sz, sz)), 0.0, color);
                            }
                        }
                    }
                    // Draw pen path preview
                    if self.selected_tool == Tool::Pen && self.pen_state.nodes.len() >= 1 {
                        let preview_color = Color32::CYAN;
                        let preview_hl = Color32::from_rgba_premultiplied(0, 200, 255, 180);
                        let painter_origin = origin;
                        let ps = pixel_size;
                        // Draw bezier segments (need >= 2 nodes)
                        if self.pen_state.nodes.len() >= 2 {
                            for i in 0..self.pen_state.nodes.len() - 1 {
                                let p0 = self.pen_state.nodes[i].pos;
                                let p3 = self.pen_state.nodes[i + 1].pos;
                                let p1 = self.pen_state.nodes[i].handle_fwd.unwrap_or(p0);
                                let p2 = self.pen_state.nodes[i + 1].handle_back.unwrap_or(p3);
                                self.draw_bezier_preview(p0, p1, p2, p3, &painter, painter_origin, ps, preview_color);
                            }
                        }
                        // Draw anchors and handles
                        for (i, node) in self.pen_state.nodes.iter().enumerate() {
                            let anchor = Pos2::new(painter_origin.x + node.pos.0 * ps, painter_origin.y + node.pos.1 * ps);
                            if let Some(hf) = node.handle_fwd {
                                let hp = Pos2::new(painter_origin.x + hf.0 * ps, painter_origin.y + hf.1 * ps);
                                painter.line_segment([anchor, hp], egui::Stroke::new(1.0, Color32::GRAY));
                                painter.circle_filled(hp, 3.0, preview_hl);
                            }
                            if let Some(hb) = node.handle_back {
                                let hp = Pos2::new(painter_origin.x + hb.0 * ps, painter_origin.y + hb.1 * ps);
                                painter.line_segment([anchor, hp], egui::Stroke::new(1.0, Color32::GRAY));
                                painter.circle_filled(hp, 3.0, preview_hl);
                            }
                            let sel = self.pen_state.selected == Some(i);
                            painter.circle_filled(anchor, if sel { 4.0 } else { 3.0 }, if sel { preview_hl } else { preview_color });
                        }
                    }
                    // Grid lines
                    if pixel_size > 6.0 {
                        for i in 0..=self.size {
                            let x = origin.x + i as f32 * pixel_size;
                            painter.line_segment([Pos2::new(x, origin.y), Pos2::new(x, origin.y + self.size as f32 * pixel_size)], egui::Stroke::new(0.5, Color32::from_gray(100)));
                            let y = origin.y + i as f32 * pixel_size;
                            painter.line_segment([Pos2::new(origin.x, y), Pos2::new(origin.x + self.size as f32 * pixel_size, y)], egui::Stroke::new(0.5, Color32::from_gray(100)));
                        }
                    }
                    // Scroll zoom
                    if resp.hovered() {
                        let scroll = ctx.input(|i| i.events.iter().filter_map(|e| {
                            if let egui::Event::MouseWheel { delta, .. } = e { Some(delta.y) } else { None }
                        }).sum::<f32>());
                        if scroll != 0.0 { self.zoom = (self.zoom * (1.0 + scroll * 0.02)).clamp(1.0, 32.0); }
                    }
                    // Pan
                    if resp.dragged_by(egui::PointerButton::Middle) || resp.dragged_by(egui::PointerButton::Secondary) {
                        self.pan += resp.drag_delta();
                    }
                    // Draw / pen interaction
                    let mouse_pos = resp.hover_pos();
                    if let Some(mpos) = mouse_pos {
                        let px = ((mpos.x - origin.x) / pixel_size) as i32;
                        let py = ((mpos.y - origin.y) / pixel_size) as i32;
                        let mf = ((mpos.x - origin.x) / pixel_size) as f32;
                        let mfy = ((mpos.y - origin.y) / pixel_size) as f32;

                        if self.selected_tool == Tool::Pen {
                            // Pen tool interaction
                            if resp.drag_started_by(egui::PointerButton::Primary) {
                                // Check hit test on existing nodes/handles
                                if let Some((idx, is_handle, is_fwd)) = self.pen_hit_test(mf, mfy) {
                                    if is_handle {
                                        self.pen_state.selected = Some(idx);
                                        self.pen_state.dragging_handle = Some((idx, is_fwd));
                                    } else {
                                        self.pen_state.selected = Some(idx);
                                        self.pen_state.dragging_node = true;
                                    }
                                } else {
                                    // Add new node
                                    self.pen_state.nodes.push(PenNode {
                                        pos: (mf, mfy),
                                        handle_back: None,
                                        handle_fwd: None,
                                    });
                                    self.pen_state.selected = Some(self.pen_state.nodes.len() - 1);
                                    self.pen_state.active = true;
                                }
                            }
                            // Handle dragging
                            if resp.dragged_by(egui::PointerButton::Primary) {
                                if let Some((idx, is_fwd)) = self.pen_state.dragging_handle {
                                    let delta = resp.drag_delta();
                                    let dpx = delta.x / pixel_size;
                                    let dpy = delta.y / pixel_size;
                                    if let Some(node) = self.pen_state.nodes.get_mut(idx) {
                                        if is_fwd {
                                            let prev = node.handle_fwd.unwrap_or(node.pos);
                                            node.handle_fwd = Some((prev.0 + dpx, prev.1 + dpy));
                                            // Mirror to back handle for smooth continuity
                                            let dx = node.pos.0 - (prev.0 + dpx);
                                            let dy = node.pos.1 - (prev.1 + dpy);
                                            node.handle_back = Some((node.pos.0 + dx, node.pos.1 + dy));
                                        } else {
                                            let prev = node.handle_back.unwrap_or(node.pos);
                                            node.handle_back = Some((prev.0 + dpx, prev.1 + dpy));
                                            let dx = node.pos.0 - (prev.0 + dpx);
                                            let dy = node.pos.1 - (prev.1 + dpy);
                                            node.handle_fwd = Some((node.pos.0 + dx, node.pos.1 + dy));
                                        }
                                    }
                                } else if self.pen_state.dragging_node {
                                    let delta = resp.drag_delta();
                                    let dpx = delta.x / pixel_size;
                                    let dpy = delta.y / pixel_size;
                                    if let Some(idx) = self.pen_state.selected {
                                        if let Some(node) = self.pen_state.nodes.get_mut(idx) {
                                            node.pos.0 += dpx;
                                            node.pos.1 += dpy;
                                            if let Some(ref mut hf) = node.handle_fwd { hf.0 += dpx; hf.1 += dpy; }
                                            if let Some(ref mut hb) = node.handle_back { hb.0 += dpx; hb.1 += dpy; }
                                        }
                                    }
                                } else if self.pen_state.active && self.pen_state.nodes.len() > 0 {
                                    let last_idx = self.pen_state.nodes.len() - 1;
                                    let prev_pos = if last_idx > 0 { Some(self.pen_state.nodes[last_idx - 1].pos) } else { None };
                                    if let Some(node) = self.pen_state.nodes.get_mut(last_idx) {
                                        if let Some(prev) = prev_pos {
                                            let dx = mf - prev.0;
                                            let dy = mfy - prev.1;
                                            let len = (dx * dx + dy * dy).sqrt().max(0.001);
                                            let handle_len = len * 0.4;
                                            let nx = -dx / len;
                                            let ny = -dy / len;
                                            node.handle_back = Some((node.pos.0 + nx * handle_len, node.pos.1 + ny * handle_len));
                                            node.handle_fwd = Some((node.pos.0 - nx * handle_len, node.pos.1 - ny * handle_len));
                                        }
                                    }
                                }
                            }
                            if resp.drag_stopped() {
                                self.pen_state.dragging_node = false;
                                self.pen_state.dragging_handle = None;
                            }
                            // Cursor indicator
                            if px >= 0 && py >= 0 && px < self.size as i32 && py < self.size as i32 {
                                let r = 3.0 * pixel_size;
                                painter.circle_stroke(Pos2::new(origin.x + px as f32 * pixel_size + pixel_size / 2.0, origin.y + py as f32 * pixel_size + pixel_size / 2.0),
                                    r, egui::Stroke::new(1.0, Color32::CYAN));
                            }
                        } else {
                            // Standard drawing tools
                            let primary_down = ctx.input(|i| i.pointer.primary_down());
                            if primary_down && resp.hovered() {
                                if !self.drawing {
                                    self.push_undo();
                                    self.drawing = true;
                                    self.start_pos = Some(Pos2::new(px as f32, py as f32));
                                    self.last_pos = Some(Pos2::new(px as f32, py as f32));
                                    // Flood fill on click
                                    if self.selected_tool == Tool::Fill && px >= 0 && py >= 0 {
                                        self.flood_fill(px, py, self.brush_color);
                                    } else if self.selected_tool == Tool::MagicEraser && px >= 0 && py >= 0 {
                                        self.flood_fill(px, py, Color32::TRANSPARENT);
                                    } else if px >= 0 && py >= 0 && px < self.size as i32 && py < self.size as i32 {
                                        // Draw initial dot for brush-type tools
                                        match self.selected_tool {
                                            Tool::Brush | Tool::Pen | Tool::Eraser => { self.draw_dot(px, py); }
                                            _ => {}
                                        }
                                    }
                                } else {
                                    let last = self.last_pos.unwrap_or(Pos2::new(px as f32, py as f32));
                                    let start = self.start_pos.unwrap_or(Pos2::new(px as f32, py as f32));
                                    if (last.x - px as f32).abs() > 0.01 || (last.y - py as f32).abs() > 0.01 {
                                        match self.selected_tool {
                                            Tool::Brush | Tool::Eraser => { self.draw_line(last.x as i32, last.y as i32, px, py); }
                                            Tool::Pen => { self.draw_line(last.x as i32, last.y as i32, px, py); }
                                            Tool::Line => {
                                                self.pixels = self.undo_stack.last().cloned().unwrap_or(self.pixels.clone());
                                                self.draw_line(start.x as i32, start.y as i32, px, py);
                                            }
                                            Tool::Rectangle => {
                                                self.pixels = self.undo_stack.last().cloned().unwrap_or(self.pixels.clone());
                                                let x0 = start.x as i32; let y0 = start.y as i32; let x1 = px; let y1 = py;
                                                self.draw_line(x0, y0, x1, y0); self.draw_line(x1, y0, x1, y1);
                                                self.draw_line(x0, y1, x1, y1); self.draw_line(x0, y0, x0, y1);
                                            }
                                            Tool::Ellipse => {
                                                self.pixels = self.undo_stack.last().cloned().unwrap_or(self.pixels.clone());
                                                let x0 = start.x as i32; let y0 = start.y as i32; let x1 = px; let y1 = py;
                                                let cx = (x0 + x1) / 2; let cy = (y0 + y1) / 2;
                                                let rx = (x1 - x0).abs() as f32 / 2.0; let ry = (y1 - y0).abs() as f32 / 2.0;
                                                if rx > 0.5 && ry > 0.5 {
                                                    let steps = 64;
                                                    for i in 0..=steps {
                                                        let angle = i as f32 * std::f32::consts::TAU / steps as f32;
                                                        let ex = (cx as f32 + rx * angle.cos()).round() as i32;
                                                        let ey = (cy as f32 + ry * angle.sin()).round() as i32;
                                                        self.draw_dot(ex, ey);
                                                        if i > 0 {
                                                            let pa = (i - 1) as f32 * std::f32::consts::TAU / steps as f32;
                                                            let pex = (cx as f32 + rx * pa.cos()).round() as i32;
                                                            let pey = (cy as f32 + ry * pa.sin()).round() as i32;
                                                            self.draw_line(pex, pey, ex, ey);
                                                        }
                                                    }
                                                }
                                            }
                                            _ => {}
                                        }
                                        self.last_pos = Some(Pos2::new(px as f32, py as f32));
                                    }
                                }
                            } else {
                                self.drawing = false;
                                self.last_pos = None;
                                self.start_pos = None;
                            }
                            // Cursor — show hardness by filling the circle
                            if px >= 0 && py >= 0 && px < self.size as i32 && py < self.size as i32 {
                                let r = (self.brush_size / 2.0).ceil() as f32 * pixel_size;
                                let cursor_center = Pos2::new(origin.x + px as f32 * pixel_size + pixel_size / 2.0, origin.y + py as f32 * pixel_size + pixel_size / 2.0);
                                if self.hardness < 1.0 {
                                    let fade_alpha = (self.hardness * 0.4 + 0.1).clamp(0.0, 0.5);
                                    painter.circle_filled(cursor_center, r, Color32::from_black_alpha((fade_alpha * 255.0) as u8));
                                }
                                painter.circle_stroke(cursor_center, r, egui::Stroke::new(1.0, Color32::WHITE));
                            }
                        }
                    }
                });
            });
        if !open { self.open = false; }
    }

    fn draw_bezier_preview(&self, p0: (f32, f32), p1: (f32, f32), p2: (f32, f32), p3: (f32, f32),
                           painter: &egui::Painter, origin: Pos2, ps: f32, color: Color32) {
        let steps = 32;
        let mut prev = (p0.0, p0.1);
        for i in 1..=steps {
            let t = i as f32 / steps as f32;
            let (bx, by) = eval_bezier(p0, p1, p2, p3, t);
            let a = Pos2::new(origin.x + prev.0 * ps, origin.y + prev.1 * ps);
            let b = Pos2::new(origin.x + bx * ps, origin.y + by * ps);
            painter.line_segment([a, b], egui::Stroke::new(1.5, color));
            prev = (bx, by);
        }
    }
}

fn eval_bezier(p0: (f32, f32), p1: (f32, f32), p2: (f32, f32), p3: (f32, f32), t: f32) -> (f32, f32) {
    let u = 1.0 - t;
    let x = u * u * u * p0.0 + 3.0 * u * u * t * p1.0 + 3.0 * u * t * t * p2.0 + t * t * t * p3.0;
    let y = u * u * u * p0.1 + 3.0 * u * u * t * p1.1 + 3.0 * u * t * t * p2.1 + t * t * t * p3.1;
    (x, y)
}

fn lerp(a: (f32, f32), b: (f32, f32), t: f32) -> (f32, f32) {
    (a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t)
}
