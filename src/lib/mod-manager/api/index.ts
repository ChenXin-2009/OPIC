/**
 * @module mod-manager/api
 * @description MOD管理器API层导出
 */

import { API_VERSION } from '../types';

// API版本
export const MOD_API_VERSION = `${API_VERSION.major}.${API_VERSION.minor}.${API_VERSION.patch}`;

// 时间API
export {
  TimeAPIImpl,
  getTimeAPI,
  resetTimeAPI,
} from './TimeAPI';

// 相机API
export {
  CameraAPIImpl,
  getCameraAPI,
  resetCameraAPI,
} from './CameraAPI';

// 天体API
export {
  CelestialAPIImpl,
  getCelestialAPI,
  resetCelestialAPI,
} from './CelestialAPI';

// 卫星API
export {
  SatelliteAPIImpl,
  getSatelliteAPI,
  resetSatelliteAPI,
} from './SatelliteAPI';

// 渲染API
export {
  RenderAPIImpl,
  getRenderAPI,
  resetRenderAPI,
} from './RenderAPI';