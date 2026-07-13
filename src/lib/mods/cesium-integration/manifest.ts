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
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: true,
  icon: '🌍',
  iconImage: '/mods/cesium-integration/icon.webp',
  screenshots: ['/mods/cesium-integration/screenshot-1.jpg', '/mods/cesium-integration/screenshot-2.jpg', '/mods/cesium-integration/screenshot-3.jpg'],
  apiVersion: '1.0.0',
  
  // 新架构：权限声明
  permissions: [
    'render:read',   // 读取渲染场景
    'render:write',  // 注册 Cesium 图层
  ],
  
  // 新架构：扩展点声明
  contributes: {
    dockIcons: [
      {
        id: 'cesium-integration-icon',
        icon: '🌍',
        label: 'Cesium Earth',
        labelZh: 'Cesium 地球',
        command: 'cesium-integration.toggle',
        badge: 0,
      }
    ],
    commands: [
      {
        id: 'toggle',
        title: 'Toggle Cesium Earth',
        titleZh: '切换Cesium地球',
        handler: 'handleToggle',
      }
    ]
  },
  
  // 旧字段保留以兼容
  capabilities: [
    { name: 'render:cesium', required: true },
    { name: 'render:3d', required: true },
  ],
};