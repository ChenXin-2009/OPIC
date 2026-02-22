/**
 * 测试配置验证函数
 */

import { validateSpeedZoneConfig } from '../src/components/TimeSlider.helpers';
import { TIME_SLIDER_CONFIG } from '../src/lib/config/visualConfig';

console.log('=== 配置验证测试 ===\n');

// 测试1：验证当前配置
console.log('测试1：验证当前配置');
const result = validateSpeedZoneConfig(
  TIME_SLIDER_CONFIG.speedZones,
  TIME_SLIDER_CONFIG.deadZone
);

if (result.valid) {
  console.log('✓ 配置有效');
} else {
  console.log('✗ 配置无效:');
  result.errors.forEach(err => console.log(`  - ${err}`));
}
console.log('');

// 测试2：测试无效配置（区域不连续）
console.log('测试2：测试无效配置（区域不连续）');
const invalidZones = [
  { name: 'zone1', start: 0.05, end: 0.1, maxSpeed: 1, exponent: 1.5, unit: { zh: '', en: '' } },
  { name: 'zone2', start: 0.15, end: 0.2, maxSpeed: 2, exponent: 1.5, unit: { zh: '', en: '' } }, // 不连续
];
const result2 = validateSpeedZoneConfig(invalidZones, 0.05);
console.log(`有效: ${result2.valid}`);
if (!result2.valid) {
  console.log('错误:');
  result2.errors.forEach(err => console.log(`  - ${err}`));
}
console.log('');

// 测试3：测试无效配置（负速度）
console.log('测试3：测试无效配置（负速度）');
const invalidZones2 = [
  { name: 'zone1', start: 0.05, end: 0.1, maxSpeed: -1, exponent: 1.5, unit: { zh: '', en: '' } },
];
const result3 = validateSpeedZoneConfig(invalidZones2, 0.05);
console.log(`有效: ${result3.valid}`);
if (!result3.valid) {
  console.log('错误:');
  result3.errors.forEach(err => console.log(`  - ${err}`));
}

console.log('\n=== 测试完成 ===');
