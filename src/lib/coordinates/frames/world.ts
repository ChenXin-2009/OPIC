/**
 * WorldAdapter：ObjectLocal (Three.js mesh 几何) ↔ RenderWorld (OPIC 物理世界) 桥接层。
 *
 * OPIC 的物理世界（RenderWorld）定义为 J2000 mean ecliptic：
 *   X = 春分点 · Y = 黄道面内 90° · Z = 黄道北极
 *
 * Three.js mesh 默认使用 Y-up 几何建模（如球体的"北极"沿 +Y）。
 * WorldAdapter 负责在两者之间转换，不引入额外物理旋转。
 *
 * 典型用法：
 *   行星 mesh 的几何是 Y-up 球体（旋转轴 = +Y）。
 *   行星在 RenderWorld 中的物理旋转轴是黄道北极方向 +Z（或轨道法线）。
 *   因此需要将 mesh 从 Y-up 旋转到 Z-up（RenderWorld）。
 *
 * 规则：
 *   - 物理计算（位置、速度、轨道法线）始终在 RenderWorld 中。
 *   - mesh.quaternion 最终值 = 物理姿态 quaternion × ObjectLocal → RenderWorld 校准。
 *   - 不要混用此桥接层和帧变换函数（frames/ecliptic.ts 处理 ICRF↔RenderWorld，
 *     本文件处理 Three.js 默认轴↔RenderWorld 轴）。
 */

import * as THREE from 'three';

/**
 * 将 ObjectLocal 坐标（Three.js 默认 Y-up）转换为 RenderWorld 坐标（Z-up，即 OPIC 物理约定）。
 *
 * 旋转：绕 X 轴 -90°，使 Y_up → Z_up。
 *
 * 用于：将 Three.js mesh 的几何法线/朝向转换为 RenderWorld 的物理朝向。
 * 不改变向量长度。
 *
 * @param localPos - ObjectLocal 坐标中的向量
 * @returns RenderWorld 坐标中的向量（新实例）
 */
export function objectLocalToRenderWorld(localPos: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    localPos.x,
    -localPos.z,
    localPos.y
  );
}

/**
 * 将 RenderWorld 坐标（Z-up）转回 ObjectLocal 坐标（Three.js 默认 Y-up）。
 *
 * 这是 {@link objectLocalToRenderWorld} 的逆变换。
 *
 * @param worldPos - RenderWorld 坐标中的向量
 * @returns ObjectLocal 坐标中的向量（新实例）
 */
export function renderWorldToObjectLocal(worldPos: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(
    worldPos.x,
    worldPos.z,
    -worldPos.y
  );
}

/**
 * 获取 ObjectLocal → RenderWorld 的校准四元数。
 *
 * 用途：设置 mesh.quaternion 时，先用此四元数校准，再乘物理姿态：
 *   mesh.quaternion = physicalOrientationQuat * objectLocalToWorldQuat()
 *
 * @returns 四元数，将 Y-up 几何旋转到 Z-up RenderWorld
 */
export function objectLocalToWorldQuat(): THREE.Quaternion {
  // R_x(-90°) ：旋转绕 X 轴，正角度按右手定则
  return new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    Math.PI / 2
  );
}

/**
 * 获取 RenderWorld → ObjectLocal 的校准四元数。
 *
 * 这是 objectLocalToWorldQuat 的逆。
 */
export function worldToObjectLocalQuat(): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2
  );
}
