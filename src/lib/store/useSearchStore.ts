import { create } from 'zustand';
import { SearchIndex } from '@/lib/search/SearchIndex';
import { SearchEngine } from '@/lib/search/SearchEngine';
import { NavigationHandler } from '@/lib/search/NavigationHandler';
import { SearchHistory } from '@/lib/search/SearchHistory';
import { SceneMode } from '@/lib/3d/SceneModeManager';
import type { SearchResult, SearchCategory } from '@/lib/search/types';
import type { SceneManager } from '@/lib/3d/SceneManager';
import type { CameraController } from '@/lib/3d/CameraController';
import type { SolarSystemState } from '@/lib/state';
import type { ExoplanetHostIndex } from '@/lib/types/exoplanet';
import type { TLEData } from '@/lib/types/satellite';

const MAX_RESULTS_PER_CATEGORY = 5;

const emptyCategories = (): Record<SearchCategory, SearchResult[]> => ({
  'all': [], 'solar-system': [], 'exoplanet': [], 'satellite': [], 'deep-space': [], 'places': [],
});

export interface SearchState {
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  categorizedResults: Record<SearchCategory, SearchResult[]>;
  selectedIndex: number;
  isLoading: boolean;
  activeCategory: SearchCategory;
  isNavigating: boolean;

  searchIndex: SearchIndex | null;
  searchEngine: SearchEngine | null;
  navigationHandler: NavigationHandler | null;

  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setQuery: (query: string) => void;
  setResults: (results: SearchResult[]) => void;
  setSelectedIndex: (index: number) => void;
  setActiveCategory: (category: SearchCategory) => void;
  setIsLoading: (loading: boolean) => void;
  clearQuery: () => void;

  initializeSearch: (sceneManager: SceneManager, cameraController: CameraController, store: SolarSystemState) => void;
  updateIndex: (store: SolarSystemState, renderers?: any) => void;
  indexExoplanets: (hosts: ExoplanetHostIndex[]) => void;
  indexSatellites: (satellites: TLEData[]) => void;
  performSearch: (query: string) => void;
  navigateToResult: (result: SearchResult) => Promise<void>;
  searchPlaces: (query: string) => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  query: '',
  results: [],
  categorizedResults: emptyCategories(),
  selectedIndex: -1,
  isLoading: false,
  activeCategory: 'all',
  isNavigating: false,

  searchIndex: null,
  searchEngine: null,
  navigationHandler: null,

  openSearch: () => set({ isOpen: true, query: '', results: [], selectedIndex: -1 }),
  closeSearch: () => set({ isOpen: false, query: '', results: [], selectedIndex: -1 }),
  toggleSearch: () => {
    const current = get().isOpen;
    set({ isOpen: !current, query: '', results: [], selectedIndex: -1, activeCategory: 'all' });
  },
  setQuery: (query: string) => set({ query }),
  setResults: (results: SearchResult[]) => set({ results }),
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),
  setActiveCategory: (category: SearchCategory) => set({ activeCategory: category }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  clearQuery: () => set({ query: '', results: [], selectedIndex: -1 }),

  initializeSearch: (sceneManager, cameraController, store) => {
    const searchIndex = new SearchIndex();
    const renderers = {
      localGroup: sceneManager.getLocalGroupRenderer(),
      nearbyGroups: sceneManager.getNearbyGroupsRenderer(),
      virgoSupercluster: sceneManager.getVirgoSuperclusterRenderer(),
      laniakeaSupercluster: sceneManager.getLaniakeaSuperclusterRenderer(),
    };
    searchIndex.buildFromStore(store, renderers);
    const searchEngine = new SearchEngine(searchIndex);
    const navigationHandler = new NavigationHandler(sceneManager, cameraController, store);
    set({ searchIndex, searchEngine, navigationHandler });
  },

  updateIndex: (store, renderers) => {
    const { searchIndex, searchEngine } = get();
    if (!searchIndex || !searchEngine) return;
    searchIndex.buildFromStore(store, renderers);
    searchEngine.updateIndex(searchIndex);
  },

  indexExoplanets: (hosts) => {
    const { searchIndex, searchEngine, query } = get();
    if (!searchIndex || !searchEngine) return;
    searchIndex.indexExoplanets(hosts);
    searchEngine.updateIndex(searchIndex);
    if (query.trim()) get().performSearch(query);
  },

  indexSatellites: (satellites) => {
    const { searchIndex, searchEngine, query } = get();
    if (!searchIndex || !searchEngine) return;
    searchIndex.indexSatellites(satellites);
    searchEngine.updateIndex(searchIndex);
    if (query.trim()) get().performSearch(query);
  },

  searchPlaces: async (query: string) => {
    if (!query.trim()) return;
    try {
      const viewer = (window as any).__cesiumViewer;
      if (!viewer) {
        console.warn('[searchPlaces] Cesium viewer not available');
        return;
      }
      const Cesium = await import('cesium');
      const service = new Cesium.IonGeocoderService({ scene: viewer.scene });
      const results = await service.geocode(query);
      const placeResults: SearchResult[] = (results || []).map((item: any, i: number) => {
        const dest = item.destination;
        if (!dest) return null;
        let lat: number, lon: number;
        if (dest.latitude !== undefined && dest.longitude !== undefined) {
          lat = Cesium.Math.toDegrees(dest.latitude);
          lon = Cesium.Math.toDegrees(dest.longitude);
        } else if (dest.east !== undefined && dest.west !== undefined) {
          const center = Cesium.Rectangle.center(dest);
          lat = Cesium.Math.toDegrees(center.latitude);
          lon = Cesium.Math.toDegrees(center.longitude);
        } else {
          return null;
        }
        return {
          id: `place-${lat.toFixed(4)}-${lon.toFixed(4)}`,
          name: item.displayName?.split(',')[0] || item.displayName || query,
          nameEn: item.displayName || '',
          nameZh: item.displayName || '',
          type: 'place' as const,
          category: 'places' as const,
          relevance: 1 - i * 0.1,
          description: item.displayName,
          metadata: { lat, lon, fullName: item.displayName },
        };
      }).filter(Boolean) as SearchResult[];
      set((s) => ({
        categorizedResults: {
          ...s.categorizedResults,
          places: placeResults,
        },
      }));
    } catch (err) {
      console.error('[searchPlaces] Cesium Ion geocoding failed:', err);
    }
  },

  performSearch: (query: string) => {
    const { searchEngine } = get();
    if (!searchEngine) {
      set({ results: [], categorizedResults: emptyCategories(), isLoading: false });
      return;
    }
    if (!query.trim()) {
      set({ results: [], categorizedResults: emptyCategories(), isLoading: false });
      return;
    }

    set({ isLoading: true });

    // Celestial results (synchronous)
    const categorizedResults = searchEngine.getResultsByCategory(query, MAX_RESULTS_PER_CATEGORY);
    const allCategorized = { ...categorizedResults, places: [] };

    const results = get().activeCategory === 'all'
      ? [
          ...(allCategorized['solar-system'] || []),
          ...(allCategorized['exoplanet'] || []),
          ...(allCategorized['satellite'] || []),
          ...(allCategorized['deep-space'] || []),
        ]
      : (allCategorized[get().activeCategory] || []);

    set({
      results,
      categorizedResults: allCategorized,
      isLoading: false,
      selectedIndex: -1,
    });

    // Fetch places async
    const querySnapshot = query;
    get().searchPlaces(querySnapshot).then(() => {
      const s = get();
      if (s.query !== querySnapshot) return;
      const places = s.categorizedResults['places'] || [];
      if (places.length > 0) {
        const mergedCategorized = { ...s.categorizedResults, places };
        const mergedResults = s.activeCategory === 'places' ? places
          : s.activeCategory === 'all'
            ? [
                ...(mergedCategorized['solar-system'] || []),
                ...(mergedCategorized['exoplanet'] || []),
                ...(mergedCategorized['satellite'] || []),
                ...(mergedCategorized['deep-space'] || []),
                ...places,
              ]
            : (mergedCategorized[s.activeCategory] || []);
        set({
          categorizedResults: mergedCategorized,
          results: mergedResults,
        });
      }
    });
  },

  navigateToResult: async (result: SearchResult) => {
    set({ isNavigating: true });
    try {
      if (result.type === 'place') {
        const { flyToEarthLocation } = await import('@/lib/cesium/flyToLocation');
        const lat = result.metadata?.lat;
        const lon = result.metadata?.lon;
        if (typeof lat === 'number' && typeof lon === 'number') {
          const { navigationHandler } = get();
          const nh = navigationHandler;
          if (nh) {
            const sceneManager = (nh as any).sceneManager as SceneManager | undefined;
            const cameraController = (nh as any).cameraController as CameraController | undefined;
            const solarStore = (nh as any).store as SolarSystemState | undefined;
            if (sceneManager && cameraController && solarStore) {
              const earthBody = solarStore.celestialBodies?.find(
                (b: any) => b.name?.toLowerCase() === 'earth'
              );
              if (earthBody) {
                const sceneModeManager = sceneManager.getSceneModeManager();
                // Teleport Three.js camera to near-Earth position
                cameraController.stopTracking();
                const camera = sceneManager.getCamera();
                if (camera) {
                  const { x, y, z } = earthBody;
                  camera.position.set(x, y, z + 0.00005);
                  camera.lookAt(x, y, z);
                  camera.updateProjectionMatrix();
                }
                const controls = cameraController.getControls();
                controls.target.set(earthBody.x, earthBody.y, earthBody.z);
                controls.update();
                // Prevent animation loop from switching back to THREE mode
                (window as any).__cesiumModeOverride = true;
                if (sceneModeManager.getCurrentMode() !== SceneMode.CESIUM_DOMINANT) {
                  sceneModeManager.switchMode(SceneMode.CESIUM_DOMINANT);
                  controls.enabled = false;
                  sceneManager.getRenderer().domElement.style.pointerEvents = 'none';
                }
                // Wait 2 frames for animation loop to enter CESIUM mode + syncCamera
                await new Promise<void>(resolve => {
                  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
                });
                try {
                  await flyToEarthLocation({ latitude: lat, longitude: lon, altitude: 8000 });
                } finally {
                  delete (window as any).__cesiumModeOverride;
                }
                SearchHistory.add({ id: result.id, name: result.name, type: 'place' });
                set({ isOpen: false, query: '', results: [], selectedIndex: -1, isNavigating: false });
                return;
              }
            }
          }
          // Fallback: fly directly with override
          (window as any).__cesiumModeOverride = true;
          try {
            await flyToEarthLocation({ latitude: lat, longitude: lon, altitude: 8000 });
          } finally {
            delete (window as any).__cesiumModeOverride;
          }
        }
        SearchHistory.add({ id: result.id, name: result.name, type: 'place' });
        set({ isOpen: false, query: '', results: [], selectedIndex: -1, isNavigating: false });
        return;
      }

      const { navigationHandler, searchIndex } = get();
      if (!navigationHandler || !searchIndex) {
        set({ isNavigating: false });
        return;
      }

      const celestial = searchIndex.getById(result.id);
      if (!celestial) {
        set({ isNavigating: false });
        return;
      }

      await navigationHandler.navigateTo(celestial);
      SearchHistory.add({ id: result.id, name: result.name, type: result.type as any });
      set({ isOpen: false, query: '', results: [], selectedIndex: -1, isNavigating: false });
    } catch {
      set({ isNavigating: false });
    }
  },
}));
