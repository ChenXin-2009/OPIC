import * as THREE from 'three';
import { eciToEarthScene, FlightRendererLayer } from '../index';

const METERS_PER_AU = 149_597_870_700;

describe('FlightRendererLayer coordinate bridge', () => {
  it('maps ECI to the RenderWorld ecliptic frame', () => {
    const position = eciToEarthScene([0, 0, METERS_PER_AU]);

    expect(position.x).toBeCloseTo(0, 12);
    expect(position.y).toBeCloseTo(Math.sin(23.43928 * Math.PI / 180), 12);
    expect(position.z).toBeCloseTo(Math.cos(23.43928 * Math.PI / 180), 12);
  });

  it('does not inherit the textured Earth mesh rotation', () => {
    const layer = new FlightRendererLayer();
    const earthRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    // The fourth parameter used to be copied into the flight group.  A rotated
    // Earth texture must not move an inertial flight state.
    layer.setEarthTransform(1, 2, 3, earthRotation);
    expect(layer.getGroup().quaternion.equals(earthRotation)).toBe(false);
    expect(layer.getGroup().quaternion.equals(new THREE.Quaternion())).toBe(true);

    layer.dispose();
  });
});
