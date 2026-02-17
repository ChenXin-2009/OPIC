/**
 * Unit tests for CoordinateTransformer
 * 
 * Tests coordinate transformations between ICRF, ecliptic, Jovicentric, and heliocentric frames.
 */

import { CoordinateTransformer } from './coordinates';
import { Vector3 } from './types';

describe('CoordinateTransformer', () => {
  const transformer = new CoordinateTransformer();
  const epsilon = 1e-10; // Tolerance for floating-point comparisons

  describe('icrfToEcliptic', () => {
    it('should preserve X-axis (rotation is around X)', () => {
      const pos = new Vector3(1, 0, 0);
      const result = transformer.icrfToEcliptic(pos);
      
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should transform Y-axis correctly', () => {
      const pos = new Vector3(0, 1, 0);
      const result = transformer.icrfToEcliptic(pos);
      
      // Y component should be cos(obliquity)
      const obliquity = 23.43928 * Math.PI / 180;
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(Math.cos(obliquity), 10);
      expect(result.z).toBeCloseTo(-Math.sin(obliquity), 10);
    });

    it('should transform Z-axis correctly', () => {
      const pos = new Vector3(0, 0, 1);
      const result = transformer.icrfToEcliptic(pos);
      
      // Z component should be sin(obliquity) in Y and cos(obliquity) in Z
      const obliquity = 23.43928 * Math.PI / 180;
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(Math.sin(obliquity), 10);
      expect(result.z).toBeCloseTo(Math.cos(obliquity), 10);
    });

    it('should preserve vector magnitude', () => {
      const pos = new Vector3(1.5, 2.3, -0.8);
      const result = transformer.icrfToEcliptic(pos);
      
      expect(result.length()).toBeCloseTo(pos.length(), 10);
    });

    it('should handle zero vector', () => {
      const pos = new Vector3(0, 0, 0);
      const result = transformer.icrfToEcliptic(pos);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('eclipticToICRF', () => {
    it('should preserve X-axis (rotation is around X)', () => {
      const pos = new Vector3(1, 0, 0);
      const result = transformer.eclipticToICRF(pos);
      
      expect(result.x).toBeCloseTo(1, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should transform Y-axis correctly', () => {
      const pos = new Vector3(0, 1, 0);
      const result = transformer.eclipticToICRF(pos);
      
      // Y component should be cos(obliquity)
      const obliquity = 23.43928 * Math.PI / 180;
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(Math.cos(obliquity), 10);
      expect(result.z).toBeCloseTo(Math.sin(obliquity), 10);
    });

    it('should transform Z-axis correctly', () => {
      const pos = new Vector3(0, 0, 1);
      const result = transformer.eclipticToICRF(pos);
      
      // Z component should be -sin(obliquity) in Y and cos(obliquity) in Z
      const obliquity = 23.43928 * Math.PI / 180;
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(-Math.sin(obliquity), 10);
      expect(result.z).toBeCloseTo(Math.cos(obliquity), 10);
    });

    it('should preserve vector magnitude', () => {
      const pos = new Vector3(1.5, 2.3, -0.8);
      const result = transformer.eclipticToICRF(pos);
      
      expect(result.length()).toBeCloseTo(pos.length(), 10);
    });

    it('should handle zero vector', () => {
      const pos = new Vector3(0, 0, 0);
      const result = transformer.eclipticToICRF(pos);
      
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.z).toBe(0);
    });
  });

  describe('ICRF-Ecliptic round-trip', () => {
    it('should return original vector after round-trip transformation', () => {
      const original = new Vector3(1.5, 2.3, -0.8);
      const ecliptic = transformer.icrfToEcliptic(original);
      const backToICRF = transformer.eclipticToICRF(ecliptic);
      
      expect(backToICRF.x).toBeCloseTo(original.x, 10);
      expect(backToICRF.y).toBeCloseTo(original.y, 10);
      expect(backToICRF.z).toBeCloseTo(original.z, 10);
    });

    it('should handle round-trip for multiple test vectors', () => {
      const testVectors = [
        new Vector3(1, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, 0, 1),
        new Vector3(5.2, 0, 0),
        new Vector3(1.5, -2.3, 0.8),
        new Vector3(-3.1, 4.2, -1.5),
      ];

      for (const original of testVectors) {
        const ecliptic = transformer.icrfToEcliptic(original);
        const backToICRF = transformer.eclipticToICRF(ecliptic);
        
        expect(backToICRF.x).toBeCloseTo(original.x, 10);
        expect(backToICRF.y).toBeCloseTo(original.y, 10);
        expect(backToICRF.z).toBeCloseTo(original.z, 10);
      }
    });

    it('should maintain precision within 1e-10 AU', () => {
      const original = new Vector3(5.2, 3.1, -1.8);
      const ecliptic = transformer.icrfToEcliptic(original);
      const backToICRF = transformer.eclipticToICRF(ecliptic);
      
      const difference = backToICRF.sub(original);
      expect(difference.length()).toBeLessThan(epsilon);
    });
  });

  describe('jovicentricToHeliocentric', () => {
    it('should add Jupiter position to satellite position', () => {
      const satPos = new Vector3(0.002819, 0, 0); // Io's semi-major axis in AU
      const jupiterPos = new Vector3(5.2, 0, 0);
      const result = transformer.jovicentricToHeliocentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(5.202819, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should handle 3D positions correctly', () => {
      const satPos = new Vector3(0.001, 0.002, 0.003);
      const jupiterPos = new Vector3(5.0, 2.0, -1.0);
      const result = transformer.jovicentricToHeliocentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(5.001, 10);
      expect(result.y).toBeCloseTo(2.002, 10);
      expect(result.z).toBeCloseTo(-0.997, 10);
    });

    it('should handle zero satellite position', () => {
      const satPos = new Vector3(0, 0, 0);
      const jupiterPos = new Vector3(5.2, 0, 0);
      const result = transformer.jovicentricToHeliocentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(5.2, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should handle negative coordinates', () => {
      const satPos = new Vector3(-0.001, 0.002, -0.003);
      const jupiterPos = new Vector3(-5.0, 2.0, 1.0);
      const result = transformer.jovicentricToHeliocentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(-5.001, 10);
      expect(result.y).toBeCloseTo(2.002, 10);
      expect(result.z).toBeCloseTo(0.997, 10);
    });
  });

  describe('heliocentricToJovicentric', () => {
    it('should subtract Jupiter position from satellite position', () => {
      const satPos = new Vector3(5.202819, 0, 0);
      const jupiterPos = new Vector3(5.2, 0, 0);
      const result = transformer.heliocentricToJovicentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(0.002819, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should handle 3D positions correctly', () => {
      const satPos = new Vector3(5.001, 2.002, -0.997);
      const jupiterPos = new Vector3(5.0, 2.0, -1.0);
      const result = transformer.heliocentricToJovicentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(0.001, 10);
      expect(result.y).toBeCloseTo(0.002, 10);
      expect(result.z).toBeCloseTo(0.003, 10);
    });

    it('should handle satellite at Jupiter position', () => {
      const satPos = new Vector3(5.2, 0, 0);
      const jupiterPos = new Vector3(5.2, 0, 0);
      const result = transformer.heliocentricToJovicentric(satPos, jupiterPos);
      
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
  });

  describe('Jovicentric-Heliocentric round-trip', () => {
    it('should return original position after round-trip', () => {
      const originalJovicentric = new Vector3(0.002819, 0.001, -0.0005);
      const jupiterPos = new Vector3(5.2, 2.3, -1.1);
      
      const heliocentric = transformer.jovicentricToHeliocentric(originalJovicentric, jupiterPos);
      const backToJovicentric = transformer.heliocentricToJovicentric(heliocentric, jupiterPos);
      
      expect(backToJovicentric.x).toBeCloseTo(originalJovicentric.x, 10);
      expect(backToJovicentric.y).toBeCloseTo(originalJovicentric.y, 10);
      expect(backToJovicentric.z).toBeCloseTo(originalJovicentric.z, 10);
    });

    it('should handle multiple Jupiter positions', () => {
      const satPos = new Vector3(0.002, 0.001, -0.0005);
      const jupiterPositions = [
        new Vector3(5.2, 0, 0),
        new Vector3(-5.2, 0, 0),
        new Vector3(0, 5.2, 0),
        new Vector3(3.7, 3.7, 0),
        new Vector3(5.0, 2.0, -1.5),
      ];

      for (const jupiterPos of jupiterPositions) {
        const heliocentric = transformer.jovicentricToHeliocentric(satPos, jupiterPos);
        const backToJovicentric = transformer.heliocentricToJovicentric(heliocentric, jupiterPos);
        
        expect(backToJovicentric.x).toBeCloseTo(satPos.x, 10);
        expect(backToJovicentric.y).toBeCloseTo(satPos.y, 10);
        expect(backToJovicentric.z).toBeCloseTo(satPos.z, 10);
      }
    });

    it('should maintain precision within 1e-10 AU', () => {
      const originalJovicentric = new Vector3(0.002819, 0.001234, -0.000567);
      const jupiterPos = new Vector3(5.2, 2.3, -1.1);
      
      const heliocentric = transformer.jovicentricToHeliocentric(originalJovicentric, jupiterPos);
      const backToJovicentric = transformer.heliocentricToJovicentric(heliocentric, jupiterPos);
      
      const difference = backToJovicentric.sub(originalJovicentric);
      expect(difference.length()).toBeLessThan(epsilon);
    });
  });

  describe('Edge cases', () => {
    it('should handle very large coordinates', () => {
      const pos = new Vector3(1000, 2000, -1500);
      const ecliptic = transformer.icrfToEcliptic(pos);
      const backToICRF = transformer.eclipticToICRF(ecliptic);
      
      expect(backToICRF.x).toBeCloseTo(pos.x, 8);
      expect(backToICRF.y).toBeCloseTo(pos.y, 8);
      expect(backToICRF.z).toBeCloseTo(pos.z, 8);
    });

    it('should handle very small coordinates', () => {
      const pos = new Vector3(1e-8, 2e-8, -1.5e-8);
      const ecliptic = transformer.icrfToEcliptic(pos);
      const backToICRF = transformer.eclipticToICRF(ecliptic);
      
      expect(backToICRF.x).toBeCloseTo(pos.x, 15);
      expect(backToICRF.y).toBeCloseTo(pos.y, 15);
      expect(backToICRF.z).toBeCloseTo(pos.z, 15);
    });

    it('should handle all Galilean moon distances', () => {
      // Semi-major axes in AU
      const moonDistances = [
        0.002819, // Io
        0.004485, // Europa
        0.007155, // Ganymede
        0.012585, // Callisto
      ];

      const jupiterPos = new Vector3(5.2, 0, 0);

      for (const distance of moonDistances) {
        const jovicentricPos = new Vector3(distance, 0, 0);
        const heliocentricPos = transformer.jovicentricToHeliocentric(jovicentricPos, jupiterPos);
        const backToJovicentric = transformer.heliocentricToJovicentric(heliocentricPos, jupiterPos);
        
        expect(backToJovicentric.x).toBeCloseTo(distance, 10);
        expect(backToJovicentric.y).toBeCloseTo(0, 10);
        expect(backToJovicentric.z).toBeCloseTo(0, 10);
      }
    });
  });

  describe('Combined transformations', () => {
    it('should handle ICRF -> Ecliptic -> Jovicentric -> Heliocentric chain', () => {
      // Start with a position in ICRF
      const icrfPos = new Vector3(0.002, 0.001, 0.0005);
      
      // Convert to ecliptic
      const eclipticPos = transformer.icrfToEcliptic(icrfPos);
      
      // Treat as Jovicentric and convert to heliocentric
      const jupiterPos = new Vector3(5.2, 0, 0);
      const heliocentricPos = transformer.jovicentricToHeliocentric(eclipticPos, jupiterPos);
      
      // Verify the chain is reversible
      const backToJovicentric = transformer.heliocentricToJovicentric(heliocentricPos, jupiterPos);
      const backToICRF = transformer.eclipticToICRF(backToJovicentric);
      
      expect(backToICRF.x).toBeCloseTo(icrfPos.x, 10);
      expect(backToICRF.y).toBeCloseTo(icrfPos.y, 10);
      expect(backToICRF.z).toBeCloseTo(icrfPos.z, 10);
    });
  });

  describe('planetcentricToHeliocentric', () => {
    it('should add planet position to satellite position for Earth', () => {
      const moonPos = new Vector3(0.00257, 0, 0); // Moon's distance in AU
      const earthPos = new Vector3(1.0, 0, 0);
      const result = transformer.planetcentricToHeliocentric(moonPos, earthPos);
      
      expect(result.x).toBeCloseTo(1.00257, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should work for Mars satellites', () => {
      const phobosPos = new Vector3(0.00006267, 0, 0); // Phobos distance in AU
      const marsPos = new Vector3(1.52, 0, 0);
      const result = transformer.planetcentricToHeliocentric(phobosPos, marsPos);
      
      expect(result.x).toBeCloseTo(1.52006267, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should work for Saturn satellites', () => {
      const titanPos = new Vector3(0.00817, 0, 0); // Titan distance in AU
      const saturnPos = new Vector3(9.54, 0, 0);
      const result = transformer.planetcentricToHeliocentric(titanPos, saturnPos);
      
      expect(result.x).toBeCloseTo(9.54817, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should handle 3D positions correctly', () => {
      const satPos = new Vector3(0.001, 0.002, 0.003);
      const planetPos = new Vector3(5.0, 2.0, -1.0);
      const result = transformer.planetcentricToHeliocentric(satPos, planetPos);
      
      expect(result.x).toBeCloseTo(5.001, 10);
      expect(result.y).toBeCloseTo(2.002, 10);
      expect(result.z).toBeCloseTo(-0.997, 10);
    });

    it('should handle negative coordinates', () => {
      const satPos = new Vector3(-0.001, 0.002, -0.003);
      const planetPos = new Vector3(-5.0, 2.0, 1.0);
      const result = transformer.planetcentricToHeliocentric(satPos, planetPos);
      
      expect(result.x).toBeCloseTo(-5.001, 10);
      expect(result.y).toBeCloseTo(2.002, 10);
      expect(result.z).toBeCloseTo(0.997, 10);
    });
  });

  describe('heliocentricToplanetcentric', () => {
    it('should subtract planet position from satellite position for Earth', () => {
      const moonHelioPos = new Vector3(1.00257, 0, 0);
      const earthPos = new Vector3(1.0, 0, 0);
      const result = transformer.heliocentricToplanetcentric(moonHelioPos, earthPos);
      
      expect(result.x).toBeCloseTo(0.00257, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should work for Mars satellites', () => {
      const phobosHelioPos = new Vector3(1.52006267, 0, 0);
      const marsPos = new Vector3(1.52, 0, 0);
      const result = transformer.heliocentricToplanetcentric(phobosHelioPos, marsPos);
      
      expect(result.x).toBeCloseTo(0.00006267, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });

    it('should handle 3D positions correctly', () => {
      const satPos = new Vector3(5.001, 2.002, -0.997);
      const planetPos = new Vector3(5.0, 2.0, -1.0);
      const result = transformer.heliocentricToplanetcentric(satPos, planetPos);
      
      expect(result.x).toBeCloseTo(0.001, 10);
      expect(result.y).toBeCloseTo(0.002, 10);
      expect(result.z).toBeCloseTo(0.003, 10);
    });

    it('should handle satellite at planet position', () => {
      const satPos = new Vector3(5.2, 0, 0);
      const planetPos = new Vector3(5.2, 0, 0);
      const result = transformer.heliocentricToplanetcentric(satPos, planetPos);
      
      expect(result.x).toBeCloseTo(0, 10);
      expect(result.y).toBeCloseTo(0, 10);
      expect(result.z).toBeCloseTo(0, 10);
    });
  });

  describe('Planetcentric-Heliocentric round-trip', () => {
    it('should return original position after round-trip for Earth', () => {
      const originalGeocentric = new Vector3(0.00257, 0.001, -0.0005);
      const earthPos = new Vector3(1.0, 0.5, -0.2);
      
      const heliocentric = transformer.planetcentricToHeliocentric(originalGeocentric, earthPos);
      const backToGeocentric = transformer.heliocentricToplanetcentric(heliocentric, earthPos);
      
      expect(backToGeocentric.x).toBeCloseTo(originalGeocentric.x, 10);
      expect(backToGeocentric.y).toBeCloseTo(originalGeocentric.y, 10);
      expect(backToGeocentric.z).toBeCloseTo(originalGeocentric.z, 10);
    });

    it('should handle multiple planet positions', () => {
      const satPos = new Vector3(0.002, 0.001, -0.0005);
      const planetPositions = [
        new Vector3(1.0, 0, 0),    // Earth
        new Vector3(1.52, 0, 0),   // Mars
        new Vector3(5.2, 0, 0),    // Jupiter
        new Vector3(9.54, 0, 0),   // Saturn
        new Vector3(19.19, 0, 0),  // Uranus
        new Vector3(30.07, 0, 0),  // Neptune
      ];

      for (const planetPos of planetPositions) {
        const heliocentric = transformer.planetcentricToHeliocentric(satPos, planetPos);
        const backToplanetcentric = transformer.heliocentricToplanetcentric(heliocentric, planetPos);
        
        expect(backToplanetcentric.x).toBeCloseTo(satPos.x, 10);
        expect(backToplanetcentric.y).toBeCloseTo(satPos.y, 10);
        expect(backToplanetcentric.z).toBeCloseTo(satPos.z, 10);
      }
    });

    it('should maintain precision within 1e-10 AU (Requirements 9.1, 9.5)', () => {
      const originalplanetcentric = new Vector3(0.002819, 0.001234, -0.000567);
      const planetPos = new Vector3(5.2, 2.3, -1.1);
      
      const heliocentric = transformer.planetcentricToHeliocentric(originalplanetcentric, planetPos);
      const backToplanetcentric = transformer.heliocentricToplanetcentric(heliocentric, planetPos);
      
      const difference = backToplanetcentric.sub(originalplanetcentric);
      expect(difference.length()).toBeLessThan(epsilon);
    });
  });

  describe('isSupportedPlanet', () => {
    it('should return true for Earth (399)', () => {
      expect(transformer.isSupportedPlanet(399)).toBe(true);
    });

    it('should return true for Mars (499)', () => {
      expect(transformer.isSupportedPlanet(499)).toBe(true);
    });

    it('should return true for Jupiter (599)', () => {
      expect(transformer.isSupportedPlanet(599)).toBe(true);
    });

    it('should return true for Saturn (699)', () => {
      expect(transformer.isSupportedPlanet(699)).toBe(true);
    });

    it('should return true for Uranus (799)', () => {
      expect(transformer.isSupportedPlanet(799)).toBe(true);
    });

    it('should return true for Neptune (899)', () => {
      expect(transformer.isSupportedPlanet(899)).toBe(true);
    });

    it('should return false for Mercury (199)', () => {
      expect(transformer.isSupportedPlanet(199)).toBe(false);
    });

    it('should return false for Venus (299)', () => {
      expect(transformer.isSupportedPlanet(299)).toBe(false);
    });

    it('should return false for Sun (10)', () => {
      expect(transformer.isSupportedPlanet(10)).toBe(false);
    });

    it('should return false for satellites', () => {
      expect(transformer.isSupportedPlanet(301)).toBe(false); // Moon
      expect(transformer.isSupportedPlanet(501)).toBe(false); // Io
      expect(transformer.isSupportedPlanet(606)).toBe(false); // Titan
    });

    it('should return false for invalid IDs', () => {
      expect(transformer.isSupportedPlanet(0)).toBe(false);
      expect(transformer.isSupportedPlanet(-1)).toBe(false);
      expect(transformer.isSupportedPlanet(9999)).toBe(false);
    });
  });
});
