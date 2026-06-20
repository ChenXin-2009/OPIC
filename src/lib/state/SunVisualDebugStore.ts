/**
 * SunVisualDebugStore — 太阳镜头光晕实时调参 Store
 *
 * 悬浮调试面板通过此 store 实时修改 shader 参数。
 * 默认值已与 sunVisualConfig.ts 同步。
 */
import { create } from 'zustand';

interface SunLensFlareState {
  enabled: boolean;
  opacity: number;
  colorGainR: number;
  colorGainG: number;
  colorGainB: number;
  starPoints: number;
  glareSize: number;
  flareSize: number;
  flareSpeed: number;
  haloScale: number;
  ghostScale: number;
  animated: boolean;
  anamorphic: boolean;
  secondaryGhosts: boolean;
  starBurst: boolean;
  aditionalStreaks: boolean;
  enhanceStartDistance: number;
  enhanceEndDistance: number;
  enhanceOpacityMultiplier: number;
  farLimitDistance: number;

  set: (partial: Partial<SunLensFlareState>) => void;
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
