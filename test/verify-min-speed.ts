/**
 * 验证最小速度为1秒/秒
 */

import { calculateSpeed, formatSpeedLabel } from '../src/components/TimeSlider.helpers';

console.log('=== 验证最小速度 ===\n');

// 测试秒区域的起始位置（应该是最小速度）
const positions = [0.525, 0.53, 0.535, 0.54, 0.545];

console.log('秒区域速度测试：');
positions.forEach(pos => {
  const result = calculateSpeed(pos);
  const speedInSeconds = result.speed * 86400; // 转换为秒/秒
  const label = formatSpeedLabel(result.speed, 'zh');
  console.log(`位置 ${pos}: ${speedInSeconds.toFixed(2)}秒/秒, 标签="${label}"`);
});

console.log('\n最小速度验证：');
const minResult = calculateSpeed(0.525); // 秒区域起始
const minSpeedInSeconds = minResult.speed * 86400;
console.log(`最小速度: ${minSpeedInSeconds.toFixed(2)}秒/秒`);
console.log(`是否 >= 1秒/秒: ${minSpeedInSeconds >= 1 ? '✓' : '✗'}`);

console.log('\n=== 验证完成 ===');
