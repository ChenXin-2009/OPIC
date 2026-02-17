/**
 * Unit tests for ObserverModeController
 * 
 * Tests observer mode switching, position calculation, velocity calculation,
 * and aberration mode selection.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.6, 8.7
 */

import { ObserverModeController, PlanetaryPositionProvider } from './observer';
import { Vector3, ObserverMode, AberrationMode } from './types';

/**
 * Mock planetary position provider for testing
 */
class MockPlanetaryPositionProvider implements PlanetaryPositionProvider {
  getEarthPosition(jd_tdb: number): Vector3 {
    // Simplified Earth position: circular orbit at 1 AU
    // Position varies with time for testing
    const angle = (jd_tdb - 2451545.0) / 365.25 * 2 * Math.PI;
    return new Vector3(Math.cos(angle), Math.sin(angle), 0);
  }

  getJupiterPosition(jd_tdb: number): Vector3 {
    // Simplified Jupiter position: circular orbit at 5.2 AU
    const angle = (jd_tdb - 2451545.0) / (11.86 * 365.25) * 2 * Math.PI;
    return new Vector3(5.2 * Math.cos(angle), 5.2 * Math.sin(angle), 0);
  }

  getEarthVelocity(jd_tdb: number): Vector3 {
    // Earth's orbital velocity is approximately 30 km/s
    // Direction is perpendicular to position vector
    const angle = (jd_tdb - 2451545.0) / 365.25 * 2 * Math.PI;
    return new Vector3(-30 * Math.sin(angle), 30 * Math.cos(angle), 0);
  }
}

describe('ObserverModeController', () => {
  let controller: ObserverModeController;
  let provider: MockPlanetaryPositionProvider;
  const testJD = 2451545.0; // J2000.0

  beforeEach(() => {
    provider = new MockPlanetaryPositionProvider();
    controller = new ObserverModeController(provider);
  });

  describe('Mode Management', () => {
    it('should default to GEOCENTRIC mode', () => {
      expect(controller.getMode()).toBe(ObserverMode.GEOCENTRIC);
    });

    it('should allow setting HELIOCENTRIC mode', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      expect(controller.getMode()).toBe(ObserverMode.HELIOCENTRIC);
    });

    it('should allow setting JOVICENTRIC mode', () => {
      controller.setMode(ObserverMode.JOVICENTRIC);
      expect(controller.getMode()).toBe(ObserverMode.JOVICENTRIC);
    });

    it('should allow switching between modes', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      expect(controller.getMode()).toBe(ObserverMode.HELIOCENTRIC);
      
      controller.setMode(ObserverMode.JOVICENTRIC);
      expect(controller.getMode()).toBe(ObserverMode.JOVICENTRIC);
      
      controller.setMode(ObserverMode.GEOCENTRIC);
      expect(controller.getMode()).toBe(ObserverMode.GEOCENTRIC);
    });
  });

  describe('Observer Position', () => {
    it('should return Earth position in GEOCENTRIC mode', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const pos = controller.getObserverPosition(testJD);
      
      // Should match Earth's position from provider
      const earthPos = provider.getEarthPosition(testJD);
      expect(pos.equals(earthPos)).toBe(true);
    });

    it('should return origin in HELIOCENTRIC mode', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      const pos = controller.getObserverPosition(testJD);
      
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
      expect(pos.z).toBe(0);
    });

    it('should return Jupiter position in JOVICENTRIC mode', () => {
      controller.setMode(ObserverMode.JOVICENTRIC);
      const pos = controller.getObserverPosition(testJD);
      
      // Should match Jupiter's position from provider
      const jupiterPos = provider.getJupiterPosition(testJD);
      expect(pos.equals(jupiterPos)).toBe(true);
    });

    it('should return different positions for different times in GEOCENTRIC mode', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const pos1 = controller.getObserverPosition(testJD);
      const pos2 = controller.getObserverPosition(testJD + 100); // 100 days later
      
      // Positions should be different
      expect(pos1.equals(pos2)).toBe(false);
    });

    it('should return different positions for different times in JOVICENTRIC mode', () => {
      controller.setMode(ObserverMode.JOVICENTRIC);
      const pos1 = controller.getObserverPosition(testJD);
      const pos2 = controller.getObserverPosition(testJD + 365); // 1 year later
      
      // Positions should be different
      expect(pos1.equals(pos2)).toBe(false);
    });

    it('should always return origin in HELIOCENTRIC mode regardless of time', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      const pos1 = controller.getObserverPosition(testJD);
      const pos2 = controller.getObserverPosition(testJD + 1000);
      
      expect(pos1.equals(new Vector3(0, 0, 0))).toBe(true);
      expect(pos2.equals(new Vector3(0, 0, 0))).toBe(true);
    });
  });

  describe('Observer Velocity', () => {
    it('should return Earth velocity in GEOCENTRIC mode', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const vel = controller.getObserverVelocity(testJD);
      
      // Should match Earth's velocity from provider
      const earthVel = provider.getEarthVelocity(testJD);
      expect(vel.equals(earthVel)).toBe(true);
    });

    it('should return zero velocity in HELIOCENTRIC mode', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      const vel = controller.getObserverVelocity(testJD);
      
      expect(vel.x).toBe(0);
      expect(vel.y).toBe(0);
      expect(vel.z).toBe(0);
    });

    it('should return zero velocity in JOVICENTRIC mode', () => {
      controller.setMode(ObserverMode.JOVICENTRIC);
      const vel = controller.getObserverVelocity(testJD);
      
      // Jupiter's velocity is simplified to zero for our accuracy requirements
      expect(vel.x).toBe(0);
      expect(vel.y).toBe(0);
      expect(vel.z).toBe(0);
    });

    it('should return non-zero velocity magnitude in GEOCENTRIC mode', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const vel = controller.getObserverVelocity(testJD);
      
      // Earth's velocity should be approximately 30 km/s
      const speed = vel.length();
      expect(speed).toBeGreaterThan(25);
      expect(speed).toBeLessThan(35);
    });

    it('should return velocity in ICRF frame relative to SSB', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const vel = controller.getObserverVelocity(testJD);
      
      // Velocity should be in km/s (not AU/day or other units)
      // Earth's orbital velocity is ~30 km/s
      expect(vel.length()).toBeCloseTo(30, 0);
    });
  });

  describe('Aberration Mode Selection', () => {
    it('should apply aberration in GEOCENTRIC mode', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      expect(controller.shouldApplyAberration()).toBe(true);
      expect(controller.getAberrationMode()).toBe(AberrationMode.LT_S);
    });

    it('should not apply aberration in HELIOCENTRIC mode', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      expect(controller.shouldApplyAberration()).toBe(false);
      expect(controller.getAberrationMode()).toBe(AberrationMode.LT);
    });

    it('should not apply aberration in JOVICENTRIC mode', () => {
      controller.setMode(ObserverMode.JOVICENTRIC);
      expect(controller.shouldApplyAberration()).toBe(false);
      expect(controller.getAberrationMode()).toBe(AberrationMode.LT);
    });

    it('should return LT_S mode only for GEOCENTRIC', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      expect(controller.getAberrationMode()).toBe(AberrationMode.LT_S);
      
      controller.setMode(ObserverMode.HELIOCENTRIC);
      expect(controller.getAberrationMode()).not.toBe(AberrationMode.LT_S);
      
      controller.setMode(ObserverMode.JOVICENTRIC);
      expect(controller.getAberrationMode()).not.toBe(AberrationMode.LT_S);
    });
  });

  describe('Integration Scenarios', () => {
    it('should provide consistent data for position calculations', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      
      const pos = controller.getObserverPosition(testJD);
      const vel = controller.getObserverVelocity(testJD);
      const mode = controller.getAberrationMode();
      
      // All data should be consistent for GEOCENTRIC mode
      expect(pos.length()).toBeGreaterThan(0); // Earth is not at origin
      expect(vel.length()).toBeGreaterThan(0); // Earth has velocity
      expect(mode).toBe(AberrationMode.LT_S); // Full corrections
    });

    it('should provide consistent data for heliocentric observations', () => {
      controller.setMode(ObserverMode.HELIOCENTRIC);
      
      const pos = controller.getObserverPosition(testJD);
      const vel = controller.getObserverVelocity(testJD);
      const mode = controller.getAberrationMode();
      
      // All data should be consistent for HELIOCENTRIC mode
      expect(pos.length()).toBe(0); // Observer at origin
      expect(vel.length()).toBe(0); // No velocity
      expect(mode).toBe(AberrationMode.LT); // Light-time only
    });

    it('should handle rapid mode switching', () => {
      // Switch modes rapidly and verify consistency
      for (let i = 0; i < 10; i++) {
        controller.setMode(ObserverMode.GEOCENTRIC);
        expect(controller.shouldApplyAberration()).toBe(true);
        
        controller.setMode(ObserverMode.HELIOCENTRIC);
        expect(controller.shouldApplyAberration()).toBe(false);
        
        controller.setMode(ObserverMode.JOVICENTRIC);
        expect(controller.shouldApplyAberration()).toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle J2000.0 epoch correctly', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const pos = controller.getObserverPosition(2451545.0);
      
      // Should return a valid position
      expect(pos.isFinite()).toBe(true);
      expect(pos.length()).toBeGreaterThan(0);
    });

    it('should handle far future dates', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const pos = controller.getObserverPosition(2500000.0); // ~130 years in future
      
      // Should return a valid position
      expect(pos.isFinite()).toBe(true);
    });

    it('should handle past dates', () => {
      controller.setMode(ObserverMode.GEOCENTRIC);
      const pos = controller.getObserverPosition(2400000.0); // ~140 years in past
      
      // Should return a valid position
      expect(pos.isFinite()).toBe(true);
    });
  });
});
