/**
 * CesiumTerrainManager - Cesium 地形管理器
 *
 * 负责 Cesium Viewer 的地形提供者配置、加载和回退逻辑。
 * 支持 ArcGIS World Elevation 和 Cesium World Terrain 两种源。
 */

import * as Cesium from 'cesium';
import type { CesiumAdapterConfig } from './CesiumAdapterTypes';

type LogFn = (level: 'info' | 'warn' | 'error', message: string) => void;

/**
 * 地形管理器
 *
 * 封装地形提供者的创建、加载、应用和回退逻辑。
 * 生命周期由 CesiumAdapter 控制。
 */
export class CesiumTerrainManager {
  private viewer: Cesium.Viewer;
  private config: CesiumAdapterConfig;
  private log: LogFn;
  private terrainLoadVersion = 0;

  constructor(viewer: Cesium.Viewer, config: CesiumAdapterConfig, log: LogFn) {
    this.viewer = viewer;
    this.config = config;
    this.log = log;
  }

  /**
   * 配置地形提供者
   */
  configure(): void {
    if (!this.viewer) return;

    this.viewer.scene.verticalExaggeration = this.config.terrainExaggeration ?? 1.0;
    this.viewer.scene.verticalExaggerationRelativeHeight =
      this.config.terrainExaggerationRelativeHeight ?? 0;

    if (this.config.terrainProvider) {
      this.viewer.terrainProvider = this.config.terrainProvider;
      this.log('info', 'Custom Cesium terrain provider applied');
      return;
    }

    if (!this.config.enableTerrain || this.config.terrainProviderSource === 'none') {
      return;
    }

    this.loadDefault();
  }

  /** 增加版本号，用于取消过期加载 */
  cancelPendingLoads(): void {
    this.terrainLoadVersion++;
  }

  private loadDefault(): void {
    const loadVersion = ++this.terrainLoadVersion;
    const source = this.config.terrainProviderSource === 'cesium-world-terrain'
      ? 'cesium-world-terrain'
      : 'arcgis-world-elevation';

    void (async () => {
      try {
        const provider = await this.createProvider(source);
        this.applyProvider(provider, source, loadVersion);
      } catch (error) {
        this.log('warn', `Terrain provider ${source} failed: ${error}`);

        if (source !== 'cesium-world-terrain') {
          try {
            const provider = await this.createProvider('cesium-world-terrain');
            this.applyProvider(provider, 'cesium-world-terrain', loadVersion);
          } catch (fallbackError) {
            this.log('warn', `Cesium World Terrain fallback failed: ${fallbackError}`);
          }
        }
      }
    })();
  }

  private async createProvider(
    source: 'arcgis-world-elevation' | 'cesium-world-terrain'
  ): Promise<Cesium.TerrainProvider> {
    if (source === 'cesium-world-terrain') {
      return Cesium.createWorldTerrainAsync({
        requestVertexNormals: this.config.requestTerrainVertexNormals ?? true,
        requestWaterMask: this.config.requestTerrainWaterMask ?? true,
      });
    }

    const options: Cesium.ArcGISTiledElevationTerrainProvider.ConstructorOptions = {};
    const token = this.config.esriTerrainToken ?? process.env.NEXT_PUBLIC_ESRI_API_KEY;
    if (token) {
      options.token = token;
    }

    return Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
      'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
      options
    );
  }

  private applyProvider(
    provider: Cesium.TerrainProvider,
    source: 'arcgis-world-elevation' | 'cesium-world-terrain',
    loadVersion: number
  ): void {
    if (loadVersion !== this.terrainLoadVersion || !this.viewer) {
      return;
    }

    try {
      if ((this.viewer as any).isDestroyed?.()) {
        return;
      }

      this.viewer.terrainProvider = provider;
      this.viewer.scene.globe.maximumScreenSpaceError = this.config.maximumScreenSpaceError ?? 2;
      this.log('info', `Cesium terrain provider loaded: ${source}`);
    } catch (error) {
      this.log('warn', `Applying terrain provider failed: ${error}`);
    }
  }
}
