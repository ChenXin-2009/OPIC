/**
 * 手动测试脚本：时间滑块核心功能验证
 * 
 * 测试内容：
 * 1. 死区内速度为0
 * 2. 各个速度区域的速度计算
 * 3. 区域边界处的连续性
 * 4. 标签格式化
 */

import { calculateSpeed, formatSpeedLabel } from '../src/components/TimeSlider.helpers';

console.log('=== 时间滑块核心功能测试 ===\n');

// 测试1：死区测试
console.log('测试1：死区测试');
console.log('位置 0.5 (中心):', calculateSpeed(0.5));
console.log('位置 0.51 (死区内):', calculateSpeed(0.51));
console.log('位置 0.49 (死区内):', calculateSpeed(0.49));
console.log('');

// 测试2：各个速度区域
console.log('测试2：各个速度区域');
const testPositions = [
  { pos: 0.525, desc: '秒区域起始' },
  { pos: 0.55, desc: '秒区域中间' },
  { pos: 0.575, desc: '秒区域末端' },
  { pos: 0.65, desc: '分区域中间' },
  { pos: 0.75, desc: '时区域中间' },
  { pos: 0.85, desc: '天区域中间' },
  { pos: 0.93, desc: '月区域中间' },
  { pos: 0.98, desc: '年区域末端' },
];

testPositions.forEach(({ pos, desc }) => {
  const result = calculateSpeed(pos);
  const label = formatSpeedLabel(result.speed, 'zh');
  console.log(`位置 ${pos} (${desc}): 速度=${result.speed.toFixed(6)} 天/秒, 方向=${result.direction}, 标签="${label}"`);
});
console.log('');

// 测试3：区域边界连续性
console.log('测试3：区域边界连续性');
const boundaries = [
  { pos1: 0.54999, pos2: 0.55001, desc: '秒/分边界 (0.55)' },
  { pos1: 0.59999, pos2: 0.60001, desc: '分/时边界 (0.60)' },
  { pos1: 0.69999, pos2: 0.70001, desc: '时/天边界 (0.70)' },
  { pos1: 0.79999, pos2: 0.80001, desc: '天/月边界 (0.80)' },
  { pos1: 0.89999, pos2: 0.90001, desc: '月/年边界 (0.90)' },
];

boundaries.forEach(({ pos1, pos2, desc }) => {
  const speed1 = calculateSpeed(pos1).speed;
  const speed2 = calculateSpeed(pos2).speed;
  const diff = Math.abs(speed2 - speed1);
  const continuous = diff < 0.01; // 允许小误差
  console.log(`${desc}: 位置${pos1}=${speed1.toFixed(6)}, 位置${pos2}=${speed2.toFixed(6)}, 差值=${diff.toFixed(6)}, 连续=${continuous ? '✓' : '✗'}`);
});
console.log('');

// 测试4：标签格式化
console.log('测试4：标签格式化（中英文）');
const speedTests = [
  { speed: 0, desc: '零速度' },
  { speed: 1 / 86400, desc: '1秒/秒' },
  { speed: 1 / 1440, desc: '1分/秒' },
  { speed: 1 / 24, desc: '1时/秒' },
  { speed: 1, desc: '1天/秒' },
  { speed: 30, desc: '1月/秒' },
  { speed: 365, desc: '1年/秒' },
];

speedTests.forEach(({ speed, desc }) => {
  const labelZh = formatSpeedLabel(speed, 'zh');
  const labelEn = formatSpeedLabel(speed, 'en');
  console.log(`${desc}: 中文="${labelZh}", 英文="${labelEn}"`);
});
console.log('');

// 测试5：双向对称性
console.log('测试5：双向对称性');
const symmetryTests = [0.3, 0.4, 0.6, 0.7, 0.8];
symmetryTests.forEach(pos => {
  const forward = calculateSpeed(pos);
  const backward = calculateSpeed(1 - pos);
  const symmetric = Math.abs(forward.speed - backward.speed) < 0.0001;
  console.log(`位置 ${pos} vs ${1 - pos}: 前进=${forward.speed.toFixed(6)}, 后退=${backward.speed.toFixed(6)}, 对称=${symmetric ? '✓' : '✗'}`);
});

console.log('\n=== 测试完成 ===');
