/**
 * 全球货运与贸易路线追踪 MOD 清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const globalTrafficManifest: ModManifest = {
  id: 'global-traffic',
  version: '1.0.0',
  name: 'Global Traffic & Trade Routes',
  nameZh: '全球货运与贸易路线',
  description: 'Real-time tracking of global shipping lanes, flight routes, and trade corridors with multiple public data sources',
  descriptionZh: '实时追踪全球船舶航道、航班路线和贸易走廊，支持多种公开数据源',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  configComponent: 'GlobalTrafficConfig',
  defaultEnabled: false,
  icon: '🚢',
  iconImage: '/mods/global-traffic/icon.webp',
  screenshots: ['/mods/global-traffic/screenshot-1.jpg', '/mods/global-traffic/screenshot-2.jpg', '/mods/global-traffic/screenshot-3.jpg'],
  apiVersion: '1.0.0',
  
  // 新架构：权限声明
  permissions: [
    'render:write',   // 添加渲染对象
    'render:execute', // 执行渲染回调
  ],
  optionalPermissions: [
    'network:read',   // 读取网络数据（可选）
  ],
  
  // 新架构：扩展点声明
  contributes: {
    dockIcons: [
      {
        id: 'global-traffic-icon',
        icon: '🚢',
        label: 'Global Traffic & Trade Routes',
        labelZh: '全球货运与贸易路线',
        command: 'global-traffic.toggle',
        badge: 0,
      }
    ],
    commands: [
      {
        id: 'toggle',
        title: 'Toggle Global Traffic Monitor',
        titleZh: '切换全球交通监测',
        handler: 'handleToggle',
      }
    ]
  },
  
  // 旧字段保留以兼容
  capabilities: [
    { name: 'render:3d', required: true },
    { name: 'network:fetch', required: false },
  ],
};