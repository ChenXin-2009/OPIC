/**
 * StarBrightnessSlider.tsx - 恒星亮度调整滑块组件
 * 
 * 与时间滑块完全一致的设计：
 * - 下凹弧线轨道（两端细，中间粗）
 * - 可拖动的空心圆圈滑块
 * - 显示当前亮度百分比
 * - 在时间控件隐藏后显示（远距离视图）
 */

'use client';

import { useSolarSystemStore } from '@/lib/state';
import { TIME_SLIDER_CONFIG, STAR_BRIGHTNESS_SLIDER_CONFIG } from '@/lib/config/visualConfig';

export default function StarBrightnessSlider() {
  // 不再显示恒星亮度滑块
  // Suppress unused variable warnings
  void useSolarSystemStore;
  void TIME_SLIDER_CONFIG;
  void STAR_BRIGHTNESS_SLIDER_CONFIG;
  return null;
}
