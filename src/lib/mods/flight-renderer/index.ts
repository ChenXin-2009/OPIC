import * as THREE from 'three';
import type { FlightRenderSnapshot } from '@/lib/mods/space-flight/flight-runtime-store';
import { icrfToRenderWorld } from '@/lib/coordinates/frames/ecliptic';
import { Vector3 as AstronomyVector3 } from '@/lib/astronomy/ephemeris/types';
import { cameraDistanceToRocketScale, RocketRenderer } from './RocketRenderer';
import { TrajectoryRenderer } from './TrajectoryRenderer';
import { PlumeRenderer } from './PlumeRenderer';

const METERS_PER_AU = 149_597_870_700;

export { eciDirectionToEcef, eciToEcef } from '@/lib/mods/space-flight/flight-coordinate-transform';

export function ecefToEarthScene(positionEcefMeters: readonly [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(
    positionEcefMeters[0] / METERS_PER_AU,
    positionEcefMeters[2] / METERS_PER_AU,
    -positionEcefMeters[1] / METERS_PER_AU,
  );
}

/**
 * Flight dynamics produces an Earth-centred inertial (J2000 equatorial) state.
 * RenderWorld is J2000 ecliptic in AU, so this is deliberately independent of
 * the textured Earth mesh's spin. Applying the mesh quaternion here would
 * rotate an already-inertial location a second time and moves the launch pad
 * thousands of kilometres away from its Cesium counterpart.
 */
export function eciToEarthScene(positionEciMeters: readonly [number, number, number]): THREE.Vector3 {
  const renderWorld = icrfToRenderWorld(new AstronomyVector3(
    positionEciMeters[0] / METERS_PER_AU,
    positionEciMeters[1] / METERS_PER_AU,
    positionEciMeters[2] / METERS_PER_AU,
  ));
  return new THREE.Vector3(renderWorld.x, renderWorld.y, renderWorld.z);
}

export function earthSceneMetersToWorldError(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b) * METERS_PER_AU;
}

export class FlightRendererLayer {
  private readonly group: THREE.Group;
  private readonly rocket: RocketRenderer;
  private readonly trajectory: TrajectoryRenderer;
  private lastMissionTimeS: number | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SpaceFlightRenderLayer';
    this.group.renderOrder = 15;

    this.rocket = new RocketRenderer();
    this.trajectory = new TrajectoryRenderer();

    this.group.add(this.trajectory.getObject());
    this.group.add(this.rocket.getObject());
  }

  getGroup(): THREE.Group {
    return this.group;
  }

  getRocketObject(): THREE.Object3D {
    return this.rocket.getObject();
  }

  getTrajectoryPointCount(): number {
    return this.trajectory.getPointCount();
  }

  isPlumeVisible(): boolean {
    return this.rocket.getPlumeVisible();
  }

  setEarthTransform(x: number, y: number, z: number, _earthMeshQuaternion?: THREE.Quaternion): void {
    this.group.position.set(x, y, z);
    // Flight positions are absolute vectors in the RenderWorld inertial frame,
    // not vertices in the Earth texture's rotating local frame.
    this.group.quaternion.identity();
  }

  sync(snapshot: FlightRenderSnapshot | null, camera?: THREE.Camera): void {
    if (!snapshot || !snapshot.active) {
      this.reset();
      return;
    }

    if (this.lastMissionTimeS !== null && snapshot.missionTimeS < this.lastMissionTimeS) {
      this.trajectory.reset();
    }
    this.lastMissionTimeS = snapshot.missionTimeS;

    const position = eciToEarthScene(snapshot.positionEci);
    const thrustDirection = eciToEarthScene(snapshot.thrustDirectionEci).normalize();

    const worldPosition = this.group.localToWorld(position.clone());
    const distanceAU = camera ? camera.position.distanceTo(worldPosition) : 0;
    this.rocket.setState(
      position,
      thrustDirection,
      snapshot.plumeActive,
      snapshot.throttlePercent,
      cameraDistanceToRocketScale(distanceAU),
    );
    this.trajectory.appendPoint(position);
  }

  reset(): void {
    this.lastMissionTimeS = null;
    this.rocket.hide();
    this.trajectory.reset();
  }

  dispose(): void {
    this.rocket.dispose();
    this.trajectory.dispose();
  }
}

export { RocketRenderer, TrajectoryRenderer, PlumeRenderer };
