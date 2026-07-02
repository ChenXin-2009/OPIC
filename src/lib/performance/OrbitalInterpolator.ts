import { Vector3 } from 'three';

export interface OrbitalInterpolationState {
  noradId: number;
  startPosition: Vector3;
  startVelocity: Vector3;
  endPosition: Vector3;
  endVelocity: Vector3;
  startTime: number;
  endTime: number;
}

export class OrbitalInterpolator {
  private states: Map<number, OrbitalInterpolationState>;

  private scratchV = new Vector3();
  private scratchV2 = new Vector3();
  private scratchV3 = new Vector3();

  private scratchPositions = new Map<number, Vector3>();

  constructor() {
    this.states = new Map();
  }

  setTarget(
    noradId: number,
    newPosition: Vector3,
    _newVelocity: Vector3,
    timestamp: number
  ): void {
    const existingState = this.states.get(noradId);
    const currentTime = Date.now();

    if (existingState) {
      const currentPosition = this.getInterpolatedPosition(noradId, currentTime);

      const newState: OrbitalInterpolationState = {
        noradId,
        startPosition: currentPosition.clone(),
        startVelocity: new Vector3(),
        endPosition: newPosition.clone(),
        endVelocity: new Vector3(),
        startTime: currentTime,
        endTime: timestamp,
      };

      this.states.set(noradId, newState);
    } else {
      const newState: OrbitalInterpolationState = {
        noradId,
        startPosition: newPosition.clone(),
        startVelocity: new Vector3(),
        endPosition: newPosition.clone(),
        endVelocity: new Vector3(),
        startTime: currentTime,
        endTime: timestamp,
      };

      this.states.set(noradId, newState);
    }
  }

  getInterpolatedPosition(noradId: number, currentTime: number): Vector3 {
    const state = this.states.get(noradId);
    if (!state) return new Vector3(0, 0, 0);
    return this.endPositionOrSlerp(state, currentTime).clone();
  }

  private slerpTo(start: Vector3, end: Vector3, t: number, out: Vector3): void {
    if (t <= 0) { out.copy(start); return; }
    if (t >= 1) { out.copy(end); return; }

    const startLen = start.length();
    const endLen = end.length();

    if (startLen === 0 || endLen === 0) {
      out.set(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
      return;
    }

    this.scratchV.copy(start).normalize();
    this.scratchV2.copy(end).normalize();

    let dot = this.scratchV.dot(this.scratchV2);
    dot = Math.max(-1, Math.min(1, dot));

    const theta = Math.acos(dot);

    if (Math.abs(theta) < 0.001) {
      out.set(
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
        start.z + (end.z - start.z) * t
      );
      return;
    }

    const sinTheta = Math.sin(theta);
    const w1 = Math.sin((1 - t) * theta) / sinTheta;
    const w2 = Math.sin(t * theta) / sinTheta;

    out.set(
      this.scratchV.x * w1 + this.scratchV2.x * w2,
      this.scratchV.y * w1 + this.scratchV2.y * w2,
      this.scratchV.z * w1 + this.scratchV2.z * w2
    );

    const radius = startLen + (endLen - startLen) * t;
    out.multiplyScalar(radius);
  }

  private endPositionOrSlerp(state: OrbitalInterpolationState, currentTime: number): Vector3 {
    const duration = state.endTime - state.startTime;

    if (duration <= 0) return state.endPosition;

    const elapsed = currentTime - state.startTime;
    let progress = elapsed / duration;
    progress = Math.max(0, Math.min(1, progress));

    this.slerpTo(state.startPosition, state.endPosition, progress, this.scratchV3);
    return this.scratchV3;
  }

  private getInterpolatedPositionTo(noradId: number, currentTime: number, out: Vector3): void {
    const state = this.states.get(noradId);
    if (!state) {
      out.set(0, 0, 0);
      return;
    }
    out.copy(this.endPositionOrSlerp(state, currentTime));
  }

  getInterpolatedPositions(currentTime: number): Map<number, Vector3> {
    this.states.forEach((state, noradId) => {
      let pos = this.scratchPositions.get(noradId);
      if (!pos) {
        pos = new Vector3();
        this.scratchPositions.set(noradId, pos);
      }
      this.getInterpolatedPositionTo(noradId, currentTime, pos);
    });

    if (this.scratchPositions.size !== this.states.size) {
      for (const id of this.scratchPositions.keys()) {
        if (!this.states.has(id)) {
          this.scratchPositions.delete(id);
        }
      }
    }
    return this.scratchPositions;
  }

  clear(noradId: number): void {
    this.states.delete(noradId);
    this.scratchPositions.delete(noradId);
  }

  clearAll(): void {
    this.states.clear();
    this.scratchPositions.clear();
  }

  getStateCount(): number {
    return this.states.size;
  }
}
