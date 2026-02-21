/**
 * 后端服务验证脚本
 * 直接测试Celestrak客户端和数据处理逻辑
 */

import { celestrakClient } from '../src/lib/server/celestrakClient.js';
import { SatelliteCategory } from '../src/lib/types/satellite.js';

async function verifyBackend() {
  console.log('='.repeat(60));
  console.log('开始验证后端服务');
  console.log('='.repeat(60));
  console.log();

  let allTestsPassed = true;

  // 测试1: 验证Celestrak客户端可以获取数据
  console.log('测试1: 验证Celestrak客户端数据获取');
  console.log('-'.repeat(60));
  try {
    const startTime = Date.now();
    const satellites = await celestrakClient.fetchTLE(SatelliteCategory.ACTIVE);
    const duration = Date.now() - startTime;

    if (satellites.length === 0) {
      console.error('❌ 失败: 未获取到任何卫星数据');
      allTestsPassed = false;
    } else {
      console.log(`✓ 成功获取 ${satellites.length} 颗卫星数据`);
      console.log(`✓ 耗时: ${duration}ms`);
      
      // 显示第一颗卫星的信息
      const first = satellites[0];
      console.log(`✓ 示例卫星: ${first.name}`);
      console.log(`  - NORAD ID: ${first.noradId}`);
      console.log(`  - 类别: ${first.category}`);
      console.log(`  - 历元: ${first.epoch.toISOString()}`);
      console.log(`  - TLE第一行长度: ${first.line1.length}`);
      console.log(`  - TLE第二行长度: ${first.line2.length}`);
    }
  } catch (error) {
    console.error('❌ 失败:', error instanceof Error ? error.message : error);
    allTestsPassed = false;
  }
  console.log();

  // 测试2: 验证TLE数据格式
  console.log('测试2: 验证TLE数据格式');
  console.log('-'.repeat(60));
  try {
    const satellites = await celestrakClient.fetchTLE(SatelliteCategory.ACTIVE);
    let validCount = 0;
    let invalidCount = 0;

    for (const sat of satellites.slice(0, 100)) { // 检查前100颗
      if (
        sat.name &&
        sat.noradId > 0 &&
        sat.line1.length === 69 &&
        sat.line2.length === 69 &&
        sat.line1.startsWith('1 ') &&
        sat.line2.startsWith('2 ')
      ) {
        validCount++;
      } else {
        invalidCount++;
        console.warn(`  警告: 无效数据 - ${sat.name}`);
      }
    }

    if (invalidCount > 0) {
      console.error(`❌ 发现 ${invalidCount} 个无效数据`);
      allTestsPassed = false;
    } else {
      console.log(`✓ 所有检查的卫星数据格式正确 (检查了 ${validCount} 颗)`);
    }
  } catch (error) {
    console.error('❌ 失败:', error instanceof Error ? error.message : error);
    allTestsPassed = false;
  }
  console.log();

  // 测试3: 验证不同类别
  console.log('测试3: 验证不同卫星类别');
  console.log('-'.repeat(60));
  const categories = [
    SatelliteCategory.ACTIVE,
    SatelliteCategory.ISS,
    SatelliteCategory.GPS,
    SatelliteCategory.WEATHER
  ];

  for (const category of categories) {
    try {
      const satellites = await celestrakClient.fetchTLE(category);
      console.log(`✓ ${category}: ${satellites.length} 颗卫星`);
    } catch (error) {
      console.error(`❌ ${category} 失败:`, error instanceof Error ? error.message : error);
      allTestsPassed = false;
    }
  }
  console.log();

  // 测试4: 验证TLE解析逻辑
  console.log('测试4: 验证TLE解析逻辑');
  console.log('-'.repeat(60));
  try {
    // 使用已知的ISS TLE数据进行测试
    const testTLE = `ISS (ZARYA)
1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005
2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000`;

    const parsed = celestrakClient.parseTLE(testTLE, SatelliteCategory.ISS);
    
    if (parsed.length === 0) {
      console.error('❌ 解析失败: 未能解析测试TLE数据');
      allTestsPassed = false;
    } else {
      const iss = parsed[0];
      console.log(`✓ 成功解析测试TLE数据`);
      console.log(`  - 名称: ${iss.name}`);
      console.log(`  - NORAD ID: ${iss.noradId}`);
      console.log(`  - 历元: ${iss.epoch.toISOString()}`);
      
      // 验证NORAD ID是否正确
      if (iss.noradId !== 25544) {
        console.error(`❌ NORAD ID不正确: 期望25544, 实际${iss.noradId}`);
        allTestsPassed = false;
      } else {
        console.log(`✓ NORAD ID正确`);
      }
    }
  } catch (error) {
    console.error('❌ 失败:', error instanceof Error ? error.message : error);
    allTestsPassed = false;
  }
  console.log();

  // 测试5: 验证TLE验证逻辑
  console.log('测试5: 验证TLE验证逻辑');
  console.log('-'.repeat(60));
  try {
    // 测试有效的TLE
    const validTLE = {
      name: 'TEST SAT',
      line1: '1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
      line2: '2 25544  51.6400 208.9163 0006317  69.9862  25.2906 15.50030900000000'
    };
    
    const isValid = celestrakClient.validateTLE(validTLE);
    if (isValid) {
      console.log('✓ 有效TLE验证通过');
    } else {
      console.error('❌ 有效TLE验证失败');
      allTestsPassed = false;
    }

    // 测试无效的TLE
    const invalidTLE = {
      name: 'INVALID',
      line1: '1 INVALID LINE',
      line2: '2 INVALID LINE'
    };
    
    const isInvalid = celestrakClient.validateTLE(invalidTLE);
    if (!isInvalid) {
      console.log('✓ 无效TLE正确被拒绝');
    } else {
      console.error('❌ 无效TLE未被拒绝');
      allTestsPassed = false;
    }
  } catch (error) {
    console.error('❌ 失败:', error instanceof Error ? error.message : error);
    allTestsPassed = false;
  }
  console.log();

  // 测试6: 验证缓存逻辑(模拟)
  console.log('测试6: 验证数据一致性');
  console.log('-'.repeat(60));
  try {
    // 两次获取相同类别的数据,验证数据一致性
    const data1 = await celestrakClient.fetchTLE(SatelliteCategory.ACTIVE);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    const data2 = await celestrakClient.fetchTLE(SatelliteCategory.ACTIVE);

    if (data1.length === data2.length) {
      console.log(`✓ 数据一致性验证通过: 两次获取都是 ${data1.length} 颗卫星`);
    } else {
      console.warn(`⚠ 数据数量不一致: ${data1.length} vs ${data2.length}`);
      console.warn('  (这可能是正常的,如果Celestrak数据在两次请求之间更新了)');
    }
  } catch (error) {
    console.error('❌ 失败:', error instanceof Error ? error.message : error);
    allTestsPassed = false;
  }
  console.log();

  // 最终结果
  console.log('='.repeat(60));
  if (allTestsPassed) {
    console.log('✓ 所有测试通过! 后端服务验证成功');
  } else {
    console.log('❌ 部分测试失败,请检查上述错误信息');
  }
  console.log('='.repeat(60));

  return allTestsPassed;
}

// 运行验证
verifyBackend()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('验证过程发生错误:', error);
    process.exit(1);
  });
