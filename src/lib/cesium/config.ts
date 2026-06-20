import { ensureError } from '@/lib/utils/errors';

/**
 * Cesium 配置模块
 * 
 * 负责初始化 Cesium 静态资源路径和 Ion Access Token
 */

// 配置 Cesium 静态资源路径
if (typeof window !== 'undefined') {
  // 设置 Cesium 基础 URL（指向 node_modules 中的 Cesium 资源）
  (window as any).CESIUM_BASE_URL = '/cesium';
}

/**
 * 获取 Cesium Ion Access Token
 * 
 * 从环境变量读取，如果未设置则返回空字符串（使用 Cesium 默认 token）
 */
export function getCesiumIonToken(): string {
  return process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || '';
}

/**
 * 初始化 Cesium Ion
 * 
 * 应在应用启动时调用一次
 */
export function initializeCesiumIon(): void {
  if (typeof window === 'undefined') return;
  
  import('cesium').then((Cesium) => {
    const token = getCesiumIonToken();
    if (token) {
      Cesium.Ion.defaultAccessToken = token;
    }
  }).catch((error) => {
    const err = ensureError(error);
    console.error('Failed to initialize Cesium Ion:', err.message);
  });
}
