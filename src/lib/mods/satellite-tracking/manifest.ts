/**
 * 卫星追踪MOD清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const satelliteTrackingManifest: ModManifest = {
  id: 'satellite-tracking',
  version: '1.0.0',
  name: 'Satellite Tracking',
  nameZh: '卫星追踪',
  description: 'Real-time satellite tracking, display satellite orbits and coverage',
  descriptionZh: '实时卫星追踪，显示卫星轨道和覆盖范围',
  author: 'CXIC Team',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: true,
  apiVersion: '1.0.0',
  capabilities: [
    { name: 'satellite:tracking', required: true },
    { name: 'render:3d', required: true },
  ],
};