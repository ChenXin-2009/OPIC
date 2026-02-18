/**
 * Unit tests for ResourceMonitorRegistry
 * 
 * Tests the resource monitor registry functionality including
 * registration, progress calculation, and ready state detection.
 * 
 * Requirements: 9.1, 9.2, 9.3, 5.1, 5.4
 */

import { ResourceMonitorRegistry } from '../ResourceMonitorRegistry';
import type { ResourceMonitor } from '../types';

/**
 * Create a mock monitor for testing
 */
function createMockMonitor(
  name: string,
  weight: number,
  progress: number = 0,
  ready: boolean = false
): ResourceMonitor {
  const callbacks = new Set<() => void>();
  
  return {
    name,
    weight,
    isReady: () => ready,
    getProgress: () => progress,
    onReady: (callback) => {
      callbacks.add(callback);
      if (ready) {
        callback();
      }
      return () => callbacks.delete(callback);
    },
    dispose: () => callbacks.clear(),
    // Helper methods for testing
    _setReady: (value: boolean) => {
      ready = value;
      if (value) {
        callbacks.forEach(cb => cb());
      }
    },
    _setProgress: (value: number) => {
      progress = value;
    },
  } as ResourceMonitor & {
    _setReady: (value: boolean) => void;
    _setProgress: (value: number) => void;
  };
}

describe('ResourceMonitorRegistry', () => {
  let registry: ResourceMonitorRegistry;

  beforeEach(() => {
    registry = new ResourceMonitorRegistry();
  });

  afterEach(() => {
    registry.dispose();
  });

  describe('Monitor Registration', () => {
    it('should register a monitor', () => {
      // Requirement: 9.1
      const monitor = createMockMonitor('test', 1);
      
      registry.register(monitor);
      
      expect(registry.getMonitorCount()).toBe(1);
      expect(registry.getMonitor('test')).toBe(monitor);
    });

    it('should throw error when registering duplicate monitor', () => {
      // Requirement: 9.1
      const monitor1 = createMockMonitor('test', 1);
      const monitor2 = createMockMonitor('test', 1);
      
      registry.register(monitor1);
      
      expect(() => registry.register(monitor2)).toThrow('Monitor "test" is already registered');
    });

    it('should register multiple monitors', () => {
      // Requirement: 9.1
      const monitor1 = createMockMonitor('browser', 1);
      const monitor2 = createMockMonitor('ephemeris', 2);
      const monitor3 = createMockMonitor('textures', 3);
      
      registry.register(monitor1);
      registry.register(monitor2);
      registry.register(monitor3);
      
      expect(registry.getMonitorCount()).toBe(3);
    });

    it('should unregister a monitor', () => {
      // Requirement: 9.1
      const monitor = createMockMonitor('test', 1);
      
      registry.register(monitor);
      expect(registry.getMonitorCount()).toBe(1);
      
      registry.unregister('test');
      expect(registry.getMonitorCount()).toBe(0);
      expect(registry.getMonitor('test')).toBeUndefined();
    });

    it('should not throw when unregistering non-existent monitor', () => {
      // Requirement: 9.1
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('Progress Calculation', () => {
    it('should return 0 when no monitors are registered', () => {
      // Requirement: 5.1
      expect(registry.calculateProgress()).toBe(0);
    });

    it('should calculate progress for single monitor', () => {
      // Requirement: 5.1, 5.4
      const monitor = createMockMonitor('test', 1, 0.5);
      registry.register(monitor);
      
      expect(registry.calculateProgress()).toBe(0.5);
    });

    it('should calculate weighted average progress for multiple monitors', () => {
      // Requirement: 5.1, 5.4
      // browser: weight=1, progress=1.0
      // ephemeris: weight=2, progress=0.5
      // textures: weight=3, progress=0.0
      // Expected: (1*1.0 + 2*0.5 + 3*0.0) / (1+2+3) = 2.0 / 6 = 0.333...
      
      const browser = createMockMonitor('browser', 1, 1.0);
      const ephemeris = createMockMonitor('ephemeris', 2, 0.5);
      const textures = createMockMonitor('textures', 3, 0.0);
      
      registry.register(browser);
      registry.register(ephemeris);
      registry.register(textures);
      
      const progress = registry.calculateProgress();
      expect(progress).toBeCloseTo(0.333, 2);
    });

    it('should update progress when monitor progress changes', () => {
      // Requirement: 5.1
      const monitor = createMockMonitor('test', 1, 0.0) as any;
      registry.register(monitor);
      
      expect(registry.calculateProgress()).toBe(0.0);
      
      monitor._setProgress(0.5);
      expect(registry.calculateProgress()).toBe(0.5);
      
      monitor._setProgress(1.0);
      expect(registry.calculateProgress()).toBe(1.0);
    });

    it('should handle monitors with zero weight', () => {
      // Edge case
      const monitor = createMockMonitor('test', 0, 0.5);
      registry.register(monitor);
      
      // With zero total weight, should return 0
      expect(registry.calculateProgress()).toBe(0);
    });
  });

  describe('Ready State Detection', () => {
    it('should return false when no monitors are registered', () => {
      // Requirement: 9.3
      expect(registry.isAllReady()).toBe(false);
    });

    it('should return false when some monitors are not ready', () => {
      // Requirement: 9.3
      const monitor1 = createMockMonitor('test1', 1, 1.0, true);
      const monitor2 = createMockMonitor('test2', 1, 0.5, false);
      
      registry.register(monitor1);
      registry.register(monitor2);
      
      expect(registry.isAllReady()).toBe(false);
    });

    it('should return true when all monitors are ready', () => {
      // Requirement: 9.3
      const monitor1 = createMockMonitor('test1', 1, 1.0, true);
      const monitor2 = createMockMonitor('test2', 1, 1.0, true);
      
      registry.register(monitor1);
      registry.register(monitor2);
      
      expect(registry.isAllReady()).toBe(true);
    });

    it('should update ready state when monitor becomes ready', () => {
      // Requirement: 9.3
      const monitor = createMockMonitor('test', 1, 0.0, false) as any;
      registry.register(monitor);
      
      expect(registry.isAllReady()).toBe(false);
      
      monitor._setReady(true);
      expect(registry.isAllReady()).toBe(true);
    });
  });

  describe('Callback Management', () => {
    it('should call onReady callback when all monitors become ready', (done) => {
      // Requirement: 9.2
      const monitor1 = createMockMonitor('test1', 1, 0.5, false) as any;
      const monitor2 = createMockMonitor('test2', 1, 0.5, false) as any;
      
      registry.register(monitor1);
      registry.register(monitor2);
      
      registry.onReady(() => {
        expect(registry.isAllReady()).toBe(true);
        done();
      });
      
      monitor1._setReady(true);
      monitor2._setReady(true);
    });

    it('should call onReady callback immediately if already ready', (done) => {
      // Requirement: 9.2
      const monitor = createMockMonitor('test', 1, 1.0, true);
      registry.register(monitor);
      
      registry.onReady(() => {
        expect(registry.isAllReady()).toBe(true);
        done();
      });
    });

    it('should allow unsubscribing from onReady', () => {
      // Requirement: 9.2
      const monitor = createMockMonitor('test', 1, 0.0, false) as any;
      registry.register(monitor);
      
      let callCount = 0;
      const unsubscribe = registry.onReady(() => {
        callCount++;
      });
      
      unsubscribe();
      monitor._setReady(true);
      
      expect(callCount).toBe(0);
    });

    it('should call onProgress callback with current progress', (done) => {
      // Requirement: 5.1
      const monitor = createMockMonitor('test', 1, 0.5);
      registry.register(monitor);
      
      registry.onProgress((progress) => {
        expect(progress).toBe(0.5);
        done();
      });
    });

    it('should call onProgress callback when progress changes', (done) => {
      // Requirement: 5.1
      const monitor = createMockMonitor('test', 1, 0.0) as any;
      registry.register(monitor);
      
      let callCount = 0;
      registry.onProgress((progress) => {
        callCount++;
        if (callCount === 2) {
          expect(progress).toBe(0.5);
          done();
        }
      });
      
      monitor._setProgress(0.5);
      monitor._setReady(true); // Trigger progress notification
    });

    it('should allow unsubscribing from onProgress', () => {
      // Requirement: 5.1
      const monitor = createMockMonitor('test', 1, 0.0) as any;
      registry.register(monitor);
      
      let callCount = 0;
      const unsubscribe = registry.onProgress(() => {
        callCount++;
      });
      
      unsubscribe();
      monitor._setProgress(0.5);
      monitor._setReady(true);
      
      expect(callCount).toBe(1); // Only the initial call
    });
  });

  describe('Monitor State Inspection', () => {
    it('should return monitor states', () => {
      const monitor1 = createMockMonitor('browser', 1, 1.0, true);
      const monitor2 = createMockMonitor('ephemeris', 2, 0.5, false);
      
      registry.register(monitor1);
      registry.register(monitor2);
      
      const states = registry.getMonitorStates();
      
      expect(states).toHaveLength(2);
      expect(states[0]).toEqual({
        name: 'browser',
        ready: true,
        progress: 1.0,
        weight: 1,
      });
      expect(states[1]).toEqual({
        name: 'ephemeris',
        ready: false,
        progress: 0.5,
        weight: 2,
      });
    });

    it('should return empty array when no monitors registered', () => {
      const states = registry.getMonitorStates();
      expect(states).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    it('should dispose all monitors when registry is disposed', () => {
      // Requirement: 9.4
      const monitor1 = createMockMonitor('test1', 1);
      const monitor2 = createMockMonitor('test2', 1);
      
      const dispose1 = jest.spyOn(monitor1, 'dispose');
      const dispose2 = jest.spyOn(monitor2, 'dispose');
      
      registry.register(monitor1);
      registry.register(monitor2);
      
      registry.dispose();
      
      expect(dispose1).toHaveBeenCalled();
      expect(dispose2).toHaveBeenCalled();
      expect(registry.getMonitorCount()).toBe(0);
    });

    it('should clear all callbacks when disposed', () => {
      // Requirement: 9.4
      const monitor = createMockMonitor('test', 1, 0.0, false) as any;
      registry.register(monitor);
      
      let readyCallCount = 0;
      let progressCallCount = 0;
      
      registry.onReady(() => readyCallCount++);
      registry.onProgress(() => progressCallCount++);
      
      const initialProgressCalls = progressCallCount;
      
      registry.dispose();
      
      monitor._setReady(true);
      monitor._setProgress(1.0);
      
      expect(readyCallCount).toBe(0);
      expect(progressCallCount).toBe(initialProgressCalls); // No new calls
    });
  });
});
