import { SceneManager } from '@/lib/3d/SceneManager';
import { UniverseScale } from '@/lib/types/universeTypes';
import { LocalGroupRenderer } from '@/lib/3d/LocalGroupRenderer';
import { NearbyGroupsRenderer } from '@/lib/3d/NearbyGroupsRenderer';
import { VirgoSuperclusterRenderer } from '@/lib/3d/VirgoSuperclusterRenderer';
import { LaniakeaSuperclusterRenderer } from '@/lib/3d/LaniakeaSuperclusterRenderer';
import { logger } from '@/utils/logger';

export async function initializeUniverseRenderers(sceneManager: SceneManager) {
  try {
    const dataLoader = (await import('@/lib/data/UniverseDataLoader')).UniverseDataLoader.getInstance();

    try {
      const localGroupBuffer = await dataLoader.loadDataForScale(UniverseScale.LocalGroup);
      const localGroupGalaxies = dataLoader.parseLocalGroupData(localGroupBuffer);
      const localGroupRenderer = new LocalGroupRenderer();
      await localGroupRenderer.loadData(localGroupGalaxies);
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      localGroupRenderer.initLabelManager(camera, canvas);
      sceneManager.setLocalGroupRenderer(localGroupRenderer);
      logger.debug('LocalGroupRenderer initialized with', { galaxyCount: localGroupGalaxies.length });
    } catch (error) {
      console.warn('Failed to load LocalGroup data:', error);
    }

    try {
      const nearbyGroupsBuffer = await dataLoader.loadDataForScale(UniverseScale.NearbyGroups);
      const { groups, galaxies } = dataLoader.parseNearbyGroupsData(nearbyGroupsBuffer);
      const nearbyGroupsRenderer = new NearbyGroupsRenderer();
      await nearbyGroupsRenderer.loadData(groups, galaxies);
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      nearbyGroupsRenderer.initLabelManager(camera, canvas);
      sceneManager.setNearbyGroupsRenderer(nearbyGroupsRenderer);
      console.log('NearbyGroupsRenderer initialized with', groups.length, 'groups and', galaxies.length, 'galaxies'); // @todo migrate to logger.debug
    } catch (error) {
      console.warn('Failed to load NearbyGroups data:', error);
    }

    try {
      const virgoBuffer = await dataLoader.loadDataForScale(UniverseScale.VirgoSupercluster);
      const { clusters, galaxies } = dataLoader.parseVirgoSuperclusterData(virgoBuffer);
      const virgoRenderer = new VirgoSuperclusterRenderer();
      await virgoRenderer.loadData(clusters, galaxies);
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      virgoRenderer.initLabelManager(camera, canvas);
      sceneManager.setVirgoSuperclusterRenderer(virgoRenderer);
      console.log('VirgoSuperclusterRenderer initialized with', clusters.length, 'clusters and', galaxies.length, 'galaxies'); // @todo migrate to logger.debug
    } catch (error) {
      console.warn('Failed to load VirgoSupercluster data:', error);
    }

    try {
      const laniakeaBuffer = await dataLoader.loadDataForScale(UniverseScale.LaniakeaSupercluster);
      const { superclusters, galaxies } = dataLoader.parseLaniakeaData(laniakeaBuffer);
      const laniakeaRenderer = new LaniakeaSuperclusterRenderer();
      await laniakeaRenderer.loadData(superclusters, galaxies);
      const camera = sceneManager.getCamera();
      const canvas = sceneManager.getRenderer().domElement;
      laniakeaRenderer.initLabelManager(camera, canvas);
      sceneManager.setLaniakeaSuperclusterRenderer(laniakeaRenderer);
      console.log('LaniakeaSuperclusterRenderer initialized with', superclusters.length, 'superclusters and', galaxies.length, 'galaxies'); // @todo migrate to logger.debug
    } catch (error) {
      console.warn('Failed to load Laniakea data:', error);
    }

    logger.debug('Universe renderers initialization complete');
  } catch (error) {
    console.error('Error initializing universe renderers:', error);
    throw error;
  }
}
