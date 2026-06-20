# MOD Manager

The MOD Manager is the core plugin system of OPIC, providing a modular and extensible architecture for building, loading, and managing MODs (plugins). It handles the complete lifecycle of MODs including discovery, registration, dependency resolution, permission enforcement, sandbox execution, and persistence.

## Overview

The MOD Manager is the core plugin system of OPIC, providing a modular and extensible architecture for building, loading, and managing MODs (plugins). It handles the complete lifecycle of MODs including discovery, registration, dependency resolution, permission enforcement, sandbox execution, and persistence.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Init Layer                        │
│              init.ts → initModManager()              │
├─────────────────────────────────────────────────────┤
│                    Core Layer                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Registry │  │  Lifecycle   │  │  EventBus    │  │
│  │ (core/)  │  │  (core/)     │  │  (core/)     │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│       │               │                 │          │
│  ┌────┴─────────────────┴─────────────────┴──────┐ │
│  │           DependencyResolver (core/)           │ │
│  └────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│                  API Layer (api/)                    │
│  Time  │  Camera  │  Celestial  │  Satellite  │ Render │
├─────────────────────────────────────────────────────┤
│               Security Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Sandbox   │  │Permission│  │ Proxy (API Call   │  │
│  │(sandbox/ │  │(permis-  │  │ Logging + Filter) │  │
│  │ )        │  │sion/)    │  │ (proxy/)          │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────┤
│             Extension Layer                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Contri-   │  │  Config      │  │  Service     │  │
│  │bution    │  │  Schema      │  │  Registry    │  │
│  │(contri-  │  │  (config/)   │  │  (service/)  │  │
│  │bution/)  │  └──────────────┘  └──────────────┘  │
│  └──────────┘                                       │
├─────────────────────────────────────────────────────┤
│              Supporting Layers                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │Discovery │  │Persistence│  │   Performance    │  │
│  │(disco-   │  │(persist-  │  │   (performance/) │  │
│  │very/)    │  │ence/)     │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

| Module | Directory | Purpose |
|--------|-----------|---------|
| **Core** | `core/` | MOD registry, lifecycle management, event bus, dependency resolution |
| **API** | `api/` | MOD-facing APIs (Time, Camera, Celestial, Satellite, Render) |
| **Config** | `config/` | JSON Schema parser, config UI generator, config validator |
| **Contribution** | `contribution/` | Extension points (Dock icons, windows, commands) |
| **Discovery** | `discovery/` | MOD auto-discovery, package validation, version checking |
| **Error** | `error/` | Typed error hierarchy (ModError, PermissionError, SandboxError, etc.) |
| **Performance** | `performance/` | Per-MOD performance monitoring and threshold enforcement |
| **Permission** | `permission/` | Permission declaration parsing, validation, and runtime checking |
| **Persistence** | `persistence/` | LocalStorage adapter, state/ config migration manager |
| **Proxy** | `proxy/` | API call proxy factory with logging and permission filtering |
| **Sandbox** | `sandbox/` | Isolated execution environment for MOD code |
| **Service** | `service/` | Inter-MOD service registry with visibility control |
| **Store** | `store/` | Zustand store for MOD state management |
| **Utils** | `utils/` | SemVer parsing/comparison, manifest validation |

## Key Files

| File | Purpose |
|------|---------|
| `types.ts` | All shared type definitions (570 lines) |
| `index.ts` | Barrel exports for all public API surfaces |
| `init.ts` | Initialization function (`initModManager`) and helpers |

## Initialization Flow

```
initModManager()
├── 1. Initialize core modules (EventBus, Registry, DependencyResolver)
├── 2. Load persisted MOD states from LocalStorage
├── 3. Discover MODs (scan configured paths or manifest files)
├── 4. Validate manifests
├── 5. Resolve dependencies (topological sort)
├── 6. Register valid MODs in the registry
├── 7. Enable auto-enabled MODs
└── 8. Fire system-ready event
```

## MOD Lifecycle

```
registered → loaded → enabled ⇄ disabled → unloaded
                ↓                          ↑
             load failed → error        unload failed
```

States:
- `registered` — MOD manifest is valid and registered
- `loaded` — MOD code is loaded and lifecycle hooks are bound
- `enabled` — MOD is running (`onEnable` called)
- `disabled` — MOD is stopped (`onDisable` called)
- `unloaded` — MOD is fully cleaned up

## MOD Manifest

A MOD is defined by a `ModManifest` in `types.ts`. Key fields:

```typescript
interface ModManifest {
  id: string;           // kebab-case unique ID
  version: string;      // semver
  name: string;         // display name
  entryPoint: string;   // lifecycle hooks export name
  permissions?: string[];   // required API permissions
  contributes?: { ... };    // extension points
  configSchema?: Record<string, unknown>;  // JSON Schema
  services?: Array<{ id: string; interface: string; visibility: 'public' | 'internal' | 'private' }>;
  resourceQuota?: { ... };  // CPU/memory/timer limits
}
```

## Related Documentation

- `docs/MOD_DEVELOPMENT_GUIDE.md` — Comprehensive guide for MOD developers
- `docs/MIGRATION_GUIDE.md` — Migration guide for legacy MODs
- `docs/MOD_MANAGEMENT_GUIDE.md` — Runtime MOD management
- `docs/MOD_AUTO_DISCOVERY.md` — Auto-discovery configuration
- `docs/MOD_DYNAMIC_LOADING.md` — Dynamic loading at runtime
- `docs/MOD_PACKAGE_FORMAT.md` — MOD packaging format
- `docs/API_REFERENCE.md` — API surface documentation
