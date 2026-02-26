/**
 * GIBS ImageryProvider 工厂模块
 * 
 * 负责创建和配置 NASA GIBS WMTS ImageryProvider
 * 基于 NASA 官方实现：https://github.com/nasa-gibs/gibs-web-examples
 */

import * as Cesium from "cesium";
import { GIBSGeographicTilingScheme } from "./gibs-tiling-scheme";

/**
 * GIBS 图层预设接口
 */
export interface GIBSLayerPreset {
  name: string;
  displayName: string;
  layerIdentifier: string;
  tileMatrixSet: string;
  format: "image/jpeg" | "image/png";
  maxLevel: number;
}

/**
 * GIBS Provider 配置接口
 */
export interface GIBSProviderConfig {
  layer: GIBSLayerPreset | string;
  date: Date;
}

/**
 * GIBS 图层预设常量
 */
export const GIBS_LAYER_PRESETS: Record<string, GIBSLayerPreset> = {
  MODIS_TERRA_TRUE_COLOR: {
    name: "MODIS_TERRA_TRUE_COLOR",
    displayName: "MODIS Terra 真彩色",
    layerIdentifier: "MODIS_Terra_CorrectedReflectance_TrueColor",
    tileMatrixSet: "250m",
    format: "image/jpeg",
    maxLevel: 8,
  },
  MODIS_TERRA_INFRARED: {
    name: "MODIS_TERRA_INFRARED",
    displayName: "MODIS Terra 红外",
    layerIdentifier: "MODIS_Terra_CorrectedReflectance_Bands721",
    tileMatrixSet: "250m",
    format: "image/jpeg",
    maxLevel: 8,
  },
  VIIRS_NIGHT_LIGHTS: {
    name: "VIIRS_NIGHT_LIGHTS",
    displayName: "VIIRS 夜间灯光",
    layerIdentifier: "VIIRS_SNPP_DayNightBand_ENCC",
    tileMatrixSet: "250m",
    format: "image/png",
    maxLevel: 8,
  },
};

/**
 * GIBS ImageryProvider 工厂类
 */
export class GIBSProviderFactory {
  /**
   * 创建 GIBS ImageryProvider
   * 
   * 使用 NASA 官方的配置方式：
   * - UrlTemplateImageryProvider（不是 WebMapTileServiceImageryProvider）
   * - URL 格式：RESTful 路径格式
   * - 瓦片尺寸：256×256（NASA 官方标准）
   * 
   * @param config - Provider 配置
   * @returns UrlTemplateImageryProvider 实例
   */
  static createProvider(
    config: GIBSProviderConfig
  ): Cesium.UrlTemplateImageryProvider {
    const preset =
      typeof config.layer === "string"
        ? GIBS_LAYER_PRESETS[config.layer]
        : config.layer;

    if (!preset) {
      throw new Error(`Unknown GIBS layer: ${config.layer}`);
    }

    const dateStr = this.formatDate(config.date);
    const extension = preset.format === "image/jpeg" ? "jpg" : "png";
    
    // NASA 官方 RESTful URL 格式
    const url = `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${preset.layerIdentifier}/default/${dateStr}/${preset.tileMatrixSet}/{z}/{y}/{x}.${extension}`;

    return new Cesium.UrlTemplateImageryProvider({
      url,
      tilingScheme: new GIBSGeographicTilingScheme(),
      tileWidth: 512,
      tileHeight: 512,
      minimumLevel: 0,
      maximumLevel: preset.maxLevel,
      credit: new Cesium.Credit("NASA GIBS / EOSDIS"),
      tileDiscardPolicy: new Cesium.NeverTileDiscardPolicy(),
    });
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   * 
   * @param date - 日期对象
   * @returns YYYY-MM-DD 格式的日期字符串
   */
  static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    
    return `${year}-${month}-${day}`;
  }
}
