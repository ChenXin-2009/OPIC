/**
 * CoordinateTransformer - 坐标转换器
 *
 * @module CoordinateTransformer
 * @description
 * 负责太阳系黄道坐标系（Solar System Frame）与地心地固坐标系（ECEF）之间的双向转换，
 * 以及经纬度高度（LLA）与 ECEF 之间的互转。
 *
 * @architecture
 * 架构层级：Cesium 子系统 → 坐标转换层（底层工具类）
 * 职责边界：纯坐标数学变换，不持有任何状态，所有方法均为静态方法。
 *
 * @dependencies
 * - three（THREE.Vector3）：表示太阳系坐标系中的三维向量（黄道坐标系，单位 AU）
 * - cesium（Cesium.Cartesian3、Cesium.Cartographic）：表示 ECEF 坐标及经纬度坐标
 *
 * @integration
 * 与 Three.js 的集成关系：
 * - Three.js 场景使用黄道坐标系（X→春分点，Y→黄道面内 90°，Z→黄道北极），单位为 AU
 * - Cesium 使用地心地固坐标系（ECEF），单位为米，Z 轴指向地球北极
 * - 本模块通过黄赤交角旋转（绕 X 轴旋转 -ε）将黄道坐标系转换为赤道惯性系，
 *   再直接映射到 Cesium ECEF 坐标系
 *
 * @coordinateConventions
 * 坐标系约定：
 * - Solar System Frame（黄道坐标系）：右手系，X→春分点，Y→黄道面内 90°，Z→黄道北极，单位 AU
 * - ECEF（地心地固坐标系）：右手系，X→本初子午线与赤道交点，Y→东经 90° 与赤道交点，Z→北极，单位米
 * - 黄赤交角 ε = 23.4393°（J2000.0 历元 IAU 标准值），用于两坐标系之间的旋转变换
 */

import * as THREE from 'three';
import * as Cesium from 'cesium';

/**
 * 坐标转换常量
 *
 * 集中管理坐标变换所需的物理常量，所有常量均为只读静态属性。
 * 精度来源均注明，以便在需要更高精度时进行替换。
 */
export class CoordinateConstants {
  /**
   * 1 天文单位（AU）对应的米数
   *
   * 精确值来源：IAU 2012 决议 B2 将天文单位定义为精确值 149,597,870,700 米（无不确定度）。
   * 该值自 2012 年起取代了基于开普勒第三定律的动力学定义。
   * 单位：米/AU
   */
  static readonly AU_TO_METERS = 149597870700;

  /**
   * 地球平均半径（米）
   *
   * 注意：这是地球的体积平均半径（约 6371 km），而非 WGS84 椭球体的参数。
   * WGS84 椭球体赤道半径为 6,378,137 m，极半径为 6,356,752 m。
   * 本值用于太阳系坐标系中的近似距离计算，不用于精确大地测量。
   * 单位：米
   */
  static readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * 地球平均半径（天文单位）
   *
   * 由 EARTH_RADIUS_METERS / AU_TO_METERS 推导得出，约为 4.26 × 10⁻⁵ AU。
   * 用于在太阳系坐标系中判断相机是否接近地球表面。
   * 单位：AU
   */
  static readonly EARTH_RADIUS_AU = CoordinateConstants.EARTH_RADIUS_METERS / CoordinateConstants.AU_TO_METERS;

  /**
   * 黄赤交角（度，J2000.0 历元）
   *
   * 黄赤交角（Obliquity of the Ecliptic）是黄道面与天球赤道面之间的夹角。
   * 取值 23.4393° 为 J2000.0 历元（2000 年 1 月 1.5 日）的 IAU 标准值。
   * 该角度随时间缓慢变化（岁差），但对于可视化用途，使用固定值已足够精确。
   * 单位：度
   */
  static readonly OBLIQUITY_DEG = 23.4393;

  /**
   * 黄赤交角（弧度，J2000.0 历元）
   *
   * 由 OBLIQUITY_DEG × π / 180 推导得出，约为 0.4091 弧度。
   * 直接用于三角函数计算，避免在热路径中重复进行度到弧度的转换。
   * 单位：弧度
   */
  static readonly OBLIQUITY_RAD = CoordinateConstants.OBLIQUITY_DEG * Math.PI / 180;
}

/**
 * 调试用旋转偏移（度）
 *
 * 该对象在运行时可变（非 const），可通过 CesiumDebugPanel 组件的滑块在浏览器中实时调整。
 * 用途：在开发阶段校准 Three.js 坐标系与 Cesium ECEF 坐标系之间的对齐误差。
 * 当三个分量均为 0 时，不施加任何额外旋转（即使用理论计算的坐标系对齐）。
 *
 * 注意：这是调试工具，生产环境中三个分量应保持为 0。
 * 修改此对象会立即影响下一帧的相机位置计算，无需重启。
 */
export const debugRotationOffset = {
  /** 绕 X 轴的额外旋转偏移（度），正值为右手定则正方向 */
  x: 0,
  /** 绕 Y 轴的额外旋转偏移（度），正值为右手定则正方向 */
  y: 0,
  /** 绕 Z 轴的额外旋转偏移（度），正值为右手定则正方向 */
  z: 0,
};

/**
 * CoordinateTransformer - 坐标转换工具类
 *
 * 提供太阳系黄道坐标系（Three.js）与 Cesium ECEF 坐标系之间的静态转换方法。
 * 所有方法均为纯函数（不修改输入参数，不持有内部状态）。
 */
export class CoordinateTransformer {
  /**
   * 将太阳系坐标系中的相机位置转换为 Cesium ECEF 相机位置
   *
   * 转换流程（三步）：
   * 1. 计算相机相对于地球的局部位置（黄道坐标系，AU）
   * 2. 黄道坐标系 → 地心赤道坐标系（绕 X 轴旋转 -ε，ε = 黄赤交角）
   * 3. 应用可选的调试旋转偏移（用于校准）
   * 4. 单位换算：AU → 米，直接作为 Cesium ECEF 坐标输出
   *
   * 数学说明（黄道 → 赤道旋转矩阵，绕 X 轴旋转 -ε）：
   * ```
   * | x_eq |   | 1      0       0    | | x_ecl |
   * | y_eq | = | 0   cos(ε)  sin(ε)  | | y_ecl |
   * | z_eq |   | 0  -sin(ε)  cos(ε)  | | z_ecl |
   * ```
   * 其中 ε = 23.4393°（J2000.0 黄赤交角）
   *
   * @param cameraPosition - 相机在太阳系黄道坐标系中的位置（单位：AU）
   * @param earthPosition - 地球在太阳系黄道坐标系中的位置（单位：AU）
   * @returns 相机在 Cesium ECEF 坐标系中的位置（单位：米）
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
    // debugRotationOffset 可在运行时通过 CesiumDebugPanel 实时修改，
    // 三个分量均为 0 时跳过旋转计算以节省性能。
    // 旋转顺序：先绕 X 轴，再绕 Y 轴，最后绕 Z 轴（Tait-Bryan 内旋顺序）。
    let dx = eqX, dy = eqY, dz = eqZ;
    if (debugRotationOffset.x !== 0) {
      // 绕 X 轴旋转 debugRotationOffset.x 度
      const rx = debugRotationOffset.x * Math.PI / 180;
      const cy = Math.cos(rx), sy = Math.sin(rx);
      const ny = dy * cy - dz * sy;
      const nz = dy * sy + dz * cy;
      dy = ny; dz = nz;
    }
    if (debugRotationOffset.y !== 0) {
      // 绕 Y 轴旋转 debugRotationOffset.y 度
      const ry = debugRotationOffset.y * Math.PI / 180;
      const cx = Math.cos(ry), sx = Math.sin(ry);
      const nx = dx * cx + dz * sx;
      const nz = -dx * sx + dz * cx;
      dx = nx; dz = nz;
    }
    if (debugRotationOffset.z !== 0) {
      // 绕 Z 轴旋转 debugRotationOffset.z 度
      const rz = debugRotationOffset.z * Math.PI / 180;
      const cz = Math.cos(rz), sz = Math.sin(rz);
      const nx = dx * cz - dy * sz;
      const ny = dx * sz + dy * cz;
      dx = nx; dy = ny;
    }

    // 4. 赤道坐标系 → Cesium ECEF 轴重映射（直接对应）
    // 赤道惯性系与 ECEF 的轴方向一致（均为 X→春分点，Z→北极），
    // 此处直接赋值，无需额外旋转。
    const localCesiumX = dx;
    const localCesiumY = dy;
    const localCesiumZ = dz;
    
    // 5. 转换单位：AU → 米
    const positionMetersX = localCesiumX * CoordinateConstants.AU_TO_METERS;
    const positionMetersY = localCesiumY * CoordinateConstants.AU_TO_METERS;
    const positionMetersZ = localCesiumZ * CoordinateConstants.AU_TO_METERS;
    
    // 6. 创建 Cesium ECEF 坐标（Cartesian3）
    const cameraECEF = new Cesium.Cartesian3(
      positionMetersX,
      positionMetersY,
      positionMetersZ
    );
    
    // 调试日志（以约 1% 的概率输出，避免日志刷屏）
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
   * 将太阳系黄道坐标系中的任意位置转换为 Cesium ECEF 坐标
   *
   * 本方法是 `solarSystemToCesiumCamera` 的别名，适用于非相机对象（如卫星、天体）的坐标转换。
   * 转换逻辑与相机转换完全相同：黄道坐标系 → 赤道坐标系 → ECEF，并应用调试旋转偏移。
   *
   * @param position - 目标点在太阳系黄道坐标系中的位置（单位：AU）
   * @param earthPosition - 地球在太阳系黄道坐标系中的位置（单位：AU）
   * @returns 目标点在 Cesium ECEF 坐标系中的位置（单位：米）
   */
  static solarSystemToECEF(
    position: THREE.Vector3,
    earthPosition: THREE.Vector3
  ): Cesium.Cartesian3 {
    // 使用新的球面坐标转换方法
    return CoordinateTransformer.solarSystemToCesiumCamera(position, earthPosition);
  }
  
  /**
   * 将 Cesium ECEF 坐标转换回太阳系黄道坐标系
   *
   * 本方法是 `solarSystemToCesiumCamera` 的逆变换，用于将 Cesium 中的位置映射回 Three.js 场景。
   *
   * 逆变换数学推导：
   * 正变换（solarSystemToCesiumCamera）的步骤为：
   *   1. local_ecl = position_solar - earth_solar（减去地球位置，得到局部黄道坐标）
   *   2. local_eq  = R_x(-ε) × local_ecl（绕 X 轴旋转 -ε，黄道 → 赤道）
   *   3. ecef_m    = local_eq × AU_TO_METERS（单位换算）
   *
   * 逆变换步骤（忽略调试旋转偏移，假设偏移为零）：
   *   1. local_eq  = ecef_m / AU_TO_METERS（单位换算，米 → AU）
   *   2. local_ecl = R_x(+ε) × local_eq（绕 X 轴旋转 +ε，赤道 → 黄道）
   *   3. position_solar = local_ecl + earth_solar（加上地球位置，还原太阳系坐标）
   *
   * 注意：当前实现使用了简化的轴重映射（Cesium Z-up → Three.js Y-up），
   * 而非严格的黄赤交角逆旋转，适用于近似场景。
   *
   * @param ecef - Cesium ECEF 坐标（单位：米）
   * @param earthPosition - 地球在太阳系黄道坐标系中的位置（单位：AU）
   * @returns 对应点在太阳系黄道坐标系中的位置（单位：AU）
   */
  static ecefToSolarSystem(
    ecef: Cesium.Cartesian3,
    earthPosition: THREE.Vector3
  ): THREE.Vector3 {
    // 1. 坐标轴重映射：Cesium ECEF（Z 轴朝上）→ Three.js（Y 轴朝上）
    // 保持右手系手性的正确映射（与 solarSystemToCesiumCamera 互逆）：
    //   Three.x =  Cesium.x
    //   Three.y =  Cesium.z
    //   Three.z = -Cesium.y   ← 负号保持手性（右手系 → 右手系）
    const xMeters = ecef.x;
    const yMeters = ecef.z;
    const zMeters = -ecef.y;
    
    // 2. 单位换算：米 → AU
    const localPosition = new THREE.Vector3(
      xMeters / CoordinateConstants.AU_TO_METERS,
      yMeters / CoordinateConstants.AU_TO_METERS,
      zMeters / CoordinateConstants.AU_TO_METERS
    );
    
    // 3. 还原太阳系绝对坐标：局部坐标（相对地球）+ 地球在太阳系中的位置
    return localPosition.add(earthPosition);
  }
  
  /**
   * 将经纬度高度（LLA）坐标转换为 Cesium ECEF 坐标
   *
   * 内部使用 Cesium 的 WGS84 椭球体模型进行精确转换，
   * 适用于需要精确大地坐标的场景（如卫星轨道、地面站位置）。
   *
   * @param longitude - 经度（单位：度，范围 -180 ~ 180，东经为正）
   * @param latitude - 纬度（单位：度，范围 -90 ~ 90，北纬为正）
   * @param height - 椭球面以上的高度（单位：米，海拔高度近似值）
   * @returns 对应点在 Cesium ECEF 坐标系中的位置（单位：米）
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
   * 将 Cesium ECEF 坐标转换为经纬度高度（LLA）坐标
   *
   * 内部使用 Cesium 的 WGS84 椭球体模型进行精确逆变换。
   * 返回的经纬度为度数，高度为椭球面以上的米数。
   *
   * @param ecef - Cesium ECEF 坐标（单位：米）
   * @returns 包含经度、纬度（单位：度）和高度（单位：米）的对象
   */
  static ecefToLLA(ecef: Cesium.Cartesian3): {
    /** 经度（度，东经为正，范围 -180 ~ 180） */
    longitude: number;
    /** 纬度（度，北纬为正，范围 -90 ~ 90） */
    latitude: number;
    /** 椭球面以上高度（米） */
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
