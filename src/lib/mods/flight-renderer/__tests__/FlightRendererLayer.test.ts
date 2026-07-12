import * as THREE from 'three';
import { eciToEarthScene, FlightRendererLayer } from '../index';
import type { FlightRenderSnapshot } from '@/lib/mods/space-flight/flight-runtime-store';

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

    layer.setEarthTransform(1, 2, 3, earthRotation);
    expect(layer.getGroup().quaternion.equals(earthRotation)).toBe(false);
    expect(layer.getGroup().quaternion.equals(new THREE.Quaternion())).toBe(true);

    layer.dispose();
  });
});

function makeSnapshot(overrides?: Partial<FlightRenderSnapshot>): FlightRenderSnapshot {
  return {
    active: true,
    ended: false,
    positionEci: [0, 0, 0],
    velocityEci: [0, 0, 0],
    thrustDirectionEci: [0, 1, 0],
    throttlePercent: 100,
    plumeActive: true,
    stageIndex: 0,
    missionTimeS: 0,
    absoluteTimeMs: 0,
    ...overrides,
  };
}

describe('FlightRendererLayer lifecycle', () => {
  it('starts with default state and accessors', () => {
    const layer = new FlightRendererLayer();
    expect(layer.getGroup().name).toBe('SpaceFlightRenderLayer');
    expect(layer.getTrajectoryPointCount()).toBe(0);
    expect(layer.isPlumeVisible()).toBe(false);
    expect(layer.getRocketObject()).toBeDefined();
    layer.dispose();
  });

  it('sync populates rocket and trajectory from a snapshot', () => {
    const layer = new FlightRendererLayer();
    layer.sync(makeSnapshot({ missionTimeS: 10 }));

    expect(layer.getTrajectoryPointCount()).toBe(1);
    layer.dispose();
  });

  it('sending null snapshot calls reset, clearing trajectory', () => {
    const layer = new FlightRendererLayer();
    layer.sync(makeSnapshot());
    expect(layer.getTrajectoryPointCount()).toBe(1);

    layer.sync(null);
    expect(layer.getTrajectoryPointCount()).toBe(0);
    expect(layer.isPlumeVisible()).toBe(false);
    layer.dispose();
  });

  it('sending inactive snapshot calls reset', () => {
    const layer = new FlightRendererLayer();
    layer.sync(makeSnapshot({ active: false }));
    expect(layer.getTrajectoryPointCount()).toBe(0);
    layer.dispose();
  });

  it('time rollback resets trajectory and starts fresh', () => {
    const layer = new FlightRendererLayer();
    layer.sync(makeSnapshot({ missionTimeS: 100 }));
    expect(layer.getTrajectoryPointCount()).toBe(1);

    layer.sync(makeSnapshot({ missionTimeS: 50 }));
    expect(layer.getTrajectoryPointCount()).toBe(1);
    layer.dispose();
  });

  it('setEarthTransform positions the group', () => {
    const layer = new FlightRendererLayer();
    layer.setEarthTransform(10, 20, 30);
    expect(layer.getGroup().position.x).toBe(10);
    expect(layer.getGroup().position.y).toBe(20);
    expect(layer.getGroup().position.z).toBe(30);
    layer.dispose();
  });

  it('dispose cleans up rocket and trajectory', () => {
    const layer = new FlightRendererLayer();
    const rocketObj = layer.getRocketObject();
    const disposeSpy = jest.spyOn(rocketObj, 'traverse' as any);

    layer.dispose();

    expect(layer.getTrajectoryPointCount()).toBe(0);
    disposeSpy.mockRestore();
  });
});
