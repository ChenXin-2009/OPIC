import type { ModManifest } from '@/lib/mod-manager/types';

export const gravityGridManifest: ModManifest = {
  id: 'gravity-grid',
  version: '2.0.0',
  name: 'Dynamic Gravity Cutting Plane',
  nameZh: '动态引力切面网格',
  description: 'A dynamic 3D cutting plane that calculates and visualizes gravitational potential wells in real time.',
  descriptionZh: '一个动态的三维任意切面网格，支持自由平移、旋转与缩放，实时计算并可视化太阳系天体的引力陷落。',
  author: 'OPIC',
  entryPoint: 'onLoad',
  hasConfig: true,
  defaultEnabled: false,
  icon: '🌐',
  apiVersion: '1.0.0',
  permissions: [
    'render:read',
    'render:write',
    'render:execute',
    'celestial:read',
    'celestial:execute',
  ],
  contributes: {
    dockIcons: [{
      id: 'gravity-grid-icon',
      icon: '🌐',
      label: 'Gravity Grid',
      labelZh: '引力切面网格',
      command: 'gravity-grid.toggle',
    }],
    commands: [{
      id: 'toggle',
      title: 'Toggle Gravity Grid',
      titleZh: '切换引力切面网格',
      handler: 'handleToggle',
    }],
  },
};
