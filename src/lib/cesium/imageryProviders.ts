/**
 * Cesium 影像图层源定义
 *
 * 架构层级：Cesium 子系统 → 数据配置层
 *
 * 职责：
 *   - 定义所有可用影像图源的元数据（名称、描述、预览图、分类）
 *   - 提供每个图源的工厂函数（create），按需异步创建 Cesium ImageryProvider 实例
 *   - 包含免费通用地图源（Bing、ESRI、OSM、CartoDB）和 NASA GIBS 实时卫星图层
 *
 * 使用方式：
 *   - UI 组件读取 IMAGERY_SOURCES 渲染图源选择列表
 *   - 用户选择后调用对应条目的 create() 获取 ImageryProvider，
 *     再通过 CesiumEarthExtension.setImageryProvider() 切换图层
 */

export type ImageryCategory = 'general' | 'nasa';

/**
 * 影像图源定义接口
 *
 * 描述单个影像图层的元数据和工厂函数，供 UI 展示和运行时创建 ImageryProvider 使用。
 */
export interface ImagerySourceDef {
  /** 图源唯一标识符，用于程序内部区分不同图源（如 'bing-default'、'osm'） */
  id: string;
  /** 图源显示名称，用于 UI 列表展示 */
  name: string;
  /** 图源简短描述，说明数据来源和内容特点 */
  description: string;
  /** 图源分类：'general' 为通用地图，'nasa' 为 NASA 实时卫星图层 */
  category: ImageryCategory;
  /** 缩略图 URL（静态预览图），用于 UI 中展示图源外观 */
  previewUrl: string;
  /**
   * 是否支持日期参数（NASA GIBS 时序图层专用）
   * - `true`：图层数据按日期更新，create() 接受 date 参数
   * - `false` 或未设置：静态图层，不依赖日期
   */
  temporal?: boolean;
  /**
   * 创建 Cesium ImageryProvider 的异步工厂函数
   *
   * @param date - 可选日期字符串（格式 'YYYY-MM-DD'），仅 temporal=true 的图层使用；
   *               不传时使用默认日期（通常为 2 天前，规避 GIBS 数据延迟）
   * @returns 解析为 Cesium ImageryProvider 实例的 Promise
   */
  create: (date?: string) => Promise<any>;
}

// NASA GIBS WMTS 基础配置
const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi';

/**
 * 获取 N 天前的 ISO 日期字符串（格式：'YYYY-MM-DD'）
 *
 * NASA GIBS（Global Imagery Browse Services）的卫星数据通常有 1-2 天的处理延迟，
 * 即当天的卫星图像需要 1-2 天后才能在 GIBS 服务器上获取到。
 * 因此请求"今天"的数据往往返回 404，需要向前偏移 1-2 天以获取最新可用数据。
 *
 * @param n - 向前偏移的天数（1 表示昨天，2 表示前天）
 * @returns ISO 格式日期字符串，如 '2024-01-15'
 */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// NASA GIBS REST 端点（epsg3857，Web Mercator）
const GIBS_REST = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/**
 * 所有可用影像图源的配置列表
 *
 * 按分类分为两组：
 * - 通用地图源（general）：Bing Maps、ESRI 卫星/街道/国家地理、OSM、CartoDB 暗色
 * - NASA GIBS 实时卫星图层（nasa）：MODIS Terra/Aqua 真彩色、VIIRS 夜间灯光、
 *   MODIS 火点检测、VIIRS 昼夜波段、MODIS 积雪覆盖
 *
 * UI 组件通过此数组渲染图源选择面板，用户选择后调用对应条目的 create() 切换图层。
 */
export const IMAGERY_SOURCES: ImagerySourceDef[] = [
  // ── 通用地图源 ──────────────────────────────────────────────
  {
    id: 'bing-default',
    name: 'Bing Maps',
    description: 'Cesium 内置卫星影像',
    category: 'general',
    previewUrl: 'https://ecn.t3.tiles.virtualearth.net/tiles/a120.jpeg?g=1',
    create: async () => {
      const Cesium = await import('cesium');
      // 使用 Cesium Ion 默认的 Bing Maps 图源（resource id=2）
      return await Cesium.IonImageryProvider.fromAssetId(2);
    },
  },
  {
    id: 'esri-world-imagery',
    name: 'ESRI 卫星影像',
    description: '高分辨率卫星图像',
    category: 'general',
    previewUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/2',
    create: async () => {
      const Cesium = await import('cesium');
      // ESRI World Imagery：ArcGIS Online 提供的高分辨率卫星影像，最高支持 19 级缩放
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
      });
    },
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    description: '开源街道地图',
    category: 'general',
    previewUrl: 'https://tile.openstreetmap.org/2/2/1.png',
    create: async () => {
      const Cesium = await import('cesium');
      // OpenStreetMap：社区维护的开源地图，数据更新频繁，适合展示道路和地名
      return new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });
    },
  },
  {
    id: 'esri-world-street',
    name: 'ESRI 街道地图',
    description: '详细街道和地名',
    category: 'general',
    previewUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/2/1/2',
    create: async () => {
      const Cesium = await import('cesium');
      // ESRI World Street Map：包含详细道路网络、地名标注和行政边界
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 19,
      });
    },
  },
  {
    id: 'carto-dark',
    name: 'CartoDB 暗色',
    description: '深色背景地图',
    category: 'general',
    previewUrl: 'https://a.basemaps.cartocdn.com/dark_all/2/2/1.png',
    create: async () => {
      const Cesium = await import('cesium');
      // CartoDB Dark Matter：深色背景地图，适合与发光效果的卫星轨道叠加显示
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maximumLevel: 19,
        credit: '© OpenStreetMap contributors © CARTO',
      });
    },
  },
  {
    id: 'esri-natgeo',
    name: 'ESRI 国家地理',
    description: '国家地理风格地图',
    category: 'general',
    previewUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/2/1/2',
    create: async () => {
      const Cesium = await import('cesium');
      // ESRI National Geographic：国家地理风格地图，包含地形晕渲和自然地理要素，最高 16 级
      return new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 16,
      });
    },
  },

  // ── NASA GIBS 实时卫星图层 ──────────────────────────────────
  {
    id: 'nasa-modis-terra',
    name: 'MODIS Terra 真彩色',
    description: `NASA 每日卫星真彩色图像（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fjpeg&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      // MODIS Terra 真彩色：使用 GIBS REST 端点，Web Mercator 投影，最高 9 级缩放
      // date 参数默认取 2 天前，规避 GIBS 数据处理延迟
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
  {
    id: 'nasa-modis-aqua',
    name: 'MODIS Aqua 真彩色',
    description: `NASA Aqua 卫星每日图像（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Aqua_CorrectedReflectance_TrueColor&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fjpeg&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      // MODIS Aqua 真彩色：Aqua 卫星（下午过境）的每日真彩色合成图像
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/MODIS_Aqua_CorrectedReflectance_TrueColor/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
  {
    id: 'nasa-viirs-nighttime',
    name: 'VIIRS 夜间灯光',
    description: 'NASA 夜间城市灯光图像（2016年）',
    category: 'nasa',
    temporal: false,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=VIIRS_Black_Marble&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=2016-01-01`,
    create: async () => {
      const Cesium = await import('cesium');
      // VIIRS Black Marble：2016 年合成的全球夜间灯光图，静态图层（不随日期变化）
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
  {
    id: 'nasa-modis-fires',
    name: 'MODIS 火点检测',
    description: `NASA 每日火灾热点（${daysAgo(1)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_Thermal_Anomalies_Day&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(1)}`,
    create: async (date = daysAgo(1)) => {
      const Cesium = await import('cesium');
      // MODIS 热异常（火点）：每日白天过境时检测到的热点，数据延迟约 1 天
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/MODIS_Terra_Thermal_Anomalies_Day/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
  {
    id: 'nasa-viirs-dnb',
    name: 'VIIRS 昼夜波段',
    description: `VIIRS 昼夜波段每日图像（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=VIIRS_SNPP_DayNightBand_ENCC&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      // VIIRS DNB（昼夜波段）：Suomi NPP 卫星的低光成像，可显示城市灯光、极光等
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/VIIRS_SNPP_DayNightBand_ENCC/default/${date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
  {
    id: 'nasa-modis-snow',
    name: 'MODIS 积雪覆盖',
    description: `每日积雪范围（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `${GIBS_BASE}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_Snow_Cover&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      // MODIS 积雪覆盖：每日积雪范围检测，用于监测季节性积雪变化
      return new Cesium.UrlTemplateImageryProvider({
        url: `${GIBS_REST}/MODIS_Terra_Snow_Cover/default/${date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
        credit: 'NASA GIBS',
      });
    },
  },
];

/**
 * 影像图源分类名称映射
 *
 * 将 ImageryCategory 枚举值映射为用户可读的中文分类名称，供 UI 分组展示使用。
 */
export const IMAGERY_CATEGORIES: Record<ImageryCategory, string> = {
  general: '通用地图',
  nasa: 'NASA 实时卫星',
};
