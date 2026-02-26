/**
 * 验证 GIBS TilingScheme 计算
 */

// Level 0 应该是:
// 2×1 瓦片
// 每个瓦片: 180° × 180°
// 瓦片 (0,0): -180° to 0°, 90° to -90°
// 瓦片 (1,0): 0° to 180°, 90° to -90°

console.log("=== Level 0 验证 ===");
const level0_matrixWidth = 2;
const level0_matrixHeight = 1;
const tileWidthDegrees = 360 / level0_matrixWidth;  // 180°
const tileHeightDegrees = 180 / level0_matrixHeight; // 180°

console.log(`瓦片尺寸: ${tileWidthDegrees}° × ${tileHeightDegrees}°`);

// 瓦片 (0, 0)
const tile00_west = -180 + 0 * tileWidthDegrees;   // -180
const tile00_east = tile00_west + tileWidthDegrees; // 0
const tile00_north = 90 - 0 * tileHeightDegrees;    // 90
const tile00_south = tile00_north - tileHeightDegrees; // -90

console.log(`瓦片(0,0): [${tile00_west}, ${tile00_south}] to [${tile00_east}, ${tile00_north}]`);

// 瓦片 (1, 0)
const tile10_west = -180 + 1 * tileWidthDegrees;   // 0
const tile10_east = tile10_west + tileWidthDegrees; // 180
const tile10_north = 90 - 0 * tileHeightDegrees;    // 90
const tile10_south = tile10_north - tileHeightDegrees; // -90

console.log(`瓦片(1,0): [${tile10_west}, ${tile10_south}] to [${tile10_east}, ${tile10_north}]`);

console.log("\n=== Level 1 验证 ===");
const level1_matrixWidth = 3;
const level1_matrixHeight = 2;
const tile1WidthDegrees = 360 / level1_matrixWidth;  // 120°
const tile1HeightDegrees = 180 / level1_matrixHeight; // 90°

console.log(`瓦片尺寸: ${tile1WidthDegrees}° × ${tile1HeightDegrees}°`);

// 验证几个瓦片
for (let y = 0; y < level1_matrixHeight; y++) {
  for (let x = 0; x < level1_matrixWidth; x++) {
    const west = -180 + x * tile1WidthDegrees;
    const east = west + tile1WidthDegrees;
    const north = 90 - y * tile1HeightDegrees;
    const south = north - tile1HeightDegrees;
    console.log(`瓦片(${x},${y}): [${west}, ${south}] to [${east}, ${north}]`);
  }
}

console.log("\n=== 验证 ScaleDenominator 计算 ===");
// WMTS 标准公式
const STANDARD_PIXEL_SIZE = 0.00028; // 0.28mm
const METERS_PER_DEGREE = 111319.49079327358;

const scaleDenominator0 = 223632905.6114871;
const pixelSizeMeters = scaleDenominator0 * STANDARD_PIXEL_SIZE;
const pixelSizeDegrees = pixelSizeMeters / METERS_PER_DEGREE;
const tileSizeDegrees = pixelSizeDegrees * 512;

console.log(`ScaleDenominator: ${scaleDenominator0}`);
console.log(`像素大小(米): ${pixelSizeMeters}`);
console.log(`像素大小(度): ${pixelSizeDegrees}`);
console.log(`瓦片大小(度, 512像素): ${tileSizeDegrees}`);
console.log(`预期瓦片大小(度): ${tileWidthDegrees}`);
console.log(`差异: ${Math.abs(tileSizeDegrees - tileWidthDegrees)}`);
