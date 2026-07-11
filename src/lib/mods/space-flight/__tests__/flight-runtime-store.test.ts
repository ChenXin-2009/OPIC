import {
  clearFlightRenderSnapshot,
  getInterpolatedFlightRenderSnapshot,
  setFlightRenderSnapshot,
  type FlightRenderSnapshot,
} from '../flight-runtime-store';

function snapshot(positionX: number, missionTimeS: number): FlightRenderSnapshot {
  return {
    active: true,
    ended: false,
    positionEci: [positionX, 0, 0],
    velocityEci: [1, 0, 0],
    thrustDirectionEci: [0, 1, 0],
    throttlePercent: 100,
    plumeActive: true,
    stageIndex: 0,
    missionTimeS,
    absoluteTimeMs: missionTimeS * 1000,
  };
}

describe('flight runtime interpolation', () => {
  afterEach(() => clearFlightRenderSnapshot());

  it('interpolates adjacent physics snapshots for frame-rate rendering', () => {
    setFlightRenderSnapshot(snapshot(0, 0));
    setFlightRenderSnapshot(snapshot(10, 1));

    const rendered = getInterpolatedFlightRenderSnapshot(Date.now() + 50);
    expect(rendered?.positionEci[0]).toBeCloseTo(5, 5);
    expect(rendered?.missionTimeS).toBeCloseTo(0.5, 5);
  });

  it('does not interpolate across a new mission', () => {
    setFlightRenderSnapshot(snapshot(100, 10));
    setFlightRenderSnapshot(snapshot(0, 0));

    expect(getInterpolatedFlightRenderSnapshot(Date.now() + 50)?.positionEci[0]).toBe(0);
  });
});
