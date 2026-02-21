/**
 * 测试Celestrak API
 * 验证不同的URL格式和参数
 */

async function testCelestrakAPI() {
  const urls = [
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=TLE',
    'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=TLE',
    'https://celestrak.com/NORAD/elements/gp.php?GROUP=active&FORMAT=TLE',
    'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE', // ISS
  ];

  for (const url of urls) {
    console.log(`\n测试URL: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SatelliteVisualization/1.0',
        },
      });

      console.log(`状态: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`响应长度: ${text.length} 字符`);
        console.log(`前200字符:\n${text.substring(0, 200)}`);
        
        // 统计TLE条目数量
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        const tleCount = Math.floor(lines.length / 3);
        console.log(`TLE条目数: ${tleCount}`);
      }
    } catch (error) {
      console.error(`错误: ${error.message}`);
    }
  }
}

testCelestrakAPI();
