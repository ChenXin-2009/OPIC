# Architecture Overview

## System Architecture

OPIC is a dual-engine 3D universe visualizer with a plugin (MOD) architecture.

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                       │
├─────────────────────────────────────────────────────┤
│  Components (React)        │  Pages / API Routes    │
│  ┌──────────────────────┐  │  ┌──────────────────┐  │
│  │ Dock / Window Mgr    │  │  │ page.tsx         │  │
│  │ Canvas3D / Cesium    │  │  │ api/satellites/* │  │
│  │ Search / Settings    │  │  │ api/traffic      │  │
│  └──────────┬───────────┘  │  └──────────────────┘  │
├─────────────┼───────────────────────────────────────┤
│             ▼                                        │
│  lib/ (Pure Business Logic, no React)                │
│  ┌──────────────────────────────────────────────┐   │
│  │ 3D Engine (Three.js)     │ Cesium Integration│   │
│  │ ┌──────────────────┐    │ ┌───────────────┐ │   │
│  │ │ CameraController │    │ │ Synchronizer  │ │   │
│  │ │ Planet / Scene   │    │ │ Layer Manager │ │   │
│  │ │ Player / Utils   │    │ │ Config        │ │   │
│  │ └──────────────────┘    │ └───────────────┘ │   │
│  ├──────────────────────────┼───────────────────┤   │
│  │ Astronomy (Orbit/Time)  │ MOD System        │   │
│  │ Data Loading            │ Search Engine     │   │
│  │ Exoplanets              │ i18n              │   │
│  │ State (Zustand)         │ Config            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Rendering Pipeline

Two renderers coexist and are selected based on camera distance:

| Distance | Engine | Purpose |
|----------|--------|---------|
| < 0.1 AU | **Cesium** | Earth terrain, imagery, satellites |
| ≥ 0.1 AU | **Three.js** | Solar system, stars, galaxies |

### Transition Logic

- Camera distance < 0.1 AU → Cesium mode (earth detail)
- Camera distance ≥ 0.1 AU → Three.js mode (space)
- Smooth fade between modes via skybox opacity

## MOD Plugin System

```
┌──────────────────────────────────────────────────┐
│                 MOD Manager                       │
├──────────────────────────────────────────────────┤
│ Registry          │ Event Bus    │ Lifecycle     │
│ DependencyResolver│ Sandbox      │ Permission    │
│ ServiceRegistry   │ Config       │ Store         │
├──────────────────────────────────────────────────┤
│ API Layer (Time / Camera / Celestial / Render /  │
│           Satellite)                              │
└──────────────────────────────────────────────────┘
```

### MOD Lifecycle

1. **Load** — manifest verification, dependency resolution
2. **Enable** — API allocation, UI registration
3. **Runtime** — normal operation
4. **Disable** — cleanup, unregister UI
5. **Unload** — full teardown

## Data Flow

```
External APIs (Celestrak, NASA, OpenSky)
        │
        ▼
Server Routes (src/app/api/)
        │
        ▼
Data Loaders (src/lib/data/)
        │
        ▼
State Stores (src/lib/state/)
        │
        ▼
React Components (src/components/)
        │
        ▼
Three.js / Cesium Renderers
```

## Key Design Decisions

1. **Strict Layer Separation**: `lib/` never imports React. `components/` handles all UI.
2. **MOD System**: All optional features are plugins. Core is minimal.
3. **State Management**: Zustand stores with TypeScript for type safety.
4. **Path Alias**: `@/` maps to `src/` for clean imports.
5. **Dual Engine**: Cesium for Earth detail, Three.js for space scale.
