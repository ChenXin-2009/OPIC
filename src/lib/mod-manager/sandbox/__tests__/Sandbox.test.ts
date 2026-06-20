import { Sandbox } from '../Sandbox';
import { QuotaExceededError, DEFAULT_QUOTA } from '../types';

describe('Sandbox', () => {
  let sandbox: Sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });

  describe('initialize', () => {
    it('should initialize a mod with default quota', () => {
      sandbox.initialize('mod-1');

      expect(sandbox.getQuota('mod-1')).toEqual(DEFAULT_QUOTA);
      expect(sandbox.getUsage('mod-1')).toEqual({
        memoryMB: 0,
        renderObjects: 0,
        eventListeners: 0,
        timers: 0,
        apiCallsLastSecond: 0,
      });
    });

    it('should initialize a mod with custom quota', () => {
      sandbox.initialize('mod-1', { maxMemoryMB: 100 });

      expect(sandbox.getQuota('mod-1')).toEqual({
        ...DEFAULT_QUOTA,
        maxMemoryMB: 100,
      });
    });
  });

  describe('checkQuota', () => {
    it('should auto-initialize if mod not initialized', () => {
      expect(() => sandbox.checkQuota('mod-1', 'renderObjects')).not.toThrow();
      expect(sandbox.getQuota('mod-1')).toBeDefined();
    });

    it('should pass when under quota', () => {
      sandbox.initialize('mod-1');
      expect(() => sandbox.checkQuota('mod-1', 'renderObjects')).not.toThrow();
    });

    it('should throw QuotaExceededError when over quota', () => {
      sandbox.initialize('mod-1', { maxRenderObjects: 2 });

      sandbox.trackRenderObject('mod-1');
      sandbox.trackRenderObject('mod-1');
      expect(() => sandbox.checkQuota('mod-1', 'renderObjects')).toThrow(
        QuotaExceededError
      );
    });

    it('should check event listeners quota', () => {
      sandbox.initialize('mod-1', { maxEventListeners: 1 });

      sandbox.trackEventListener('mod-1');
      expect(() => sandbox.checkQuota('mod-1', 'eventListeners')).toThrow(
        QuotaExceededError
      );
    });
  });

  describe('API call rate limiting', () => {
    it('should pass when under API rate limit', () => {
      sandbox.initialize('mod-1', { maxAPICallsPerSecond: 5 });
      expect(() => sandbox.checkQuota('mod-1', 'apiCallsLastSecond')).not.toThrow();
    });

    it('should throw when API rate limit exceeded', () => {
      sandbox.initialize('mod-1', { maxAPICallsPerSecond: 2 });

      sandbox.checkQuota('mod-1', 'apiCallsLastSecond');
      sandbox.checkQuota('mod-1', 'apiCallsLastSecond');

      expect(() => sandbox.checkQuota('mod-1', 'apiCallsLastSecond')).toThrow(
        QuotaExceededError
      );
    });
  });

  describe('trackRenderObject / untrackRenderObject', () => {
    it('should increment and decrement render objects', () => {
      sandbox.initialize('mod-1');

      sandbox.trackRenderObject('mod-1');
      sandbox.trackRenderObject('mod-1');
      expect(sandbox.getUsage('mod-1')?.renderObjects).toBe(2);

      sandbox.untrackRenderObject('mod-1');
      expect(sandbox.getUsage('mod-1')?.renderObjects).toBe(1);
    });

    it('should not decrement below zero', () => {
      sandbox.initialize('mod-1');

      sandbox.untrackRenderObject('mod-1');
      expect(sandbox.getUsage('mod-1')?.renderObjects).toBe(0);
    });

    it('should be a no-op for unknown mod', () => {
      expect(() => sandbox.trackRenderObject('unknown')).not.toThrow();
      expect(() => sandbox.untrackRenderObject('unknown')).not.toThrow();
    });
  });

  describe('trackEventListener / untrackEventListener', () => {
    it('should increment and decrement event listeners', () => {
      sandbox.initialize('mod-1');

      sandbox.trackEventListener('mod-1');
      expect(sandbox.getUsage('mod-1')?.eventListeners).toBe(1);

      sandbox.untrackEventListener('mod-1');
      expect(sandbox.getUsage('mod-1')?.eventListeners).toBe(0);
    });

    it('should not decrement below zero', () => {
      sandbox.initialize('mod-1');

      sandbox.untrackEventListener('mod-1');
      expect(sandbox.getUsage('mod-1')?.eventListeners).toBe(0);
    });
  });

  describe('trackTimer / untrackTimer', () => {
    it('should track timer count', () => {
      sandbox.initialize('mod-1');

      sandbox.trackTimer('mod-1', 1);
      sandbox.trackTimer('mod-1', 2);
      expect(sandbox.getUsage('mod-1')?.timers).toBe(2);

      sandbox.untrackTimer('mod-1', 1);
      expect(sandbox.getUsage('mod-1')?.timers).toBe(1);
    });

    it('should handle duplicate timer IDs', () => {
      sandbox.initialize('mod-1');

      sandbox.trackTimer('mod-1', 1);
      sandbox.trackTimer('mod-1', 1);
      expect(sandbox.getUsage('mod-1')?.timers).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should remove all mod data', () => {
      sandbox.initialize('mod-1');
      sandbox.trackRenderObject('mod-1');

      sandbox.cleanup('mod-1');

      expect(sandbox.getUsage('mod-1')).toBeUndefined();
      expect(sandbox.getQuota('mod-1')).toBeUndefined();
    });
  });
});
