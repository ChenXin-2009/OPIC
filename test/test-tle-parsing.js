/**
 * 测试TLE解析逻辑
 */

// 从Celestrak获取的实际TLE示例
const sampleTLE = `ISS (ZARYA)
1 25544U 98067A   26051.79705789  .00009624  00000+0  18780-3 0  9993
2 25544  51.6323 155.8543 0008571 116.6604 243.5263 15.48167199553715`;

const TLE_LINE1_REGEX = /^1 [ \d]{5}[A-Z] [ \d]{8} [ \d]{2}[ \d]{3}\.\d{8} (?:[ +-]\.\d{8}) (?:[ +-]\d{5}[+-]\d) (?:[ +-]\d{5}[+-]\d) \d [ \d]{4}\d$/;
const TLE_LINE2_REGEX = /^2 [ \d]{5} [ \d]{3}\.\d{4} [ \d]{3}\.\d{4} \d{7} [ \d]{3}\.\d{4} [ \d]{3}\.\d{4} [ \d]{2}\.\d{14}\d$/;

const lines = sampleTLE.split('\n');
const name = lines[0];
const line1 = lines[1];
const line2 = lines[2];

console.log('测试TLE解析\n');
console.log('名称:', name);
console.log('第一行长度:', line1.length);
console.log('第二行长度:', line2.length);
console.log('\n第一行:', line1);
console.log('第二行:', line2);

console.log('\n验证结果:');
console.log('第一行格式:', TLE_LINE1_REGEX.test(line1));
console.log('第二行格式:', TLE_LINE2_REGEX.test(line2));

// 逐字符检查
console.log('\n第一行字符分析:');
for (let i = 0; i < line1.length; i++) {
  const char = line1[i];
  const code = char.charCodeAt(0);
  if (i < 20 || i > 60) {
    console.log(`位置${i}: '${char}' (ASCII ${code})`);
  }
}
