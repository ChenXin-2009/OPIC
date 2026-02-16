/**
 * galaxy-generator.js - 星系生成 Web Worker
 * 
 * 在后台线程生成星系，避免阻塞主线程
 */

/**
 * NFW 概率密度函数
 */
function nfwProbability(r, rs) {
  if (r <= 0) return 0;
  
  const x = r / rs;
  const density = 1 / (x * Math.pow(1 + x, 2));
  const maxDensity = 1 / (0.01 * Math.pow(1.01, 2));
  
  return Math.min(1, density / maxDensity);
}

/**
 * NFW 分布生成
 */
function nfwDistribution(center, radius, count) {
  const galaxies = [];
  const rs = radius * 0.2;

  for (let i = 0; i < count; i++) {
    let r;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      r = Math.random() * radius;
      const probability = nfwProbability(r, rs);
      attempts++;
      
      if (attempts > maxAttempts) {
        r = Math.random() * radius;
        break;
      }
      
      if (Math.random() < probability) {
        break;
      }
    } while (true);

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    const x = center.x + r * Math.sin(phi) * Math.cos(theta);
    const y = center.y + r * Math.sin(phi) * Math.sin(theta);
    const z = center.z + r * Math.cos(phi);

    galaxies.push({ x, y, z });
  }

  return galaxies;
}

/**
 * 检查是否与真实星系太近
 */
function isTooClose(pos, realGalaxies, minDistance) {
  return realGalaxies.some((real) => {
    const dx = pos.x - real.x;
    const dy = pos.y - real.y;
    const dz = pos.z - real.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return dist < minDistance;
  });
}

/**
 * 监听消息
 */
self.onmessage = function(e) {
  try {
    if (e.data.type === 'generate') {
      const { clusterMetadata, realGalaxies } = e.data;

      const center = {
        x: clusterMetadata.centerX,
        y: clusterMetadata.centerY,
        z: clusterMetadata.centerZ,
      };

      const targetCount = clusterMetadata.memberCount;
      const needGenerate = Math.max(0, targetCount - realGalaxies.length);

      // 生成星系
      const generated = nfwDistribution(center, clusterMetadata.radius, needGenerate);

      // 过滤掉与真实星系太近的点
      const minDistance = clusterMetadata.radius * 0.05;
      const filtered = generated.filter((pos) => {
        return !isTooClose(pos, realGalaxies, minDistance);
      });

      // 添加亮度
      const galaxies = filtered.map((pos) => ({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        brightness: 0.5 + Math.random() * 0.5,
      }));

      // 发送结果
      self.postMessage({
        type: 'result',
        galaxies: galaxies,
      });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error.message,
    });
  }
};
