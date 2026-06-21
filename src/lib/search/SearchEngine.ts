import Fuse, { IFuseOptions } from 'fuse.js';
import type { IndexedCelestial, SearchIndex } from './SearchIndex';
import type { SearchResult, SearchCategory } from './types';
import { TYPE_CATEGORY_MAP } from './types';

const FUSE_OPTIONS: IFuseOptions<IndexedCelestial> = {
  keys: [
    { name: 'nameEn', weight: 0.5 },
    { name: 'nameZh', weight: 0.5 },
  ],
  threshold: 0.4,
  distance: 100,
  minMatchCharLength: 1,
  includeScore: true,
};

const TYPE_PRIORITY: Record<string, number> = {
  sun: 1,
  planet: 2,
  moon: 3,
  satellite: 3,
  exoplanet: 4,
  galaxy: 5,
  group: 6,
  cluster: 7,
  supercluster: 8,
};

export class SearchEngine {
  private index: SearchIndex;
  private fuse: Fuse<IndexedCelestial>;

  constructor(index: SearchIndex) {
    this.index = index;
    this.fuse = new Fuse(this.index.getAll(), FUSE_OPTIONS);
  }

  search(query: string, maxResults: number = 20, category?: SearchCategory): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    let celestials: IndexedCelestial[];

    const trimmed = query.trim().toLowerCase();

    // Try exact match first
    const exactResults = this.index.getAll().filter(c =>
      c.nameEn.toLowerCase() === trimmed || c.nameZh.toLowerCase() === trimmed
    );

    if (exactResults.length > 0) {
      celestials = exactResults;
    } else {
      const fuseResults = this.fuse.search(trimmed);
      celestials = fuseResults.map(r => r.item);
    }

    // Convert to SearchResult
    let results: SearchResult[] = celestials.map(c => ({
      id: c.id,
      name: c.nameZh || c.nameEn,
      nameEn: c.nameEn,
      nameZh: c.nameZh,
      type: c.type,
      category: TYPE_CATEGORY_MAP[c.type] || 'deep-space',
      relevance: 0,
      scale: c.scale,
      position: c.position ? { x: c.position.x, y: c.position.y, z: c.position.z } : undefined,
      distance: c.distance,
      distanceUnit: String(c.scale) === 'solar-system' ? 'AU' : 'Mpc',
      metadata: c.metadata,
    }));

    // Apply category filter
    if (category && category !== 'all') {
      results = results.filter(r => r.category === category);
    }

    // Sort: type priority then relevance
    results.sort((a, b) => {
      const priorityDiff = (TYPE_PRIORITY[a.type] || 99) - (TYPE_PRIORITY[b.type] || 99);
      if (priorityDiff !== 0) return priorityDiff;
      return a.relevance - b.relevance;
    });

    return results.slice(0, maxResults);
  }

  searchByCategory(query: string, category: SearchCategory, maxResults: number = 10): SearchResult[] {
    return this.search(query, maxResults, category);
  }

  getResultsByCategory(query: string, maxResults: number = 5): Record<SearchCategory, SearchResult[]> {
    const categories: SearchCategory[] = ['solar-system', 'exoplanet', 'satellite', 'deep-space', 'places'];
    const result: Record<SearchCategory, SearchResult[]> = {
      'all': [],
      'solar-system': [],
      'exoplanet': [],
      'satellite': [],
      'deep-space': [],
      'places': [],
    };

    for (const cat of categories) {
      result[cat] = this.search(query, maxResults, cat);
    }

    result['all'] = this.search(query, maxResults * 4);
    return result;
  }

  updateIndex(index: SearchIndex): void {
    this.index = index;
    this.fuse = new Fuse(this.index.getAll(), FUSE_OPTIONS);
  }
}

export type { SearchResult, SearchCategory } from './types';
