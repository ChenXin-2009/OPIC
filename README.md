# Solar System & Observable Universe Visualization

An interactive 3D visualization of the solar system and the observable universe, built with Next.js, Three.js, and TypeScript.

## Features

### Multi-Scale Universe Visualization

Explore the cosmos from the solar system to the observable universe with smooth transitions between scales:

- **Solar System** - Planets, moons, and orbits
- **Nearby Stars** - Stars within 300 light years
- **Milky Way Galaxy** - Our galaxy structure (100,000 light years)
- **Local Group** - 80 galaxies including Andromeda (based on McConnachie 2012 catalog)
- **Nearby Galaxy Groups** - 8 major groups (Sculptor, Centaurus A, M81, etc.)
- **Virgo Supercluster** - 30 galaxy clusters (based on 2MRS survey)
- **Laniakea Supercluster** - Our cosmic home (based on Cosmicflows-3 data)
- **Nearby Superclusters** - 20 major superclusters
- **Observable Universe** - Cosmic web structures, voids, and filaments

### Real Astronomical Data

All visualizations are based on real astronomical observations:

- **Local Group**: McConnachie (2012) catalog
- **Nearby Groups**: Karachentsev et al. (2013) catalog
- **Virgo Supercluster**: 2MRS (2MASS Redshift Survey) data
- **Laniakea**: Cosmicflows-3 dataset

No simulated data - everything you see is based on actual observations!

### Performance Optimizations

- **LOD System**: Dynamic quality adjustment based on camera distance
- **Particle Systems**: Efficient rendering of millions of galaxies
- **Instanced Rendering**: Reduced draw calls for detailed objects
- **Memory Management**: Automatic resource cleanup for distant scales
- **Web Workers**: Non-blocking procedural generation

### Interactive Features

- Smooth camera controls (orbit, pan, zoom)
- Real-time scale indicator
- Smooth fade transitions between scales
- Click on galaxies to view details (Local Group)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the visualization.

## Project Structure

```
src/
├── lib/
│   ├── 3d/                    # Three.js renderers and managers
│   │   ├── LocalGroupRenderer.ts
│   │   ├── NearbyGroupsRenderer.ts
│   │   ├── VirgoSuperclusterRenderer.ts
│   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   ├── NearbySuperclusterRenderer.ts
│   │   ├── ObservableUniverseRenderer.ts
│   │   ├── OptimizedParticleSystem.ts
│   │   ├── LODManager.ts
│   │   ├── MemoryManager.ts
│   │   └── SceneManager.ts
│   ├── config/                # Configuration files
│   │   ├── universeScaleConfig.ts
│   │   └── universeConfig.ts
│   ├── data/                  # Data loaders
│   │   └── UniverseDataLoader.ts
│   ├── types/                 # TypeScript type definitions
│   │   └── universeTypes.ts
│   └── utils/                 # Utility functions
│       └── CoordinateConverter.ts
├── components/                # React components
│   └── UniverseScaleIndicator.tsx
public/
├── data/universe/            # Astronomical data files
└── textures/universe/        # Galaxy textures
docs/
└── UNIVERSE_VISUALIZATION.md # Detailed documentation
```

## Documentation

- [Universe Visualization Architecture](docs/UNIVERSE_VISUALIZATION.md) - Detailed technical documentation
- [Texture Guide](public/textures/universe/README.md) - Galaxy texture specifications

## Technology Stack

- **Framework**: Next.js 14
- **3D Engine**: Three.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Format**: Binary Float32Array (Gzip compressed)

## Performance Targets

- 60 FPS at galaxy scale
- 30+ FPS at universe scale
- < 2GB memory usage
- < 30KB compressed data files

## Data Sources & References

### Catalogs
1. McConnachie, A. W. (2012) - Local Group galaxies
2. Karachentsev, I. D., et al. (2013) - Nearby galaxies
3. 2MRS - 2MASS Redshift Survey
4. Cosmicflows-3 - Tully et al. (2016)

### Coordinate Systems
- Supergalactic coordinates (Lahav et al. 2000)
- ΛCDM cosmology: H₀=70 km/s/Mpc, Ωₘ=0.3, ΩΛ=0.7

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

See [LICENSE](LICENSE) file for details.

## Acknowledgments

- NASA/IPAC Extragalactic Database (NED)
- HyperLeda database
- 2MASS Redshift Survey team
- Cosmicflows project team
- All astronomers who contributed to the observational data
