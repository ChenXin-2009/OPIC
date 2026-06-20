# 3D Rendering

## Overview

3D rendering subsystem built on Three.js, providing the multi-scale universe visualization from planetary surfaces to galaxy clusters.

## Architecture

```
SceneManager ─── Scene ─── Renderers (WebGL + CSS2D)
     │
     ├── CameraController ─── PerspectiveCamera
     │       └── CameraAnimator (smooth transitions)
     │
     ├── Planets ─── Planet instances (each with mesh, marker, label)
     │       └── OrbitCurve (line + optional filled disc)
     │
     ├── SatelliteLayer ─── SatelliteRenderer (TLE-based)
     │       └── SatelliteOrbit
     │
     ├── ExoplanetRenderer ─── ExoplanetSystemRenderer
     │
     ├── GalaxyRenderer ─── particle systems
     ├── LaniakeaSuperclusterRenderer ─── particle systems
     ├── LocalGroupRenderer
     ├── NearbyGroupsRenderer
     ├── VirgoSuperclusterRenderer
     │
     ├── CesiumMappedPlanet ─── EarthPlanet (Cesium overlay)
     │       └── SceneModeManager (3D ↔ Cesium mode switch)
     │
     ├── TextureManager
     ├── LODManager (distance-based level of detail)
     ├── FocusManager (camera target tracking)
     └── MemoryManager (GPU resource cleanup)
```

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `camera/` | CameraController, CameraAnimator, transition helpers |
| `planet/` | Planet rendering (mesh, shaders, lens flare, glow, rings) |
| `player/` | Gamepad/controller input support |
| `scene-manager/` | SceneManager, SkyboxManager |
| `orbit-curve/` | OrbitCurve sub-modules: generator, color, disc, gradient line |
| `utils/` | Mesh helpers, coordinate conversion, geometry utilities |

## Core Classes

| Class | File | Purpose |
|-------|------|---------|
| `SceneManager` | `SceneManager.ts` | Scene lifecycle, renderer management, resize handling, mode switching |
| `CameraController` | `CameraController.ts` | Camera movement, focus, transitions, Earth lock |
| `Planet` | `Planet.ts` | Single planet rendering: mesh, atmosphere, marker, label, rings |
| `OrbitCurve` | `OrbitCurve.ts` | Orbital path visualization with LOD and gradient coloring |
| `SatelliteLayer` | `SatelliteLayer.ts` | Satellite group: visibility filter, orbit display, hover |
| `SatelliteRenderer` | `SatelliteRenderer.ts` | Per-satellite dot rendering, raycasting for picking |
| `ExoplanetRenderer` | `ExoplanetRenderer.ts` | Exoplanet system rendering, picking, system focusing |
| `LODManager` | `LODManager.ts` | Distance-based LOD for planets, orbits, labels |
| `FocusManager` | `FocusManager.ts` | Camera focus target tracking and updates |
| `TextureManager` | `TextureManager.ts` | Texture loading, caching, disposal |
| `MemoryManager` | `MemoryManager.ts` | GPU memory tracking and cleanup |

## Render Pipeline

```
Each frame (requestAnimationFrame):
┌─────────────────────────────────────────────┐
│1. LODManager.update(cameraPosition)          │
│   ├── Planet LOD (mesh detail)               │
│   └── OrbitCurve resolution                  │
├─────────────────────────────────────────────┤
│2. SatelliteLayer.update(time)                │
│   ├── TLE propagation                        │
│   └── Visibility filter                      │
├─────────────────────────────────────────────┤
│3. ExoplanetRenderer.update(camera)           │
│   └── Screen-space marker positions          │
├─────────────────────────────────────────────┤
│4. LabelManager.update()                      │
│   └── Billboard labels (CSS2DRenderer)       │
├─────────────────────────────────────────────┤
│5. FocusManager.update()                      │
│   └── Camera tracking / following            │
├─────────────────────────────────────────────┤
│6. SceneManager.render()                      │
│   ├── WebGLRenderer.render(scene, camera)    │
│   └── CSS2DRenderer.render(scene, camera)    │
└─────────────────────────────────────────────┘
```

## Scene Modes

| Mode | Description |
|------|-------------|
| `3d` | Pure Three.js rendering (solar system, galaxies, exoplanets) |
| `cesium` | Cesium globe overlay for Earth, Moon, Mars with 3D Tiles |
| `locked` | Earth-locked mode: Cesium globe with satellite overlays |

## Related Files

- `index.ts` — Barrel re-exports all public classes from submodules
- `SceneModeIntegration.example.ts` — Example: integrating Cesium with the 3D scene
