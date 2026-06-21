import * as THREE from 'three';
import type { CelestialBody, SolarSystemState } from '../state';
import {
  UniverseScale,
  type GalaxyCluster,
  type GalaxyGroup,
  type LocalGroupGalaxy,
  type Supercluster,
} from '../types/universeTypes';
import { planetNames } from '../astronomy/names';
import { getChineseName, LOCAL_GROUP_NAMES } from '../astronomy/universeNames';
import { MEGAPARSEC_TO_AU } from '../constants/units';
import type { ExoplanetHostIndex } from '../types/exoplanet';
import type { TLEData } from '../types/satellite';
import type { SearchResult, SearchResultType, SearchCategory } from './types';
import { TYPE_CATEGORY_MAP } from './types';

export type CelestialType = SearchResultType;

export interface IndexedCelestial {
  id: string;
  nameEn: string;
  nameZh: string;
  type: CelestialType;
  scale: UniverseScale;
  position: THREE.Vector3;
  distance?: number;
  metadata?: Record<string, any>;
}

export class SearchIndex {
  private celestials: Map<string, IndexedCelestial>;
  private _cachedExoplanetHosts: ExoplanetHostIndex[] = [];
  private _cachedSatelliteData: TLEData[] = [];

  constructor() {
    this.celestials = new Map();
  }

  buildFromStore(
    store: SolarSystemState,
    renderers?: {
      localGroup?: any;
      nearbyGroups?: any;
      virgoSupercluster?: any;
      laniakeaSupercluster?: any;
    }
  ): void {
    this.clear();
    this.indexSolarSystemBodies(store.celestialBodies);
    if (renderers?.localGroup) {
      this.indexLocalGroup(renderers.localGroup.getObjectData?.());
    }
    if (renderers?.nearbyGroups) {
      const data = renderers.nearbyGroups.getObjectData?.();
      if (data) {
        this.indexNearbyGroups(data.groups, data.galaxies);
      }
    }
    if (renderers?.virgoSupercluster) {
      const data = renderers.virgoSupercluster.getObjectData?.();
      if (data) {
        this.indexVirgoSupercluster(data.clusters, data.galaxies);
      }
    }
    if (renderers?.laniakeaSupercluster) {
      const data = renderers.laniakeaSupercluster.getObjectData?.();
      if (data) {
        this.indexLaniakeaSupercluster(data);
      }
    }
    // Re-add cached exoplanet hosts and satellites after clear
    if (this._cachedExoplanetHosts.length > 0) {
      this.indexExoplanets(this._cachedExoplanetHosts);
    }
    if (this._cachedSatelliteData.length > 0) {
      this.indexSatellites(this._cachedSatelliteData);
    }
  }

  indexExoplanets(hosts: ExoplanetHostIndex[]): void {
    this._cachedExoplanetHosts = hosts;
    hosts.forEach(host => {
      const nameEn = host.hostname;
      const nameZh = nameEn;
      const indexed: IndexedCelestial = {
        id: `exoplanet-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'exoplanet',
        scale: UniverseScale.NearbyStars,
        position: new THREE.Vector3(0, 0, 0),
        distance: host.distancePc,
        metadata: {
          hostname: host.hostname,
          planetCount: host.planetCount,
          starCount: host.starCount,
          distancePc: host.distancePc,
          raDeg: host.raDeg,
          decDeg: host.decDeg,
        },
      };
      this.add(indexed);
    });
  }

  indexSatellites(satellites: TLEData[]): void {
    this._cachedSatelliteData = satellites;
    satellites.forEach(tle => {
      const nameEn = tle.name;
      const nameZh = nameEn;
      const indexed: IndexedCelestial = {
        id: `satellite-${tle.noradId}`,
        nameEn,
        nameZh,
        type: 'satellite',
        scale: UniverseScale.SolarSystem,
        position: new THREE.Vector3(0, 0, 0),
        metadata: {
          noradId: tle.noradId,
          name: tle.name,
          epoch: tle.epoch,
          category: tle.category,
        },
      };
      this.add(indexed);
    });
  }

  toSearchResult(celestial: IndexedCelestial): SearchResult {
    const category: SearchCategory = TYPE_CATEGORY_MAP[celestial.type] || 'deep-space';
    return {
      id: celestial.id,
      name: celestial.nameZh || celestial.nameEn,
      nameEn: celestial.nameEn,
      nameZh: celestial.nameZh,
      type: celestial.type,
      category,
      relevance: 0,
      scale: celestial.scale,
      position: celestial.position ? { x: celestial.position.x, y: celestial.position.y, z: celestial.position.z } : undefined,
      distance: celestial.distance,
      distanceUnit: celestial.scale === UniverseScale.SolarSystem ? 'AU' : 'Mpc',
      metadata: celestial.metadata,
    };
  }

  toSearchResults(celestials: IndexedCelestial[]): SearchResult[] {
    return celestials.map(c => this.toSearchResult(c));
  }

  private indexSolarSystemBodies(bodies: CelestialBody[]): void {
    bodies.forEach(body => {
      const nameEn = body.name;
      const nameZh = planetNames.zh[nameEn] || nameEn;

      let type: CelestialType;
      if (nameEn === 'Sun') {
        type = 'sun';
      } else if (['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'].includes(nameEn)) {
        type = 'planet';
      } else {
        type = 'moon';
      }

      const indexed: IndexedCelestial = {
        id: `solar-system-${nameEn.toLowerCase()}`,
        nameEn,
        nameZh,
        type,
        scale: UniverseScale.SolarSystem,
        position: new THREE.Vector3(body.x, body.y, body.z),
        distance: Math.sqrt(body.x ** 2 + body.y ** 2 + body.z ** 2),
        metadata: { radius: body.radius },
      };

      this.add(indexed);
    });
  }

  private indexLocalGroup(galaxies?: LocalGroupGalaxy[]): void {
    if (!galaxies) return;
    galaxies.forEach(galaxy => {
      const nameEn = galaxy.name;
      const nameZh = LOCAL_GROUP_NAMES[nameEn] || nameEn;
      const indexed: IndexedCelestial = {
        id: `local-group-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'galaxy',
        scale: UniverseScale.LocalGroup,
        position: new THREE.Vector3(galaxy.x * MEGAPARSEC_TO_AU, galaxy.y * MEGAPARSEC_TO_AU, galaxy.z * MEGAPARSEC_TO_AU),
        distance: Math.sqrt(galaxy.x ** 2 + galaxy.y ** 2 + galaxy.z ** 2),
        metadata: { galaxyType: galaxy.type, brightness: galaxy.brightness, radius: galaxy.radius },
      };
      this.add(indexed);
    });
  }

  private indexNearbyGroups(groups?: GalaxyGroup[], _galaxies?: any[]): void {
    if (!groups) return;
    groups.forEach(group => {
      const nameEn = group.name;
      const nameZh = this.getNearbyGroupName(nameEn);
      const indexed: IndexedCelestial = {
        id: `nearby-groups-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'group',
        scale: UniverseScale.NearbyGroups,
        position: new THREE.Vector3(group.centerX * MEGAPARSEC_TO_AU, group.centerY * MEGAPARSEC_TO_AU, group.centerZ * MEGAPARSEC_TO_AU),
        distance: Math.sqrt(group.centerX ** 2 + group.centerY ** 2 + group.centerZ ** 2),
        metadata: { memberCount: group.memberCount, richness: group.richness, radius: group.radius },
      };
      this.add(indexed);
    });
  }

  private indexVirgoSupercluster(clusters?: GalaxyCluster[], _galaxies?: any[]): void {
    if (!clusters) return;
    clusters.forEach(cluster => {
      const nameEn = cluster.name;
      const nameZh = this.getVirgoClusterName(nameEn);
      const indexed: IndexedCelestial = {
        id: `virgo-supercluster-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'cluster',
        scale: UniverseScale.VirgoSupercluster,
        position: new THREE.Vector3(cluster.centerX * MEGAPARSEC_TO_AU, cluster.centerY * MEGAPARSEC_TO_AU, cluster.centerZ * MEGAPARSEC_TO_AU),
        distance: Math.sqrt(cluster.centerX ** 2 + cluster.centerY ** 2 + cluster.centerZ ** 2),
        metadata: { memberCount: cluster.memberCount, richness: cluster.richness, radius: cluster.radius },
      };
      this.add(indexed);
    });
  }

  private indexLaniakeaSupercluster(superclusters?: Supercluster[]): void {
    if (!superclusters) return;
    superclusters.forEach(supercluster => {
      const nameEn = supercluster.name;
      const nameZh = this.getLaniakeaName(nameEn);
      const indexed: IndexedCelestial = {
        id: `laniakea-supercluster-${nameEn.toLowerCase().replace(/\s+/g, '-')}`,
        nameEn,
        nameZh,
        type: 'supercluster',
        scale: UniverseScale.LaniakeaSupercluster,
        position: new THREE.Vector3(supercluster.centerX * MEGAPARSEC_TO_AU, supercluster.centerY * MEGAPARSEC_TO_AU, supercluster.centerZ * MEGAPARSEC_TO_AU),
        distance: Math.sqrt(supercluster.centerX ** 2 + supercluster.centerY ** 2 + supercluster.centerZ ** 2),
        metadata: { memberCount: supercluster.memberCount, richness: supercluster.richness, radius: supercluster.radius },
      };
      this.add(indexed);
    });
  }

  private getNearbyGroupName(englishName: string): string {
    return getChineseName(englishName, 'nearby-groups');
  }

  private getVirgoClusterName(englishName: string): string {
    return getChineseName(englishName, 'virgo-supercluster');
  }

  private getLaniakeaName(englishName: string): string {
    return getChineseName(englishName, 'laniakea');
  }

  add(celestial: IndexedCelestial): void {
    this.celestials.set(celestial.id, celestial);
  }

  getAll(): IndexedCelestial[] {
    return Array.from(this.celestials.values());
  }

  getById(id: string): IndexedCelestial | undefined {
    return this.celestials.get(id);
  }

  clear(): void {
    this.celestials.clear();
  }

  size(): number {
    return this.celestials.size;
  }
}

export { TYPE_CATEGORY_MAP } from './types';
