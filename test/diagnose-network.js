/**
 * 网络诊断脚本
 * 用于检测 Celestrak API 访问是否走代理，以及响应时间
 */

const https = require('https');
const http = require('http');

// 检查代理配置
console.log('=== 代理配置检查 ===');
console.log('HTTP_PROXY:', process.env.HTTP_PROXY || '未设置');
console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY || '未设置');
console.log('NO_PROXY:', process.env.NO_PROXY || '未设置');
console.log('');

// 检查 Node.js 全局代理
console.log('=== Node.js 代理设置 ===');
console.log('http.globalAgent.proxy:', http.globalAgent.proxy || '未设置');
console.log('https.globalAgent.proxy:', https.globalAgent.proxy || '未设置');
console.log('');

// 测试 Celestrak API 访问
async function testCelestrakAPI() {
  console.log('=== 测试 Celestrak API 访问 ===');
  const url = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=TLE';
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SatelliteVisualization/1.0',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ 请求成功');
    console.log('状态码:', response.status);
    console.log('响应时间:', duration, 'ms');
    console.log('响应头:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    console.log('数据行数:', lines.length);
    console.log('数据大小:', (text.length / 1024).toFixed(2), 'KB');
    
    // 检查是否有代理相关的响应头
    if (response.headers.has('via') || response.headers.has('x-forwarded-for')) {
      console.log('⚠️  检测到代理相关的响应头，可能经过了代理');
    } else {
      console.log('ℹ️  未检测到代理相关的响应头');
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('❌ 请求失败');
    console.log('错误类型:', error.constructor.name);
    console.log('错误信息:', error.message);
    console.log('错误详情:', error);
    console.log('失败时间:', duration, 'ms');
    
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      console.log('⚠️  请求超时！可能原因：');
      console.log('   1. 网络连接慢');
      console.log('   2. 代理服务器响应慢');
      console.log('   3. Celestrak 服务器负载高');
    }
    
    if (error.cause) {
      console.log('根本原因:', error.cause);
    }
  }
}

// 运行测试
testCelestrakAPI();
