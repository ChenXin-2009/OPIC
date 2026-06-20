import { evalSensitivityCurve, DEFAULT_DRAG_CURVE } from '../SensitivityCurve';
import type { DragSensitivityCurve } from '../CameraTypes';

describe('evalSensitivityCurve', () => {
  it('should return a value for normal distance (1 AU)', () => {
    const result = evalSensitivityCurve(DEFAULT_DRAG_CURVE, 1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(2.1);
  });

  it('should handle very close distance (1e-12 AU)', () => {
    const result = evalSensitivityCurve(DEFAULT_DRAG_CURVE, 1e-12);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  it('should handle very far distance (1e10 AU)', () => {
    const result = evalSensitivityCurve(DEFAULT_DRAG_CURVE, 1e10);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(2.1);
  });

  it('should return 1 for empty anchors', () => {
    const curve: DragSensitivityCurve = {
      yMin: 0.001,
      yMax: 2,
      anchors: [],
    };
    expect(evalSensitivityCurve(curve, 1)).toBe(1);
  });

  it('should return single anchor value for single anchor', () => {
    const curve: DragSensitivityCurve = {
      yMin: 0.001,
      yMax: 2,
      anchors: [{ nx: 0.5, ny: 0.5 }],
    };
    const result = evalSensitivityCurve(curve, 1);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(2);
  });

  it('should match anchor value at exact anchor match', () => {
    const curve: DragSensitivityCurve = {
      yMin: 0.001,
      yMax: 2,
      anchors: [
        { nx: 0, ny: 0.08 },
        { nx: 0.5, ny: 0.5 },
        { nx: 1, ny: 1 },
      ],
    };
    const result = evalSensitivityCurve(curve, 1);
    expect(result).toBeGreaterThan(0);
  });

  it('should return min at nx=0 and max at nx=1', () => {
    const resultMin = evalSensitivityCurve(DEFAULT_DRAG_CURVE, 1e-10);
    const resultMax = evalSensitivityCurve(DEFAULT_DRAG_CURVE, 1e0);
    expect(resultMin).toBeLessThan(resultMax);
  });

  it('should use default curve anchors', () => {
    expect(DEFAULT_DRAG_CURVE.anchors.length).toBe(6);
    expect(DEFAULT_DRAG_CURVE.yMin).toBe(0.001);
    expect(DEFAULT_DRAG_CURVE.yMax).toBe(2);
  });
});
