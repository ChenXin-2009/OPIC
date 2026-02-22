/**
 * 测试双向速度计算的对称性和方向一致性
 */

import { calculateSpeed } from '../src/components/TimeSlider.helpers';

console.log('=== 双向速度计算测试 ===\n');

// 测试1：方向一致性
console.log('测试1：方向一致性');
const directionTests = [
  { pos: 0.3, expectedDir: 'backward' },
  { pos: 0.4, expectedDir: 'backward' },
  { pos: 0.47, expectedDir: 'backward' },  // 在死区外
  { pos: 0.5, expectedDir: 'forward' },  // 中心点默认forward
  { pos: 0.53, expectedDir: 'forward' },  // 在死区外
  { pos: 0.6, expectedDir: 'forward' },
  { pos: 0.7, expectedDir: 'forward' },
];

let directionPass = true;
directionTests.forEach(({ pos, expectedDir }) => {
  const result = calculateSpeed(pos);
  const pass = result.direction === expectedDir;
  if (!pass) directionPass = false;
  console.log(`位置 ${pos}: 方向=${result.direction}, 期望=${expectedDir}, ${pass ? '✓' : '✗'}`);
});
console.log(`方向一致性测试: ${directionPass ? '✓ 通过' : '✗ 失败'}\n`);

// 测试2：双向对称性（速度值相等）
console.log('测试2：双向对称性（速度值相等）');
const symmetryTests = [
  0.3, 0.35, 0.4, 0.45,
  0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95
];

let symmetryPass = true;
symmetryTests.forEach(pos => {
  const forward = calculateSpeed(pos);
  const backward = calculateSpeed(1 - pos);
  const speedDiff = Math.abs(forward.speed - backward.speed);
  const symmetric = speedDiff < 0.0001;
  
  if (!symmetric) symmetryPass = false;
  
  console.log(
    `位置 ${pos.toFixed(2)} vs ${(1 - pos).toFixed(2)}: ` +
    `前进=${forward.speed.toFixed(6)}, 后退=${backward.speed.toFixed(6)}, ` +
    `差值=${speedDiff.toFixed(8)}, ${symmetric ? '✓' : '✗'}`
  );
});
console.log(`双向对称性测试: ${symmetryPass ? '✓ 通过' : '✗ 失败'}\n`);

// 测试3：死区内方向
console.log('测试3：死区内方向（应该都是forward）');
const deadZoneTests = [0.48, 0.49, 0.5, 0.51, 0.52];
let deadZonePass = true;
deadZoneTests.forEach(pos => {
  const result = calculateSpeed(pos);
  const pass = result.speed === 0 && result.direction === 'forward';
  if (!pass) deadZonePass = false;
  console.log(`位置 ${pos}: 速度=${result.speed}, 方向=${result.direction}, ${pass ? '✓' : '✗'}`);
});
console.log(`死区方向测试: ${deadZonePass ? '✓ 通过' : '✗ 失败'}\n`);

// 总结
const allPass = directionPass && symmetryPass && deadZonePass;
console.log('=== 测试总结 ===');
console.log(`方向一致性: ${directionPass ? '✓' : '✗'}`);
console.log(`双向对称性: ${symmetryPass ? '✓' : '✗'}`);
console.log(`死区方向: ${deadZonePass ? '✓' : '✗'}`);
console.log(`总体结果: ${allPass ? '✓ 全部通过' : '✗ 存在失败'}`);
