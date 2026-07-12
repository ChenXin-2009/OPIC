import * as THREE from 'three';
import { ecefToEarthScene, eciToEarthScene, earthSceneMetersToWorldError } from '../index';

const METERS_PER_AU = 149_597_870_700;

describe('flight-renderer coordinate transforms', () => {
  it('ecefToEarthScene maps ECEF position to RenderWorld space', () => {
    const result = ecefToEarthScene([METERS_PER_AU, 0, 0]);
    expect(result.x).toBeCloseTo(1, 12);
    expect(result.y).toBeCloseTo(0, 12);
    expect(result.z).toBeCloseTo(0, 12);
  });

  it('ecefToEarthScene swaps Y and Z axes', () => {
    const result = ecefToEarthScene([0, METERS_PER_AU, 0]);
    expect(result.x).toBeCloseTo(0, 12);
    expect(result.y).toBeCloseTo(0, 12);
    expect(result.z).toBeCloseTo(-1, 12);
  });

  it('eciToEarthScene maps ECI J2000 equatorial to ecliptic RenderWorld', () => {
    const result = eciToEarthScene([0, 0, METERS_PER_AU]);
    const obliquity = 23.43928 * Math.PI / 180;
    expect(result.x).toBeCloseTo(0, 12);
    expect(result.y).toBeCloseTo(Math.sin(obliquity), 12);
    expect(result.z).toBeCloseTo(Math.cos(obliquity), 12);
  });

  it('earthSceneMetersToWorldError converts scene distance back to meters', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(1 / METERS_PER_AU, 0, 0);
    const error = earthSceneMetersToWorldError(a, b);
    expect(error).toBeCloseTo(1, 6);
  });
});
