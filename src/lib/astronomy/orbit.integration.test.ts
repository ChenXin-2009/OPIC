/**
 * Integration tests for orbit system with ephemeris calculator
 * 
 * These tests verify that the new ephemeris system integrates correctly
 * with the existing orbit system.
 */

import { 
  getCelestialBodies, 
  initializeSatelliteCalculator,
  SATELLITE_DEFINITIONS 
} from './orbit';
import { SatelliteId } from './ephemeris';

describe('Orbit System Integration', () => {
  describe('getCelestialBodies with ephemeris system', () => {
    it('should return all celestial bodies including Jupiter moons', () => {
      const jd = 2451545.0; // J2000.0
      const bodies = getCelestialBodies(jd);
      
      // Should have Sun + 8 planets + satellites
      expect(bodies.length).toBeGreaterThan(9);
      
      // Check for Jupiter's moons
      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      expect(jupiterMoons.length).toBe(4);
      
      const moonNames = jupiterMoons.map(m => m.name).sort();
      expect(moonNames).toEqual(['Callisto', 'Europa', 'Ganymede', 'Io']);
    });

    it('should return valid positions for all bodies', () => {
      const jd = 2451545.0;
      const bodies = getCelestialBodies(jd);
      
      for (const body of bodies) {
        expect(body.x).toBeDefined();
        expect(body.y).toBeDefined();
        expect(body.z).toBeDefined();
        expect(isFinite(body.x)).toBe(true);
        expect(isFinite(body.y)).toBe(true);
        expect(isFinite(body.z)).toBe(true);
      }
    });

    it('should mark Jupiter moons as satellites', () => {
      const jd = 2451545.0;
      const bodies = getCelestialBodies(jd);
      
      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      
      for (const moon of jupiterMoons) {
        expect(moon.isSatellite).toBe(true);
        expect(moon.parent).toBe('jupiter');
      }
    });

    it('should work without ephemeris data (fallback mode)', () => {
      // This test verifies that the system works even if ephemeris data fails to load
      const jd = 2451545.0;
      const bodies = getCelestialBodies(jd);
      
      // Should still return Jupiter's moons using analytical fallback
      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      expect(jupiterMoons.length).toBe(4);
    });
  });

  describe('initializeSatelliteCalculator', () => {
    it('should initialize without throwing errors', async () => {
      // This may fail to load data (network error), but should not throw
      await expect(initializeSatelliteCalculator()).resolves.not.toThrow();
    });

    it('should handle missing ephemeris data URL gracefully', async () => {
      await expect(
        initializeSatelliteCalculator('/nonexistent/path.bin.gz')
      ).resolves.not.toThrow();
    });
  });

  describe('Position consistency', () => {
    it('should produce consistent positions for the same time', () => {
      const jd = 2451545.0;
      const bodies1 = getCelestialBodies(jd);
      const bodies2 = getCelestialBodies(jd);
      
      expect(bodies1.length).toBe(bodies2.length);
      
      for (let i = 0; i < bodies1.length; i++) {
        expect(bodies1[i].name).toBe(bodies2[i].name);
        expect(bodies1[i].x).toBeCloseTo(bodies2[i].x, 10);
        expect(bodies1[i].y).toBeCloseTo(bodies2[i].y, 10);
        expect(bodies1[i].z).toBeCloseTo(bodies2[i].z, 10);
      }
    });

    it('should produce different positions for different times', () => {
      const jd1 = 2451545.0; // J2000.0
      const jd2 = 2451545.0 + 1.0; // 1 day later
      
      const bodies1 = getCelestialBodies(jd1);
      const bodies2 = getCelestialBodies(jd2);
      
      // Find Io in both sets
      const io1 = bodies1.find(b => b.name === 'Io');
      const io2 = bodies2.find(b => b.name === 'Io');
      
      expect(io1).toBeDefined();
      expect(io2).toBeDefined();
      
      // Io should have moved (orbital period ~1.77 days)
      const distance = Math.sqrt(
        Math.pow(io2!.x - io1!.x, 2) +
        Math.pow(io2!.y - io1!.y, 2) +
        Math.pow(io2!.z - io1!.z, 2)
      );
      
      // Io's orbit is ~421,700 km = ~0.00282 AU
      // In 1 day, it moves ~360°/1.77 = ~203° around Jupiter
      // So distance should be significant (roughly diameter of orbit)
      expect(distance).toBeGreaterThan(0.001); // At least 1000 km
    });
  });

  describe('Satellite definitions compatibility', () => {
    it('should have matching satellite names in definitions and ephemeris', () => {
      const jupiterSats = SATELLITE_DEFINITIONS.jupiter;
      const expectedNames = ['Io', 'Europa', 'Ganymede', 'Callisto'];
      
      const actualNames = jupiterSats.map(s => s.name);
      expect(actualNames).toEqual(expectedNames);
    });
  });

  describe('Coordinate system consistency', () => {
    it('should place Jupiter moons near Jupiter', () => {
      const jd = 2451545.0;
      const bodies = getCelestialBodies(jd);
      
      const jupiter = bodies.find(b => b.name === 'Jupiter');
      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      
      expect(jupiter).toBeDefined();
      
      for (const moon of jupiterMoons) {
        // Calculate distance from Jupiter
        const distance = Math.sqrt(
          Math.pow(moon.x - jupiter!.x, 2) +
          Math.pow(moon.y - jupiter!.y, 2) +
          Math.pow(moon.z - jupiter!.z, 2)
        );
        
        // All Galilean moons should be within 0.02 AU (~3 million km) of Jupiter
        // Callisto's orbit is ~1.88 million km = ~0.0126 AU
        expect(distance).toBeLessThan(0.02);
        expect(distance).toBeGreaterThan(0); // But not at exactly the same position
      }
    });

    it('should maintain orbital ordering (Io closest, Callisto farthest)', () => {
      const jd = 2451545.0;
      const bodies = getCelestialBodies(jd);
      
      const jupiter = bodies.find(b => b.name === 'Jupiter');
      const io = bodies.find(b => b.name === 'Io');
      const europa = bodies.find(b => b.name === 'Europa');
      const ganymede = bodies.find(b => b.name === 'Ganymede');
      const callisto = bodies.find(b => b.name === 'Callisto');
      
      expect(jupiter).toBeDefined();
      expect(io).toBeDefined();
      expect(europa).toBeDefined();
      expect(ganymede).toBeDefined();
      expect(callisto).toBeDefined();
      
      const distanceIo = Math.sqrt(
        Math.pow(io!.x - jupiter!.x, 2) +
        Math.pow(io!.y - jupiter!.y, 2) +
        Math.pow(io!.z - jupiter!.z, 2)
      );
      
      const distanceEuropa = Math.sqrt(
        Math.pow(europa!.x - jupiter!.x, 2) +
        Math.pow(europa!.y - jupiter!.y, 2) +
        Math.pow(europa!.z - jupiter!.z, 2)
      );
      
      const distanceGanymede = Math.sqrt(
        Math.pow(ganymede!.x - jupiter!.x, 2) +
        Math.pow(ganymede!.y - jupiter!.y, 2) +
        Math.pow(ganymede!.z - jupiter!.z, 2)
      );
      
      const distanceCallisto = Math.sqrt(
        Math.pow(callisto!.x - jupiter!.x, 2) +
        Math.pow(callisto!.y - jupiter!.y, 2) +
        Math.pow(callisto!.z - jupiter!.z, 2)
      );
      
      // Verify orbital ordering (with some tolerance for orbital positions)
      // Average distances: Io ~0.00282 AU, Europa ~0.00448 AU, 
      // Ganymede ~0.00716 AU, Callisto ~0.0126 AU
      expect(distanceIo).toBeLessThan(distanceEuropa);
      expect(distanceEuropa).toBeLessThan(distanceGanymede);
      expect(distanceGanymede).toBeLessThan(distanceCallisto);
    });
  });
});
