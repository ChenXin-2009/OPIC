/**
 * 运行所有测试
 */

import { execSync } from 'child_process';

const tests = [
  { name: '核心功能测试', file: 'test/time-slider-manual-test.ts' },
  { name: '配置验证测试', file: 'test/test-config-validation.ts' },
  { name: '双向对称性测试', file: 'test/test-bidirectional-symmetry.ts' },
  { name: '性能测试', file: 'test/test-performance.ts' },
  { name: '错误处理测试', file: 'test/test-error-handling.ts' },
];

console.log('=== 运行所有测试 ===\n');

let allPassed = true;

tests.forEach(({ name, file }, index) => {
  console.log(`\n[${ index + 1}/${tests.length}] ${name}`);
  console.log('='.repeat(60));
  
  try {
    execSync(`npx tsx ${file}`, { stdio: 'inherit' });
    console.log(`✓ ${name} 通过\n`);
  } catch (error) {
    console.log(`✗ ${name} 失败\n`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log('测试总结');
console.log('='.repeat(60));
console.log(`总体结果: ${allPassed ? '✓ 所有测试通过' : '✗ 存在失败的测试'}`);
