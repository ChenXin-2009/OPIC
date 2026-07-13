/**
 * 气象灾害监测MOD清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const weatherDisasterManifest: ModManifest = {
  id: 'weather-disaster',
  version: '1.0.0',
  name: 'Weather & Disaster Monitor',
  nameZh: '气象灾害监测',
  description: 'Real-time weather data and disaster monitoring: typhoons, earthquakes, floods, wildfires and more',
  descriptionZh: '实时气象数据与灾害监测：台风、地震、洪水、野火等多源数据可视化',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: false,
  icon: '🌪️',
  iconImage: '/mods/weather-disaster/icon.webp',
  screenshots: ['/mods/weather-disaster/screenshot-1.jpg', '/mods/weather-disaster/screenshot-2.jpg', '/mods/weather-disaster/screenshot-3.jpg'],
  apiVersion: '1.0.0',
  
  // 新架构：权限声明
  permissions: [
    'render:read',    // 读取渲染场景
    'render:write',   // 添加渲染对象
    'render:execute', // 执行渲染回调
  ],
  
  // 新架构：扩展点声明
  contributes: {
    dockIcons: [
      {
        id: 'weather-disaster-icon',
        icon: '🌪️',
        label: 'Weather & Disaster Monitor',
        labelZh: '气象灾害监测',
        command: 'weather-disaster.toggle',
        badge: 0,
      }
    ],
    commands: [
      {
        id: 'toggle',
        title: 'Toggle Weather & Disaster Monitor',
        titleZh: '切换气象灾害监测',
        handler: 'handleToggle',
      }
    ]
  },
  
  // 旧字段保留以兼容
  capabilities: [
    { name: 'render:cesium', required: false },
    { name: 'render:3d', required: true },
  ],
};