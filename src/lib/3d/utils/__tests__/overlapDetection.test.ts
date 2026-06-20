import { OverlapDetector, type LabelInfo } from '../overlapDetection';

function makeLabel(overrides: Partial<LabelInfo> & { key: string }): LabelInfo {
  return {
    screenX: 0,
    screenY: 0,
    text: '',
    isSelected: false,
    priority: 0,
    width: 50,
    height: 20,
    ...overrides,
  };
}

describe('OverlapDetector', () => {
  it('should return empty set when no labels', () => {
    const detector = new OverlapDetector();
    const result = detector.detectOverlaps([]);
    expect(result.size).toBe(0);
  });

  it('should return empty set for non-overlapping labels', () => {
    const detector = new OverlapDetector();
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 0, screenY: 0, width: 20, height: 10 }),
      makeLabel({ key: 'b', screenX: 500, screenY: 500, width: 20, height: 10 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.size).toBe(0);
  });

  it('should detect overlapping labels', () => {
    const detector = new OverlapDetector();
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });

  it('should not add selected labels to overlapping set', () => {
    const detector = new OverlapDetector();
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20, isSelected: true }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.has('a')).toBe(false);
    expect(result.has('b')).toBe(true);
  });

  it('should respect different cell sizes', () => {
    const detector = new OverlapDetector(200);
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });

  it('should handle labels that touch but do not overlap', () => {
    const detector = new OverlapDetector();
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 150, screenY: 100, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.size).toBe(0);
  });

  it('should detect overlap among three labels', () => {
    const detector = new OverlapDetector();
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
      makeLabel({ key: 'c', screenX: 120, screenY: 110, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.size).toBe(3);
  });

  it('should clear previous results on new detection', () => {
    const detector = new OverlapDetector();
    const overlapping: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
    ];
    const nonOverlapping: LabelInfo[] = [
      makeLabel({ key: 'c', screenX: 0, screenY: 0, width: 10, height: 10 }),
      makeLabel({ key: 'd', screenX: 500, screenY: 500, width: 10, height: 10 }),
    ];

    const result1 = detector.detectOverlaps(overlapping);
    expect(result1.size).toBe(2);

    const result2 = detector.detectOverlaps(nonOverlapping);
    expect(result2.size).toBe(0);
  });

  it('should set cell size', () => {
    const detector = new OverlapDetector();
    detector.setCellSize(200);
    const labels: LabelInfo[] = [
      makeLabel({ key: 'a', screenX: 100, screenY: 100, width: 50, height: 20 }),
      makeLabel({ key: 'b', screenX: 110, screenY: 105, width: 50, height: 20 }),
    ];
    const result = detector.detectOverlaps(labels);
    expect(result.has('a')).toBe(true);
    expect(result.has('b')).toBe(true);
  });
});
