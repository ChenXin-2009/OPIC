# Cesium Integration

## Overview

CesiumJS integration layer providing high-fidelity 3D globe rendering for Earth (and lunar/Martian surfaces). Bridges the Three.js scene graph with Cesium's geospatial coordinate system.

## Key Classes

| Class | File | Purpose |
|-------|------|---------|
| `CesiumAdapter` | `CesiumAdapter.ts` | Core adapter — creates Cesium viewer, manages scene mode transitions, synchronizes with Three.js |
| `CesiumEarthExtension` | `CesiumEarthExtension.ts` | Earth-specific extension: atmosphere, cloud layer, imagery blending |
| `CesiumTerrainManager` | `CesiumTerrainManager.ts` | Terrain loading, streaming, and LOD configuration |
| `CameraSynchronizer` | `CameraSynchronizer.ts` | Two-way camera sync between Three.js and Cesium viewports |
| `CoordinateTransformer` | `CoordinateTransformer.ts` | ICRF ↔ WGS84 ↔ geodetic coordinate conversions |

## Type Definitions

| File | Purpose |
|------|---------|
| `CesiumAdapterTypes.ts` | Shared types: view mode, sync state, imagery layer config |
| `config.ts` | Runtime configuration interface |
| `defaultConfig.ts` | Default values for all configurable parameters |
| `imageryProviders.ts` | Built-in imagery provider presets (Bing, OSM, ESRI, Sentinel) |

## Initialization Flow

```
CesiumAdapter
├── 1. Create CesiumWidget (or Viewer) in a DOM container
├── 2. Configure terrain (CesiumTerrainManager)
├── 3. Add base imagery layer (configurable provider)
├── 4. Apply extensions (CesiumEarthExtension)
├── 5. Link camera (CameraSynchronizer)
└── 6. Start render loop integration with Three.js
```

## Scene Mode Mapping

| Mode | Cesium State |
|------|-------------|
| `cesium` | Full Cesium globe with terrain, imagery, 3D Tiles |
| `3d` | Cesium hidden, pure Three.js rendering |
| `locked` | Cesium globe with satellite/spacecraft tracking overlays |

## Coordinate Conventions

| System | Description |
|--------|-------------|
| ICRF | International Celestial Reference Frame (Three.js scene) |
| WGS84 | World Geodetic System 1984 (Cesium) |
| Cartographic | Longitude/Latitude/Height (degrees + meters) |
| Cartesian3 | Cesium's internal ECEF coordinates |
