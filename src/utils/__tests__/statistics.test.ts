import {
  avg,
  min,
  max,
  percentile,
  p95,
  p99,
  calculateStatistics,
  assessDataQuality,
  calculateImprovement,
  formatStatistics,
} from '../statistics';

describe('avg', () => {
  it('should calculate the average of numbers', () => {
    expect(avg([1, 2, 3, 4, 5])).toBe(3);
  });

  it('should return 0 for empty array', () => {
    expect(avg([])).toBe(0);
  });

  it('should return the single value for one-element array', () => {
    expect(avg([42])).toBe(42);
  });

  it('should handle negative numbers', () => {
    expect(avg([-1, 0, 1])).toBe(0);
  });
});

describe('min', () => {
  it('should find the minimum value', () => {
    expect(min([3, 1, 4, 1, 5])).toBe(1);
  });

  it('should return 0 for empty array', () => {
    expect(min([])).toBe(0);
  });

  it('should return the single value for one-element array', () => {
    expect(min([42])).toBe(42);
  });

  it('should handle negative numbers', () => {
    expect(min([-5, -2, -10])).toBe(-10);
  });
});

describe('max', () => {
  it('should find the maximum value', () => {
    expect(max([3, 1, 4, 1, 5])).toBe(5);
  });

  it('should return 0 for empty array', () => {
    expect(max([])).toBe(0);
  });

  it('should return the single value for one-element array', () => {
    expect(max([42])).toBe(42);
  });

  it('should handle negative numbers', () => {
    expect(max([-5, -2, -10])).toBe(-2);
  });
});

describe('percentile', () => {
  it('should return 0 for empty array', () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it('should throw error for percentile < 0', () => {
    expect(() => percentile([1, 2, 3], -0.1)).toThrow('Percentile must be between 0 and 1');
  });

  it('should throw error for percentile > 1', () => {
    expect(() => percentile([1, 2, 3], 1.1)).toThrow('Percentile must be between 0 and 1');
  });

  it('should return 0th percentile as sorted first element', () => {
    expect(percentile([3, 1, 2], 0)).toBe(1);
  });

  it('should return 100th percentile as sorted last element', () => {
    expect(percentile([3, 1, 2], 1)).toBe(3);
  });

  it('should return exact value when index is integer', () => {
    expect(percentile([10, 20, 30, 40, 50], 0.5)).toBe(30);
  });

  it('should interpolate when index is fractional', () => {
    const result = percentile([10, 20, 30, 40], 0.5);
    expect(result).toBe(25);
  });
});

describe('p95', () => {
  it('should delegate to percentile with 0.95', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    expect(p95(values)).toBeCloseTo(percentile(values, 0.95), 5);
  });
});

describe('p99', () => {
  it('should delegate to percentile with 0.99', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    expect(p99(values)).toBeCloseTo(percentile(values, 0.99), 5);
  });
});

describe('calculateStatistics', () => {
  it('should return all statistics fields', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = calculateStatistics(values);
    expect(stats.avg).toBe(5.5);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
    expect(stats.count).toBe(10);
    expect(stats.p95).toBeGreaterThan(0);
    expect(stats.p99).toBeGreaterThan(stats.p95);
  });
});

describe('assessDataQuality', () => {
  it('should return score 0 for null data', () => {
    const result = assessDataQuality(null);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('Data is empty or null');
  });

  it('should return score 0 for undefined data', () => {
    const result = assessDataQuality(undefined);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('should return score 0 for empty array', () => {
    const result = assessDataQuality([]);
    expect(result.score).toBe(0);
    expect(result.passed).toBe(false);
  });

  it('should penalize for insufficient records', () => {
    const result = assessDataQuality([{ id: 1 }], ['id'], 5);
    expect(result.score).toBe(70);
    expect(result.issues).toContain('Insufficient records: expected at least 5, got 1');
  });

  it('should detect missing required fields for array data', () => {
    const result = assessDataQuality([{ name: 'test' }], ['id', 'name']);
    expect(result.score).toBe(90);
    expect(result.issues).toContain('Missing required fields: id');
  });

  it('should penalize null/undefined elements in array', () => {
    const result = assessDataQuality([{ id: 1 }, null, undefined], ['id']);
    expect(result.issues).toContain('Found 2 null/undefined elements in array');
    expect(result.score).toBe(90);
  });

  it('should detect missing fields for object data', () => {
    const result = assessDataQuality({ name: 'test' }, ['id', 'name']);
    expect(result.score).toBe(90);
    expect(result.issues).toContain('Missing required fields: id');
  });

  it('should pass valid data without issues', () => {
    const result = assessDataQuality([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], ['id', 'name']);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toEqual([]);
  });

  it('should pass valid object data without issues', () => {
    const result = assessDataQuality({ id: 1, name: 'test' }, ['id', 'name']);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('should handle nested field paths', () => {
    const result = assessDataQuality([{ user: { name: 'alice' } }], ['user.name', 'user.age']);
    expect(result.issues).toContain('Missing required fields: user.age');
  });

  it('should not crash on non-object data', () => {
    const result = assessDataQuality('string data');
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });
});

describe('calculateImprovement', () => {
  it('should calculate improvement percentage', () => {
    expect(calculateImprovement(100, 80)).toBe(20);
  });

  it('should return 0 when before is 0', () => {
    expect(calculateImprovement(0, 10)).toBe(0);
  });

  it('should handle negative improvement', () => {
    expect(calculateImprovement(80, 100)).toBe(-25);
  });
});

describe('formatStatistics', () => {
  it('should format statistics with default unit', () => {
    const stats = { avg: 10.5, min: 1, max: 100, p95: 90, p99: 99, count: 50 };
    const result = formatStatistics(stats);
    expect(result).toContain('Count: 50');
    expect(result).toContain('Avg: 10.50ms');
    expect(result).toContain('Min: 1.00ms');
    expect(result).toContain('Max: 100.00ms');
    expect(result).toContain('P95: 90.00ms');
    expect(result).toContain('P99: 99.00ms');
  });

  it('should format statistics with custom unit', () => {
    const stats = { avg: 5, min: 1, max: 10, p95: 9, p99: 10, count: 100 };
    const result = formatStatistics(stats, 's');
    expect(result).toContain('Avg: 5.00s');
  });
});
