export interface OrbitalElements {
  name: string;
  a: number;
  e: number;
  i: number;
  L: number;
  w_bar: number;
  O: number;
  a_dot: number;
  e_dot: number;
  i_dot: number;
  L_dot: number;
  w_bar_dot: number;
  O_dot: number;
  radius: number;
  color: string;
}

export interface CelestialBody {
  name: string;
  x: number;
  y: number;
  z: number;
  r: number;
  radius: number;
  color: string;
  isSun?: boolean;
  parent?: string;
  isSatellite?: boolean;
  elements?: OrbitalElements;
  usingEphemeris?: boolean;
}

export interface PositionCache {
  jd: number;
  bodies: CelestialBody[];
  timestamp: number;
}
