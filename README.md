# OPIC — Open Integrated Cosmos

<div align="center">
  <img src="public/LOGO/logolw.svg" alt="OPIC Logo" width="300">
</div>

**A web-based multi-scale universe visualization and astronomical data integration system**

> **Note**: This project was formerly known as CXIC (CXIN Integrated Cosmos). See [Name Change Announcement](docs/NAME_CHANGE_ANNOUNCEMENT.md) for details.

[中文文档](./README_CN.md)

---

## Overview

OPIC is an interactive universe visualization application built with Three.js, Cesium, and Next.js. Using real astronomical data and precise orbital calculations, it presents a dynamic simulation from Earth's surface to the edge of the observable universe.

The project is transitioning to a modular plugin architecture (MOD Manager system), allowing features to be independently loaded, configured, and toggled at runtime without restarting the application.

### Demo

<div align="center">
  <img src="docs/images/earth-to-universe-zoom.gif" alt="Earth to Universe Zoom Demo" width="800">
  <p><em>Seamless zoom experience from Earth's surface buildings to the cosmic panorama</em></p>
</div>

## Features

### Earth Visualization (Cesium Integration)

- High-precision tile-based Earth rendering with global terrain and imagery
- Multiple map sources: Bing Maps, OpenStreetMap, ArcGIS, Tianditu
- Real terrain elevation data
- Distance-adaptive rendering: seamless transition between Cesium tiles (close range) and Three.js sphere (far range)
- Real-time camera synchronization between Three.js and Cesium

### Solar System Simulation

- High-precision ephemeris system based on NASA JPL DE440 data
- 27 celestial bodies: 8 planets + 19 major moons with precise position calculations
- Time control: 2009-2109 high-precision range with fast-forward and rewind
- Automatic switching between high-precision ephemeris and analytical models

### Satellite Tracking

- Real-time tracking based on CelesTrak TLE data and SGP4 orbital model
- Satellite search and browsing
- Orbital path visualization
- Detailed satellite parameters and orbital elements

<div align="center">
  <img src="docs/images/satellite-tracking-demo.gif" alt="Satellite Tracking Demo" width="800">
  <p><em>Real-time satellite orbit tracking and information display</em></p>
</div>

### Multi-Scale Universe Visualization

Explore 9 cosmic scales through zoom:

| Scale | Distance Range | Data Source |
|-------|----------------|-------------|
| Earth | 0 - 100,000 km | Cesium Tiles |
| Solar System | 0.1 - 100 AU | NASA JPL DE440 |
| Nearby Stars | 0 - 100 ly | ESA Gaia DR3 |
| Milky Way | 100 - 50,000 ly | ESA Gaia |
| Local Group | 50k - 1M ly | McConnachie 2012 |
| Nearby Galaxy Groups | 1M - 10M ly | Karachentsev 2013 |
| Virgo Supercluster | 10M - 50M ly | 2MRS Survey |
| Laniakea Supercluster | 50M - 500M ly | Cosmicflows-3 |
| Observable Universe | 500M+ ly | Cosmic Web Structure |

### MOD Manager System (In Development)

A modular plugin architecture that keeps the core system lightweight while allowing optional features to be dynamically loaded at runtime:

- Declarative MOD manifests with semantic versioning
- Full lifecycle management: registered → loaded → enabled → disabled → unloaded
- Automatic dependency resolution with cycle detection
- Versioned API layer: Time, Camera, Celestial, Satellite, Render APIs
- Error isolation — MOD failures don't affect the core system
- Configuration persistence across sessions

<div align="center">
  <img src="docs/images/mod-manager-interface.gif" alt="MOD Manager Interface" width="800">
  <p><em>MOD Manager interface with example modules</em></p>
</div>

### Visual Features

- High-quality planetary textures (Solar System Scope)
- Gaia-based stellar rendering for Milky Way background
- Interactive camera: free rotation, zoom, and celestial body focus
- Seamless scale transitions
- 4-level LOD system with distance-based adjustment

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend Framework | Next.js 16 / React 19 |
| 3D Rendering | Three.js 0.170 + Cesium 1.139 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| State Management | Zustand 5 |
| Orbital Calculation | satellite.js (SGP4) |
| Data Compression | pako (gzip) |
| Testing | Jest + fast-check |

## Quick Start

### Requirements

- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/ChenXin-2009/OPIC.git
cd OPIC

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to view the application.

### Production Build

```bash
npm run build
npm start
```

## Controls

| Action | Function |
|--------|----------|
| Mouse drag | Rotate view |
| Scroll wheel | Zoom (explore different cosmic scales) |
| Click planet/moon | Focus on target |
| Time control | Adjust simulation speed and date |
| Map switch | Change imagery source in Earth view |
| Earth lock | Lock camera to Earth center |

## Data Sources

### Ephemeris Data

| Bodies | Data Source | Time Range | Accuracy |
|--------|-------------|------------|----------|
| Earth, Mars, Moon | NASA JPL DE440 | 2009-2109 | <0.1° |
| Other planets | NASA JPL DE440 | 2009-2039 | <0.1° |
| Jupiter moons | NASA JPL JUP365 | 2009-2039 | <0.01° |
| Saturn moons | NASA JPL SAT441 | 2009-2039 | <0.01° |
| Neptune moons | NASA JPL NEP097 | 2009-2039 | <0.01° |

### Universe Data

- Stellar data: ESA Gaia Mission (DR3)
- Local Group: McConnachie (2012) Local Group Catalog
- Nearby Galaxy Groups: Karachentsev et al. (2013)
- Virgo Supercluster: 2MRS Survey Data
- Laniakea Supercluster: Cosmicflows-3 Dataset

### Satellite Data

- TLE orbital data: CelesTrak (NORAD)
- Satellite metadata: UCS (Union of Concerned Scientists) Satellite Database

### Visual Resources

- Planetary textures: Solar System Scope
- Milky Way imagery: ESA/Gaia

## Project Structure

```
opic/
├── src/
│   ├── app/                    # Next.js app router
│   ├── components/             # React components
│   │   ├── canvas/            # 3D canvas components
│   │   ├── cesium/            # Cesium-related components
│   │   ├── satellite/         # Satellite tracking UI
│   │   ├── mod-manager/       # MOD manager UI (in development)
│   │   └── ...
│   ├── lib/
│   │   ├── 3d/                # Three.js renderers
│   │   │   ├── SceneManager.ts
│   │   │   ├── Planet.ts
│   │   │   ├── GalaxyRenderer.ts
│   │   │   ├── LocalGroupRenderer.ts
│   │   │   ├── VirgoSuperclusterRenderer.ts
│   │   │   ├── LaniakeaSuperclusterRenderer.ts
│   │   │   ├── LODManager.ts
│   │   │   └── ...
│   │   ├── cesium/            # Cesium integration
│   │   │   ├── CesiumAdapter.ts
│   │   │   ├── CameraSynchronizer.ts
│   │   │   └── ...
│   │   ├── astronomy/         # Astronomical calculations
│   │   ├── satellite/         # Satellite tracking (SGP4)
│   │   ├── mod-manager/       # MOD manager core (in development)
│   │   │   ├── core/          # Registry, lifecycle, dependency resolver
│   │   │   ├── api/           # Time, Camera, Celestial, Satellite, Render APIs
│   │   │   ├── persistence/   # Configuration storage
│   │   │   ├── error/         # Error handling and isolation
│   │   │   └── performance/   # Performance monitoring
│   │   ├── config/            # Configuration files
│   │   ├── data/              # Data loaders
│   │   └── types/             # TypeScript types
│   └── stores/                # Zustand state management
├── public/
│   ├── data/                  # Ephemeris and universe data
│   │   ├── ephemeris/        # NASA JPL ephemeris data
│   │   ├── gaia/             # Gaia stellar data
│   │   └── universe/         # Universe structure data
│   ├── textures/              # Texture resources
│   └── cesium/                # Cesium static assets
├── scripts/                   # Data generation scripts
└── docs/                      # Project documentation
```

## Development

```bash
# Run tests
npm test

# Linting
npm run lint
npm run lint:fix

# Type checking
npm run quality:check

# Test coverage
npm run test:coverage
```

## Performance Optimizations

- 4-level LOD system with distance-based adjustment
- On-demand Cesium tile loading with automatic far-distance culling
- Distance-adaptive rendering: Cesium tiles at close range, Three.js sphere at far range
- Custom shader particle system supporting millions of particles
- Instanced rendering to reduce draw calls
- Frustum culling for visible objects only
- Automatic memory management for distant resources
- Web Workers for non-blocking data processing

## Disclaimer

This application is for educational and entertainment purposes only.

**Astronomical Data Accuracy:**

Within the high-precision time range (2009-2109 for Earth/Mars/Moon, 2009-2039 for other bodies), NASA JPL ephemeris data is used with arcsecond-level accuracy. Outside this range, the system automatically switches to analytical models with reduced accuracy.

For precise astronomical data for scientific research or navigation, please refer to the NASA JPL HORIZONS system or other professional astronomical institution resources.

**Satellite Orbital Data:**

Satellite orbital data is calculated based on TLE (Two-Line Element) and SGP4 models. Accuracy is affected by factors such as atmospheric drag and solar radiation pressure, and is for reference only.

**Liability:**

This software is provided "as is" without any express or implied warranties. In no event shall the authors or copyright holders be liable for any claims, damages, or other liability.

This software is not suitable for environments requiring fail-safe performance. Users expressly understand and agree that the authors shall not be responsible for any loss or damage resulting from the use of this software in high-risk activities.

## Contributing

Contributions are welcome! We embrace collaboration from both human developers and AI assistants.

- See [CONTRIBUTING.md](CONTRIBUTING.md) for how to participate
- Submit Issues to report bugs or suggest features
- Submit Pull Requests to contribute code
- **AI Contributions Welcome**: We encourage contributions assisted by AI tools and agents

## License

This project is licensed under the Apache License 2.0.

Key features:
- Allows commercial use, modification, and distribution
- Requires preservation of copyright and license notices
- Provides explicit patent licensing
- Includes disclaimer and liability limitations

See [LICENSE](LICENSE) file for details.

## Contact

- **GitHub**: [@ChenXin-2009](https://github.com/ChenXin-2009)
- **Project**: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)
- **Website**: [https://opic.cxin.tech](https://opic.cxin.tech)
