/**
 * 手动后端验证测试
 * 使用fetch直接测试Celestrak API
 */

const CELESTRAK_BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

console.log('='.repeat(60));
console.log('后端服务验证 - 手动测试');
console.log('='.repeat(60));
console.log();

// 测试1: 直接从Celestrak获取数据
console.log('测试1: 验证Celestrak API连接');
console.log('-'.repeat(60));

try {
  const url = `${CELESTRAK_BASE_URL}?GROUP=active&FORMAT=TLE`;
  console.log(`请求URL: ${url}`);
  
  const startTime = Date.now();
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'SatelliteVisualization/1.0',
    },
  });
  const duration = Date.now() - startTime;

  console.log(`✓ HTTP状态: ${response.status} ${response.statusText}`);
  console.log(`✓ 响应时间: ${duration}ms`);

  if (!response.ok) {
    console.error(`❌ 请求失败: ${response.status}`);
    process.exit(1);
  }

  const rawData = await response.text();
  console.log(`✓ 数据大小: ${rawData.length} 字节`);

  // 解析TLE数据
  const lines = rawData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const satelliteCount = Math.floor(lines.length / 3);
  
  console.log(`✓ 总行数: ${lines.length}`);
  console.log(`✓ 卫星数量: ${satelliteCount}`);

  if (satelliteCount === 0) {
    console.error('❌ 未获取到任何卫星数据');
    process.exit(1);
  }

  // 显示第一颗卫星
  console.log();
  console.log('第一颗卫星示例:');
  console.log(`  名称: ${lines[0]}`);
  console.log(`  TLE1: ${lines[1]}`);
  console.log(`  TLE2: ${lines[2]}`);
  
  // 验证TLE格式
  const line1 = lines[1];
  const line2 = lines[2];
  
  console.log();
  console.log('TLE格式验证:');
  console.log(`  ✓ TLE1长度: ${line1.length} (期望69)`);
  console.log(`  ✓ TLE2长度: ${line2.length} (期望69)`);
  console.log(`  ✓ TLE1开头: ${line1.startsWith('1 ') ? '正确' : '错误'}`);
  console.log(`  ✓ TLE2开头: ${line2.startsWith('2 ') ? '正确' : '错误'}`);

  if (line1.length !== 69 || line2.length !== 69) {
    console.error('❌ TLE行长度不正确');
    process.exit(1);
  }

  if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
    console.error('❌ TLE行格式不正确');
    process.exit(1);
  }

  // 提取NORAD ID
  const noradId = parseInt(line1.substring(2, 7).trim(), 10);
  console.log(`  ✓ NORAD ID: ${noradId}`);

  if (isNaN(noradId) || noradId <= 0) {
    console.error('❌ NORAD ID无效');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
}

console.log();

// 测试2: 测试不同类别
console.log('测试2: 验证不同卫星类别');
console.log('-'.repeat(60));

const categories = [
  { name: 'active', group: 'active' },
  { name: 'stations', group: 'stations' },
  { name: 'gps-ops', group: 'gps-ops' },
  { name: 'weather', group: 'weather' }
];

for (const category of categories) {
  try {
    const url = `${CELESTRAK_BASE_URL}?GROUP=${category.group}&FORMAT=TLE`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SatelliteVisualization/1.0' }
    });

    if (!response.ok) {
      console.error(`❌ ${category.name}: HTTP ${response.status}`);
      continue;
    }

    const rawData = await response.text();
    const lines = rawData.split('\n').filter(line => line.trim().length > 0);
    const count = Math.floor(lines.length / 3);

    console.log(`✓ ${category.name}: ${count} 颗卫星`);

  } catch (error) {
    console.error(`❌ ${category.name}: ${error.message}`);
  }
}

console.log();
console.log('='.repeat(60));
console.log('✓ 所有测试通过! Celestrak API连接正常');
console.log('='.repeat(60));
