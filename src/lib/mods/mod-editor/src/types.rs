use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModMeta {
    #[serde(default)]
    pub icon_image: String,
    #[serde(default)]
    pub screenshots: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ModInfo {
    pub id: String,
    pub name_zh: String,
    pub name_en: String,
    pub description_zh: String,
    pub description_en: String,
    pub version: String,
    pub author: String,
    pub meta: ModMeta,
}

impl ModInfo {
    pub fn display_name(&self) -> &str {
        if !self.name_zh.is_empty() { &self.name_zh } else { &self.name_en }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ImageSlot {
    Icon,
    Screenshot(usize),
}

impl ImageSlot {
    pub fn label_zh(&self) -> &str {
        match self {
            ImageSlot::Icon => "图标 (256x256 WebP)",
            ImageSlot::Screenshot(i) => match i {
                0 => "效果图 1 (1280x720 JPG)",
                1 => "效果图 2 (1280x720 JPG)",
                _ => "效果图 3 (1280x720 JPG)",
            }
        }
    }
    pub fn index(&self) -> usize {
        match self {
            ImageSlot::Icon => 0,
            ImageSlot::Screenshot(i) => 1 + i,
        }
    }
}
