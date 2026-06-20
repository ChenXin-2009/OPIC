# Astronomy

## Overview

Core astronomical computation library handling orbit propagation, time systems, ephemeris data, and coordinate transformations. This is the mathematical engine behind all celestial body positioning in OPIC.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `orbit/` | Orbital mechanics — Keplerian element propagation, VSOP87 integration, orbit orchestrator |
| `time/` | Time systems — JD/MJD/J2000 conversions, time scale transformations |
| `ephemeris/` | JPL DE440/DE441 ephemeris — data loading, interpolation, correction, observer calculations |
| `__tests__/` | Test suites |

## Key Files

| File | Purpose |
|------|---------|
| `orbit.ts` | Top-level orbit computation entry point |
| `orbit-coordinator.ts` | Coordinates multiple orbit sources (keplerian, VSOP87) for position calculation |
| `names.ts` | Celestial body name registry and lookup |
| `universeNames.ts` | Universe-scale object name resolution |
| `time.ts` | Time-related utilities (time scale conversions) |
| `utils/` | Shared math utilities (e.g., `rotationMatrix`) |

## Orbit Pipeline

```
orbit-coordinator.ts
├── Keplerian elements (orbit/data.ts)
│   └── → mechanics.ts → compute position at epoch t
├── VSOP87 (orbit/ephemeris-integration.ts)
│   └── → position via VSOP87 series evaluation
└── Result: unified position object
```

## Time Systems

```
JD (Julian Date) ↔ MJD (Modified JD) ↔ J2000 (days since 2000-01-01 12:00 TT)
         ↕
UTC ↔ TAI ↔ TT ↔ TDB (for ephemeris calculations)
```

All conversions in `time/converter.ts`.

## Ephemeris (JPL DE440/DE441)

The `ephemeris/` submodule handles:

- **Loading** — Parquet file chunk loading with progressive resolution
- **Interpolation** — Chebyshev polynomial evaluation
- **Corrections** — Light-time, gravitational deflection, precession/nutation
- **Observer** — Topocentric coordinates, rise/set times, apparent magnitude
- **Management** — Cache, chunk lifecycle, memory management

See `ephemeris/README.md` for detailed documentation.
