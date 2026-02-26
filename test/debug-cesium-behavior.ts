/**
 * 调试 Cesium 的行为
 */

import * as Cesium from "cesium";

// 测试标准 GeographicTilingScheme
const standard = new Cesium.GeographicTilingScheme({
  numberOfLevelZeroTilesX: 2,
  numberOfLevelZeroTilesY: 1,
});

console.log("=== 标准 GeographicTilingScheme ===");
for (let level = 0; level <= 3; level++) {
  const xTiles = standard.getNumberOfXTilesAtLevel(level);
  const yTiles = standard.getNumberOfYTilesAtLevel(level);
  console.log(`Level ${level}: ${xTiles} × ${yTiles}`);
  
  // 检查瓦片边界
  const rect00 = standard.tileXYToRectangle(0, 0, level);
  const west = Cesium.Math.toDegrees(rect00.west);
  const south = Cesium.Math.toDegrees(rect00.south);
  const east = Cesium.Math.toDegrees(rect00.east);
  const north = Cesium.Math.toDegrees(rect00.north);
  
  const tileWidth = east - west;
  const tileHeight = north - south;
  
  console.log(`  瓦片(0,0): [${west.toFixed(2)}, ${south.toFixed(2)}] to [${east.toFixed(2)}, ${north.toFixed(2)}]`);
  console.log(`  瓦片尺寸: ${tileWidth.toFixed(2)}° × ${tileHeight.toFixed(2)}°`);
}
