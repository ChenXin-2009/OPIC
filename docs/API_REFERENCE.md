# MOD API Reference

## Overview

OPIC MOD APIs provide controlled access to core system functionality. Each API is accessed through a dedicated interface within the MOD context. All APIs require appropriate permission declarations in the MOD manifest.

---

## Time API

Access simulation time, speed, and playback state.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentTime` | `Date` | Current simulation time |
| `isPlaying` | `boolean` | Whether animation is playing |
| `timeSpeed` | `number` | Time speed in days/second |
| `playDirection` | `'forward' \| 'backward'` | Time flow direction |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setCurrentTime` | `(date: Date) => void` | Sets simulation time |
| `togglePlayPause` | `() => void` | Toggles play/pause state |
| `setTimeSpeed` | `(speed: number) => void` | Sets time speed (clamped to valid range) |
| `setPlayDirection` | `(direction: 'forward' \| 'backward') => void` | Sets playback direction |
| `onTimeChange` | `(callback: (time: Date) => void) => () => void` | Subscribes to time changes; returns unsubscribe function |

### Permissions Required

- `time:read` — currentTime, isPlaying, timeSpeed, playDirection
- `time:write` — setCurrentTime, togglePlayPause, setTimeSpeed, setPlayDirection

### Example

```typescript
const time = context.time;
const now = time.currentTime;
time.setTimeSpeed(100); // 100x speed
time.togglePlayPause(); // Start playing
```

---

## Camera API

Control the 3D camera position, zoom, and planet focus.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `cameraDistance` | `number` | Camera distance from target in AU |
| `viewOffset` | `ViewOffset` | View offset `{ x, y }` in AU |
| `zoom` | `number` | Current zoom level (10–200) |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `setCameraDistance` | `(distance: number) => void` | Sets camera distance (min 0.1) |
| `setViewOffset` | `(offset: ViewOffset) => void` | Sets view offset |
| `setZoom` | `(zoom: number) => void` | Sets zoom level (clamped 10–200) |
| `centerOnPlanet` | `(name: string) => boolean` | Centers camera on named planet; returns true if found |
| `onCameraChange` | `(callback: (state: CameraState) => void) => () => void` | Subscribes to camera changes; returns unsubscribe function |

### Types

```typescript
interface ViewOffset { x: number; y: number }
interface CameraState {
  distance: number;
  offset: ViewOffset;
  zoom: number;
  focusedPlanet: string | null;
}
```

### Permissions Required

- `camera:read` — cameraDistance, viewOffset, zoom
- `camera:write` — setCameraDistance, setViewOffset, setZoom, centerOnPlanet

### Example

```typescript
const camera = context.camera;
camera.centerOnPlanet('Mars');
camera.setCameraDistance(2.5); // 2.5 AU
```

---

## Celestial API

Query celestial body positions, orbital elements, and coordinate conversion.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `ORBITAL_ELEMENTS` | `Record<string, OrbitalElementsData>` | Orbital elements catalog |
| `CELESTIAL_BODIES` | `Record<string, unknown>` | Celestial body metadata |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getCelestialBodies` | `() => CelestialBodyData[]` | Returns all celestial body data |
| `getOrbitalElements` | `(bodyName: string) => OrbitalElementsData \| null` | Gets orbital elements for a named body |
| `calculatePosition` | `(elements: OrbitalElementsData, jd: number) => { x, y, z, r }` | Computes position from orbital elements at Julian date |
| `dateToJulianDay` | `(date: Date) => number` | Converts Date to Julian Day |
| `julianDayToDate` | `(jd: number) => Date` | Converts Julian Day to Date |
| `onBodiesUpdate` | `(callback: (bodies: CelestialBodyData[]) => void) => () => void` | Subscribes to body data updates; returns unsubscribe function |

### Types

```typescript
interface CelestialBodyData {
  name: string;
  x: number; y: number; z: number;
  r: number;
  radius: number;
  color: string;
  isSun?: boolean;
  parent?: string;
  isSatellite?: boolean;
}

interface OrbitalElementsData {
  a: number;   // Semi-major axis (AU)
  e: number;   // Eccentricity
  i: number;   // Inclination (radians)
  L: number;   // Mean longitude (radians)
  w_bar: number; // Longitude of perihelion (radians)
  O: number;   // Longitude of ascending node (radians)
}
```

### Permissions Required

- `celestial:read` — All properties and methods

### Example

```typescript
const cel = context.celestial;
const bodies = cel.getCelestialBodies();
const jd = cel.dateToJulianDay(new Date());
const pos = cel.calculatePosition(
  cel.getOrbitalElements('Earth')!,
  jd
);
```

---

## Satellite API

Query and track Earth-orbiting satellites.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `satellites` | `SatelliteData[]` | All satellite data |
| `visibleSatellites` | `SatelliteData[]` | Satellites with position data |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `fetchSatellites` | `(source?: string) => Promise<void>` | Loads satellite data from external source |
| `selectSatellite` | `(noradId: number) => SatelliteData \| null` | Looks up satellite by NORAD ID |
| `calculateSatellitePosition` | `(noradId: number, time: Date) => { x, y, z } \| null` | Gets cached satellite position |
| `isLoading` | `() => boolean` | Returns whether satellite data is loading |
| `getError` | `() => Error \| null` | Returns last load error, if any |
| `onSatellitesUpdate` | `(callback: (satellites: SatelliteData[]) => void) => () => void` | Subscribes to satellite updates; returns unsubscribe function |

### Types

```typescript
interface SatelliteData {
  noradId: number;
  name: string;
  tle?: { line1: string; line2: string };
  position?: { x: number; y: number; z: number };
}
```

### Permissions Required

- `satellite:read` — All properties and methods

### Example

```typescript
const sat = context.satellite;
await sat.fetchSatellites();
const selected = sat.selectSatellite(25544); // ISS
```

---

## Render API

Register 3D renderers, Cesium layers, and render lifecycle hooks.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerRenderer` | `(id: string, factory: RendererFactory) => void` | Registers a 3D renderer; factory receives ModContext |
| `unregisterRenderer` | `(id: string) => void` | Unregisters and disposes a renderer |
| `getScene` | `() => unknown` | Returns the Three.js scene reference |
| `getCamera` | `() => unknown` | Returns the Three.js camera reference |
| `getRenderer` | `() => unknown` | Returns the Three.js WebGLRenderer reference |
| `registerCesiumLayer` | `(options: CesiumLayerOptions) => void` | Registers a Cesium imagery/terrain layer |
| `unregisterCesiumLayer` | `(id: string) => void` | Unregisters a Cesium layer |
| `onBeforeRender` | `(callback: () => void) => () => void` | Registers pre-render callback; returns unsubscribe |
| `onAfterRender` | `(callback: () => void) => () => void` | Registers post-render callback; returns unsubscribe |
| `getRendererIds` | `() => string[]` | Lists all registered renderer IDs |
| `getCesiumLayerIds` | `() => string[]` | Lists all registered Cesium layer IDs |

### Types

```typescript
type RendererFactory = (context: ModContext) => unknown;

interface CesiumLayerOptions {
  id: string;
  type: 'imagery' | 'terrain';
  url: string;
  options?: Record<string, unknown>;
}
```

### Permissions Required

- `render:write` — registerRenderer, unregisterRenderer
- `render:read` — getScene, getCamera, getRenderer, getRendererIds, getCesiumLayerIds

### Example

```typescript
const render = context.render;
render.registerRenderer('my-effect', (ctx) => {
  const geometry = new THREE.SphereGeometry(0.1, 16, 16);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
});
```

---

## API Version

The current MOD API version is `1.0.0`.

Accessible as `MOD_API_VERSION` from `@/lib/mod-manager/api`.

---

## Complete MOD Context

The full MOD runtime context (`ModContext`) provides access to all APIs:

```typescript
interface ModContext {
  // Identity
  id: string;
  manifest: ModManifest;

  // API Layer
  api: {
    time: TimeAPI;
    camera: CameraAPI;
    celestial: CelestialAPI;
    satellite: SatelliteAPI;
    render: RenderAPI;
  };

  // 权限检查
  hasPermission(permission: string): boolean;

  // 配置管理
  getConfig<T = Record<string, unknown>>(): T;
  updateConfig(updates: Record<string, unknown>): void;

  // 资源监控
  getResourceUsage(): {
    memoryMB: number;
    renderObjects: number;
    eventListeners: number;
    timers: number;
    apiCallsPerSecond: number;
  };

  // 状态管理（沙箱隔离）
  setState(key: string, value: unknown): void;
  getState(key: string): unknown;

  // 服务注册表
  registerService<T>(id: string, implementation: T): void;
  getService<T>(id: string): Promise<T | null>;

  // 事件系统
  subscribe(event: string, handler: Function): () => void;
  emit(event: string, ...args: unknown[]): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;

  // UI 扩展
  updateDockIconBadge(iconId: string, badge: number | string): void;
  openWindow(windowId: string): void;
  closeWindow(windowId: string): void;

  // 国际化
  getLanguage(): 'zh' | 'en';

  // 沙箱定时器（受配额限制）
  logger: Console;
  setTimeout(handler: TimerHandler, timeout?: number): number;
  setInterval(handler: TimerHandler, timeout?: number): number;
  clearTimeout(id: number): void;
  clearInterval(id: number): void;
}
```
