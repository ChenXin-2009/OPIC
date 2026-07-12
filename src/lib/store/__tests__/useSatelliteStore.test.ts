import { useSatelliteStore } from '../useSatelliteStore';
import { satelliteConfig } from '@/lib/config/satelliteConfig';
import { SatelliteAPIResponse, SatelliteCategory, TLEData } from '@/lib/types/satellite';

beforeEach(() => {
  localStorage.clear();
  useSatelliteStore.setState({
    tleData: new Map(),
    satellites: new Map(),
    loading: false,
    error: null,
    lastUpdate: null,
    searchQuery: '',
    visibleSatellites: new Set(),
    selectedSatellite: null,
    hoveredSatellite: null,
    showOrbits: new Set(),
    cameraFollowTarget: null,
    showSatellites: true,
    showInfoPanel: false,
  });
});

describe('useSatelliteStore', () => {
  describe('initial state', () => {
    it('starts with default values', () => {
      const s = useSatelliteStore.getState();
      expect(s.loading).toBe(false);
      expect(s.showSatellites).toBe(true);
      expect(s.selectedSatellite).toBeNull();
    });
  });

  describe('selectSatellite', () => {
    it('selects a satellite and shows info panel', () => {
      useSatelliteStore.getState().selectSatellite(25544);
      expect(useSatelliteStore.getState().selectedSatellite).toBe(25544);
      expect(useSatelliteStore.getState().showInfoPanel).toBe(true);
    });

    it('deselects and hides info panel', () => {
      useSatelliteStore.getState().selectSatellite(null);
      expect(useSatelliteStore.getState().selectedSatellite).toBeNull();
      expect(useSatelliteStore.getState().showInfoPanel).toBe(false);
    });
  });

  describe('setHoveredSatellite', () => {
    it('sets hovered satellite', () => {
      useSatelliteStore.getState().setHoveredSatellite(25544);
      expect(useSatelliteStore.getState().hoveredSatellite).toBe(25544);
      useSatelliteStore.getState().setHoveredSatellite(null);
      expect(useSatelliteStore.getState().hoveredSatellite).toBeNull();
    });
  });

  describe('toggleOrbit', () => {
    it('adds orbit when not shown', () => {
      useSatelliteStore.getState().toggleOrbit(25544);
      expect(useSatelliteStore.getState().showOrbits.has(25544)).toBe(true);
    });

    it('removes orbit when already shown', () => {
      useSatelliteStore.getState().toggleOrbit(25544);
      useSatelliteStore.getState().toggleOrbit(25544);
      expect(useSatelliteStore.getState().showOrbits.has(25544)).toBe(false);
    });

    it('evicts oldest orbit when exceeding maxOrbits', () => {
      const max = satelliteConfig.ui.maxOrbits;
      for (let i = 1; i <= max + 1; i++) {
        useSatelliteStore.getState().toggleOrbit(i);
      }
      expect(useSatelliteStore.getState().showOrbits.has(1)).toBe(false);
      expect(useSatelliteStore.getState().showOrbits.size).toBeLessThanOrEqual(max);
    });
  });

  describe('clearAllOrbits', () => {
    it('clears all orbits', () => {
      useSatelliteStore.getState().toggleOrbit(25544);
      useSatelliteStore.getState().toggleOrbit(12345);
      useSatelliteStore.getState().clearAllOrbits();
      expect(useSatelliteStore.getState().showOrbits.size).toBe(0);
    });
  });

  describe('setShowSatellites', () => {
    it('toggles satellite visibility', () => {
      useSatelliteStore.getState().setShowSatellites(false);
      expect(useSatelliteStore.getState().showSatellites).toBe(false);
    });
  });

  describe('setShowInfoPanel', () => {
    it('closes info panel and clears selection', () => {
      useSatelliteStore.getState().selectSatellite(25544);
      useSatelliteStore.getState().setShowInfoPanel(false);
      expect(useSatelliteStore.getState().showInfoPanel).toBe(false);
      expect(useSatelliteStore.getState().selectedSatellite).toBeNull();
    });

    it('opens info panel without clearing selection', () => {
      useSatelliteStore.getState().selectSatellite(25544);
      useSatelliteStore.getState().setShowInfoPanel(true);
      expect(useSatelliteStore.getState().showInfoPanel).toBe(true);
      expect(useSatelliteStore.getState().selectedSatellite).toBe(25544);
    });
  });

  describe('updateSatelliteState', () => {
    it('updates a single satellite state', () => {
      const state = { noradId: 25544, name: 'ISS', lat: 0, lng: 0, alt: 400 } as any;
      useSatelliteStore.getState().updateSatelliteState(25544, state);
      expect(useSatelliteStore.getState().satellites.get(25544)).toBe(state);
    });
  });

  describe('updateSatelliteStates', () => {
    it('replaces all satellite states', () => {
      const states = new Map([[25544, { noradId: 25544 } as any]]);
      useSatelliteStore.getState().updateSatelliteStates(states);
      expect(useSatelliteStore.getState().satellites.size).toBe(1);
    });
  });

  describe('setCameraFollowTarget', () => {
    it('sets and clears follow target', () => {
      useSatelliteStore.getState().setCameraFollowTarget(25544);
      expect(useSatelliteStore.getState().cameraFollowTarget).toBe(25544);
      useSatelliteStore.getState().setCameraFollowTarget(null);
      expect(useSatelliteStore.getState().cameraFollowTarget).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('sets search query and updates visible satellites', () => {
      useSatelliteStore.getState().setSearchQuery('ISS');
      expect(useSatelliteStore.getState().searchQuery).toBe('ISS');
    });
  });

  describe('updateSatellitePositions', () => {
    const mockTles: TLEData[] = [
      { name: 'ISS (ZARYA)', noradId: 25544, line1: '1 25544', line2: '2 25544', category: SatelliteCategory.ACTIVE, epoch: new Date() },
      { name: 'HST', noradId: 20580, line1: '1 20580', line2: '2 20580', category: SatelliteCategory.ACTIVE, epoch: new Date() },
      { name: 'GPS BIIR-2', noradId: 24876, line1: '1 24876', line2: '2 24876', category: SatelliteCategory.GPS, epoch: new Date() },
    ];

    beforeEach(() => {
      const tleMap = new Map(mockTles.map((t) => [t.noradId, t]));
      useSatelliteStore.setState({ tleData: tleMap, searchQuery: '' });
    });

    it('adds all satellites to visible when no search query', () => {
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.size).toBe(3);
      expect(visible.has(25544)).toBe(true);
      expect(visible.has(20580)).toBe(true);
      expect(visible.has(24876)).toBe(true);
    });

    it('filters visible satellites by name match (case insensitive)', () => {
      useSatelliteStore.setState({ searchQuery: 'iss' });
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.size).toBe(1);
      expect(visible.has(25544)).toBe(true);
    });

    it('filters visible satellites by name substring match', () => {
      useSatelliteStore.setState({ searchQuery: 'GPS' });
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.size).toBe(1);
      expect(visible.has(24876)).toBe(true);
    });

    it('filters visible satellites by NORAD ID match', () => {
      useSatelliteStore.setState({ searchQuery: '20580' });
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.size).toBe(1);
      expect(visible.has(20580)).toBe(true);
    });

    it('returns empty visible set when no satellites match search', () => {
      useSatelliteStore.setState({ searchQuery: 'NONEXISTENT' });
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.size).toBe(0);
    });

    it('matches NORAD ID by partial string', () => {
      useSatelliteStore.setState({ searchQuery: '44' });
      useSatelliteStore.getState().updateSatellitePositions(Date.now());
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.has(25544)).toBe(true);
    });

    it('re-applies search filter after tleData changes via setSearchQuery', () => {
      useSatelliteStore.setState({ searchQuery: 'ISS' });
      useSatelliteStore.getState().setSearchQuery('ISS');
      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.has(25544)).toBe(true);
    });
  });

  describe('fetchSatellites', () => {
    const mockApiResponse: SatelliteAPIResponse = {
      satellites: [
        { name: 'ISS (ZARYA)', noradId: 25544, line1: '1 25544', line2: '2 25544', category: SatelliteCategory.ACTIVE, epoch: new Date('2024-06-01') },
        { name: 'HST', noradId: 20580, line1: '1 20580', line2: '2 20580', category: SatelliteCategory.ACTIVE, epoch: new Date('2024-06-01') },
      ],
      count: 2,
      category: 'active',
      lastUpdate: '2024-06-01T12:00:00Z',
      cacheExpiry: '2024-06-02T12:00:00Z',
    };

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      (global.fetch as jest.Mock).mockRestore();
    });

    it('fetches satellites successfully and updates state', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await useSatelliteStore.getState().fetchSatellites();

      const state = useSatelliteStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tleData.size).toBe(2);
      expect(state.tleData.get(25544)?.name).toBe('ISS (ZARYA)');
      expect(state.tleData.get(20580)?.name).toBe('HST');
      expect(state.lastUpdate).toEqual(new Date('2024-06-01T12:00:00Z'));
    });

    it('calls the correct API endpoint with default category', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await useSatelliteStore.getState().fetchSatellites();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/satellites?category=active',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('calls the API endpoint with specified category', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockApiResponse, category: 'gps-ops' }),
      });

      await useSatelliteStore.getState().fetchSatellites(SatelliteCategory.GPS);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/satellites?category=gps-ops',
        expect.any(Object)
      );
    });

    it('updates visible satellite positions after fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await useSatelliteStore.getState().fetchSatellites();

      const visible = useSatelliteStore.getState().visibleSatellites;
      expect(visible.has(25544)).toBe(true);
      expect(visible.has(20580)).toBe(true);
      expect(visible.size).toBe(2);
    });

    it('handles API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await useSatelliteStore.getState().fetchSatellites();

      const state = useSatelliteStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toContain('API请求失败');
      expect(state.error).toContain('500');
      expect(state.tleData.size).toBe(0);
    });

    it('handles network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

      await useSatelliteStore.getState().fetchSatellites();

      const state = useSatelliteStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toContain('获取卫星数据失败');
      expect(state.error).toContain('Network failure');
    });

    it('handles unknown error type', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('string error');

      await useSatelliteStore.getState().fetchSatellites();

      const state = useSatelliteStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toContain('未知错误');
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      const fetchCall = useSatelliteStore.getState().fetchSatellites();

      expect(useSatelliteStore.getState().loading).toBe(true);
      expect(useSatelliteStore.getState().error).toBeNull();

      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      });

      await fetchCall;
      expect(useSatelliteStore.getState().loading).toBe(false);
    });
  });

  describe('persistence', () => {
    it('persists showSatellites to localStorage', () => {
      useSatelliteStore.getState().setShowSatellites(false);
      const stored = JSON.parse(localStorage.getItem('satellite-store') || '{}');
      expect(stored.state.showSatellites).toBe(false);
    });

    it('persists showSatellites as true by default', () => {
      const stored = JSON.parse(localStorage.getItem('satellite-store') || '{}');
      expect(stored.state.showSatellites).toBe(true);
    });

    it('does not persist non-whitelisted state like searchQuery', () => {
      useSatelliteStore.getState().setSearchQuery('ISS');
      const stored = JSON.parse(localStorage.getItem('satellite-store') || '{}');
      expect(stored.state.searchQuery).toBeUndefined();
    });
  });
});
