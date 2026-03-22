/**
 * CameraSynchronizer - 相机同步器
 * 
 * 负责在 Three.js 相机和 Cesium 相机之间双向同步
 * 支持两种模式：
 * 1. Three.js → Cesium（当 Three.js 控制相机时）
 * 2. Cesium → Three.js（当 Cesium 控制相机时）
 */

import * as THREE from 'three';
import * as Cesium from 'cesium';
import { CoordinateTransformer } from './CoordinateTransformer';

/**
 * CameraSynchronizer - 相机同步工具类
 */
export class CameraSynchronizer {
  /**
   * 同步视图矩阵（Three.js → Cesium）
   * 
   * 将 Three.js 相机的位置和方向同步到 Cesium 相机
   * 仅同步视图矩阵，允许 Cesium 使用自己的投影矩阵和动态 near/far 裁剪面
   * 
   * @param threeCamera - Three.js 相机
   * @param cesiumCamera - Cesium 相机
   * @param earthPosition - 地球在 Solar System Frame 中的位置（AU）
   */
  static syncViewMatrix(
    threeCamera: THREE.PerspectiveCamera,
    cesiumCamera: Cesium.Camera,
    earthPosition: THREE.Vector3
  ): void {
    // 1. 转换相机位置为 ECEF 坐标（米）
    const cameraECEF = CoordinateTransformer.solarSystemToECEF(
      threeCamera.position,
      earthPosition
    );
    
    // 2. 设置 Cesium 相机位置
    cesiumCamera.position = cameraECEF;
    
    // 3. 获取 Three.js 相机的方向向量（在世界空间）
    const directionThree = new THREE.Vector3();
    const upThree = new THREE.Vector3();
    const rightThree = new THREE.Vector3();
    
    // 获取相机的世界方向（相机看向的方向）
    threeCamera.getWorldDirection(directionThree);
    
    // 获取相机的世界上向量
    upThree.set(0, 1, 0).applyQuaternion(threeCamera.quaternion).normalize();
    
    // 获取相机的世界右向量（用于验证）
    rightThree.crossVectors(directionThree, upThree).normalize();
    
    // 4. 坐标系转换：Three.js 黄道坐标系 → Cesium ECEF（赤道坐标系）
    // 步骤一：黄道 → 赤道，绕 X 轴旋转 -ε（ε = 黄赤交角 23.4393°）
    //   x_eq =  x_ecl
    //   y_eq =  y_ecl * cos(ε) + z_ecl * sin(ε)
    //   z_eq = -y_ecl * sin(ε) + z_ecl * cos(ε)
    // 步骤二：赤道坐标系轴 → Cesium ECEF 轴（直接对应，无需额外变换）
    const cosObl = Math.cos(23.4393 * Math.PI / 180);
    const sinObl = Math.sin(23.4393 * Math.PI / 180);

    const directionCesium = new Cesium.Cartesian3(
      directionThree.x,
      directionThree.y * cosObl + directionThree.z * sinObl,
      -directionThree.y * sinObl + directionThree.z * cosObl
    );
    
    const upCesium = new Cesium.Cartesian3(
      upThree.x,
      upThree.y * cosObl + upThree.z * sinObl,
      -upThree.y * sinObl + upThree.z * cosObl
    );
    
    // 5. 设置 Cesium 相机方向（归一化）
    cesiumCamera.direction = Cesium.Cartesian3.normalize(directionCesium, new Cesium.Cartesian3());
    cesiumCamera.up = Cesium.Cartesian3.normalize(upCesium, new Cesium.Cartesian3());
    
    // 6. 计算 Cesium 相机的右向量（用于验证正交性）
    const rightCesium = new Cesium.Cartesian3();
    Cesium.Cartesian3.cross(cesiumCamera.direction, cesiumCamera.up, rightCesium);
    Cesium.Cartesian3.normalize(rightCesium, rightCesium);
    
    // 调试日志（偶尔输出）
    if (Math.random() < 0.01) {
      console.log('[CameraSynchronizer] Three.js → Cesium sync:', {
        threePos: { x: threeCamera.position.x.toFixed(6), y: threeCamera.position.y.toFixed(6), z: threeCamera.position.z.toFixed(6) },
        threeDir: { x: directionThree.x.toFixed(3), y: directionThree.y.toFixed(3), z: directionThree.z.toFixed(3) },
        threeUp: { x: upThree.x.toFixed(3), y: upThree.y.toFixed(3), z: upThree.z.toFixed(3) },
        cesiumPos: { x: cameraECEF.x.toFixed(0), y: cameraECEF.y.toFixed(0), z: cameraECEF.z.toFixed(0) },
        cesiumDir: { x: cesiumCamera.direction.x.toFixed(3), y: cesiumCamera.direction.y.toFixed(3), z: cesiumCamera.direction.z.toFixed(3) },
        cesiumUp: { x: cesiumCamera.up.x.toFixed(3), y: cesiumCamera.up.y.toFixed(3), z: cesiumCamera.up.z.toFixed(3) },
        cesiumRight: { x: rightCesium.x.toFixed(3), y: rightCesium.y.toFixed(3), z: rightCesium.z.toFixed(3) }
      });
    }
    
    // 同步 FOV：将 Three.js 的垂直 FOV 转换为水平 FOV 后设置给 Cesium
    // Three.js camera.fov 是垂直 FOV（角度）
    // Cesium PerspectiveFrustum.fov 是水平 FOV（弧度）
    // 转换公式：hFov = 2 * atan(tan(vFov/2) * aspectRatio)
    if (cesiumCamera.frustum instanceof Cesium.PerspectiveFrustum) {
      const vFovRad = THREE.MathUtils.degToRad(threeCamera.fov);
      const aspect = threeCamera.aspect;
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
      cesiumCamera.frustum.fov = hFovRad;
    }
  }
  
  /**
   * 反向同步视图矩阵（Cesium → Three.js）
   * 
   * 将 Cesium 相机的位置和方向同步到 Three.js 相机
   * 用于当 Cesium 控制相机时，让 Three.js 场景跟随
   * 
   * @param cesiumCamera - Cesium 相机
   * @param threeCamera - Three.js 相机
   * @param earthPosition - 地球在 Solar System Frame 中的位置（AU）
   */
  static syncFromCesium(
    cesiumCamera: Cesium.Camera,
    threeCamera: THREE.PerspectiveCamera,
    earthPosition: THREE.Vector3
  ): void {
    // 1. 转换 Cesium 相机位置（ECEF 米）为 Solar System Frame（AU）
    const cameraSolarSystem = CoordinateTransformer.ecefToSolarSystem(
      cesiumCamera.position,
      earthPosition
    );
    
    // 2. 设置 Three.js 相机位置
    threeCamera.position.copy(cameraSolarSystem);
    
    // 3. 坐标系转换：Cesium ECEF (Z-up, Y-forward) → Three.js (Y-up, Z-backward)
    // Cesium ECEF: X-right(本初子午线), Y-forward(东经90°), Z-up(北极)  右手系
    // Three.js:    X-right,             Y-up,               Z-backward   右手系
    //
    // 保持右手系手性的正确映射：
    //   Three.x =  Cesium.x
    //   Three.y =  Cesium.z
    //   Three.z = -Cesium.y   ← 负号保持手性，否则左右镜像
    const directionThree = new THREE.Vector3(
      cesiumCamera.direction.x,
      cesiumCamera.direction.z,
      -cesiumCamera.direction.y
    ).normalize();
    
    const upThree = new THREE.Vector3(
      cesiumCamera.up.x,
      cesiumCamera.up.z,
      -cesiumCamera.up.y
    ).normalize();
    
    // 4. 计算 Three.js 相机的目标点（相机位置 + 方向）
    const target = new THREE.Vector3().addVectors(
      threeCamera.position,
      directionThree
    );
    
    // 5. 使用 lookAt 设置相机方向
    threeCamera.up.copy(upThree);
    threeCamera.lookAt(target);
    
    // 调试日志（偶尔输出）
    if (Math.random() < 0.01) {
      console.log('[CameraSynchronizer] Cesium → Three.js sync:', {
        cesiumPos: { x: cesiumCamera.position.x.toFixed(0), y: cesiumCamera.position.y.toFixed(0), z: cesiumCamera.position.z.toFixed(0) },
        cesiumDir: { x: cesiumCamera.direction.x.toFixed(3), y: cesiumCamera.direction.y.toFixed(3), z: cesiumCamera.direction.z.toFixed(3) },
        cesiumUp: { x: cesiumCamera.up.x.toFixed(3), y: cesiumCamera.up.y.toFixed(3), z: cesiumCamera.up.z.toFixed(3) },
        threePos: { x: threeCamera.position.x.toFixed(6), y: threeCamera.position.y.toFixed(6), z: threeCamera.position.z.toFixed(6) },
        threeDir: { x: directionThree.x.toFixed(3), y: directionThree.y.toFixed(3), z: directionThree.z.toFixed(3) },
        threeUp: { x: upThree.x.toFixed(3), y: upThree.y.toFixed(3), z: upThree.z.toFixed(3) }
      });
    }
  }
}
