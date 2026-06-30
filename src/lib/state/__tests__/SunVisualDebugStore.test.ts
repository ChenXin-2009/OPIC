import { useSunVisualDebugStore } from '../SunVisualDebugStore';

describe('SunVisualDebugStore', () => {
  beforeEach(() => {
    useSunVisualDebugStore.setState({
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
    });
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useSunVisualDebugStore.getState();
      expect(state.enabled).toBe(true);
      expect(state.opacity).toBe(0.95);
      expect(state.colorGainR).toBe(43);
      expect(state.colorGainG).toBe(18);
      expect(state.colorGainB).toBe(5);
      expect(state.starPoints).toBe(4);
      expect(state.glareSize).toBe(0.03);
      expect(state.flareSize).toBe(0.005);
      expect(state.flareSpeed).toBe(0);
      expect(state.haloScale).toBe(0.5);
      expect(state.ghostScale).toBe(0.6);
      expect(state.animated).toBe(false);
      expect(state.anamorphic).toBe(true);
      expect(state.secondaryGhosts).toBe(true);
      expect(state.starBurst).toBe(false);
      expect(state.aditionalStreaks).toBe(true);
      expect(state.enhanceStartDistance).toBe(70);
      expect(state.enhanceEndDistance).toBe(5);
      expect(state.enhanceOpacityMultiplier).toBe(2.5);
      expect(state.farLimitDistance).toBe(100);
    });
  });

  describe('set', () => {
    it('should update partial state', () => {
      useSunVisualDebugStore.getState().set({ opacity: 0.5, enabled: false });
      const state = useSunVisualDebugStore.getState();
      expect(state.opacity).toBe(0.5);
      expect(state.enabled).toBe(false);
      expect(state.colorGainR).toBe(43);
    });

    it('should allow single field update', () => {
      useSunVisualDebugStore.getState().set({ starPoints: 6 });
      expect(useSunVisualDebugStore.getState().starPoints).toBe(6);
    });
  });

  describe('copyConfig', () => {
    beforeEach(() => {
      (navigator as any).clipboard = { writeText: jest.fn().mockResolvedValue(undefined) };
    });

    it('should generate config string and copy to clipboard', async () => {
      const writeText = (navigator.clipboard as any).writeText;
      useSunVisualDebugStore.getState().copyConfig();
      await new Promise(r => setTimeout(r, 0));
      expect(writeText).toHaveBeenCalledTimes(1);
      const configStr = writeText.mock.calls[0][0] as string;
      expect(configStr).toContain('SUN_LENS_FLARE_CONFIG');
      expect(configStr).toContain('enabled: true');
      expect(configStr).toContain('opacity: 0.95');
      expect(configStr).toContain('farLimitDistance: 100');
    });

    it('should fallback to console.log if clipboard fails', async () => {
      (navigator.clipboard as any).writeText = jest.fn().mockRejectedValue(new Error('denied'));
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      useSunVisualDebugStore.getState().copyConfig();
      await new Promise(r => setTimeout(r, 0));
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
