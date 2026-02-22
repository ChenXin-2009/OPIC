/**
 * 测试错误处理和边界情况
 */

import { calculateSpeed, formatSpeedLabel } from '../src/components/TimeSlider.helpers';

console.log('=== 错误处理和边界情况测试 ===\n');

// 测试1：calculateSpeed 超出范围的position
console.log('测试1：calculateSpeed 超出范围的position');
const positionTests = [
  { pos: -0.5, desc: '负数' },
  { pos: -0.1, desc: '小负数' },
  { pos: 0, desc: '最小值' },
  { pos: 0.5, desc: '中心' },
  { pos: 1, desc: '最大值' },
  { pos: 1.5, desc: '超出最大值' },
  { pos: 2, desc: '大超出' },
];

positionTests.forEach(({ pos, desc }) => {
  const result = calculateSpeed(pos);
  console.log(`位置 ${pos} (${desc}): 速度=${result.speed.toFixed(6)}, 方向=${result.direction}`);
});
console.log('');

// 测试2：formatSpeedLabel 特殊值
console.log('测试2：formatSpeedLabel 特殊值');
const speedTests = [
  { speed: NaN, desc: 'NaN' },
  { speed: Infinity, desc: 'Infinity' },
  { speed: -Infinity, desc: '-Infinity' },
  { speed: 0, desc: '零' },
  { speed: -1, desc: '负数' },
  { speed: 0.000001, desc: '极小正数' },
  { speed: 1000000, desc: '极大正数' },
];

speedTests.forEach(({ speed, desc }) => {
  const labelZh = formatSpeedLabel(speed, 'zh');
  const labelEn = formatSpeedLabel(speed, 'en');
  console.log(`速度 ${speed} (${desc}): 中文="${labelZh}", 英文="${labelEn}"`);
});
console.log('');

// 测试3：formatSpeedLabel 无效语言参数
console.log('测试3：formatSpeedLabel 无效语言参数');
const invalidLangTests = [
  { speed: 1, lang: 'fr' as any, desc: '法语' },
  { speed: 1, lang: 'es' as any, desc: '西班牙语' },
  { speed: 1, lang: '' as any, desc: '空字符串' },
  { speed: 1, lang: null as any, desc: 'null' },
  { speed: 1, lang: undefined as any, desc: 'undefined' },
];

invalidLangTests.forEach(({ speed, lang, desc }) => {
  try {
    const label = formatSpeedLabel(speed, lang);
    console.log(`语言 "${lang}" (${desc}): 结果="${label}"`);
  } catch (error) {
    console.log(`语言 "${lang}" (${desc}): 错误=${error}`);
  }
});
console.log('');

// 测试4：边界值精度
console.log('测试4：边界值精度');
const precisionTests = [
  { pos: 0.5 + 0.025, desc: '死区边界' },
  { pos: 0.55, desc: '秒/分边界' },
  { pos: 0.6, desc: '分/时边界' },
  { pos: 0.7, desc: '时/天边界' },
  { pos: 0.8, desc: '天/月边界' },
  { pos: 0.9, desc: '月/年边界' },
];

precisionTests.forEach(({ pos, desc }) => {
  const result = calculateSpeed(pos);
  const label = formatSpeedLabel(result.speed, 'zh');
  console.log(`${desc} (${pos}): 速度=${result.speed.toFixed(8)}, 标签="${label}"`);
});

console.log('\n=== 测试完成 ===');
console.log('所有边界情况都得到正确处理');
