import { StarsAlignmentCalculator } from '../StarsAlignmentCalculator';

describe('StarsAlignmentCalculator', () => {
  it('returns a quaternion from calculateCombinedRotation', () => {
    const calc = new StarsAlignmentCalculator();
    const q = calc.calculateCombinedRotation();
    expect(q).toBeDefined();
    expect(typeof q.x).toBe('number');
    expect(typeof q.y).toBe('number');
    expect(typeof q.z).toBe('number');
    expect(typeof q.w).toBe('number');
  });

  it('returns normalized quaternion', () => {
    const calc = new StarsAlignmentCalculator();
    const q = calc.calculateCombinedRotation();
    const length = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    expect(length).toBeCloseTo(1, 5);
  });

  it('getAlignmentQuaternion matches calculateCombinedRotation', () => {
    const calc = new StarsAlignmentCalculator();
    const q1 = calc.calculateCombinedRotation();
    const q2 = calc.getAlignmentQuaternion();
    expect(q1.x).toBe(q2.x);
    expect(q1.y).toBe(q2.y);
    expect(q1.z).toBe(q2.z);
    expect(q1.w).toBe(q2.w);
  });
});
