/**
 * MoonSiteMarkers.ts — 月球着陆点 3D 标记
 *
 * 在月球表面使用 CSS2DObject 标记所有已知着陆点（Apollo + 其他探测器）。
 * 标记随月球运动自动更新位置，在接近月球时可见。
 *
 * 架构：
 * - 模块级单例（通过 create/update/dispose 管理）
 * - CSS2DObject 挂载到场景 → CSS2DRenderer 自动渲染
 * - 每帧 update() 重算日心 → 月心 → 表面坐标
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { ALL_LANDING_SITES, lunarCoordToCartesian, type LunarSite } from '@/lib/astronomy/lunar-sites';

/** 单个标记 */
interface MarkerEntry {
  object: CSS2DObject;
  site: LunarSite;
  /** 月心相对坐标 (AU)，基于月球半径 1737.4 km */
  localPos: THREE.Vector3;
}

/** 标记的可见距离阈值 (AU) */
const VISIBLE_DISTANCE_AU = 0.00015; // ~22,400 km

let _markers: MarkerEntry[] = [];
let _initialized = false;

/** Moon 半径 (km) → AU 缩放因子 */
const MOON_RADIUS_KM = 1737.4;
const KM_TO_AU = 1 / 149597870.7;
const MOON_RADIUS_AU = MOON_RADIUS_KM * KM_TO_AU;

// ----------------------------------------------------------------

/**
 * 创建所有着陆点标记并添加到场景。
 * 应在 useSolarSystemInit 中月球 Planet 创建后调用。
 */
export function createMoonSiteMarkers(scene: THREE.Scene): void {
  if (_initialized) return;

  for (const site of ALL_LANDING_SITES) {
    // 月心相对坐标 (km → AU)
    const pos = lunarCoordToCartesian(site.lon, site.lat, MOON_RADIUS_KM);
    const localPos = new THREE.Vector3(
      pos.x * KM_TO_AU,
      pos.y * KM_TO_AU,
      pos.z * KM_TO_AU
    );

    // 创建 CSS2D 标签
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      display: flex;
      align-items: center;
      gap: 3px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    `;

    // 彩色圆点
    const dot = document.createElement('span');
    const colors: Record<string, string> = {
      landing: '#64b5f6',
      crater: '#ffb74d',
      mare: '#81c784',
      mountain: '#a1887f',
    };
    dot.style.cssText = `
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: ${colors[site.type] || '#aaa'};
      box-shadow: 0 0 3px ${colors[site.type] || '#aaa'};
    `;
    div.appendChild(dot);

    // 标签文字
    const label = document.createElement('span');
    label.textContent = site.name;
    label.style.cssText = `
      font-size: 9px;
      font-family: 'SF Mono', 'Consolas', monospace;
      color: rgba(255,255,255,0.85);
      text-shadow: 0 0 3px rgba(0,0,0,0.8);
      white-space: nowrap;
    `;
    div.appendChild(label);

    const object = new CSS2DObject(div);
    object.visible = false; // 初始不可见
    scene.add(object);

    _markers.push({ object, site, localPos });
  }

  _initialized = true;
}

/**
 * 每帧更新所有标记位置。
 * 应在 useSolarSystemAnimation 中调用（每帧）。
 *
 * @param moonWorldPos - 月球在 Three.js 世界空间的中心位置 (AU)
 * @param cameraPos - 相机世界空间位置 (AU)
 */
export function updateMoonSiteMarkers(
  moonWorldPos: THREE.Vector3,
  cameraPos: THREE.Vector3
): void {
  if (_markers.length === 0) return;

  const distToMoon = cameraPos.distanceTo(moonWorldPos);
  const shouldShow = distToMoon < VISIBLE_DISTANCE_AU;

  // 月球自转 + 天平动：需要统一旋转
  // 简化：标记固定在月心坐标系中，随月球位置平移
  for (const entry of _markers) {
    // 世界空间位置 = 月心位置 + 标记偏移
    entry.object.position.set(
      moonWorldPos.x + entry.localPos.x,
      moonWorldPos.y + entry.localPos.y,
      moonWorldPos.z + entry.localPos.z
    );

    const wasVisible = entry.object.visible;
    entry.object.visible = shouldShow;

    if (shouldShow && !wasVisible) {
      (entry.object.element as HTMLElement).style.opacity = '1';
    } else if (!shouldShow && wasVisible) {
      (entry.object.element as HTMLElement).style.opacity = '0';
    }
  }
}

/**
 * 销毁所有标记。
 * 应在组件卸载或 MOD 禁用时调用。
 */
export function disposeMoonSiteMarkers(scene: THREE.Scene): void {
  for (const entry of _markers) {
    scene.remove(entry.object);
    entry.object.element?.remove();
  }
  _markers = [];
  _initialized = false;
}
