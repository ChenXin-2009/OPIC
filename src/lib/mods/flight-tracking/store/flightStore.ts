/**
 * @module mods/flight-tracking/store/flightStore
 * @description 航班追踪 MOD 状态管理
 */

import { create } from 'zustand';
import type {
  Flight,
  FlightState,
  FlightFilter,
  FlightSort,
  FlightStats,
  FetchStatus,
  FlightTrackingConfig,
} from '../types';
import { DEFAULT_CONFIG } from '../types';
import { stateToFlight, filterValidStates } from '../utils/dataParser';

interface FlightStoreState {
  // 数据
  flights: Map<string, Flight>;
  selectedIcao24: string | null;
  filteredIds: string[];

  // 状态
  fetchStatus: FetchStatus;
  stats: FlightStats;

  // 筛选排序
  filter: FlightFilter;
  sort: FlightSort;

  // 配置
  config: FlightTrackingConfig;
}

interface FlightStoreActions {
  setFlights(states: FlightState[]): void;
  selectFlight(icao24: string | null): void;
  setFilter(filter: Partial<FlightFilter>): void;
  setSort(sort: FlightSort): void;
  setConfig(config: Partial<FlightTrackingConfig>): void;
  setLoading(loading: boolean): void;
  setError(error: string | null): void;
  setLastUpdate(time: number): void;
  incrementRetry(): void;
  resetRetry(): void;
  clearFlights(): void;
}

type FlightStore = FlightStoreState & FlightStoreActions;

function applyFilter(flights: Map<string, Flight>, filter: FlightFilter, sort: FlightSort): string[] {
  let ids = Array.from(flights.keys());

  if (filter.callsign) {
    const q = filter.callsign.toLowerCase();
    ids = ids.filter(id => {
      const f = flights.get(id)!;
      return (
        f.icao24.toLowerCase().includes(q) ||
        (f.callsign?.toLowerCase().includes(q) ?? false)
      );
    });
  }

  if (filter.altitudeRange) {
    const [min, max] = filter.altitudeRange;
    ids = ids.filter(id => {
      const alt = flights.get(id)!.position?.altitude ?? 0;
      return alt >= min && alt <= max;
    });
  }

  if (filter.countries?.length) {
    const countries = filter.countries.map(c => c.toLowerCase());
    ids = ids.filter(id =>
      countries.includes(flights.get(id)!.originCountry.toLowerCase())
    );
  }

  if (filter.onGroundOnly) {
    ids = ids.filter(id => flights.get(id)!.onGround);
  }

  if (filter.inAirOnly) {
    ids = ids.filter(id => !flights.get(id)!.onGround);
  }

  // 排序
  ids.sort((a, b) => {
    const fa = flights.get(a)!;
    const fb = flights.get(b)!;
    let va: number | string = 0;
    let vb: number | string = 0;

    switch (sort.field) {
      case 'altitude':
        va = fa.position?.altitude ?? -1;
        vb = fb.position?.altitude ?? -1;
        break;
      case 'velocity':
        va = fa.velocity ?? -1;
        vb = fb.velocity ?? -1;
        break;
      case 'callsign':
        va = fa.callsign ?? '';
        vb = fb.callsign ?? '';
        break;
      case 'lastContact':
        va = fa.lastContact;
        vb = fb.lastContact;
        break;
    }

    if (va < vb) return sort.direction === 'asc' ? -1 : 1;
    if (va > vb) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return ids;
}

export const useFlightStore = create<FlightStore>((set, get) => ({
  flights: new Map(),
  selectedIcao24: null,
  filteredIds: [],
  fetchStatus: { loading: false, error: null, lastUpdate: null, retryCount: 0 },
  stats: { total: 0, inAir: 0, onGround: 0 },
  filter: {},
  sort: { field: 'lastContact', direction: 'desc' },
  config: DEFAULT_CONFIG,

  setFlights(states) {
    const valid = filterValidStates(states);
    const flights = new Map<string, Flight>();
    for (const s of valid) {
      flights.set(s.icao24, stateToFlight(s));
    }

    const inAir = valid.filter(s => !s.onGround).length;
    const onGround = valid.filter(s => s.onGround).length;

    const { filter, sort } = get();
    const filteredIds = applyFilter(flights, filter, sort);

    set({
      flights,
      filteredIds,
      stats: { total: valid.length, inAir, onGround },
    });
  },

  selectFlight(icao24) {
    set({ selectedIcao24: icao24 });
  },

  setFilter(filter) {
    const newFilter = { ...get().filter, ...filter };
    const filteredIds = applyFilter(get().flights, newFilter, get().sort);
    set({ filter: newFilter, filteredIds });
  },

  setSort(sort) {
    const filteredIds = applyFilter(get().flights, get().filter, sort);
    set({ sort, filteredIds });
  },

  setConfig(config) {
    set(state => ({ config: { ...state.config, ...config } }));
  },

  setLoading(loading) {
    set(state => ({ fetchStatus: { ...state.fetchStatus, loading } }));
  },

  setError(error) {
    set(state => ({ fetchStatus: { ...state.fetchStatus, error } }));
  },

  setLastUpdate(time) {
    set(state => ({ fetchStatus: { ...state.fetchStatus, lastUpdate: time } }));
  },

  incrementRetry() {
    set(state => ({
      fetchStatus: { ...state.fetchStatus, retryCount: state.fetchStatus.retryCount + 1 },
    }));
  },

  resetRetry() {
    set(state => ({ fetchStatus: { ...state.fetchStatus, retryCount: 0 } }));
  },

  clearFlights() {
    set({
      flights: new Map(),
      filteredIds: [],
      selectedIcao24: null,
      stats: { total: 0, inAir: 0, onGround: 0 },
    });
  },
}));
