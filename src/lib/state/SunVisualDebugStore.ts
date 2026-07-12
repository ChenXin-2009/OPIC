/**
 * SunVisualDebugStore — 太阳镜头光晕实时调参 Store
 *
 * 悬浮调试面板通过此 store 实时修改 shader 参数。
 * 默认值已与 sunVisualConfig.ts 严格同步。
 */
import { create } from 'zustand';

/**
 * 太阳镜头光晕实时调试状态与操作接口
 */
interface SunLensFlareState {
  /** 光晕效果总开关 */
  enabled: boolean;
  /** 整体透明度（0-1） */
  opacity: number;
  /** 红色通道增益 */
  colorGainR: number;
  /** 绿色通道增益 */
  colorGainG: number;
  /** 蓝色通道增益 */
  colorGainB: number;
  /** 星芒射线数量 */
  starPoints: number;
  /** 眩光尺寸 */
  glareSize: number;
  /** 耀斑尺寸 */
  flareSize: number;
  /** 耀斑动画速度 */
  flareSpeed: number;
  /** 光晕缩放比例 */
  haloScale: number;
  /** 鬼影缩放比例 */
  ghostScale: number;
  /** 是否启用动画 */
  animated: boolean;
  /** 是否启用变形宽银幕效果 */
  anamorphic: boolean;
  /** 是否显示二级鬼影 */
  secondaryGhosts: boolean;
  /** 是否启用星芒爆炸 */
  starBurst: boolean;
  /** 是否显示额外条纹 */
  aditionalStreaks: boolean;
  /** 增强效果起始距离 */
  enhanceStartDistance: number;
  /** 增强效果结束距离 */
  enhanceEndDistance: number;
  /** 增强效果不透明度倍率 */
  enhanceOpacityMultiplier: number;
  /** 最远可见距离 */
  farLimitDistance: number;

  /**
   * 部分更新当前状态
   * @param partial - 需要更新的部分状态字段
   */
  set: (partial: Partial<SunLensFlareState>) => void;
  /**
   * 将当前配置复制为 sunVisualConfig.ts 的常量代码到剪贴板
   *
   * 用于调试面板中"导出配置"功能，生成可直接粘贴到源码中的配置对象。
   */
  copyConfig: () => void;
}

// 默认值与 sunVisualConfig.ts 严格同步
const defaults = {
  enabled: true,
  opacity: 0.95,
  colorGainR: 43,
  colorGainG: 18,
  colorGainB: 5,
  starPoints: 4,
  glareSize: 0.03,
  flareSize: 0.005,
  flareSpeed: 0,
  haloScale: 0.5,
  ghostScale: 0.6,
  animated: false,
  anamorphic: true,
  secondaryGhosts: true,
  starBurst: false,
  aditionalStreaks: true,
  enhanceStartDistance: 70,
  enhanceEndDistance: 5,
  enhanceOpacityMultiplier: 2.5,
  farLimitDistance: 100,
};

export const useSunVisualDebugStore = create<SunLensFlareState>((set, get) => ({
  ...defaults,

  set: (partial) => set(partial),

  copyConfig: () => {
    const s = get();
    const config = `export const SUN_LENS_FLARE_CONFIG = {
  enabled: ${s.enabled},
  opacity: ${s.opacity},
  colorGainR: ${s.colorGainR},
  colorGainG: ${s.colorGainG},
  colorGainB: ${s.colorGainB},
  starPoints: ${s.starPoints},
  glareSize: ${s.glareSize},
  flareSize: ${s.flareSize},
  flareSpeed: ${s.flareSpeed},
  flareShape: 1.3,
  haloScale: ${s.haloScale},
  animated: ${s.animated},
  anamorphic: ${s.anamorphic},
  secondaryGhosts: ${s.secondaryGhosts},
  starBurst: ${s.starBurst},
  ghostScale: ${s.ghostScale},
  aditionalStreaks: ${s.aditionalStreaks},
  enhanceStartDistance: ${s.enhanceStartDistance},
  enhanceEndDistance: ${s.enhanceEndDistance},
  enhanceOpacityMultiplier: ${s.enhanceOpacityMultiplier},
  farLimitDistance: ${s.farLimitDistance},
};`;
    navigator.clipboard.writeText(config).catch((e) => {
      console.error('Failed to copy config to clipboard:', e);
      console.log(config);
    });
  },
}));
