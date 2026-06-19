/**
 * 系外行星状态管理 (Exoplanet Store)
 *
 * 基于 Zustand 管理系外行星系统的全局状态。
 *
 * 状态职责：
 * - 宿主星索引的加载与缓存
 * - 当前选中/悬停的恒星和行星
 * - 选中系统的详细数据加载
 * - 加载状态和错误处理
 */

import { create } from 'zustand';
import {
  ExoplanetHostIndex,
  ExoplanetSelection,
  ExoplanetSystemDetails,
} from '@/lib/types/exoplanet';

interface ExoplanetStore {
  systems: ExoplanetHostIndex[];
  systemsByName: Map<string, ExoplanetHostIndex>;
  loadingIndex: boolean;
  indexError: string | null;
  selectedHostName: string | null;
  selectedSystem: ExoplanetSystemDetails | null;
  selectedBody: ExoplanetSelection | null;
  loadingSystem: boolean;
  systemError: string | null;
  hoveredHostName: string | null;
  hoveredPlanetName: string | null;
  fetchIndex: (forceRefresh?: boolean) => Promise<ExoplanetHostIndex[]>;
  selectHost: (hostname: string) => Promise<ExoplanetSystemDetails | null>;
  selectPlanet: (planetName: string) => void;
  clearSelection: () => void;
  setHoveredHost: (hostname: string | null) => void;
  setHoveredPlanet: (planetName: string | null) => void;
}

let indexRequest: Promise<ExoplanetHostIndex[]> | null = null;
const systemDetailCache = new Map<string, ExoplanetSystemDetails>();

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown exoplanet error';
}

function buildSystemMap(systems: ExoplanetHostIndex[]): Map<string, ExoplanetHostIndex> {
  return new Map(systems.map((system) => [system.hostname.toLowerCase(), system]));
}

/** 系外行星全局状态 Store — 管理索引加载、选择、悬停和系统详情。 */
export const useExoplanetStore = create<ExoplanetStore>((set, get) => ({
  systems: [],
  systemsByName: new Map(),
  loadingIndex: false,
  indexError: null,
  selectedHostName: null,
  selectedSystem: null,
  selectedBody: null,
  loadingSystem: false,
  systemError: null,
  hoveredHostName: null,
  hoveredPlanetName: null,

  fetchIndex: async (forceRefresh = false) => {
    const current = get();
    if (!forceRefresh && current.systems.length > 0) {
      return current.systems;
    }

    if (!forceRefresh && indexRequest) {
      return indexRequest;
    }

    set({ loadingIndex: true, indexError: null });

    indexRequest = fetch(`/api/exoplanets${forceRefresh ? '?refresh=1' : ''}`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Exoplanet index HTTP ${response.status}`);
        }

        const payload = await response.json();
        const systems = Array.isArray(payload.systems)
          ? (payload.systems as ExoplanetHostIndex[])
          : [];

        set({
          systems,
          systemsByName: buildSystemMap(systems),
          loadingIndex: false,
          indexError: null,
        });

        return systems;
      })
      .catch((error) => {
        const message = toErrorMessage(error);
        set({ loadingIndex: false, indexError: message });
        throw error;
      })
      .finally(() => {
        indexRequest = null;
      });

    return indexRequest;
  },

  selectHost: async (hostname: string) => {
    const cacheKey = hostname.toLowerCase();
    const cached = systemDetailCache.get(cacheKey);

    set({
      selectedHostName: hostname,
      selectedBody: { type: 'star', hostname },
      selectedSystem: cached ?? null,
      loadingSystem: !cached,
      systemError: null,
    });

    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`/api/exoplanet/${encodeURIComponent(hostname)}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Exoplanet system HTTP ${response.status}`);
      }

      const system = (await response.json()) as ExoplanetSystemDetails;
      systemDetailCache.set(cacheKey, system);

      if (get().selectedHostName?.toLowerCase() === cacheKey) {
        set({
          selectedSystem: system,
          loadingSystem: false,
          systemError: null,
          selectedBody: { type: 'star', hostname: system.hostname },
        });
      }

      return system;
    } catch (error) {
      const message = toErrorMessage(error);

      if (get().selectedHostName?.toLowerCase() === cacheKey) {
        set({
          loadingSystem: false,
          systemError: message,
        });
      }

      return null;
    }
  },

  selectPlanet: (planetName: string) => {
    const hostname = get().selectedHostName;
    if (!hostname) {
      return;
    }

    set({
      selectedBody: { type: 'planet', hostname, planetName },
      hoveredPlanetName: planetName,
    });
  },

  clearSelection: () => {
    set({
      selectedHostName: null,
      selectedSystem: null,
      selectedBody: null,
      loadingSystem: false,
      systemError: null,
      hoveredHostName: null,
      hoveredPlanetName: null,
    });
  },

  setHoveredHost: (hostname: string | null) => {
    set({ hoveredHostName: hostname });
  },

  setHoveredPlanet: (planetName: string | null) => {
    set({ hoveredPlanetName: planetName });
  },
}));

export type { ExoplanetHostIndex, ExoplanetSystemDetails };
