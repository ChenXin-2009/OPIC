import * as THREE from 'three';
import {
  parseHexColor,
  findClosestPointAndMaxDist,
  computeGradientColors,
} from '../OrbitCurveColor';

describe('parseHexColor', () => {
  it('should parse 6-digit hex color', () => {
    const result = parseHexColor('#ff8800');
    expect(result.r).toBeCloseTo(255 / 255);
    expect(result.g).toBeCloseTo(136 / 255);
    expect(result.b).toBeCloseTo(0);
  });

  it('should parse 3-digit hex color', () => {
    const result = parseHexColor('#f0a');
    expect(result.r).toBeCloseTo(15 / 15);
    expect(result.g).toBeCloseTo(0);
    expect(result.b).toBeCloseTo(10 / 15);
  });

  it('should parse black hex color', () => {
    const result = parseHexColor('#000000');
    expect(result.r).toBe(0);
    expect(result.g).toBe(0);
    expect(result.b).toBe(0);
  });

  it('should parse white hex color', () => {
    const result = parseHexColor('#ffffff');
    expect(result.r).toBe(1);
    expect(result.g).toBe(1);
    expect(result.b).toBe(1);
  });

  it('should return white for 3-char string (too short)', () => {
    const result = parseHexColor('#ab');
    expect(result).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('should return white for empty string', () => {
    const result = parseHexColor('');
    expect(result).toEqual({ r: 1, g: 1, b: 1 });
  });

  it('should return white for 5-digit hex', () => {
    const result = parseHexColor('#12345');
    expect(result).toEqual({ r: 1, g: 1, b: 1 });
  });
});

describe('findClosestPointAndMaxDist', () => {
  it('should find closest point and max distance for normal case', () => {
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(3, 0, 0),
      new THREE.Vector3(0, 4, 0),
      new THREE.Vector3(0, 0, 5),
    ];
    const position = new THREE.Vector3(1, 0, 0);

    const result = findClosestPointAndMaxDist(points, position);

    expect(result.closestIdx).toBe(0);
    expect(result.maxDist).toBeCloseTo(Math.sqrt(26));
  });

  it('should handle single point', () => {
    const points = [new THREE.Vector3(1, 2, 3)];
    const position = new THREE.Vector3(0, 0, 0);

    const result = findClosestPointAndMaxDist(points, position);

    expect(result.closestIdx).toBe(0);
    expect(result.maxDist).toBeCloseTo(Math.sqrt(14));
  });

  it('should handle equidistant points', () => {
    const points = [
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ];
    const position = new THREE.Vector3(0, 0, 0);

    const result = findClosestPointAndMaxDist(points, position);

    expect(result.closestIdx).toBe(0);
    expect(result.maxDist).toBe(1);
  });

  it('should find closest point among multiple candidates', () => {
    const points = [
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(5, 0, 0),
    ];
    const position = new THREE.Vector3(0, 0, 0);

    const result = findClosestPointAndMaxDist(points, position);

    expect(result.closestIdx).toBe(1);
    expect(result.maxDist).toBe(10);
  });
});

describe('computeGradientColors', () => {
  it('should compute gradient colors for normal orbit points', () => {
    const points = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(3, 0, 0),
      new THREE.Vector3(4, 0, 0),
    ];
    const planetPos = new THREE.Vector3(0, 0, 0);
    const rgb = { r: 1, g: 1, b: 1 };
    const lineOpacity = 1;

    const colors = computeGradientColors(points, planetPos, rgb, lineOpacity);

    expect(colors.length).toBe(12);
    expect(colors[0]).toBeGreaterThanOrEqual(0);
    expect(colors[0]).toBeLessThanOrEqual(1);
  });

  it('should apply lineOpacity to all vertices', () => {
    const points = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(2, 0, 0),
    ];
    const planetPos = new THREE.Vector3(0, 0, 0);
    const rgb = { r: 1, g: 1, b: 1 };
    const lineOpacity = 0.5;

    const colors = computeGradientColors(points, planetPos, rgb, lineOpacity);

    for (let i = 0; i < colors.length; i++) {
      expect(colors[i]).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });

  it('should compute gradient for single point orbit', () => {
    const points = [new THREE.Vector3(5, 0, 0)];
    const planetPos = new THREE.Vector3(0, 0, 0);
    const rgb = { r: 0.5, g: 0.5, b: 0.5 };
    const lineOpacity = 1;

    const colors = computeGradientColors(points, planetPos, rgb, lineOpacity);

    expect(colors.length).toBe(3);
    expect(colors[0]).toBeGreaterThanOrEqual(0);
    expect(colors[0]).toBeLessThanOrEqual(1);
  });
});
