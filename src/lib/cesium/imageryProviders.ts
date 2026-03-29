/**
 * Cesium 影像图层源定义
 * 包含免费地图源和 NASA GIBS 实时卫星图层
 */

export type ImageryCategory = 'general' | 'nasa';

export interface ImagerySourceDef {
  id: string;
  name: string;
  description: string;
  category: ImageryCategory;
  /** 缩略图 URL（静态预览图） */
  previewUrl: string;
  /** 是否支持日期参数（NASA GIBS 时序图层） */
  temporal?: boolean;
  /** 创建 Cesium ImageryProvider 的工厂函数 */
  create: (date?: string) => Promise<any>;
}

// NASA GIBS WMTS 基础配置
const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi';

/** 获取 N 天前的 ISO 日期字符串（GIBS 有 1-2 天延迟） */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

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
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_CorrectedReflectance_TrueColor&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fjpeg&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=${date}`,
        layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'GoogleMapsCompatible_Level9',
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
  {
    id: 'nasa-modis-aqua',
    name: 'MODIS Aqua 真彩色',
    description: `NASA Aqua 卫星每日图像（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Aqua_CorrectedReflectance_TrueColor&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fjpeg&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=${date}`,
        layer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',
        style: 'default',
        format: 'image/jpeg',
        tileMatrixSetID: 'GoogleMapsCompatible_Level9',
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
  {
    id: 'nasa-viirs-nighttime',
    name: 'VIIRS 夜间灯光',
    description: 'NASA 夜间城市灯光图像',
    category: 'nasa',
    temporal: false,
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=VIIRS_Black_Marble&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=2016-01-01`,
    create: async () => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=2016-01-01`,
        layer: 'VIIRS_Black_Marble',
        style: 'default',
        format: 'image/png',
        tileMatrixSetID: 'GoogleMapsCompatible_Level8',
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
  {
    id: 'nasa-modis-fires',
    name: 'MODIS 火点检测',
    description: `NASA 每日火灾热点（叠加层，${daysAgo(1)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_Thermal_Anomalies_Day&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level9&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(1)}`,
    create: async (date = daysAgo(1)) => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=${date}`,
        layer: 'MODIS_Terra_Thermal_Anomalies_Day',
        style: 'default',
        format: 'image/png',
        tileMatrixSetID: 'GoogleMapsCompatible_Level9',
        maximumLevel: 9,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
  {
    id: 'nasa-viirs-dnb',
    name: 'VIIRS 昼夜波段',
    description: `VIIRS 昼夜波段每日图像（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=VIIRS_SNPP_DayNightBand_ENCC&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=${date}`,
        layer: 'VIIRS_SNPP_DayNightBand_ENCC',
        style: 'default',
        format: 'image/png',
        tileMatrixSetID: 'GoogleMapsCompatible_Level8',
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
  {
    id: 'nasa-modis-snow',
    name: 'MODIS 积雪覆盖',
    description: `每日积雪范围（${daysAgo(2)}）`,
    category: 'nasa',
    temporal: true,
    previewUrl: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=MODIS_Terra_Snow_Cover&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible_Level8&TILEMATRIX=2&TILEROW=1&TILECOL=2&FORMAT=image%2Fpng&TIME=${daysAgo(2)}`,
    create: async (date = daysAgo(2)) => {
      const Cesium = await import('cesium');
      return new Cesium.WebMapTileServiceImageryProvider({
        url: `${GIBS_BASE}?TIME=${date}`,
        layer: 'MODIS_Terra_Snow_Cover',
        style: 'default',
        format: 'image/png',
        tileMatrixSetID: 'GoogleMapsCompatible_Level8',
        maximumLevel: 8,
        tilingScheme: new Cesium.WebMercatorTilingScheme(),
      });
    },
  },
];

export const IMAGERY_CATEGORIES: Record<ImageryCategory, string> = {
  general: '通用地图',
  nasa: 'NASA 实时卫星',
};
