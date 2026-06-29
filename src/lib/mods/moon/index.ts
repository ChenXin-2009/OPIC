/**
 * moon/index.ts — 月球探索 MOD 入口
 *
 * 生命周期钩子：
 * - onLoad:  仅日志
 * - onEnable: 触发月球数据采集启动
 * - onDisable: 无操作（数据计算由动画循环驱动，实时订阅）
 */

import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { moonManifest } from './manifest';

export const moonHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Moon] MOD 加载完成');
  },

  onEnable: async (context: ModContext) => {
    // 无需额外初始化 — 月球状态由 useSolarSystemAnimation.ts 中的
    // LUNAR_UPDATE_INTERVAL 循环驱动，MoonPanel 直接订阅 useLunarStore。
    context.logger.info('[Moon] MOD 已启用');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Moon] MOD 已禁用');
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Moon] MOD 已卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Moon] 错误:', error.message);
  },

  /** Dock 点击 / 命令触发 → 打开发射窗口 */
  handleToggle: (context: ModContext) => {
    context.emit('mod:open-window', {
      modId: 'moon',
      windowId: 'moon-window',
      title: 'Moon Explorer',
      titleZh: '月球探索',
    });
  },
};

export function getMoonMod() {
  return {
    manifest: moonManifest,
    hooks: moonHooks,
  };
}
