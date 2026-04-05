/**
 * Cesium集成MOD清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const cesiumIntegrationManifest: ModManifest = {
  id: 'cesium-integration',
  version: '1.0.0',
  name: 'Cesium Earth',
  nameZh: 'Cesium 地球',
  description: 'Display high-precision terrain and imagery on Earth, support multiple map sources',
  descriptionZh: '在地球上显示高精度地形和影像，支持多种地图源',
  author: 'CXIC Team',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: true,
  apiVersion: '1.0.0',
  capabilities: [
    { name: 'render:cesium', required: true },
    { name: 'render:3d', required: true },
  ],
};