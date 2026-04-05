/**
 * @module mods/flight-tracking/manifest
 * @description 航班追踪 MOD 清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const flightTrackingManifest: ModManifest = {
  id: 'flight-tracking',
  version: '1.0.0',
  name: '航班追踪',
  description: '实时追踪全球航班，在地球上显示飞机位置和航迹',
  author: 'CXIC Team',
  entryPoint: 'onLoad',
  hasConfig: true,
  configComponent: 'FlightTrackingConfig',
  defaultEnabled: false,
  apiVersion: '1.0.0',
  dependencies: [
    {
      id: 'cesium-integration',
      version: { min: '1.0.0' },
    },
  ],
  capabilities: [
    { name: 'render:cesium', required: true },
  ],
  icon: 'flight',
};
