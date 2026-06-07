import {
  J2000_JD, DAYS_PER_CENTURY, AU_IN_KM, SPEED_OF_LIGHT_KM_S,
  GM_SUN, OBLIQUITY_J2000_RAD, OBLIQUITY_J2000_DEG,
  DEG_TO_RAD, RAD_TO_DEG, ARCSEC_TO_RAD, RAD_TO_ARCSEC,
  SECONDS_PER_DAY, MILLISECONDS_PER_DAY,
  KEPLER_TOLERANCE, KEPLER_MAX_ITERATIONS,
  TWO_PI, HALF_PI,
  julianCenturies, kmToAU, auToKM,
} from '../constants';

describe('astronomy constants', () => {
  it('should have correct J2000_JD', () => {
    expect(J2000_JD).toBe(2451545.0);
  });

  it('should have correct DAYS_PER_CENTURY', () => {
    expect(DAYS_PER_CENTURY).toBe(36525.0);
  });

  it('should have correct AU_IN_KM', () => {
    expect(AU_IN_KM).toBe(149597870.7);
  });

  it('should have correct SPEED_OF_LIGHT', () => {
    expect(SPEED_OF_LIGHT_KM_S).toBe(299792.458);
  });

  it('should have positive GM_SUN', () => {
    expect(GM_SUN).toBeGreaterThan(0);
  });

  it('should have OBLIQUITY_J2000 match in degrees and radians', () => {
    const deg = OBLIQUITY_J2000_DEG;
    const rad = OBLIQUITY_J2000_RAD;
    expect(rad).toBeCloseTo(deg * Math.PI / 180, 10);
  });

  it('should have DEG_TO_RAD reciprocal of RAD_TO_DEG', () => {
    expect(DEG_TO_RAD * RAD_TO_DEG).toBeCloseTo(1, 10);
  });

  it('should have ARCSEC_TO_RAD reciprocal of RAD_TO_ARCSEC', () => {
    expect(ARCSEC_TO_RAD * RAD_TO_ARCSEC).toBeCloseTo(1, 10);
  });

  it('should have correct SECONDS_PER_DAY and MILLISECONDS_PER_DAY', () => {
    expect(SECONDS_PER_DAY).toBe(86400);
    expect(MILLISECONDS_PER_DAY).toBe(SECONDS_PER_DAY * 1000);
  });

  it('should have KEPLER_TOLERANCE as small number', () => {
    expect(KEPLER_TOLERANCE).toBeLessThan(1e-6);
    expect(KEPLER_MAX_ITERATIONS).toBe(50);
  });

  it('should have TWO_PI = 2 * Math.PI', () => {
    expect(TWO_PI).toBeCloseTo(2 * Math.PI, 10);
  });

  it('should have HALF_PI = Math.PI / 2', () => {
    expect(HALF_PI).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe('julianCenturies', () => {
  it('should return 0 at J2000.0', () => {
    expect(julianCenturies(J2000_JD)).toBe(0);
  });

  it('should return 1 after one century', () => {
    expect(julianCenturies(J2000_JD + DAYS_PER_CENTURY)).toBeCloseTo(1, 10);
  });

  it('should return -1 before one century', () => {
    expect(julianCenturies(J2000_JD - DAYS_PER_CENTURY)).toBeCloseTo(-1, 10);
  });
});

describe('kmToAU', () => {
  it('should return 1 for AU_IN_KM', () => {
    expect(kmToAU(AU_IN_KM)).toBe(1);
  });

  it('should return 0 for 0', () => {
    expect(kmToAU(0)).toBe(0);
  });

  it('should handle small distances', () => {
    const dist = kmToAU(384400);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(1);
  });
});

describe('auToKM', () => {
  it('should return AU_IN_KM for 1 AU', () => {
    expect(auToKM(1)).toBe(AU_IN_KM);
  });

  it('should return 0 for 0', () => {
    expect(auToKM(0)).toBe(0);
  });

  it('should be inverse of kmToAU', () => {
    const originalKm = 1000000;
    const au = kmToAU(originalKm);
    const backKm = auToKM(au);
    expect(backKm).toBeCloseTo(originalKm, 6);
  });
});
