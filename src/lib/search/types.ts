export type SearchResultType =
  | 'sun'
  | 'planet'
  | 'moon'
  | 'satellite'
  | 'exoplanet'
  | 'galaxy'
  | 'group'
  | 'cluster'
  | 'supercluster'
  | 'place';

export type SearchCategory = 'all' | 'solar-system' | 'exoplanet' | 'satellite' | 'deep-space' | 'places';

export interface SearchResult {
  id: string;
  name: string;
  nameEn: string;
  nameZh: string;
  type: SearchResultType;
  category: SearchCategory;
  relevance: number;
  scale?: string;
  position?: { x: number; y: number; z: number };
  distance?: number;
  distanceUnit?: 'AU' | 'Mpc' | 'km' | 'pc';
  description?: string;
  metadata?: Record<string, any>;
}

export const CATEGORY_LABELS: Record<SearchCategory, { zh: string; en: string }> = {
  'all': { zh: '全部', en: 'All' },
  'solar-system': { zh: '太阳系', en: 'Solar System' },
  'exoplanet': { zh: '系外行星', en: 'Exoplanets' },
  'satellite': { zh: '人造卫星', en: 'Satellites' },
  'deep-space': { zh: '深空', en: 'Deep Space' },
  'places': { zh: '地球地点', en: 'Places' },
};

export const TYPE_COLORS: Record<SearchResultType, string> = {
  sun: '#ffaa00',
  planet: '#4488ff',
  moon: '#88ccff',
  satellite: '#66dd88',
  exoplanet: '#ff66aa',
  galaxy: '#aa88ff',
  group: '#ffaa88',
  cluster: '#ffcc66',
  supercluster: '#ff88cc',
  place: '#44ddb8',
};

export const TYPE_CATEGORY_MAP: Record<SearchResultType, SearchCategory> = {
  sun: 'solar-system',
  planet: 'solar-system',
  moon: 'solar-system',
  satellite: 'satellite',
  exoplanet: 'exoplanet',
  galaxy: 'deep-space',
  group: 'deep-space',
  cluster: 'deep-space',
  supercluster: 'deep-space',
  place: 'places',
};

export const TYPE_LABELS: Record<SearchResultType, { zh: string; en: string }> = {
  sun: { zh: '恒星', en: 'Star' },
  planet: { zh: '行星', en: 'Planet' },
  moon: { zh: '卫星', en: 'Moon' },
  satellite: { zh: '人造卫星', en: 'Satellite' },
  exoplanet: { zh: '系外行星', en: 'Exoplanet' },
  galaxy: { zh: '星系', en: 'Galaxy' },
  group: { zh: '星系群', en: 'Group' },
  cluster: { zh: '星系团', en: 'Cluster' },
  supercluster: { zh: '超星系团', en: 'Supercluster' },
  place: { zh: '地点', en: 'Place' },
};

export const CATEGORY_ICONS: Record<SearchCategory, string> = {
  'all': '🔭',
  'solar-system': '☀️',
  'exoplanet': '🪐',
  'satellite': '📡',
  'deep-space': '🌌',
  'places': '🌍',
};

export function getCategoryIcon(type: SearchResultType): string {
  return CATEGORY_ICONS[TYPE_CATEGORY_MAP[type]] || '🔭';
}
