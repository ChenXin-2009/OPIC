/**
 * universeRendererUtils - 宇宙渲染器公共工具函数
 * 
 * 提供粒子系统创建、连接线生成等公共功能
 */

import * as THREE from 'three';
import type { SimpleGalaxy } from '../../types/universeTypes';
import { MEGAPARSEC_TO_AU } from '../../config/universeConfig';
import { OptimizedParticleSystem } from '../OptimizedParticleSystem';

/**
 * 从星系数据创建粒子系统
 */
export function createParticleSystemFromGalaxies(
  galaxies: SimpleGalaxy[],
  particleSize: number
): OptimizedParticleSystem {
  const count = galaxies.length;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  galaxies.forEach((galaxy, i) => {
    // 转换位置从 Mpc 到 AU
    positions[i * 3] = galaxy.x * MEGAPARSEC_TO_AU;
    positions[i * 3 + 1] = galaxy.y * MEGAPARSEC_TO_AU;
    positions[i * 3 + 2] = galaxy.z * MEGAPARSEC_TO_AU;

    // 设置颜色（白色）
    const color = new THREE.Color(0xffffff);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    // 设置大小
    sizes[i] = particleSize * MEGAPARSEC_TO_AU * (galaxy.brightness || 1);
  });

  return new OptimizedParticleSystem(positions, colors, sizes);
}

/**
 * 创建星系组内的连接线
 */
export function createConnectionLinesForGroup(
  galaxies: SimpleGalaxy[],
  maxDistance: number,
  maxConnections: number,
  color: number
): THREE.LineSegments | null {
  if (galaxies.length < 2) return null;

  const positions: number[] = [];
  const maxDistanceAU = maxDistance * MEGAPARSEC_TO_AU;

  galaxies.forEach((galaxy, i) => {
    let connections = 0;

    for (let j = i + 1; j < galaxies.length && connections < maxConnections; j++) {
      const other = galaxies[j];
      const dx = (galaxy.x - other.x) * MEGAPARSEC_TO_AU;
      const dy = (galaxy.y - other.y) * MEGAPARSEC_TO_AU;
      const dz = (galaxy.z - other.z) * MEGAPARSEC_TO_AU;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < maxDistanceAU) {
        positions.push(
          galaxy.x * MEGAPARSEC_TO_AU,
          galaxy.y * MEGAPARSEC_TO_AU,
          galaxy.z * MEGAPARSEC_TO_AU,
          other.x * MEGAPARSEC_TO_AU,
          other.y * MEGAPARSEC_TO_AU,
          other.z * MEGAPARSEC_TO_AU
        );
        connections++;
      }
    }
  });

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    linewidth: 1,
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * 使用空间索引创建高级连接线（用于大型数据集）
 */
export function createAdvancedConnectionLines(
  galaxies: SimpleGalaxy[],
  linkingLength: number,
  maxConnections: number,
  color: number
): THREE.LineSegments | null {
  if (galaxies.length < 2) return null;

  const positions: number[] = [];
  
  // 按 X 坐标排序以优化搜索
  const sortedByX = [...galaxies].sort((a, b) => a.x - b.x);

  galaxies.forEach((galaxy) => {
    const neighbors: Array<{ galaxy: SimpleGalaxy; distance: number }> = [];

    for (const other of sortedByX) {
      if (other === galaxy) continue;

      const dx = galaxy.x - other.x;
      if (Math.abs(dx) > linkingLength) continue;

      const dy = galaxy.y - other.y;
      const dz = galaxy.z - other.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < linkingLength) {
        neighbors.push({ galaxy: other, distance });
      }
    }

    // 按距离排序并连接最近的邻居
    neighbors.sort((a, b) => a.distance - b.distance);
    const connectCount = Math.min(maxConnections, neighbors.length);

    for (let k = 0; k < connectCount; k++) {
      const other = neighbors[k].galaxy;
      positions.push(
        galaxy.x * MEGAPARSEC_TO_AU,
        galaxy.y * MEGAPARSEC_TO_AU,
        galaxy.z * MEGAPARSEC_TO_AU,
        other.x * MEGAPARSEC_TO_AU,
        other.y * MEGAPARSEC_TO_AU,
        other.z * MEGAPARSEC_TO_AU
      );
    }
  });

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    linewidth: 1,
    depthWrite: true,
    depthTest: true,
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * 更新连接线透明度
 */
export function updateConnectionLinesOpacity(
  lines: THREE.LineSegments[],
  opacity: number,
  baseOpacity: number
): void {
  lines.forEach((line) => {
    const material = line.material as THREE.LineBasicMaterial;
    material.opacity = opacity * baseOpacity;
  });
}
