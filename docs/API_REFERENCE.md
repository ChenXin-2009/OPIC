# MOD API Reference

> **Note:** Parts of this document were affected by an encoding issue in the original source. Content has been recovered to the best extent possible.

## Overview

OPIC MOD APIs provide controlled access to core system functionality. Each API is accessed through a dedicated interface within the MOD context.

## Time API

Access simulation time, speed, and pause state.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getCurrentTime` | `() => Date` | Returns current simulation time |
| `setTime` | `(date: Date) => void` | Sets simulation time |
| `getTimeScale` | `() => number` | Returns time speed multiplier |
| `setTimeScale` | `(scale: number) => void` | Sets time speed (1 = real-time) |
| `isPaused` | `() => boolean` | Checks if simulation is paused |
| `setPaused` | `(paused: boolean) => void` | Pauses/resumes simulation |

### Permissions Required

- `time:read` — getCurrentTime, getTimeScale, isPaused
- `time:write` — setTime, setTimeScale, setPaused

### Example

```typescript
const time = context.time;
const now = time.getCurrentTime();
time.setTimeScale(100); // 100x speed
```

---

## Camera API

Control the 3D camera position, target, and behavior.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPosition` | `() => THREE.Vector3` | Returns camera position in AU |
| `setPosition` | `(pos: THREE.Vector3) => void` | Sets camera position |
| `getTarget` | `() => THREE.Vector3` | Returns camera look-at target |
| `setTarget` | `(target: THREE.Vector3) => void` | Sets camera look-at target |
| `getDistance` | `() => number` | Returns distance from target in AU |
| `setDistance` | `(dist: number) => void` | Sets distance from target |
| `flyTo` | `(target: THREE.Vector3, distance?: number) => Promise<void>` | Smoothly animates camera to target |
| `isEarthLocked` | `() => boolean` | Returns whether camera is locked to Earth |
| `setEarthLocked` | `(locked: boolean) => void` | Locks/unlocks camera to Earth |

### Permissions Required

- `camera:read` — getPosition, getTarget, getDistance, isEarthLocked
- `camera:write` — setPosition, setTarget, setDistance, flyTo, setEarthLocked

### Example

```typescript
const camera = context.camera;
await camera.flyTo(new THREE.Vector3(2, 0, 0), 1.5);
```

---

## Celestial API

Query celestial body positions, orbits, and properties.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getBodyPosition` | `(id: string, time: Date) => THREE.Vector3` | Returns body position at given time |
| `getBodyOrbit` | `(id: string) => OrbitalElements` | Returns orbital elements for body |
| `getBodies` | `() => string[]` | Returns list of known celestial body IDs |
| `searchBodies` | `(query: string) => SearchResult[]` | Searches celestial bodies by name |
| `getBodyInfo` | `(id: string) => CelestialBodyInfo` | Returns detailed body information |

### Permissions Required

- `celestial:read` — all methods

### Example

```typescript
const celestial = context.celestial;
const earthPos = celestial.getBodyPosition('earth', new Date());
const bodies = celestial.searchBodies('mar');
```

---

## Render API

Register 3D objects, overlays, and manage render layers.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerObject` | `(obj: THREE.Object3D) => string` | Registers a 3D object for rendering |
| `unregisterObject` | `(id: string) => void` | Removes a registered 3D object |
| `registerCesiumLayer` | `(layer: LayerConfig) => void` | Registers a Cesium imagery layer |
| `unregisterCesiumLayer` | `(id: string) => void` | Removes a Cesium layer |
| `getObjectById` | `(id: string) => THREE.Object3D \| undefined` | Retrieves a registered object |
| `createLabel` | `(text: string, pos: THREE.Vector3) => string` | Creates a 3D text label |

### Permissions Required

- `render:read` — getObjectById
- `render:write` — registerObject, unregisterObject, createLabel
- `render:cesium` — registerCesiumLayer, unregisterCesiumLayer

### Example

```typescript
const render = context.render;
const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
const id = render.registerObject(sphere);
```

---

## Satellite API

Track Earth satellites with real-time position data.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSatellitePosition` | `(noradId: number, time: Date) => SatellitePosition` | Returns satellite position at time |
| `getSatellites` | `() => SatelliteInfo[]` | Returns list of tracked satellites |
| `searchSatellites` | `(query: string) => SatelliteInfo[]` | Searches satellites by name/NORAD ID |
| `getSatelliteInfo` | `(noradId: number) => SatelliteInfo` | Returns detailed satellite info |
| `getGroundTrack` | `(noradId: number) => GroundTrackPoint[]` | Returns ground track for satellite |
| `getPasses` | `(noradId: number, lat: number, lng: number) => PassPrediction[]` | Returns pass predictions |

### Permissions Required

- `satellite:read` — all methods

### Example

```typescript
const satellite = context.satellite;
const iss = satellite.getSatelliteInfo(25544); // ISS
const pos = satellite.getSatellitePosition(25544, new Date());
```
