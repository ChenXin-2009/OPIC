import { TLEData, SatelliteCategory } from '@/lib/types/satellite';
import {
  formatTLE,
  formatTLEBatch,
  formatTLEByCategory,
  validateFormattedTLE,
  TLEFormatterError,
} from '../tle-formatter';

function makeLine1(): string {
  return ('1 25544U 98067A   24001.50000000  .00000000  00000-0  00000-0 0  9994').padEnd(69, ' ');
}

function makeLine2(): string {
  return ('2 25544  51.6400 100.0000 0005000  50.0000 310.0000 15.50000000400000').padEnd(69, ' ');
}

function makeTLE(overrides?: Partial<TLEData>): TLEData {
  return {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    line1: makeLine1(),
    line2: makeLine2(),
    category: SatelliteCategory.ISS,
    epoch: new Date('2024-01-01'),
    ...overrides,
  };
}

describe('TLEFormatterError', () => {
  it('should be an instance of Error', () => {
    const err = new TLEFormatterError('test', 'field', 'value');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TLEFormatterError);
    expect(err.name).toBe('TLEFormatterError');
    expect(err.message).toBe('test');
    expect(err.field).toBe('field');
    expect(err.value).toBe('value');
  });

  it('should allow optional field and value', () => {
    const err = new TLEFormatterError('test');
    expect(err.field).toBeUndefined();
    expect(err.value).toBeUndefined();
  });
});

describe('formatTLE', () => {
  it('should format valid TLE data to a three-line string', () => {
    const result = formatTLE(makeTLE());
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('ISS (ZARYA)');
    expect(lines[1]).toBe(makeLine1());
    expect(lines[2]).toBe(makeLine2());
  });

  it('should trim whitespace from name', () => {
    const result = formatTLE(makeTLE({ name: '  ISS (ZARYA)  ' }));
    expect(result.split('\n')[0]).toBe('ISS (ZARYA)');
  });

  it('should throw TLEFormatterError for missing name', () => {
    expect(() => formatTLE(makeTLE({ name: '' }))).toThrow(TLEFormatterError);
    expect(() => formatTLE(makeTLE({ name: '' as any }))).toThrow('Missing or invalid name field');
  });

  it('should throw TLEFormatterError for missing line1', () => {
    expect(() => formatTLE(makeTLE({ line1: '' }))).toThrow(TLEFormatterError);
  });

  it('should throw TLEFormatterError for missing line2', () => {
    expect(() => formatTLE(makeTLE({ line2: '' }))).toThrow(TLEFormatterError);
  });

  it('should throw for line1 with wrong length', () => {
    expect(() => formatTLE(makeTLE({ line1: '1 short' }))).toThrow('Invalid line1 length');
  });

  it('should throw for line2 with wrong length', () => {
    expect(() => formatTLE(makeTLE({ line2: '2 short' }))).toThrow('Invalid line2 length');
  });

  it('should throw for line1 not starting with "1 "', () => {
    const badLine1 = '3 ' + 'x'.repeat(67);
    expect(() => formatTLE(makeTLE({ line1: badLine1 }))).toThrow('Invalid line1 format');
  });

  it('should throw for line2 not starting with "2 "', () => {
    const badLine2 = '3 ' + 'x'.repeat(67);
    expect(() => formatTLE(makeTLE({ line2: badLine2 }))).toThrow('Invalid line2 format');
  });

  it('should throw for null input', () => {
    expect(() => formatTLE(null as any)).toThrow();
  });

  it('should throw for undefined input', () => {
    expect(() => formatTLE(undefined as any)).toThrow();
  });
});

describe('formatTLEBatch', () => {
  it('should format multiple TLEs separated by newlines', () => {
    const tle1 = makeTLE({ name: 'SAT-A' });
    const tle2 = makeTLE({ name: 'SAT-B' });
    const result = formatTLEBatch([tle1, tle2]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe('SAT-A');
    expect(lines[3]).toBe('SAT-B');
  });

  it('should return empty string for empty array', () => {
    expect(formatTLEBatch([])).toBe('');
  });

  it('should throw for non-array input', () => {
    expect(() => formatTLEBatch('not-an-array' as any)).toThrow('Input must be an array');
  });

  it('should throw with index info when a TLE in the batch is invalid', () => {
    const valid = makeTLE({ name: 'VALID' });
    const invalid = makeTLE({ name: '' });
    expect(() => formatTLEBatch([valid, invalid])).toThrow('Error formatting TLE at index 1');
  });
});

describe('formatTLEByCategory', () => {
  it('should group TLEs by category', () => {
    const iss = makeTLE({ name: 'ISS', category: SatelliteCategory.ISS });
    const gps = makeTLE({ name: 'GPS-1', category: SatelliteCategory.GPS });
    const gps2 = makeTLE({ name: 'GPS-2', category: SatelliteCategory.GPS });

    const result = formatTLEByCategory([iss, gps, gps2]);
    expect(result.size).toBe(2);
    expect(result.has(SatelliteCategory.ISS)).toBe(true);
    expect(result.has(SatelliteCategory.GPS)).toBe(true);

    const gpsFormatted = result.get(SatelliteCategory.GPS)!;
    expect(gpsFormatted.split('\n')).toHaveLength(6);
  });

  it('should default to ACTIVE category when category is missing', () => {
    const tle = makeTLE({ category: undefined as any });
    const result = formatTLEByCategory([tle]);
    expect(result.has(SatelliteCategory.ACTIVE)).toBe(true);
  });

  it('should return empty map for empty array', () => {
    const result = formatTLEByCategory([]);
    expect(result.size).toBe(0);
  });
});

describe('validateFormattedTLE', () => {
  it('should return true for valid formatted TLE', () => {
    const formatted = formatTLE(makeTLE());
    expect(validateFormattedTLE(formatted)).toBe(true);
  });

  it('should return true for multiple valid TLEs', () => {
    const tle1 = formatTLE(makeTLE({ name: 'A' }));
    const tle2 = formatTLE(makeTLE({ name: 'B' }));
    expect(validateFormattedTLE(tle1 + '\n' + tle2)).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(validateFormattedTLE('')).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(validateFormattedTLE(null as any)).toBe(false);
    expect(validateFormattedTLE(undefined as any)).toBe(false);
    expect(validateFormattedTLE(123 as any)).toBe(false);
  });

  it('should return false when line count is not a multiple of 3', () => {
    expect(validateFormattedTLE('name\nline1')).toBe(false);
  });

  it('should return false when line1 length is wrong', () => {
    const line2 = makeLine2();
    const formatted = `ISS\n1 short\n${line2}`;
    expect(validateFormattedTLE(formatted)).toBe(false);
  });

  it('should return false when line1 prefix is wrong', () => {
    const badLine1 = '3 ' + 'x'.repeat(67);
    const formatted = `ISS\n${badLine1}\n${makeLine2()}`;
    expect(validateFormattedTLE(formatted)).toBe(false);
  });

  it('should return false when line2 prefix is wrong', () => {
    const badLine2 = '3 ' + 'x'.repeat(67);
    const formatted = `ISS\n${makeLine1()}\n${badLine2}`;
    expect(validateFormattedTLE(formatted)).toBe(false);
  });

  it('should ignore blank lines', () => {
    const formatted = formatTLE(makeTLE()) + '\n\n\n';
    expect(validateFormattedTLE(formatted)).toBe(true);
  });
});
