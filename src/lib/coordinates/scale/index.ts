/**
 * 渲染域缩放模块 (Render Domain Scale)
 *
 * 提供不同渲染域（太阳系、星系、宇宙尺度）的坐标缩放和精度控制。
 */

export {
  RENDER_DOMAINS,
  getActiveRenderDomain,
  rtcOffset,
  float32Resolution,
} from './render-domain';
export type { RenderDomain } from './render-domain';
