/**
 * moon/manifest.ts — 月球探索 MOD 清单
 */

import type { ModManifest } from '@/lib/mod-manager/types';

export const moonManifest: ModManifest = {
  id: 'moon',
  version: '1.0.0',
  name: 'Moon Explorer',
  nameZh: '月球探索',
  description: 'Real-time lunar data: phase, libration, distance, solar/subsolar points, landing sites, craters, and maria.',
  descriptionZh: '实时月球数据：月相、天平动、地月距离、日下点、着陆点、环形山、月海。基于 astronomy-engine 高精度计算。',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: false,
  defaultEnabled: false,
  icon: '',
  apiVersion: '1.0.0',
  permissions: [
    'render:read',
    'render:write',
  ],
  contributes: {
    dockIcons: [{
      id: 'moon-icon',
      icon: '',
      label: 'Moon Explorer',
      labelZh: '月球探索',
      command: 'moon.toggle',
      badge: 0,
    }],
    commands: [{
      id: 'toggle',
      title: 'Toggle Moon Explorer',
      titleZh: '切换月球探索',
      handler: 'handleToggle',
    }],
  },
  capabilities: [
    { name: 'render:3d', required: false },
    { name: 'astronomy:engine', required: true },
  ],
};
