/**
 * CoordinateTransformer - 坐标转换器
 * 
 * 负责 Solar System Frame ↔ ECEF 坐标转换
 * 提供 LLA ↔ ECEF 双向转换
 */

import * as THREE from 'three';
import * as Cesium from 'cesium';

/**
 * 坐标转换常量
 */
export class CoordinateConstants {
  /** 1 AU（天文单位）= 149,597,870,700 米 */
  static readonly AU_TO_METERS = 149597870700;
  
  /** 地球半径（米） */
  static readonly EARTH_RADIUS_METERS = 6371000;
  
  /** 地球半径（AU） */
  static readonly EARTH_RADIUS_AU = CoordinateConstants.EARTH_RADIUS_METERS / CoordinateConstants.AU_TO_METERS;

  /** 黄赤交角（度，J2000.0） */
  static readonly OBLIQUITY_DEG = 23.4393;

  /** 黄赤交角（弧度） */
  static readonly OBLIQUITY_RAD = CoordinateConstants.OBLIQUITY_DEG * Math.PI / 180;
}

/**
 * 调试用旋转偏移（度）
 * 可在运行时通过 CesiumDebugPanel 调整，用于校准坐标系对齐
 */
export const debugRotationOffset = {
  x: 0,  // 绕 X 轴旋转（度）
  y: 0,  // 绕 Y 轴旋转（度）
  z: 0,  // 绕 Z 轴旋转（度）
};

/**
 * CoordinateTransformer - 坐标转换工具类
 */
export class CoordinateTransformer {
  /**
   * Solar System Frame → Cesium Camera Position
   * 
   * 将太阳系坐标系中的相机位置转换为 Cesium 相机位置
   * 直接进行笛卡尔坐标转换，不使用球面坐标
   * 
   * @param cameraPosition - 相机在 Solar System Frame 中的位置（AU）
   * @param earthPosition - 地球在 Solar System Frame 中的位置（AU）
   * @returns Cesium 相机位置 (ECEF 坐标,米)
   */
  static solarSystemToCesiumCamera(
    cameraPosition: THREE.Vector3,
    earthPosition: THREE.Vector3
  ): Cesium.Cartesian3 {
    // 1. 计算相机相对于地球的位置（局部坐标系，AU）
    const localPosition = cameraPosition.clone().sub(earthPosition);
    
    // 2. 黄道坐标系 → 地心赤道坐标系
    // Three.js 场景坐标系 = 黄道坐标系（X→春分点，Y→黄道面内90°，Z→黄道北极）
    // 地心赤道坐标系（X→春分点，Y→赤道面内90°，Z→天球北极/地球自转轴）
    // 转换：绕 X 轴旋转 -ε（ε = 黄赤交角 23.4393°）
    //   x_eq =  x_ecl
    //   y_eq =  y_ecl * cos(ε) + z_ecl * sin(ε)
    //   z_eq = -y_ecl * sin(ε) + z_ecl * cos(ε)
    const cosObl = Math.cos(CoordinateConstants.OBLIQUITY_RAD);
    const sinObl = Math.sin(CoordinateConstants.OBLIQUITY_RAD);
    const eqX = localPosition.x;
    const eqY = localPosition.y * cosObl + localPosition.z * sinObl;
    const eqZ = -localPosition.y * sinObl + localPosition.z * cosObl;

    // 3. 应用调试旋转偏移（用于校准坐标系对齐）
    // 依次绕 X、Y、Z 轴旋转
    let dx = eqX, dy = eqY, dz = eqZ;
    if (debugRotationOffset.x !== 0) {
      const rx = debugRotationOffset.x * Math.PI / 180;
      const cy = Math.cos(rx), sy = Math.sin(rx);
      const ny = dy * cy - dz * sy;
      const nz = dy * sy + dz * cy;
      dy = ny; dz = nz;
    }
    if (debugRotationOffset.y !== 0) {
      const ry = debugRotationOffset.y * Math.PI / 180;
      const cx = Math.cos(ry), sx = Math.sin(ry);
      const nx = dx * cx + dz * sx;
      const nz = -dx * sx + dz * cx;
      dx = nx; dz = nz;
    }
    if (debugRotationOffset.z !== 0) {
      const rz = debugRotationOffset.z * Math.PI / 180;
      const cz = Math.cos(rz), sz = Math.sin(rz);
      const nx = dx * cz - dy * sz;
      const ny = dx * sz + dy * cz;
      dx = nx; dy = ny;
    }

    // 4. 赤道坐标系 → Cesium ECEF 轴重映射（直接对应）
    const localCesiumX = dx;
    const localCesiumY = dy;
    const localCesiumZ = dz;
    
    // 4. 转换单位：AU → 米
    const positionMetersX = localCesiumX * CoordinateConstants.AU_TO_METERS;
    const positionMetersY = localCesiumY * CoordinateConstants.AU_TO_METERS;
    const positionMetersZ = localCesiumZ * CoordinateConstants.AU_TO_METERS;
    
    // 5. 创建 ECEF 坐标
    const cameraECEF = new Cesium.Cartesian3(
      positionMetersX,
      positionMetersY,
      positionMetersZ
    );
    
    // 调试日志（偶尔输出）
    if (Math.random() < 0.01) {
      const distance = localPosition.length();
      const distanceKm = distance * CoordinateConstants.AU_TO_METERS / 1000;
      console.log('[CoordinateTransformer] Camera conversion:', {
        localThree: { x: localPosition.x.toFixed(6), y: localPosition.y.toFixed(6), z: localPosition.z.toFixed(6) },
        localEq: { x: eqX.toFixed(6), y: eqY.toFixed(6), z: eqZ.toFixed(6) },
        distanceKm: distanceKm.toFixed(0),
        ecef: { x: cameraECEF.x.toFixed(0), y: cameraECEF.y.toFixed(0), z: cameraECEF.z.toFixed(0) }
      });
    }
    
    return cameraECEF;
  }
  
  /**
   * Solar System Frame → ECEF
   * 
   * 将太阳系黄道坐标系（AU）转换为地心地固坐标系（meters）
   * 
   * @param position - Solar System Frame 坐标（AU）
   * @param earthPosition - 地球在 Solar System Frame 中的位置（AU）
   * @returns ECEF 坐标（meters）
   */
  static solarSystemToECEF(
    position: THREE.Vector3,
    earthPosition: THREE.Vector3
  ): Cesium.Cartesian3 {
    // 使用新的球面坐标转换方法
    return CoordinateTransformer.solarSystemToCesiumCamera(position, earthPosition);
  }
  
  /**
   * ECEF → Solar System Frame
   * 
   * 将地心地固坐标系（meters）转换为太阳系黄道坐标系（AU）
   * 
   * @param ecef - ECEF 坐标（meters）
   * @param earthPosition - 地球在 Solar System Frame 中的位置（AU）
   * @returns Solar System Frame 坐标（AU）
   */
  static ecefToSolarSystem(
    ecef: Cesium.Cartesian3,
    earthPosition: THREE.Vector3
  ): THREE.Vector3 {
    // 坐标系转换：Cesium ECEF (Z-up) → Three.js (Y-up)
    // 保持右手系手性的正确映射（与 solarSystemToCesiumCamera 互逆）：
    //   Three.x =  Cesium.x
    //   Three.y =  Cesium.z
    //   Three.z = -Cesium.y   ← 负号保持手性
    const xMeters = ecef.x;
    const yMeters = ecef.z;
    const zMeters = -ecef.y;
    
    // 2. 转换单位：meters → AU
    const localPosition = new THREE.Vector3(
      xMeters / CoordinateConstants.AU_TO_METERS,
      yMeters / CoordinateConstants.AU_TO_METERS,
      zMeters / CoordinateConstants.AU_TO_METERS
    );
    
    // 3. 转换为 Solar System Frame（加上地球位置）
    return localPosition.add(earthPosition);
  }
  
  /**
   * LLA → ECEF
   * 
   * 将经纬度高度坐标转换为地心地固坐标系
   * 
   * @param longitude - 经度（度）
   * @param latitude - 纬度（度）
   * @param height - 高度（米）
   * @returns ECEF 坐标（meters）
   */
  static llaToECEF(
    longitude: number,
    latitude: number,
    height: number
  ): Cesium.Cartesian3 {
    const cartographic = Cesium.Cartographic.fromDegrees(longitude, latitude, height);
    return Cesium.Cartographic.toCartesian(cartographic);
  }
  
  /**
   * ECEF → LLA
   * 
   * 将地心地固坐标系转换为经纬度高度坐标
   * 
   * @param ecef - ECEF 坐标（meters）
   * @returns { longitude, latitude, height }
   */
  static ecefToLLA(ecef: Cesium.Cartesian3): {
    longitude: number;
    latitude: number;
    height: number;
  } {
    const cartographic = Cesium.Cartographic.fromCartesian(ecef);
    return {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: cartographic.height
    };
  }
}
