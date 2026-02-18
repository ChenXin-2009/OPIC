/**
 * Unit tests for Loading System Types
 * 
 * Tests type definitions and interfaces for the resource loading system.
 * 
 * Requirements: 9.1, 9.2, 9.4
 */

import type {
  ResourceMonitor,
  LoadingProgress,
  MonitorState,
  ExtendedResourceLoaderResult,
  ResourceLoaderResult,
  SceneInitEventDetail,
  TextureLoadEventDetail,
  EphemerisLoadEventDetail,
  UniverseLoadEventDetail,
} from '../types';

describe('Loading System Types', () => {
  describe('ResourceMonitor Interface', () => {
    it('should define required properties', () => {
      // Create a mock monitor that implements the interface
      const mockMonitor: ResourceMonitor = {
        name: 'test-monitor',
        weight: 1,
        isReady: () => false,
        getProgress: () => 0.5,
        onReady: (callback: () => void) => () => {},
        dispose: () => {},
      };

      expect(mockMonitor.name).toBe('test-monitor');
      expect(mockMonitor.weight).toBe(1);
      expect(typeof mockMonitor.isReady).toBe('function');
      expect(typeof mockMonitor.getProgress).toBe('function');
      expect(typeof mockMonitor.onReady).toBe('function');
      expect(typeof mockMonitor.dispose).toBe('function');
    });

    it('should allow isReady to return boolean', () => {
      const monitor: ResourceMonitor = {
        name: 'test',
        weight: 1,
        isReady: () => true,
        getProgress: () => 1,
        onReady: () => () => {},
        dispose: () => {},
      };

      expect(monitor.isReady()).toBe(true);
    });

    it('should allow getProgress to return number between 0 and 1', () => {
      const monitor: ResourceMonitor = {
        name: 'test',
        weight: 1,
        isReady: () => false,
        getProgress: () => 0.75,
        onReady: () => () => {},
        dispose: () => {},
      };

      const progress = monitor.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it('should allow onReady to accept callback and return unsubscribe function', () => {
      let callbackCalled = false;
      const monitor: ResourceMonitor = {
        name: 'test',
        weight: 1,
        isReady: () => true,
        getProgress: () => 1,
        onReady: (callback) => {
          callback();
          return () => { callbackCalled = false; };
        },
        dispose: () => {},
      };

      const unsubscribe = monitor.onReady(() => { callbackCalled = true; });
      expect(callbackCalled).toBe(true);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('LoadingProgress Type', () => {
    it('should define all required properties', () => {
      const progress: LoadingProgress = {
        overall: 0.5,
        stages: {
          browser: 1.0,
          scene: 0.5,
          ephemeris: 0.3,
          textures: 0.2,
          universe: 0.0,
        },
        currentStage: '加载星历数据...',
        isComplete: false,
      };

      expect(progress.overall).toBe(0.5);
      expect(progress.stages.browser).toBe(1.0);
      expect(progress.currentStage).toBe('加载星历数据...');
      expect(progress.isComplete).toBe(false);
    });

    it('should allow overall progress between 0 and 1', () => {
      const progress: LoadingProgress = {
        overall: 0.75,
        stages: {
          browser: 1.0,
          scene: 1.0,
          ephemeris: 0.5,
          textures: 0.5,
          universe: 0.0,
        },
        currentStage: '加载纹理...',
        isComplete: false,
      };

      expect(progress.overall).toBeGreaterThanOrEqual(0);
      expect(progress.overall).toBeLessThanOrEqual(1);
    });
  });

  describe('MonitorState Type', () => {
    it('should define all required properties', () => {
      const state: MonitorState = {
        name: 'ephemeris',
        ready: false,
        progress: 0.5,
        weight: 2,
      };

      expect(state.name).toBe('ephemeris');
      expect(state.ready).toBe(false);
      expect(state.progress).toBe(0.5);
      expect(state.weight).toBe(2);
    });
  });

  describe('ExtendedResourceLoaderResult Type', () => {
    it('should define all required properties', () => {
      const result: ExtendedResourceLoaderResult = {
        isReady: false,
        wasCached: false,
        progress: 0.5,
        currentStage: '加载星历数据...',
      };

      expect(result.isReady).toBe(false);
      expect(result.wasCached).toBe(false);
      expect(result.progress).toBe(0.5);
      expect(result.currentStage).toBe('加载星历数据...');
    });

    it('should be compatible with ResourceLoaderResult', () => {
      const extended: ExtendedResourceLoaderResult = {
        isReady: true,
        wasCached: true,
        progress: 1.0,
        currentStage: '完成',
      };

      // Should be assignable to the base type
      const base: ResourceLoaderResult = {
        isReady: extended.isReady,
        wasCached: extended.wasCached,
      };

      expect(base.isReady).toBe(true);
      expect(base.wasCached).toBe(true);
    });
  });

  describe('SceneInitEventDetail Type', () => {
    it('should allow all valid stage values', () => {
      const stages: Array<SceneInitEventDetail['stage']> = [
        'start',
        'webgl',
        'shaders',
        'complete',
      ];

      stages.forEach(stage => {
        const detail: SceneInitEventDetail = { stage };
        expect(detail.stage).toBe(stage);
      });
    });
  });

  describe('TextureLoadEventDetail Type', () => {
    it('should define all required properties', () => {
      const detail: TextureLoadEventDetail = {
        total: 14,
        loaded: 7,
        textureId: 'earth',
      };

      expect(detail.total).toBe(14);
      expect(detail.loaded).toBe(7);
      expect(detail.textureId).toBe('earth');
    });

    it('should allow optional textureId', () => {
      const detail: TextureLoadEventDetail = {
        total: 14,
        loaded: 14,
      };

      expect(detail.total).toBe(14);
      expect(detail.loaded).toBe(14);
      expect(detail.textureId).toBeUndefined();
    });
  });

  describe('EphemerisLoadEventDetail Type', () => {
    it('should allow all valid stage values', () => {
      const stages: Array<EphemerisLoadEventDetail['stage']> = [
        'start',
        'manifest',
        'data',
        'bodies',
      ];

      stages.forEach(stage => {
        const detail: EphemerisLoadEventDetail = { stage };
        expect(detail.stage).toBe(stage);
      });
    });
  });

  describe('UniverseLoadEventDetail Type', () => {
    it('should define all properties as optional', () => {
      const detail1: UniverseLoadEventDetail = {
        scale: 'LocalGroup',
        total: 4,
        loaded: 1,
      };

      const detail2: UniverseLoadEventDetail = {};

      expect(detail1.scale).toBe('LocalGroup');
      expect(detail2.scale).toBeUndefined();
    });

    it('should allow all valid scale values', () => {
      const scales: Array<NonNullable<UniverseLoadEventDetail['scale']>> = [
        'LocalGroup',
        'NearbyGroups',
        'VirgoSupercluster',
        'LaniakeaSupercluster',
      ];

      scales.forEach(scale => {
        const detail: UniverseLoadEventDetail = { scale };
        expect(detail.scale).toBe(scale);
      });
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ExtendedResourceLoaderResult to be used where ResourceLoaderResult is expected', () => {
      const extended: ExtendedResourceLoaderResult = {
        isReady: true,
        wasCached: true,
        progress: 1.0,
        currentStage: '完成',
      };

      // This should compile without errors
      const useResult = (result: ResourceLoaderResult) => {
        return result.isReady && result.wasCached;
      };

      expect(useResult(extended)).toBe(true);
    });

    it('should allow monitor implementations with different weight values', () => {
      const monitors: ResourceMonitor[] = [
        {
          name: 'browser',
          weight: 1,
          isReady: () => true,
          getProgress: () => 1,
          onReady: () => () => {},
          dispose: () => {},
        },
        {
          name: 'ephemeris',
          weight: 2,
          isReady: () => false,
          getProgress: () => 0.5,
          onReady: () => () => {},
          dispose: () => {},
        },
        {
          name: 'textures',
          weight: 3,
          isReady: () => false,
          getProgress: () => 0.3,
          onReady: () => () => {},
          dispose: () => {},
        },
      ];

      expect(monitors).toHaveLength(3);
      expect(monitors[0].weight).toBe(1);
      expect(monitors[1].weight).toBe(2);
      expect(monitors[2].weight).toBe(3);
    });
  });
});
