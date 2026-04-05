/**
 * @module mods/flight-tracking/utils/iconGenerator
 * @description 飞机图标 SVG 生成器
 */

const iconCache = new Map<string, string>();

/**
 * 生成飞机图标 SVG Data URL
 */
export function createAircraftIcon(color: string, size = 24): string {
  const key = `${color}-${size}`;
  if (iconCache.has(key)) return iconCache.get(key)!;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
    <path fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"
      d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
  </svg>`;

  const url = `data:image/svg+xml;base64,${btoa(svg)}`;
  iconCache.set(key, url);
  return url;
}

/**
 * 清除图标缓存
 */
export function clearIconCache(): void {
  iconCache.clear();
}
