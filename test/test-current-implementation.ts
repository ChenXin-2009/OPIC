/**
 * 测试当前实现
 */

import * as Cesium from "cesium";

// 模拟当前实现
class TestTilingScheme {
  private readonly tileMatrices = [
    { matrixWidth: 2, matrixHeight: 1 },
    { matrixWidth: 3, matrixHeight: 2 },
  ];

  private readonly TOTAL_WIDTH_DEGREES = 360;
  private readonly TOTAL_HEIGHT_DEGREES = 180;
  private readonly WEST_DEGREES = -180;
  private readonly NORTH_DEGREES = 90;

  tileXYToRectangle(x: number, y: number, level: number) {
    const matrix = this.tileMatrices[level];
    
    const tileWidthDegrees = this.TOTAL_WIDTH_DEGREES / matrix.matrixWidth;
    const tileHeightDegrees = this.TOTAL_HEIGHT_DEGREES / matrix.matrixHeight;
    
    const westDegrees = this.WEST_DEGREES + x * tileWidthDegrees;
    const eastDegrees = westDegrees + tileWidthDegrees;
    const northDegrees = this.NORTH_DEGREES - y * tileHeightDegrees;
    const southDegrees = northDegrees - tileHeightDegrees;
    
    return {
      west: westDegrees,
      south: southDegrees,
      east: eastDegrees,
      north: northDegrees,
    };
  }
}

const scheme = new TestTilingScheme();

console.log("=== Level 0 瓦片边界 ===");
console.log("瓦片(0,0):", scheme.tileXYToRectangle(0, 0, 0));
console.log("瓦片(1,0):", scheme.tileXYToRectangle(1, 0, 0));

console.log("\n=== Level 1 瓦片边界 ===");
for (let y = 0; y < 2; y++) {
  for (let x = 0; x < 3; x++) {
    console.log(`瓦片(${x},${y}):`, scheme.tileXYToRectangle(x, y, 1));
  }
}

// 检查是否有间隙或重叠
console.log("\n=== 检查 Level 0 连续性 ===");
const tile00 = scheme.tileXYToRectangle(0, 0, 0);
const tile10 = scheme.tileXYToRectangle(1, 0, 0);
console.log(`瓦片(0,0) east: ${tile00.east}`);
console.log(`瓦片(1,0) west: ${tile10.west}`);
console.log(`间隙: ${tile10.west - tile00.east}`);
