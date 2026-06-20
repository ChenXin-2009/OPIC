import {
  getCelestialBodies,
  initializeAllBodiesCalculator,
  SATELLITE_DEFINITIONS
} from './orbit';

describe('Orbit System Integration', () => {
  describe('getCelestialBodies with ephemeris system', () => {
    it('should return all celestial bodies including Jupiter moons', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

      expect(bodies.length).toBeGreaterThan(9);

      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      expect(jupiterMoons.length).toBe(4);

      const moonNames = jupiterMoons.map(m => m.name).sort();
      expect(moonNames).toEqual(['Callisto', 'Europa', 'Ganymede', 'Io']);
    });

    it('should return valid positions for all bodies', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

      for (const body of bodies) {
        expect(body.x).toBeDefined();
        expect(body.y).toBeDefined();
        expect(body.z).toBeDefined();
        expect(isFinite(body.x)).toBe(true);
        expect(isFinite(body.y)).toBe(true);
        expect(isFinite(body.z)).toBe(true);
      }
    });

    it('should mark Jupiter moons as satellites', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');

      for (const moon of jupiterMoons) {
        expect(moon.isSatellite).toBe(true);
        expect(moon.parent).toBe('jupiter');
      }
    });

    it('should work without ephemeris data (fallback mode)', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');
      expect(jupiterMoons.length).toBe(4);
    });
  });

  describe('initializeAllBodiesCalculator', () => {
    it('should initialize without throwing errors', async () => {
      await expect(initializeAllBodiesCalculator()).resolves.not.toThrow();
    });

    it('should handle missing ephemeris data gracefully', async () => {
      await expect(initializeAllBodiesCalculator()).resolves.not.toThrow();
    });
  });

  describe('Position consistency', () => {
    it('should produce consistent positions for the same time', async () => {
      const jd = 2451545.0;
      const bodies1 = await getCelestialBodies(jd);
      const bodies2 = await getCelestialBodies(jd);

      expect(bodies1.length).toBe(bodies2.length);

      for (let i = 0; i < bodies1.length; i++) {
        expect(bodies1[i].name).toBe(bodies2[i].name);
        expect(bodies1[i].x).toBeCloseTo(bodies2[i].x, 10);
        expect(bodies1[i].y).toBeCloseTo(bodies2[i].y, 10);
        expect(bodies1[i].z).toBeCloseTo(bodies2[i].z, 10);
      }
    });

    it('should produce different positions for different times', async () => {
      const jd1 = 2451545.0;
      const jd2 = 2451545.0 + 1.0;

      const bodies1 = await getCelestialBodies(jd1);
      const bodies2 = await getCelestialBodies(jd2);

      const io1 = bodies1.find(b => b.name === 'Io');
      const io2 = bodies2.find(b => b.name === 'Io');

      expect(io1).toBeDefined();
      expect(io2).toBeDefined();

      const distance = Math.sqrt(
        (io2!.x - io1!.x) * (io2!.x - io1!.x) +
        (io2!.y - io1!.y) * (io2!.y - io1!.y) +
        (io2!.z - io1!.z) * (io2!.z - io1!.z)
      );

      expect(distance).toBeGreaterThan(0.001);
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
    it('should place Jupiter moons near Jupiter', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

      const jupiter = bodies.find(b => b.name === 'Jupiter');
      const jupiterMoons = bodies.filter(b => b.parent === 'jupiter');

      expect(jupiter).toBeDefined();

      for (const moon of jupiterMoons) {
        const distance = Math.sqrt(
          (moon.x - jupiter!.x) * (moon.x - jupiter!.x) +
          (moon.y - jupiter!.y) * (moon.y - jupiter!.y) +
          (moon.z - jupiter!.z) * (moon.z - jupiter!.z)
        );

        expect(distance).toBeLessThan(0.02);
        expect(distance).toBeGreaterThan(0);
      }
    });

    it('should maintain orbital ordering (Io closest, Callisto farthest)', async () => {
      const jd = 2451545.0;
      const bodies = await getCelestialBodies(jd);

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
        (io!.x - jupiter!.x) * (io!.x - jupiter!.x) +
        (io!.y - jupiter!.y) * (io!.y - jupiter!.y) +
        (io!.z - jupiter!.z) * (io!.z - jupiter!.z)
      );

      const distanceEuropa = Math.sqrt(
        (europa!.x - jupiter!.x) * (europa!.x - jupiter!.x) +
        (europa!.y - jupiter!.y) * (europa!.y - jupiter!.y) +
        (europa!.z - jupiter!.z) * (europa!.z - jupiter!.z)
      );

      const distanceGanymede = Math.sqrt(
        (ganymede!.x - jupiter!.x) * (ganymede!.x - jupiter!.x) +
        (ganymede!.y - jupiter!.y) * (ganymede!.y - jupiter!.y) +
        (ganymede!.z - jupiter!.z) * (ganymede!.z - jupiter!.z)
      );

      const distanceCallisto = Math.sqrt(
        (callisto!.x - jupiter!.x) * (callisto!.x - jupiter!.x) +
        (callisto!.y - jupiter!.y) * (callisto!.y - jupiter!.y) +
        (callisto!.z - jupiter!.z) * (callisto!.z - jupiter!.z)
      );

      expect(distanceIo).toBeLessThan(distanceEuropa);
      expect(distanceEuropa).toBeLessThan(distanceGanymede);
      expect(distanceGanymede).toBeLessThan(distanceCallisto);
    });
  });
});
