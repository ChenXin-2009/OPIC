/**
 * 商业航天发射追踪 MOD 清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const spaceLaunchesManifest: ModManifest = {
  id: 'space-launches',
  version: '1.0.0',
  name: 'Space Launch Tracker',
  nameZh: '商业航天发射追踪',
  description: 'Real-time commercial space launch tracking: launch schedules, orbital insertions, mission progress and trajectory data from multiple public sources',
  descriptionZh: '实时商业航天发射追踪：发射时间表、轨道插入、任务进度和轨道数据，支持多种公开数据源',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: false,
  icon: '🚀',
  iconImage: '/mods/space-launches/icon.webp',
  screenshots: ['/mods/space-launches/screenshot-1.jpg', '/mods/space-launches/screenshot-2.jpg', '/mods/space-launches/screenshot-3.jpg'],
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
        id: 'space-launches-icon',
        icon: '🚀',
        label: 'Space Launch Tracker',
        labelZh: '商业航天发射追踪',
        command: 'space-launches.toggle',
        badge: 0,
      }
    ],
    commands: [
      {
        id: 'toggle',
        title: 'Toggle Space Launch Tracker',
        titleZh: '切换航天发射追踪',
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