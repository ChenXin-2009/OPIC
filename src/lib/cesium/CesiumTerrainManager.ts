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
 *
 * 智能地形：根据相机高度和视角动态启用/禁用三维地形，
 * 俯视地球或高空时自动切换为平坦地形以节省性能。
 */
export class CesiumTerrainManager {
  private viewer: Cesium.Viewer;
  private config: CesiumAdapterConfig;
  private log: LogFn;
  private terrainLoadVersion = 0;

  /** 缓存的真实地形提供者（ArcGIS 或 Cesium World Terrain），用于恢复 */
  private realTerrainProvider: Cesium.TerrainProvider | null = null;
  /** 当前地形是否启用 */
  private terrainEnabled: boolean = true;
  /** 上次启用地形的时间戳（毫秒），仅对启用地形做防抖 */
  private lastEnableTime: number = 0;

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
      this.viewer.terrainProvider = this.config.terrainProvider as unknown as Cesium.TerrainProvider;
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

      this.realTerrainProvider = provider;
      this.viewer.terrainProvider = provider;
      this.viewer.scene.globe.maximumScreenSpaceError = this.config.maximumScreenSpaceError ?? 2;
      this.terrainEnabled = true;
      this.log('info', `Cesium terrain provider loaded: ${source}`);
    } catch (error) {
      this.log('warn', `Applying terrain provider failed: ${error}`);
    }
  }

  /**
   * 运行时切换三维地形启用状态
   *
   * 启用时恢复真实地形提供者，禁用时切换为平坦椭球体地形。
   * - 启用：500ms 防抖，避免快速进出阈值区导致频繁加载
   * - 禁用：立即执行，离开条件区域后立刻关闭高程节省资源
   *
   * @param enabled - 是否启用三维地形
   */
  setTerrainEnabled(enabled: boolean): void {
    if (!this.viewer || (this.viewer as any).isDestroyed?.()) return;

    // 状态未变化，跳过
    if (enabled === this.terrainEnabled) return;

    const now = performance.now();

    if (enabled) {
      // 启用地形有防抖：500ms 内不允许重复启用，避免边界抖动
      if (now - this.lastEnableTime < 500) return;
      this.lastEnableTime = now;

      if (this.realTerrainProvider) {
        this.viewer.terrainProvider = this.realTerrainProvider;
        this.viewer.scene.globe.maximumScreenSpaceError = this.config.maximumScreenSpaceError ?? 2;
        this.terrainEnabled = true;
        this.log('info', 'Smart terrain: 3D terrain ENABLED (oblique view, low altitude)');
      }
    } else {
      // 禁用地形：立即执行，不防抖
      // 离开条件区域后应立刻关闭高程以节省带宽和 GPU
      if (!this.realTerrainProvider && this.viewer.terrainProvider) {
        const isFlat = this.viewer.terrainProvider instanceof Cesium.EllipsoidTerrainProvider;
        if (!isFlat) {
          this.realTerrainProvider = this.viewer.terrainProvider;
        }
      }

      if (this.realTerrainProvider) {
        this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        this.terrainEnabled = false;
        this.log('info', 'Smart terrain: 3D terrain DISABLED (top-down view or high altitude)');
      }
    }
  }
}
