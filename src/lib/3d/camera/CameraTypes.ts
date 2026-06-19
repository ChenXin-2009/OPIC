/**
 * 相机系统类型定义 (Camera Types)
 */

/** 相机模式：free=自由飞行, locked=锁定目标, follow=跟随跟踪 */
export type CameraMode = 'free' | 'locked' | 'follow';

/** 拖拽灵敏度曲线配置 — 用 Catmull-Rom 插值控制灵敏度随距离的变化 */
export interface DragSensitivityCurve {
  yMin: number;
  yMax: number;
  anchors: { nx: number; ny: number }[];
}
