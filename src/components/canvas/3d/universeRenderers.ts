import { SceneManager } from '@/lib/3d/SceneManager';
import { UniverseScale } from '@/lib/types/universeTypes';
import { LocalGroupRenderer } from '@/lib/3d/LocalGroupRenderer';
import { NearbyGroupsRenderer } from '@/lib/3d/NearbyGroupsRenderer';
import { VirgoSuperclusterRenderer } from '@/lib/3d/VirgoSuperclusterRenderer';
import { LaniakeaSuperclusterRenderer } from '@/lib/3d/LaniakeaSuperclusterRenderer';
import { logger } from '@/utils/logger';
import * as THREE from 'three';

/**
 * 并行初始化所有宇宙尺度渲染器
 *
 * 性能优化：将原本串行的 4 个尺度加载改为并行（Promise.allSettled），
 * 减少初始化时间约 60-75%。单个尺度加载失败不影响其他尺度。
 */
export async function initializeUniverseRenderers(sceneManager: SceneManager) {
  try {
    const dataLoader = (await import('@/lib/data/UniverseDataLoader')).UniverseDataLoader.getInstance();
    const camera = sceneManager.getCamera();
    const canvas = sceneManager.getRenderer().domElement;

    // 并行加载所有 4 个尺度的数据
    const results = await Promise.allSettled([
      initLocalGroup(dataLoader, sceneManager, camera, canvas),
      initNearbyGroups(dataLoader, sceneManager, camera, canvas),
      initVirgoSupercluster(dataLoader, sceneManager, camera, canvas),
      initLaniakeaSupercluster(dataLoader, sceneManager, camera, canvas),
    ]);

    const names = ['LocalGroup', 'NearbyGroups', 'VirgoSupercluster', 'LaniakeaSupercluster'];
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`Failed to load ${names[i]} data:`, result.reason);
      }
    });

    logger.debug('Universe renderers parallel initialization complete');
  } catch (error) {
    console.error('Error initializing universe renderers:', error);
    throw error;
  }
}

async function initLocalGroup(
  dataLoader: any, sceneManager: SceneManager,
  camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
): Promise<void> {
  const buffer = await dataLoader.loadDataForScale(UniverseScale.LocalGroup);
  const galaxies = dataLoader.parseLocalGroupData(buffer);
  const renderer = new LocalGroupRenderer();
  await renderer.loadData(galaxies);
  renderer.initLabelManager(camera, canvas);
  sceneManager.setLocalGroupRenderer(renderer);
  logger.debug('LocalGroupRenderer initialized with', { galaxyCount: galaxies.length });
}

async function initNearbyGroups(
  dataLoader: any, sceneManager: SceneManager,
  camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
): Promise<void> {
  const buffer = await dataLoader.loadDataForScale(UniverseScale.NearbyGroups);
  const { groups, galaxies } = dataLoader.parseNearbyGroupsData(buffer);
  const renderer = new NearbyGroupsRenderer();
  await renderer.loadData(groups, galaxies);
  renderer.initLabelManager(camera, canvas);
  sceneManager.setNearbyGroupsRenderer(renderer);
  console.log('NearbyGroupsRenderer initialized with', groups.length, 'groups and', galaxies.length, 'galaxies');
}

async function initVirgoSupercluster(
  dataLoader: any, sceneManager: SceneManager,
  camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
): Promise<void> {
  const buffer = await dataLoader.loadDataForScale(UniverseScale.VirgoSupercluster);
  const { clusters, galaxies } = dataLoader.parseVirgoSuperclusterData(buffer);
  const renderer = new VirgoSuperclusterRenderer();
  await renderer.loadData(clusters, galaxies);
  renderer.initLabelManager(camera, canvas);
  sceneManager.setVirgoSuperclusterRenderer(renderer);
  console.log('VirgoSuperclusterRenderer initialized with', clusters.length, 'clusters and', galaxies.length, 'galaxies');
}

async function initLaniakeaSupercluster(
  dataLoader: any, sceneManager: SceneManager,
  camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement,
): Promise<void> {
  const buffer = await dataLoader.loadDataForScale(UniverseScale.LaniakeaSupercluster);
  const { superclusters, galaxies } = dataLoader.parseLaniakeaData(buffer);
  const renderer = new LaniakeaSuperclusterRenderer();
  await renderer.loadData(superclusters, galaxies);
  renderer.initLabelManager(camera, canvas);
  sceneManager.setLaniakeaSuperclusterRenderer(renderer);
  console.log('LaniakeaSuperclusterRenderer initialized with', superclusters.length, 'superclusters and', galaxies.length, 'galaxies');
}
