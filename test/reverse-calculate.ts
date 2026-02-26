/**
 * 反推 GIBS 的实际像素大小
 */

const METERS_PER_DEGREE = 111319.49079327358;

// Level 0: 2×1, 每个瓦片应该是 180°
const expectedTileSizeDegrees = 180;
const tilePixels = 512;

// 反推像素大小
const pixelSizeDegrees = expectedTileSizeDegrees / tilePixels;
const pixelSizeMeters = pixelSizeDegrees * METERS_PER_DEGREE;

console.log("=== 反推计算 ===");
console.log(`预期瓦片大小: ${expectedTileSizeDegrees}°`);
console.log(`瓦片像素数: ${tilePixels}`);
console.log(`计算出的像素大小(度): ${pixelSizeDegrees}`);
console.log(`计算出的像素大小(米): ${pixelSizeMeters}`);

// 验证 ScaleDenominator
const scaleDenominator0 = 223632905.6114871;
const standardPixelSize = 0.00028;

const calculatedPixelSize = pixelSizeMeters / scaleDenominator0;
console.log(`\n=== 验证 ===`);
console.log(`NASA ScaleDenominator: ${scaleDenominator0}`);
console.log(`标准像素大小: ${standardPixelSize} m`);
console.log(`反推的像素大小系数: ${calculatedPixelSize} m`);
console.log(`差异倍数: ${calculatedPixelSize / standardPixelSize}`);

// 验证其他层级
console.log(`\n=== 验证其他层级 ===`);
const levels = [
  { level: 0, scaleDenominator: 223632905.6114871, matrixWidth: 2 },
  { level: 1, scaleDenominator: 111816452.8057436, matrixWidth: 3 },
  { level: 2, scaleDenominator: 55908226.40287178, matrixWidth: 5 },
];

for (const { level, scaleDenominator, matrixWidth } of levels) {
  const expectedTileSize = 360 / matrixWidth;
  const pixelSize = expectedTileSize / 512;
  const pixelSizeM = pixelSize * METERS_PER_DEGREE;
  const coefficient = pixelSizeM / scaleDenominator;
  
  console.log(`Level ${level}: 预期=${expectedTileSize}°, 系数=${coefficient.toFixed(10)}`);
}
