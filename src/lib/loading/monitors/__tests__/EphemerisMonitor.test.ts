/**
 * Unit tests for EphemerisMonitor
 * 
 * Tests the ephemeris data loading monitor functionality.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { EphemerisMonitor } from '../EphemerisMonitor';
import type { EphemerisLoadEventDetail } from '../../types';

/**
 * Dispatch a custom ephemeris event
 */
function dispatchEphemerisEvent(
  type: 'ephemeris:init:start' | 'ephemeris:manifest:loaded' | 'ephemeris:data:loaded' | 'ephemeris:bodies:ready',
  stage: EphemerisLoadEventDetail['stage']
): void {
  const event = new CustomEvent(type, {
    detail: { stage },
  });
  window.dispatchEvent(event);
}

describe('EphemerisMonitor', () => {
  let monitor: EphemerisMonitor;

  beforeEach(() => {
    monitor = new EphemerisMonitor();
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('Initialization', () => {
    it('should have correct name and weight', () => {
      // Requirement: 3.1
      expect(monitor.name).toBe('ephemeris');
      expect(monitor.weight).toBe(2);
    });

    it('should start with progress 0 and not ready', () => {
      // Requirement: 3.3, 3.4
      expect(monitor.getProgress()).toBe(0);
      expect(monitor.isReady()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should update progress to 0.25 on init:start event', () => {
      // Requirement: 3.2, 3.3
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      
      expect(monitor.getProgress()).toBe(0.25);
      expect(monitor.isReady()).toBe(false);
    });

    it('should update progress to 0.5 on manifest:loaded event', () => {
      // Requirement: 3.2, 3.3
      dispatchEphemerisEvent('ephemeris:manifest:loaded', 'manifest');
      
      expect(monitor.getProgress()).toBe(0.5);
      expect(monitor.isReady()).toBe(false);
    });

    it('should update progress to 0.75 on data:loaded event', () => {
      // Requirement: 3.2, 3.3
      dispatchEphemerisEvent('ephemeris:data:loaded', 'data');
      
      expect(monitor.getProgress()).toBe(0.75);
      expect(monitor.isReady()).toBe(false);
    });

    it('should update progress to 1.0 and set ready on bodies:ready event', () => {
      // Requirement: 3.2, 3.3, 3.4
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      expect(monitor.getProgress()).toBe(1.0);
      expect(monitor.isReady()).toBe(true);
    });

    it('should handle events in sequence', () => {
      // Requirement: 3.2, 3.3
      expect(monitor.getProgress()).toBe(0);
      
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      expect(monitor.getProgress()).toBe(0.25);
      
      dispatchEphemerisEvent('ephemeris:manifest:loaded', 'manifest');
      expect(monitor.getProgress()).toBe(0.5);
      
      dispatchEphemerisEvent('ephemeris:data:loaded', 'data');
      expect(monitor.getProgress()).toBe(0.75);
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(monitor.getProgress()).toBe(1.0);
      expect(monitor.isReady()).toBe(true);
    });

    it('should handle events out of order', () => {
      // Requirement: 3.2, 3.3
      // Events might arrive out of order in real scenarios
      
      dispatchEphemerisEvent('ephemeris:data:loaded', 'data');
      expect(monitor.getProgress()).toBe(0.75);
      
      dispatchEphemerisEvent('ephemeris:manifest:loaded', 'manifest');
      expect(monitor.getProgress()).toBe(0.5); // Progress can go backwards
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(monitor.getProgress()).toBe(1.0);
      expect(monitor.isReady()).toBe(true);
    });
  });

  describe('Callback Management', () => {
    it('should call onReady callback when bodies are ready', (done) => {
      // Requirement: 3.4
      monitor.onReady(() => {
        expect(monitor.isReady()).toBe(true);
        done();
      });
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
    });

    it('should call onReady callback immediately if already ready', (done) => {
      // Requirement: 3.4
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      monitor.onReady(() => {
        expect(monitor.isReady()).toBe(true);
        done();
      });
    });

    it('should allow unsubscribing from onReady', () => {
      // Requirement: 3.4
      let callCount = 0;
      
      const unsubscribe = monitor.onReady(() => {
        callCount++;
      });
      
      unsubscribe();
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      expect(callCount).toBe(0);
    });

    it('should call multiple onReady callbacks', () => {
      // Requirement: 3.4
      let callback1Called = false;
      let callback2Called = false;
      
      monitor.onReady(() => { callback1Called = true; });
      monitor.onReady(() => { callback2Called = true; });
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      expect(callback1Called).toBe(true);
      expect(callback2Called).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on dispose', () => {
      // Requirement: 3.5
      monitor.dispose();
      
      // Events should not affect the monitor after disposal
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      expect(monitor.getProgress()).toBe(0);
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(monitor.isReady()).toBe(false);
    });

    it('should clear callbacks on dispose', () => {
      // Requirement: 3.5
      let callCount = 0;
      
      monitor.onReady(() => {
        callCount++;
      });
      
      monitor.dispose();
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      expect(callCount).toBe(0);
    });

    it('should be safe to dispose multiple times', () => {
      // Requirement: 3.5
      expect(() => {
        monitor.dispose();
        monitor.dispose();
        monitor.dispose();
      }).not.toThrow();
    });
  });

  describe('Integration with ResourceMonitor Interface', () => {
    it('should implement ResourceMonitor interface correctly', () => {
      expect(typeof monitor.name).toBe('string');
      expect(typeof monitor.weight).toBe('number');
      expect(typeof monitor.isReady).toBe('function');
      expect(typeof monitor.getProgress).toBe('function');
      expect(typeof monitor.onReady).toBe('function');
      expect(typeof monitor.dispose).toBe('function');
    });

    it('should return progress between 0 and 1', () => {
      expect(monitor.getProgress()).toBeGreaterThanOrEqual(0);
      expect(monitor.getProgress()).toBeLessThanOrEqual(1);
      
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      expect(monitor.getProgress()).toBeGreaterThanOrEqual(0);
      expect(monitor.getProgress()).toBeLessThanOrEqual(1);
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(monitor.getProgress()).toBeGreaterThanOrEqual(0);
      expect(monitor.getProgress()).toBeLessThanOrEqual(1);
    });

    it('should have weight greater than 0', () => {
      expect(monitor.weight).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sequential events', () => {
      // Requirement: 3.2, 3.3
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      dispatchEphemerisEvent('ephemeris:manifest:loaded', 'manifest');
      dispatchEphemerisEvent('ephemeris:data:loaded', 'data');
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      
      expect(monitor.getProgress()).toBe(1.0);
      expect(monitor.isReady()).toBe(true);
    });

    it('should handle duplicate events', () => {
      // Requirement: 3.2, 3.3
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      expect(monitor.getProgress()).toBe(0.25);
      
      dispatchEphemerisEvent('ephemeris:init:start', 'start');
      expect(monitor.getProgress()).toBe(0.25); // Should remain the same
    });

    it('should handle bodies:ready event multiple times', () => {
      // Requirement: 3.4
      let callCount = 0;
      
      monitor.onReady(() => {
        callCount++;
      });
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(callCount).toBe(1);
      
      dispatchEphemerisEvent('ephemeris:bodies:ready', 'bodies');
      expect(callCount).toBe(2); // Callback should be called again
    });
  });
});
