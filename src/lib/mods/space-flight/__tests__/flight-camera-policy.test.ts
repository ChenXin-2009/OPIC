import {
  createAscentCameraPlan,
  createGroundCameraPlan,
  smoothingFactor,
} from '../flight-camera-policy';

describe('flight camera policy', () => {
  it('places the ground camera at a close, near-level pad view', () => {
    const plan = createGroundCameraPlan(0);

    expect(plan.cameraOffsetEnu[0]).toBeCloseTo(0, 6);
    expect(plan.cameraOffsetEnu[1]).toBeCloseTo(-260, 6);
    expect(plan.cameraOffsetEnu[2]).toBe(60);
    expect(plan.targetOffsetEnu).toEqual([0, 0, 24]);
  });

  it('keeps the pad camera through the initial climb, then expands the tracking view', () => {
    expect(createAscentCameraPlan(749).phase).toBe('pad');

    const ascent = createAscentCameraPlan(10_000);
    expect(ascent.phase).toBe('ascent');
    expect(ascent.rangeM).toBeGreaterThan(4_000);
    expect(ascent.verticalOffsetM).toBeGreaterThan(0);
    expect(ascent.lookAheadM).toBeGreaterThan(0);
  });

  it('returns a bounded, frame-rate-independent smoothing factor', () => {
    expect(smoothingFactor(0)).toBe(0);
    expect(smoothingFactor(1 / 60)).toBeGreaterThan(0);
    expect(smoothingFactor(1)).toBeLessThan(1);
  });
});
