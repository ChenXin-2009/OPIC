/**
 * Type Definitions Index
 * 
 * This module exports all shared type definitions used throughout the application.
 * Types are organized by domain (celestial bodies, orbital mechanics, etc.).
 */

// Celestial body types
export type {
  CelestialBodyConfig,
  RotationConfig,
  AxialTiltConfig
} from './celestialTypes';

export {
  CELESTIAL_BODIES,
  equatorialToEcliptic,
  calculateRotationAxis
} from './celestialTypes';

// Satellite types
export type {
  TLEData,
  SatelliteState,
  OrbitalElements,
  SatelliteAPIResponse,
  APIError,
  ECIPosition,
  ECIVelocity,
  PropagationResult,
  RenderConfig,
  OrbitTrajectory,
  SatelliteConfig,
  WorkerMessage,
  WorkerResponse
} from './satellite';

export {
  OrbitType,
  SatelliteCategory
} from './satellite';
