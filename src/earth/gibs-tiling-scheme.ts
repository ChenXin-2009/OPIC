/**
 * GIBS 自定义 TilingScheme
 * 
 * 基于 NASA GIBS 官方 WMTS TileMatrixSet 定义
 * 使用 ScaleDenominator 标准计算瓦片边界
 */

import * as Cesium from "cesium";

/**
 * GIBS Geographic TilingScheme
 * 
 * 基于 NASA GIBS 官方 WMTS TileMatrixSet 定义
 * 使用 ScaleDenominator 标准计算瓦片边界
 */
export class GIBSGeographicTilingScheme extends Cesium.GeographicTilingScheme {
  private readonly rect = Cesium.Rectangle.MAX_VALUE;
  
  /**
   * 每个层级的 TileMatrix 定义
   * 来自 GIBS WMTS GetCapabilities (250m TileMatrixSet)
   */
  private readonly tileMatrices = [
    {
      identifier: "0",
      scaleDenominator: 223632905.6114871,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 2,
      matrixHeight: 1,
    },
    {
      identifier: "1",
      scaleDenominator: 111816452.8057436,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 3,
      matrixHeight: 2,
    },
    {
      identifier: "2",
      scaleDenominator: 55908226.40287178,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 5,
      matrixHeight: 3,
    },
    {
      identifier: "3",
      scaleDenominator: 27954113.20143589,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 10,
      matrixHeight: 5,
    },
    {
      identifier: "4",
      scaleDenominator: 13977056.60071795,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 20,
      matrixHeight: 10,
    },
    {
      identifier: "5",
      scaleDenominator: 6988528.300358973,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 40,
      matrixHeight: 20,
    },
    {
      identifier: "6",
      scaleDenominator: 3494264.150179486,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 80,
      matrixHeight: 40,
    },
    {
      identifier: "7",
      scaleDenominator: 1747132.075089743,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 160,
      matrixHeight: 80,
    },
    {
      identifier: "8",
      scaleDenominator: 873566.0375448716,
      topLeftCorner: { lon: -180, lat: 90 },
      tileWidth: 512,
      tileHeight: 512,
      matrixWidth: 320,
      matrixHeight: 160,
    },
  ];

  /**
   * WMTS 标准常量
   * 来自 OGC WMTS 1.0.0 规范
   */
  private readonly STANDARD_PIXEL_SIZE = 0.00028; // 0.28mm per pixel
  private readonly METERS_PER_DEGREE = 111319.49079327358; // WGS84 椭球在赤道的米/度

  constructor() {
    super({
      numberOfLevelZeroTilesX: 2,
      numberOfLevelZeroTilesY: 1,
      rectangle: Cesium.Rectangle.MAX_VALUE,
    });
  }

  /**
   * 根据 ScaleDenominator 计算像素大小(弧度)
   * 
   * 公式: pixelSize = scaleDenominator × 0.28mm/pixel ÷ metersPerUnit
   */
  private getPixelSizeInRadians(scaleDenominator: number): number {
    const pixelSizeInMeters = scaleDenominator * this.STANDARD_PIXEL_SIZE;
    const pixelSizeInDegrees = pixelSizeInMeters / this.METERS_PER_DEGREE;
    return Cesium.Math.toRadians(pixelSizeInDegrees);
  }

  /**
   * 获取指定层级的 X 方向瓦片数量
   */
  override getNumberOfXTilesAtLevel(level: number): number {
    if (level < 0 || level >= this.tileMatrices.length) {
      return 0;
    }
    return this.tileMatrices[level].matrixWidth;
  }

  /**
   * 获取指定层级的 Y 方向瓦片数量
   */
  override getNumberOfYTilesAtLevel(level: number): number {
    if (level < 0 || level >= this.tileMatrices.length) {
      return 0;
    }
    return this.tileMatrices[level].matrixHeight;
  }

  /**
   * 将瓦片坐标转换为地理矩形
   * 
   * 使用 WMTS 标准的 ScaleDenominator 计算
   */
  override tileXYToRectangle(
    x: number,
    y: number,
    level: number,
    result?: Cesium.Rectangle
  ): Cesium.Rectangle {
    if (level < 0 || level >= this.tileMatrices.length) {
      throw new Error(`Invalid level: ${level}`);
    }

    const matrix = this.tileMatrices[level];
    
    // 计算单个像素的大小(弧度)
    const pixelSizeRadians = this.getPixelSizeInRadians(matrix.scaleDenominator);
    
    // 计算单个瓦片的大小(弧度)
    const tileWidthRadians = pixelSizeRadians * matrix.tileWidth;
    const tileHeightRadians = pixelSizeRadians * matrix.tileHeight;
    
    // TopLeftCorner 转换为弧度
    const topLeftLon = Cesium.Math.toRadians(matrix.topLeftCorner.lon);
    const topLeftLat = Cesium.Math.toRadians(matrix.topLeftCorner.lat);
    
    // 计算瓦片边界
    const west = topLeftLon + x * tileWidthRadians;
    const east = west + tileWidthRadians;
    const north = topLeftLat - y * tileHeightRadians;
    const south = north - tileHeightRadians;

    if (!result) {
      result = new Cesium.Rectangle(west, south, east, north);
    } else {
      result.west = west;
      result.south = south;
      result.east = east;
      result.north = north;
    }
    
    return result;
  }

  /**
   * 将地理位置转换为瓦片坐标
   */
  override positionToTileXY(
    position: Cesium.Cartographic,
    level: number,
    result?: Cesium.Cartesian2
  ): Cesium.Cartesian2 {
    if (!Cesium.Rectangle.contains(this.rect, position)) {
      if (!result) {
        return new Cesium.Cartesian2(0, 0);
      }
      result.x = 0;
      result.y = 0;
      return result;
    }

    if (level < 0 || level >= this.tileMatrices.length) {
      if (!result) {
        return new Cesium.Cartesian2(0, 0);
      }
      result.x = 0;
      result.y = 0;
      return result;
    }

    const matrix = this.tileMatrices[level];
    
    // 计算单个像素的大小(弧度)
    const pixelSizeRadians = this.getPixelSizeInRadians(matrix.scaleDenominator);
    
    // 计算单个瓦片的大小(弧度)
    const tileWidthRadians = pixelSizeRadians * matrix.tileWidth;
    const tileHeightRadians = pixelSizeRadians * matrix.tileHeight;
    
    // TopLeftCorner 转换为弧度
    const topLeftLon = Cesium.Math.toRadians(matrix.topLeftCorner.lon);
    const topLeftLat = Cesium.Math.toRadians(matrix.topLeftCorner.lat);
    
    // 计算瓦片坐标
    const longitude = position.longitude;
    const latitude = position.latitude;
    
    let xTileCoordinate = Math.floor((longitude - topLeftLon) / tileWidthRadians);
    let yTileCoordinate = Math.floor((topLeftLat - latitude) / tileHeightRadians);
    
    // 边界检查
    if (xTileCoordinate < 0) xTileCoordinate = 0;
    if (xTileCoordinate >= matrix.matrixWidth) xTileCoordinate = matrix.matrixWidth - 1;
    if (yTileCoordinate < 0) yTileCoordinate = 0;
    if (yTileCoordinate >= matrix.matrixHeight) yTileCoordinate = matrix.matrixHeight - 1;

    if (!result) {
      result = new Cesium.Cartesian2(xTileCoordinate, yTileCoordinate);
    } else {
      result.x = xTileCoordinate;
      result.y = yTileCoordinate;
    }
    
    return result;
  }

  /**
   * 检查瓦片是否可用
   * 防止 Cesium 请求无效瓦片
   */
  getTileDataAvailable(x: number, y: number, level: number): boolean {
    if (level < 0 || level >= this.tileMatrices.length) {
      return false;
    }
    
    const matrix = this.tileMatrices[level];
    return x >= 0 && x < matrix.matrixWidth && y >= 0 && y < matrix.matrixHeight;
  }
}
