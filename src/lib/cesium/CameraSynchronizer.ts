/**
 * @module CameraSynchronizer
 * @description 相机同步器 —— 负责在 Three.js 相机与 Cesium 相机之间进行双向视图矩阵同步。
 *
 * @architecture
 * 架构层级：Cesium 子系统 / 相机桥接层
 * 职责边界：仅负责相机状态的坐标变换与同步，不持有任何场景状态。
 *
 * 支持两种同步方向：
 *   1. Three.js → Cesium（`syncViewMatrix`）：当 Three.js 控制相机时，将其位置/方向
 *      经过完整坐标变换链（黄道惯性系 → 赤道惯性系 → ECEF）写入 Cesium 相机。
 *   2. Cesium → Three.js（`syncFromCesium`）：当 Cesium 控制相机时，将 ECEF 坐标
 *      逆变换回 Solar System Frame，并重映射坐标轴写入 Three.js 相机。
 *
 * @dependencies
 * 直接依赖：
 *   - three（Three.js 相机与向量运算）
 *   - cesium（Cesium 相机、坐标变换矩阵、视锥体）
 *   - CoordinateTransformer（ECEF ↔ Solar System Frame 的高层转换工具）
 *   - debugRotationOffset（运行时可调的调试旋转偏移量，用于校准坐标系对齐）
 *
 * 被依赖：
 *   - CesiumEarthExtension / CesiumAdapter（在每帧渲染循环中调用本类的静态方法）
 *
 * @coordinateSystems
 * 本模块涉及三个坐标系：
 *   - Solar System Frame（黄道惯性系，Three.js 使用，单位 AU）
 *   - ICRF / 赤道惯性系（中间过渡系，单位 AU）
 *   - ECEF / ITRF（地球固连系，Cesium 使用，单位 米）
 *
 * @integration
 * 与 Three.js 的集成关系：
 *   本模块是 Cesium 子系统与 Three.js 渲染子系统之间的唯一相机状态桥梁。
 *   Three.js 场景使用黄道惯性系（Y 轴朝上），Cesium 使用 ECEF（Z 轴朝北极）。
 *   两套坐标系的对齐通过黄赤交角旋转 + GMST 旋转实现，确保地球表面纹理与
 *   Three.js 场景中的地球位置在视觉上完全重合。
 */

import * as THREE from 'three';
import * as Cesium from 'cesium';
import { CoordinateTransformer, debugRotationOffset } from './CoordinateTransformer';

/**
 * CameraSynchronizer - 相机同步工具类
 *
 * 提供 Three.js 相机与 Cesium 相机之间的双向同步静态方法。
 * 所有方法均为纯静态，无需实例化。
 */
export class CameraSynchronizer {
  /**
   * 同步视图矩阵（Three.js → Cesium）
   *
   * 将 Three.js 相机的位置和方向经过完整坐标变换链同步到 Cesium 相机。
   * 仅同步视图矩阵（位置、方向、上向量），允许 Cesium 使用自己的投影矩阵
   * 和动态 near/far 裁剪面，以保证地球表面细节的正确渲染。
   *
   * 坐标变换链：
   *   Solar System Frame（黄道惯性系，AU）
   *     → 赤道惯性系 ICRF（绕 X 轴旋转 -ε，ε = 黄赤交角）
   *     → ECEF / ITRF（绕 Z 轴旋转 -GMST，由 Cesium 精确计算）
   *     → 单位换算（AU → 米，× 149,597,870,700）
   *
   * @param threeCamera - Three.js 透视相机，提供位置、方向和 FOV
   * @param cesiumCamera - Cesium 相机，同步目标
   * @param earthPosition - 地球在 Solar System Frame 中的位置（单位：AU）
   * @param currentTime - 可选的 Cesium 儒略日期，用于精确计算 ICRF→ECEF 旋转矩阵；
   *                      若未提供则使用当前系统时间
   */
  static syncViewMatrix(
    threeCamera: THREE.PerspectiveCamera,
    cesiumCamera: Cesium.Camera,
    earthPosition: THREE.Vector3,
    currentTime?: Cesium.JulianDate
  ): void {
    // ─────────────────────────────────────────────────────────────────────────
    // 完整变换链：黄道惯性系 → 赤道惯性系(ICRF) → ECEF(ITRF)
    //
    // 步骤一：黄道 → 赤道惯性系（绕 X 轴旋转 -ε，ε = 黄赤交角 23.4393°）
    //   x' = x
    //   y' = y * cos(ε) - z * sin(ε)
    //   z' = y * sin(ε) + z * cos(ε)
    //
    // 步骤二：赤道惯性系(ICRF) → ECEF(ITRF)（绕 Z 轴旋转 -GMST）
    //   使用 Cesium.Transforms.computeIcrfToFixedMatrix 精确计算
    //   GMST 随时间变化，必须用仿真当前时间计算
    // ─────────────────────────────────────────────────────────────────────────

    // 黄赤交角（obliquity of the ecliptic）预计算三角函数值
    // 23.4393° 为 J2000.0 历元（2000年1月1日12时TT）的黄赤交角 IAU 标准值，
    // 来源：IAU 1976 岁差模型，精度约 0.0001°，满足实时可视化需求。
    const cosObl = Math.cos(23.4393 * Math.PI / 180);
    const sinObl = Math.sin(23.4393 * Math.PI / 180);

    // 获取 ICRF → ECEF 旋转矩阵（主要是绕 Z 轴的 GMST 旋转）
    const icrfToFixed = new Cesium.Matrix3();
    const time = currentTime ?? (cesiumCamera.frustum ? Cesium.JulianDate.now() : undefined);
    let hasIcrfMatrix = false;
    if (time) {
      const result = Cesium.Transforms.computeIcrfToFixedMatrix(time, icrfToFixed);
      hasIcrfMatrix = !!result;
    }

    /**
     * 辅助函数：将 Solar System Frame 中的向量经完整变换链转换到 ECEF 坐标系。
     *
     * 变换步骤：
     *   1. 黄道惯性系 → 赤道惯性系（绕 X 轴旋转 -ε）
     *   2. 赤道惯性系 → ECEF（使用 Cesium 精确 ICRF→Fixed 矩阵）
     *   3. 若无时间信息（hasIcrfMatrix = false），退化为仅执行步骤 1（fallback）
     *
     * @param v - Solar System Frame 中的三维向量（单位与输入一致，方向向量无单位）
     * @returns ECEF 坐标系中的 [x, y, z] 分量（方向向量无单位，位置向量单位与输入相同）
     */
    const transformToECEF = (v: THREE.Vector3): [number, number, number] => {
      // 步骤一：黄道 → 赤道惯性系（绕 X 轴旋转 -ε）
      // 公式推导：Rx(-ε) * [x, y, z]^T
      const ix = v.x;
      const iy = v.y * cosObl - v.z * sinObl;
      const iz = v.y * sinObl + v.z * cosObl;

      if (hasIcrfMatrix) {
        // 步骤二：赤道惯性系 → ECEF（用 Cesium 精确矩阵，包含 GMST 旋转和极移修正）
        const inertial = new Cesium.Cartesian3(ix, iy, iz);
        const ecef = Cesium.Matrix3.multiplyByVector(icrfToFixed, inertial, new Cesium.Cartesian3());
        return [ecef.x, ecef.y, ecef.z];
      }
      // fallback：无时间信息时直接用赤道惯性系坐标（忽略地球自转，误差约 0~360°经度偏移）
      return [ix, iy, iz];
    };

    // ── 1. 转换相机位置（Solar System Frame → ECEF，AU → 米）────────────────
    // 先将相机位置转换为相对地球的局部坐标（AU），再变换到 ECEF
    const localPosition = threeCamera.position.clone().sub(earthPosition);
    const [px, py, pz] = transformToECEF(localPosition);
    // 1 AU = 149,597,870,700 米（IAU 2012 定义的精确值）
    const cameraECEF = new Cesium.Cartesian3(
      px * 149597870700,
      py * 149597870700,
      pz * 149597870700
    );
    cesiumCamera.position = cameraECEF;

    // ── 2. 获取 Three.js 相机方向向量 ────────────────────────────────────────
    const directionThree = new THREE.Vector3();
    const upThree = new THREE.Vector3();
    threeCamera.getWorldDirection(directionThree);
    // 从相机四元数提取上向量（世界空间中的 +Y 轴方向）
    upThree.set(0, 1, 0).applyQuaternion(threeCamera.quaternion).normalize();

    // ── 3. 转换方向和上向量（Solar System Frame → ECEF）─────────────────────
    // 方向向量和上向量均为纯方向量（无平移），直接应用旋转变换即可
    const [dDirX, dDirY, dDirZ] = transformToECEF(directionThree);
    const [dUpX, dUpY, dUpZ] = transformToECEF(upThree);

    // ── 4. 应用调试旋转偏移（用于校准坐标系对齐，生产环境偏移量通常为 0）────
    let fDirX = dDirX, fDirY = dDirY, fDirZ = dDirZ;
    let fUpX = dUpX, fUpY = dUpY, fUpZ = dUpZ;
    if (debugRotationOffset.x !== 0) {
      // 绕 X 轴旋转（调整俯仰偏差）
      const rx = debugRotationOffset.x * Math.PI / 180;
      const cy = Math.cos(rx), sy = Math.sin(rx);
      [fDirY, fDirZ] = [fDirY * cy - fDirZ * sy, fDirY * sy + fDirZ * cy];
      [fUpY, fUpZ] = [fUpY * cy - fUpZ * sy, fUpY * sy + fUpZ * cy];
    }
    if (debugRotationOffset.y !== 0) {
      // 绕 Y 轴旋转（调整偏航偏差）
      const ry = debugRotationOffset.y * Math.PI / 180;
      const cx = Math.cos(ry), sx = Math.sin(ry);
      [fDirX, fDirZ] = [fDirX * cx + fDirZ * sx, -fDirX * sx + fDirZ * cx];
      [fUpX, fUpZ] = [fUpX * cx + fUpZ * sx, -fUpX * sx + fUpZ * cx];
    }
    if (debugRotationOffset.z !== 0) {
      // 绕 Z 轴旋转（调整滚转偏差）
      const rz = debugRotationOffset.z * Math.PI / 180;
      const cz = Math.cos(rz), sz = Math.sin(rz);
      [fDirX, fDirY] = [fDirX * cz - fDirY * sz, fDirX * sz + fDirY * cz];
      [fUpX, fUpY] = [fUpX * cz - fUpY * sz, fUpX * sz + fUpY * cz];
    }

    const directionCesium = new Cesium.Cartesian3(fDirX, fDirY, fDirZ);
    const upCesium = new Cesium.Cartesian3(fUpX, fUpY, fUpZ);

    // 安全检查：方向/上向量不能是零向量或含 NaN（会导致 Cesium normalize 崩溃）
    const dirLen = Math.sqrt(fDirX*fDirX + fDirY*fDirY + fDirZ*fDirZ);
    const upLen  = Math.sqrt(fUpX*fUpX  + fUpY*fUpY  + fUpZ*fUpZ);
    if (!isFinite(dirLen) || dirLen < 1e-10 || !isFinite(upLen) || upLen < 1e-10) return;
    
    // ── 5. 设置 Cesium 相机方向（归一化后写入）──────────────────────────────
    cesiumCamera.direction = Cesium.Cartesian3.normalize(directionCesium, new Cesium.Cartesian3());
    cesiumCamera.up = Cesium.Cartesian3.normalize(upCesium, new Cesium.Cartesian3());
    
    // ── 6. 计算 Cesium 相机的右向量（用于验证正交性）────────────────────────
    // right = direction × up（叉积，右手系）
    const rightCesium = new Cesium.Cartesian3();
    Cesium.Cartesian3.cross(cesiumCamera.direction, cesiumCamera.up, rightCesium);
    Cesium.Cartesian3.normalize(rightCesium, rightCesium);
    
    // 调试日志（偶尔输出，约 1% 概率，避免性能影响）
    if (Math.random() < 0.01) {
      console.log('[CameraSynchronizer] Three.js → Cesium sync:', {
        threePos: { x: threeCamera.position.x.toFixed(6), y: threeCamera.position.y.toFixed(6), z: threeCamera.position.z.toFixed(6) },
        threeDir: { x: directionThree.x.toFixed(3), y: directionThree.y.toFixed(3), z: directionThree.z.toFixed(3) },
        threeUp: { x: upThree.x.toFixed(3), y: upThree.y.toFixed(3), z: upThree.z.toFixed(3) },
        cesiumPos: { x: cameraECEF.x.toFixed(0), y: cameraECEF.y.toFixed(0), z: cameraECEF.z.toFixed(0) },
        cesiumDir: { x: cesiumCamera.direction.x.toFixed(3), y: cesiumCamera.direction.y.toFixed(3), z: cesiumCamera.direction.z.toFixed(3) },
        cesiumUp: { x: cesiumCamera.up.x.toFixed(3), y: cesiumCamera.up.y.toFixed(3), z: cesiumCamera.up.z.toFixed(3) },
        hasIcrfMatrix,
        earthPos: { x: earthPosition.x.toFixed(6), y: earthPosition.y.toFixed(6), z: earthPosition.z.toFixed(6) },
        localPosAU: { x: localPosition.x.toFixed(8), y: localPosition.y.toFixed(8), z: localPosition.z.toFixed(8) },
        distToEarthAU: localPosition.length().toFixed(8),
      });
    }

    // ── 7. 同步 FOV 和动态 near/far 裁剪面 ──────────────────────────────────
    if (cesiumCamera.frustum instanceof Cesium.PerspectiveFrustum) {
      // Cesium 使用水平 FOV（hFov），Three.js 使用垂直 FOV（vFov），需要换算
      // 换算公式：hFov = 2 * atan(tan(vFov/2) * aspect)
      const vFovRad = THREE.MathUtils.degToRad(threeCamera.fov);
      const aspect = threeCamera.aspect;
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
      cesiumCamera.frustum.fov = hFovRad;
      
      // 动态计算 near/far 裁剪面距离（单位：米）
      // 不能直接使用 Three.js 的 near/far（AU 单位），因为宇宙尺度下换算后的 near
      // 值（如 1e-5 AU ≈ 1500m）远大于地球表面细节所需的近裁剪距离。
      //
      // EARTH_RADIUS_M：地球平均半径，约 6,371,000 米（WGS84 椭球体长半轴 6,378,137m 的近似值）
      const EARTH_RADIUS_M = 6371000;
      // 相机到地球表面的高度（米），最小为 0（防止地下相机产生负值）
      const cameraAltitude = Math.max(0, Cesium.Cartesian3.magnitude(cesiumCamera.position) - EARTH_RADIUS_M);
      
      // near = 相机高度的 0.01%，最小 0.1m，最大 1000m
      //   - 最小值 0.1m：允许贴近地面查看建筑细节
      //   - 最大值 1000m：防止高空视角下 near 过大导致地面被裁剪
      //   - 0.0001 系数：保证 near/far 比值足够大，避免深度缓冲精度问题
      cesiumCamera.frustum.near = Math.max(0.1, Math.min(1000, cameraAltitude * 0.0001));
      // far = 相机高度的 100 倍，最小 1e8m（约 100,000km）
      //   - 最小值 1e8m：保证宇宙视角（相机在地球轨道外）时仍能看到整个地球
      //   - 100 倍系数：覆盖地球直径（约 12,742km）及大气层（约 100km）
      cesiumCamera.frustum.far = Math.max(1e8, cameraAltitude * 100);
    }
  }
  
  /**
   * 反向同步视图矩阵（Cesium → Three.js）
   *
   * 将 Cesium 相机的位置和方向逆变换后同步到 Three.js 相机。
   * 用于当 Cesium 控制相机时（如用户在 Cesium 地球上拖拽导航），
   * 让 Three.js 宇宙场景跟随 Cesium 相机的视角变化。
   *
   * 坐标变换链（逆向）：
   *   ECEF（米）→ Solar System Frame（AU）：由 CoordinateTransformer.ecefToSolarSystem 完成
   *   坐标轴重映射：Cesium ECEF（Z-up）→ Three.js（Y-up）
   *
   * @param cesiumCamera - Cesium 相机，提供 ECEF 坐标系下的位置和方向
   * @param threeCamera - Three.js 透视相机，同步目标
   * @param earthPosition - 地球在 Solar System Frame 中的位置（单位：AU），
   *                        用于将 ECEF 绝对坐标转换为相对地球的局部坐标
   */
  static syncFromCesium(
    cesiumCamera: Cesium.Camera,
    threeCamera: THREE.PerspectiveCamera,
    earthPosition: THREE.Vector3,
    currentTime?: Cesium.JulianDate
  ): void {
    // ── 1. 获取 ECEF → ICRF 旋转矩阵（syncViewMatrix 中 ICRF→ECEF 的逆）────
    const icrfToFixed = new Cesium.Matrix3();
    const time = currentTime ?? Cesium.JulianDate.now();
    const hasIcrfMatrix = !!Cesium.Transforms.computeIcrfToFixedMatrix(time, icrfToFixed);
    // 逆矩阵：ECEF → ICRF（正交矩阵的逆 = 转置）
    const fixedToIcrf = hasIcrfMatrix
      ? Cesium.Matrix3.transpose(icrfToFixed, new Cesium.Matrix3())
      : null;

    // 黄赤交角（与 syncViewMatrix 相同的常量）
    const cosObl = Math.cos(23.4393 * Math.PI / 180);
    const sinObl = Math.sin(23.4393 * Math.PI / 180);

    /**
     * 将 ECEF 向量逆变换回 Solar System Frame（黄道惯性系）
     * 逆变换链：ECEF → ICRF（逆 GMST）→ 黄道系（逆黄赤交角，绕 X 轴旋转 +ε）
     */
    const ecefToSolarSystem = (v: Cesium.Cartesian3): THREE.Vector3 => {
      let ix = v.x, iy = v.y, iz = v.z;

      // 步骤一：ECEF → 赤道惯性系 ICRF（逆 GMST 旋转，即转置 ICRF→ECEF 矩阵）
      if (fixedToIcrf) {
        const inertial = Cesium.Matrix3.multiplyByVector(
          fixedToIcrf,
          new Cesium.Cartesian3(ix, iy, iz),
          new Cesium.Cartesian3()
        );
        ix = inertial.x; iy = inertial.y; iz = inertial.z;
      }

      // 步骤二：赤道惯性系 → 黄道系（逆黄赤交角旋转，绕 X 轴旋转 +ε）
      // 正变换 Rx(-ε): y' = y*cos(ε) - z*sin(ε),  z' = y*sin(ε) + z*cos(ε)
      // 逆变换 Rx(+ε): y' = y*cos(ε) + z*sin(ε),  z' = -y*sin(ε) + z*cos(ε)
      const sy = iy * cosObl + iz * sinObl;
      const sz = -iy * sinObl + iz * cosObl;

      return new THREE.Vector3(ix, sy, sz);
    };

    // ── 2. 转换相机位置（ECEF 米 → Solar System Frame AU）────────────────────
    const posECEF = cesiumCamera.position;
    const localAU = ecefToSolarSystem(posECEF);
    // 单位换算：米 → AU，再加上地球在太阳系中的位置
    const cameraSolarSystem = new THREE.Vector3(
      localAU.x / 149597870700,
      localAU.y / 149597870700,
      localAU.z / 149597870700
    ).add(earthPosition);
    threeCamera.position.copy(cameraSolarSystem);

    // ── 3. 转换方向和上向量（ECEF → Solar System Frame，纯方向向量无需加地球位置）
    const dirSolar = ecefToSolarSystem(cesiumCamera.direction).normalize();
    const upSolar  = ecefToSolarSystem(cesiumCamera.up).normalize();

    // ── 4. 使用 lookAt 设置相机方向 ──────────────────────────────────────────
    const target = new THREE.Vector3().addVectors(threeCamera.position, dirSolar);
    threeCamera.up.copy(upSolar);
    threeCamera.lookAt(target);
  }
}
