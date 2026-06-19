/**
 * 拖拽灵敏度曲线 (Drag Sensitivity Curve)
 *
 * 根据相机与目标的距离动态调整拖拽灵敏度。
 * 使用 Catmull-Rom 样条插值在锚点之间平滑过渡。
 *
 * 用途：距离远时降低灵敏度避免过度旋转，距离近时提高灵敏度便于精细操作。
 */

import type { DragSensitivityCurve } from './CameraTypes';

export const DEFAULT_DRAG_CURVE: DragSensitivityCurve = {
  yMin: 0.001, yMax: 2,
  anchors: [
    { nx: 0,      ny: 0.08 },
    { nx: 0.5583, ny: 0.2041 },
    { nx: 0.5728, ny: 0.5408 },
    { nx: 0.5922, ny: 0.7194 },
    { nx: 0.7816, ny: 0.9082 },
    { nx: 1,      ny: 1 },
  ],
};

/**
 * 根据灵敏度曲线配置和当前距离计算灵敏度倍率（Catmull-Rom 插值）
 */
export function evalSensitivityCurve(
  curve: DragSensitivityCurve,
  distanceAU: number
): number {
  const LOG_MIN = -10, LOG_MAX = 0;
  const nx = Math.max(0, Math.min(1, (Math.log10(Math.max(distanceAU, 1e-12)) - LOG_MIN) / (LOG_MAX - LOG_MIN)));
  const sorted = [...curve.anchors].sort((a, b) => a.nx - b.nx);
  const logMin = Math.log10(Math.max(curve.yMin, 1e-9));
  const logMax = Math.log10(Math.max(curve.yMax, 1e-9));
  const nyToVal = (ny: number) => Math.pow(10, logMin + Math.max(0, Math.min(1, ny)) * (logMax - logMin));
  if (sorted.length === 0) return 1;
  if (sorted.length === 1) return nyToVal(sorted[0].ny);
  if (nx <= sorted[0].nx) return nyToVal(sorted[0].ny);
  if (nx >= sorted[sorted.length - 1].nx) return nyToVal(sorted[sorted.length - 1].ny);

  let i = 1;
  while (i < sorted.length - 1 && sorted[i].nx < nx) i++;
  const p1 = sorted[i - 1], p2 = sorted[i];
  const p0 = sorted[i - 2] ?? { nx: p1.nx - (p2.nx - p1.nx), ny: p1.ny };
  const p3 = sorted[i + 1] ?? { nx: p2.nx + (p2.nx - p1.nx), ny: p2.ny };
  const t = (nx - p1.nx) / (p2.nx - p1.nx), t2 = t * t, t3 = t2 * t;
  const ny = Math.max(0, Math.min(1, 0.5 * (
    2 * p1.ny +
    (-p0.ny + p2.ny) * t +
    (2 * p0.ny - 5 * p1.ny + 4 * p2.ny - p3.ny) * t2 +
    (-p0.ny + 3 * p1.ny - 3 * p2.ny + p3.ny) * t3
  )));
  return nyToVal(ny);
}
