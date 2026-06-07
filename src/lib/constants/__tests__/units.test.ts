import {
  LIGHT_YEAR_TO_AU,
  PARSEC_TO_LIGHT_YEAR,
  PARSEC_TO_AU,
  MEGAPARSEC_TO_AU,
  GIGAPARSEC_TO_AU,
  lightYearsToAU,
  parsecsToAU,
  megaparsecsToAU,
  auToLightYears,
  auToParsecs,
  auToMegaparsecs,
} from '../units';

describe('unit constants', () => {
  it('LIGHT_YEAR_TO_AU should be 63241.077', () => {
    expect(LIGHT_YEAR_TO_AU).toBe(63241.077);
  });

  it('PARSEC_TO_LIGHT_YEAR should be 3.26156', () => {
    expect(PARSEC_TO_LIGHT_YEAR).toBe(3.26156);
  });

  it('PARSEC_TO_AU should be 206265', () => {
    expect(PARSEC_TO_AU).toBe(206265);
  });

  it('MEGAPARSEC_TO_AU should be PARSEC_TO_AU * 1e6', () => {
    expect(MEGAPARSEC_TO_AU).toBe(206265 * 1e6);
  });

  it('GIGAPARSEC_TO_AU should be PARSEC_TO_AU * 1e9', () => {
    expect(GIGAPARSEC_TO_AU).toBe(206265 * 1e9);
  });
});

describe('lightYearsToAU', () => {
  it('should convert light years to AU', () => {
    expect(lightYearsToAU(1)).toBe(63241.077);
  });

  it('should convert 0 light years to 0 AU', () => {
    expect(lightYearsToAU(0)).toBe(0);
  });

  it('should handle negative values', () => {
    expect(lightYearsToAU(-1)).toBe(-63241.077);
  });
});

describe('parsecsToAU', () => {
  it('should convert parsecs to AU', () => {
    expect(parsecsToAU(1)).toBe(206265);
  });

  it('should convert 0 parsecs to 0 AU', () => {
    expect(parsecsToAU(0)).toBe(0);
  });
});

describe('megaparsecsToAU', () => {
  it('should convert megaparsecs to AU', () => {
    expect(megaparsecsToAU(1)).toBe(206265 * 1e6);
  });

  it('should convert 0 megaparsecs to 0 AU', () => {
    expect(megaparsecsToAU(0)).toBe(0);
  });
});

describe('auToLightYears', () => {
  it('should convert AU to light years', () => {
    expect(auToLightYears(63241.077)).toBeCloseTo(1, 10);
  });

  it('should convert 0 AU to 0 light years', () => {
    expect(auToLightYears(0)).toBe(0);
  });

  it('should round-trip conversion', () => {
    const originalLY = 4.5;
    const au = lightYearsToAU(originalLY);
    const resultLY = auToLightYears(au);
    expect(resultLY).toBeCloseTo(originalLY, 10);
  });
});

describe('auToParsecs', () => {
  it('should convert AU to parsecs', () => {
    expect(auToParsecs(206265)).toBeCloseTo(1, 10);
  });

  it('should round-trip conversion', () => {
    const originalPC = 3.5;
    const au = parsecsToAU(originalPC);
    const resultPC = auToParsecs(au);
    expect(resultPC).toBeCloseTo(originalPC, 10);
  });
});

describe('auToMegaparsecs', () => {
  it('should convert AU to megaparsecs', () => {
    expect(auToMegaparsecs(206265 * 1e6)).toBeCloseTo(1, 10);
  });

  it('should round-trip conversion', () => {
    const originalMPC = 2.5;
    const au = megaparsecsToAU(originalMPC);
    const resultMPC = auToMegaparsecs(au);
    expect(resultMPC).toBeCloseTo(originalMPC, 10);
  });
});
