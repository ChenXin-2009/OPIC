/**
 * 卫星追踪MOD清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const satelliteTrackingManifest: ModManifest = {
  id: 'satellite-tracking',
  version: '2.0.0',
  name: 'Satellite Tracking',
  nameZh: '卫星追踪',
  description: 'Real-time satellite tracking with live position, ground track, pass predictions, orbit visualization and coverage areas. Data from Celestrak TLE + UCS metadata.',
  descriptionZh: '实时卫星追踪：实时位置（经纬度/高度/速度）、地面轨迹、过境预测、3D轨道可视化、服务覆盖区域。数据来源：Celestrak TLE + UCS卫星数据库。',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: false,
  icon: '📡',
  apiVersion: '1.0.0',
  
  // 新架构：权限声明
  permissions: [
    'satellite:read',    // 读取卫星数据
    'satellite:write',   // 获取卫星数据
    'satellite:execute', // 执行卫星轨道计算
    'render:write',      // 注册渲染器
    'render:execute',    // 执行渲染回调
  ],
  
  // 新架构：扩展点声明
  contributes: {
    dockIcons: [
      {
        id: 'satellite-tracking-icon',
        icon: '📡',
        label: 'Satellite Tracking',
        labelZh: '卫星追踪',
        command: 'satellite-tracking.toggle',
        badge: 0,
      }
    ],
    commands: [
      {
        id: 'toggle',
        title: 'Toggle Satellite Tracking',
        titleZh: '切换卫星追踪',
        handler: 'handleToggle',
      },
      {
        id: 'refresh',
        title: 'Refresh Satellite Data',
        titleZh: '刷新卫星数据',
        handler: 'handleRefresh',
      }
    ]
  },
  
  // 旧字段保留以兼容
  capabilities: [
    { name: 'satellite:tracking', required: true },
    { name: 'satellite:realtime', required: true },
    { name: 'satellite:passes', required: false },
    { name: 'satellite:groundtrack', required: false },
    { name: 'render:3d', required: true },
  ],
};