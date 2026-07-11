import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { spaceFlightManifest } from './manifest';

/**
 * space-flight MOD
 *
 * 统一的航天飞行 MOD，包含：
 * - 载具搭建器（部件选择 → 堆叠 → Δv 计算）
 * - 任务控制（遥测 HUD + 发射控制 + 时间加速）
 * - 飞行渲染（火箭网格 + 尾焰 + 轨迹线 + 追踪相机）
 *
 * 物理引擎在 src/lib/flight-dynamics/（纯 lib 层）。
 * 部件数据在 src/lib/data/rocket-parts/。
 * 发射场数据在 src/lib/data/launch-sites.ts。
 *
 * 当前状态（Phase 1 Task 1.1-1.3 物理核心完成）：
 * - RK4 积分器（二体 + 推力 + 大气阻力 + 变质量）✅
 * - 部件目录 + Δv 计算 ✅
 * - 发射场数据库 + LLA→ECI 转换 ✅
 * - 窗口 UI（搭建器 + 遥测）✅
 * - Three.js 渲染层（待 Task 1.6-1.7）
 */

export const spaceFlightHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[Space Flight] 航天飞行 MOD 加载');
    context.setState({
      integratorReady: true,
      launched: false,
      currentVehicle: null,
      currentFlightState: null,
      timeScale: 1,
    });
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[Space Flight] 航天飞行 MOD 已启用');
    context.setState({ integratorReady: true });
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[Space Flight] 航天飞行 MOD 已禁用');
    context.setState({
      integratorReady: false,
      launched: false,
      currentFlightState: null,
    });
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('[Space Flight] 航天飞行 MOD 卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('[Space Flight] 错误:', error);
  },

  handleToggle: (context: ModContext) => {
    context.emit('mod:open-window', {
      modId: 'space-flight',
      windowId: 'space-flight-window',
      title: 'Space Flight',
      titleZh: '航天飞行',
    });
  },
};

export function getSpaceFlightMod() {
  return {
    manifest: spaceFlightManifest,
    hooks: spaceFlightHooks,
  };
}

export { spaceFlightManifest } from './manifest';
