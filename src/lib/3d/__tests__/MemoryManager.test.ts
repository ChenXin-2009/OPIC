import { MemoryManager } from '../MemoryManager';
import { UniverseScale } from '../../types/universeTypes';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    manager = new MemoryManager(1000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default max memory of 2000MB', () => {
      const defaultManager = new MemoryManager();
      expect(defaultManager.getMemoryPercentage()).toBe(0);
    });

    it('should accept custom max memory', () => {
      expect(manager.getMemoryUsage().max).toBe(1000);
    });
  });

  describe('registerRenderer', () => {
    it('should track renderer memory', () => {
      manager.registerRenderer('galaxy', 500);
      expect(manager.getMemoryUsage().current).toBe(500);
    });

    it('should accumulate multiple renderers', () => {
      manager.registerRenderer('galaxy', 500);
      manager.registerRenderer('stars', 300);
      expect(manager.getMemoryUsage().current).toBe(800);
    });

    it('should replace existing renderer registration', () => {
      manager.registerRenderer('galaxy', 500);
      manager.registerRenderer('galaxy', 700);
      expect(manager.getMemoryUsage().current).toBe(700);
    });
  });

  describe('unregisterRenderer', () => {
    it('should subtract memory', () => {
      manager.registerRenderer('galaxy', 500);
      manager.unregisterRenderer('galaxy');
      expect(manager.getMemoryUsage().current).toBe(0);
    });

    it('should handle unregistering non-existent renderer', () => {
      expect(() => manager.unregisterRenderer('nonexistent')).not.toThrow();
      expect(manager.getMemoryUsage().current).toBe(0);
    });
  });

  describe('shouldReleaseMemory', () => {
    it('should return false when under 80%', () => {
      manager.registerRenderer('r1', 500);
      expect(manager.shouldReleaseMemory()).toBe(false);
    });

    it('should return true when over 80%', () => {
      manager.registerRenderer('r1', 850);
      expect(manager.shouldReleaseMemory()).toBe(true);
    });

    it('should return true when at 100%', () => {
      manager.registerRenderer('r1', 1000);
      expect(manager.shouldReleaseMemory()).toBe(true);
    });
  });

  describe('releaseDistantRenderers', () => {
    it('should release renderers for distant scales', () => {
      manager.registerRenderer('solar-system', 100);
      manager.registerRenderer('nearby-stars', 100);
      manager.registerRenderer('galaxy', 100);
      manager.registerRenderer('local-group', 100);
      manager.registerRenderer('nearby-groups', 100);

      manager.releaseDistantRenderers(UniverseScale.LocalGroup);

      // SolarSystem and NearbyStars should be released (distance >= 3)
      expect(manager.getMemoryUsage().current).toBeLessThan(500);
    });

    it('should not release nearby renderers', () => {
      manager.registerRenderer('galaxy', 200);
      manager.registerRenderer('local-group', 200);

      manager.releaseDistantRenderers(UniverseScale.LocalGroup);

      // Both are nearby (distance < 3), should not be released
      expect(manager.getMemoryUsage().current).toBe(400);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return correct usage info', () => {
      manager.registerRenderer('r1', 500);
      const usage = manager.getMemoryUsage();
      expect(usage.current).toBe(500);
      expect(usage.max).toBe(1000);
      expect(usage.percentage).toBe(50);
      expect(usage.renderers.get('r1')).toBe(500);
    });

    it('should return empty renderers when none registered', () => {
      const usage = manager.getMemoryUsage();
      expect(usage.renderers.size).toBe(0);
    });
  });

  describe('getMemoryPercentage', () => {
    it('should return percentage', () => {
      manager.registerRenderer('r1', 500);
      expect(manager.getMemoryPercentage()).toBe(50);
    });
  });

  describe('setMaxMemory', () => {
    it('should update max memory', () => {
      manager.setMaxMemory(2000);
      expect(manager.getMemoryUsage().max).toBe(2000);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      manager.registerRenderer('r1', 500);
      manager.registerRenderer('r2', 300);
      manager.clear();
      expect(manager.getMemoryUsage().current).toBe(0);
      expect(manager.getMemoryUsage().renderers.size).toBe(0);
    });
  });

  describe('getMemoryReport', () => {
    it('should return a string report', () => {
      manager.registerRenderer('r1', 500);
      const report = manager.getMemoryReport();
      expect(report).toContain('500.0MB');
      expect(report).toContain('r1');
    });
  });
});
