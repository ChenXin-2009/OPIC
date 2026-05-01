# Observable Universe Visualization

## Overview

This document describes the architecture and implementation of the observable universe visualization feature, which extends the solar system visualization from the galaxy scale to the observable universe scale.

<div align="center">
  <img src="images/earth-to-universe-zoom.gif" alt="从地球到宇宙的缩放演示" width="700">
  <p><em>多尺度宇宙可视化：从地球表面到可观测宇宙边缘</em></p>
</div>

## Architecture

### Renderer Architecture

The system uses a modular renderer architecture where each universe scale has its own dedicated renderer class:

```
SceneManager
├── LocalGroupRenderer - 本星系群 (80 galaxies)
├── NearbyGroupsRenderer - 近邻星系群 (8 groups, ~150 galaxies)
├── VirgoSuperclusterRenderer - 室女座超星系团 (30 clusters, ~600 galaxies)
├── LaniakeaSuperclusterRenderer - 拉尼亚凯亚超星系团 (15 superclusters, ~200 galaxies)
├── NearbySuperclusterRenderer - 近邻超星系团 (20 superclusters, ~200 galaxies)
└── ObservableUniverseRenderer - 可观测宇宙 (cosmic web structures)
```

All renderers implement the `UniverseScaleRenderer` interface:

```typescript
interface UniverseScaleRenderer {
  getGroup(): THREE.Group;
  update(cameraDistance: number, deltaTime: number): void;
  getOpacity(): number;
  getIsVisible(): boolean;
  dispose(): void;
  setBrightness?(brightness: number): void;
  getObjectData?(): any[];
}
```

### Coordinate System

All data uses the **Supergalactic Coordinate System** as the primary reference frame:

- **Origin**: Virgo Supercluster plane
- **Advantages**: Best suited for visualizing local universe structures
- **Conversion**: J2000.0 Equatorial → Galactic → Supergalactic

The `CoordinateConverter` utility class handles all coordinate transformations.

### Data Strategy

The system uses a hybrid approach combining real astronomical data with procedural enhancement:

**Real Data Sources:**
- Local Group: McConnachie (2012) catalog (~80 galaxies)
- Nearby Groups: Karachentsev et al. (2013) catalog (~150 galaxies)
- Virgo Supercluster: 2MRS survey data (~600 representative galaxies)
- Laniakea Supercluster: Cosmicflows-3 dataset (~200 representative galaxies)

**Procedural Enhancement:**
- Uses NFW (Navarro-Frenk-White) distribution to generate additional galaxies
- Maintains scientific accuracy while improving visual density
- Enhancement factors: 3x for nearby groups, 5x for Virgo

**Data Format:**
- Binary Float32Array format for efficiency
- Gzip compression (target: ~30KB total)
- Lazy loading based on camera distance

## Performance Optimization

### 1. LOD (Level of Detail) System

The `LODManager` dynamically adjusts rendering quality based on camera distance:

```typescript
LOD Levels:
- Level 0: distance=0, particleRatio=1.0, textureSize=512
- Level 1: distance=100M LY, particleRatio=0.5, textureSize=256
- Level 2: distance=500M LY, particleRatio=0.2, textureSize=128
- Level 3: distance=1B LY, particleRatio=0.05, textureSize=64
```

### 2. Particle System

The `OptimizedParticleSystem` uses custom shaders for efficient rendering:

- **Vertex Shader**: Distance-based size attenuation
- **Fragment Shader**: Circular points with glow effect
- **Blending**: Additive blending for realistic appearance
- **Culling**: Frustum culling enabled

### 3. Instanced Rendering

For the Local Group (detailed galaxies), `InstancedGalaxyRenderer` uses THREE.InstancedMesh to reduce draw calls.

### 4. Memory Management

The `MemoryManager` tracks and controls memory usage:

- Maximum memory budget: 2GB
- Automatic release of distant scale data
- Preloading of adjacent scales

### 5. Web Workers

The `ProceduralGenerator` uses Web Workers for galaxy generation to avoid blocking the main thread.

## Scale Transition System

Smooth transitions between scales are controlled by distance thresholds:

```typescript
Scale Thresholds (in light years):
- Local Group: 150k (fade) → 200k (show) → 500k (full)
- Nearby Groups: 800k (fade) → 1M (show) → 3M (full)
- Virgo: 4M (fade) → 5M (show) → 15M (full)
- Laniakea: 40M (fade) → 50M (show) → 150M (full)
- Nearby Superclusters: 120M (fade) → 150M (show) → 400M (full)
- Observable Universe: 400M (fade) → 500M (show) → 1.5B (full)
```

Opacity is calculated using smooth interpolation (smoothstep or linear) to ensure seamless visual transitions.

## Implementation Details

### LocalGroupRenderer

- **Rendering**: Individual meshes for each galaxy
- **Types**: Spiral, Elliptical, Irregular, Dwarf
- **Textures**: Optional WebP textures for enhanced visuals
- **Interaction**: Click to view galaxy details

### NearbyGroupsRenderer

- **Rendering**: Particle system
- **Enhancement**: 3x procedural generation
- **Groups**: 8 major galaxy groups (Sculptor, Centaurus A, M81, M83, etc.)

### VirgoSuperclusterRenderer

- **Rendering**: Particle system with density field
- **Enhancement**: 5x procedural generation
- **Clusters**: 30 major clusters (Virgo, Coma, Leo, etc.)

### LaniakeaSuperclusterRenderer

- **Rendering**: Particle system with LOD
- **Features**: Optional velocity flow visualization
- **Superclusters**: 15 major superclusters

### NearbySuperclusterRenderer

- **Rendering**: Particle system with density field
- **Mass Scaling**: Visual size based on member count and richness

### ObservableUniverseRenderer

- **Filaments**: Catmull-Rom curves between anchor points
- **Voids**: Low-density regions rendered as dark spheres
- **Walls**: Large-scale structures (Sloan Great Wall, etc.)
- **Boundary**: Observable universe boundary at 46.5 billion light years

## Usage Example

```typescript
import { LocalGroupRenderer } from './lib/3d/LocalGroupRenderer';
import { UniverseDataLoader } from './lib/data/UniverseDataLoader';

// Load data
const loader = UniverseDataLoader.getInstance();
const galaxies = await loader.loadLocalGroupData();

// Create renderer
const renderer = new LocalGroupRenderer();
await renderer.loadData(galaxies);

// Add to scene
sceneManager.setLocalGroupRenderer(renderer);

// Update in animation loop
renderer.update(cameraDistance, deltaTime);
```

## Configuration

All configuration is centralized in `src/lib/config/universeScaleConfig.ts`:

```typescript
export const LOCAL_GROUP_CONFIG = {
  enabled: true,
  galaxyCount: 80,
  baseGalaxySize: 0.01 * MEGAPARSEC_TO_AU,
  brightnessScale: 2.0,
  useTextures: true,
  // ...
};
```

## Testing

### Unit Tests

- Coordinate conversion accuracy (< 1% error)
- Data loader caching and concurrency
- Renderer initialization and cleanup

### Performance Tests

- Target: 60 FPS for galaxy scale
- Target: 30+ FPS for universe scale
- Memory usage: < 2GB

### Visual Tests

- Smooth fade transitions
- Spatial alignment across scales
- LOD switching smoothness

## Future Enhancements

1. **Interactive Features**
   - Click on galaxies to view details
   - Search and navigation to specific objects
   - Bookmarking interesting locations

2. **Data Updates**
   - Integration with latest astronomical catalogs
   - Real-time data from observatories

3. **Visual Improvements**
   - Better galaxy textures
   - Improved cosmic web rendering
   - Redshift color effects

4. **Performance**
   - GPU-based particle systems
   - Compute shaders for procedural generation
   - Streaming data loading

## References

### Data Sources

1. McConnachie (2012) - Local Group catalog
2. Karachentsev et al. (2013) - Nearby galaxies catalog
3. 2MRS - 2MASS Redshift Survey
4. Cosmicflows-3 - Distance-velocity data
5. SDSS - Sloan Digital Sky Survey

### Coordinate Systems

- Supergalactic coordinates: Lahav et al. (2000)
- Coordinate transformations: Astropy documentation

### Cosmology

- ΛCDM model: H₀=70 km/s/Mpc, Ωₘ=0.3, ΩΛ=0.7
- Redshift-distance relation: Hogg (1999)

## License

This visualization uses real astronomical data from public catalogs and surveys. All data sources are properly attributed in the metadata files.
