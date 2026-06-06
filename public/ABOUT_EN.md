# OPIC — Open Integrated Cosmos

**A web-based multi-scale universe visualization and astronomical data integration system**

## Project Overview

OPIC is an interactive universe visualization application built with Three.js, Cesium, and Next.js. Through real astronomical data and precise orbital calculations, it presents a dynamic simulation from the Earth's surface to the edge of the observable universe.

The project started in November 2025, developed and maintained by a high school student during holidays.

## Key Features

### Earth Visualization (Cesium Integration)

- High-precision tile-based Earth rendering
- Multi-source map switching (Bing Maps, OpenStreetMap, ArcGIS, Tianditu, etc.)
- Real terrain elevation data
- Seamless transition: Cesium tiles at close range, Three.js sphere at distance

### Solar System Simulation

- High-precision ephemeris system based on NASA JPL DE440 data
- Precise position calculation for 27 celestial bodies (8 planets + 19 major moons)
- High-precision time range: 2009-2109
- Time control: fast forward, rewind, pause

### Satellite Tracking

- Based on CelesTrak TLE data and SGP4 orbital model
- Satellite search and browsing
- Orbit visualization and motion trails
- Satellite parameters and orbital elements details

### Multi-scale Universe Visualization

Explore 9 cosmic scales through zooming:

1. **Earth** - Cesium tiled Earth
2. **Solar System** - Precise planetary and lunar orbits
3. **Nearby Stars** - ESA Gaia DR3 stellar data
4. **Milky Way** - Galaxy structure visualization
5. **Local Group** - 80 galaxies
6. **Nearby Galaxy Groups** - Karachentsev catalog
7. **Virgo Supercluster** - 2MRS survey data
8. **Laniakea Supercluster** - Cosmicflows-3 data
9. **Observable Universe** - Cosmic web structure

### Visual Features

- High-quality planetary textures
- Milky Way background star rendering
- Interactive camera controls
- Smooth transitions between scales
- 4-level LOD system

## Controls

- **Mouse drag**: Rotate view
- **Scroll wheel**: Zoom view
- **Click celestial body**: Focus on target
- **Time control**: Adjust simulation speed and date
- **Map switch**: Change Earth imagery source
- **Earth lock**: Lock camera to Earth center

## Tech Stack

- Next.js 16 / React 19
- Three.js 0.170 + Cesium 1.139
- TypeScript 5
- Tailwind CSS 4
- Zustand 5
- satellite.js (SGP4)

## Data Sources

### Ephemeris Data

- NASA JPL DE440 (Planets)
- NASA JPL JUP365 (Jupiter moons)
- NASA JPL SAT441 (Saturn moons)
- NASA JPL NEP097 (Neptune moons)

Accuracy: Planets <0.1°, major moons <0.01°

### Universe Data

- ESA Gaia Mission (DR3) - Stars
- McConnachie (2012) - Local Group
- Karachentsev et al. (2013) - Nearby galaxies
- 2MRS Survey - Virgo Supercluster
- Cosmicflows-3 - Laniakea

### Satellite Data

- CelesTrak TLE orbital data
- UCS Satellite Database

### Visual Resources

- Planetary textures: Solar System Scope
- Milky Way image: ESA/Gaia

## Disclaimer

This application is for educational and entertainment purposes only.

**Astronomical Data Accuracy**: High-precision NASA JPL ephemeris data is used within the valid time range. Outside this range, analytical models are automatically switched. For scientific research, please refer to professional systems like NASA JPL HORIZONS.

**Satellite Orbital Data**: Calculated based on TLE and SGP4 models, affected by factors like atmospheric drag, for reference only.

**Liability**: This software is provided "as is" without any warranty. The author is not responsible for any damages.

## License

Apache License 2.0

## Contact

- GitHub: [@ChenXin-2009](https://github.com/ChenXin-2009)
- Project: [https://github.com/ChenXin-2009/OPIC](https://github.com/ChenXin-2009/OPIC)

---

*Project maintained by an individual, started in November 2025*
