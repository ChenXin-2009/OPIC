/**
 * @module SolarSystemGrid
 * @description 太阳系参考网格
 *
 * 在恒星层级显示以太阳系黄道平面为基准的参考网格。
 * 网格大小自适应相机距离，并提供当前网格间距信息供比例尺使用。
 *
 * 架构层级：Three.js 3D 渲染子系统 → 场景辅助对象层
 * 职责边界：仅负责网格线的生成与更新，不处理相机控制或坐标转换。
 *
 * 依赖：
 *   - three：Three.js 核心库，用于几何体、材质和场景对象
 *   - galaxyConfig：提供光年/AU 换算常量和视图层级阈值
 *
 * 坐标系约定：黄道坐标系（场景默认坐标系）
 *   - X 轴：指向春分点（J2000.0 历元）
 *   - Y 轴：黄道平面内，垂直于 X 轴（右手系）
 *   - Z 轴：黄道北极（垂直于黄道平面，指向北天极方向）
 * 因此网格在 XY 平面上（Z=0），即黄道面。
 */

import * as THREE from 'three';
import { LIGHT_YEAR_TO_AU } from '../config/galaxyConfig';
import { SCALE_VIEW_CONFIG } from '../config/galaxyConfig';

// 网格显示的距离阈值（AU）
const GRID_FADE_START = SCALE_VIEW_CONFIG.nearbyStarsShowStart * 0.5; // 15000 AU
const GRID_FADE_FULL = SCALE_VIEW_CONFIG.nearbyStarsShowStart;         // 30000 AU
const GRID_FADE_OUT_START = SCALE_VIEW_CONFIG.nearbyStarsFadeStart;    // 500 光年
const GRID_FADE_OUT_END = SCALE_VIEW_CONFIG.nearbyStarsFadeEnd;        // 1000 光年

// 网格颜色
const GRID_COLOR = new THREE.Color(0x4488cc);        // 普通网格线颜色（蓝色调）
const GRID_CENTER_COLOR = new THREE.Color(0x6699dd); // 中心轴线颜色（更亮的蓝色，突出原点）

// 网格自适应：每个视口内保持约 8~16 条线
const TARGET_LINES = 10;

// 网格间距候选值（AU），按量级排列
// 分组说明：
//   亚 AU 级（0.1~0.5 AU）：用于近距离观察太阳系内部结构
//   AU 级（1~5 AU）：覆盖内太阳系（水星~木星轨道范围）
//   十 AU 级（10~50 AU）：覆盖外太阳系（土星~柯伊伯带）
//   百 AU 级（100~500 AU）：覆盖日球层顶附近区域
//   千 AU 级（1000~5000 AU）：覆盖奥尔特云内边缘
//   万 AU 级（10000~500000 AU）：覆盖奥尔特云外边缘至最近恒星
//   光年级（1~1000 光年）：覆盖恒星际空间，切换为光年单位显示
const GRID_STEPS_AU = [
  // 亚 AU 级
  0.1, 0.2, 0.5,
  // AU 级（内太阳系）
  1, 2, 5,
  // 十 AU 级（外太阳系）
  10, 20, 50,
  // 百 AU 级（日球层顶）
  100, 200, 500,
  // 千 AU 级（奥尔特云内边缘）
  1000, 2000, 5000,
  // 万 AU 级（奥尔特云外边缘）
  10000, 20000, 50000,
  // 十万 AU 级（最近恒星距离量级）
  100000, 200000, 500000,
  // 光年级（恒星际空间）
  1 * LIGHT_YEAR_TO_AU,
  2 * LIGHT_YEAR_TO_AU,
  5 * LIGHT_YEAR_TO_AU,
  10 * LIGHT_YEAR_TO_AU,
  20 * LIGHT_YEAR_TO_AU,
  50 * LIGHT_YEAR_TO_AU,
  100 * LIGHT_YEAR_TO_AU,
  200 * LIGHT_YEAR_TO_AU,
  500 * LIGHT_YEAR_TO_AU,
  1000 * LIGHT_YEAR_TO_AU,
];

/**
 * 网格状态信息，供外部（如比例尺 UI）读取当前网格参数
 */
export interface GridInfo {
  /** 当前网格间距（AU） */
  cellSizeAU: number;
  /** 当前网格间距的可读标签（如 "1 光年"、"100 AU"） */
  label: string;
  /** 当前网格透明度，范围 0~1（0 表示完全不可见） */
  opacity: number;
}

/**
 * 太阳系参考网格类
 *
 * 管理黄道平面上的自适应参考网格，根据相机距离动态调整网格间距和透明度。
 * 网格仅在恒星层级（约 15000~500000 AU）可见，在太阳系内部和银河系尺度下自动淡出。
 */
export class SolarSystemGrid {
  /** Three.js 场景组，包含所有网格线对象 */
  private group: THREE.Group;
  /** 当前网格线段对象，重建时会被替换 */
  private gridLines: THREE.LineSegments | null = null;
  /** 上一帧的网格间距（AU），用于检测是否需要重建网格 */
  private currentCellSize: number = 0;
  /** 当前平滑后的透明度值（0~1），通过指数平滑过渡 */
  private currentOpacity: number = 0;
  /** 对外暴露的网格状态信息缓存 */
  private gridInfo: GridInfo = { cellSizeAU: 0, label: '', opacity: 0 };

  /**
   * 创建 SolarSystemGrid 实例
   *
   * 初始化 Three.js Group 容器，网格线将在首次调用 `update` 时按需生成。
   * 网格位于黄道平面（XY 平面），无需额外旋转。
   */
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'SolarSystemGrid';
    // 网格在黄道平面（XY 平面），不需要旋转
  }

  /**
   * 获取 Three.js 场景组，用于添加到父场景
   * @returns 包含网格线的 Three.js Group 对象
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * 获取当前网格状态信息，供比例尺等 UI 组件读取
   * @returns 包含间距、标签和透明度的网格信息对象
   */
  getGridInfo(): GridInfo {
    return this.gridInfo;
  }

  /**
   * 每帧更新，根据相机距离和视野计算网格间距与透明度
   *
   * 调用频率：每渲染帧（通常 60fps）
   * 副作用：可能重建网格几何体（当间距变化超过 10% 时）
   *
   * @param camera - Three.js 透视相机，用于获取 FOV 和宽高比
   * @param cameraDistance - 相机到原点（太阳）的距离（AU）
   */
  update(camera: THREE.PerspectiveCamera, cameraDistance: number): void {
    // 计算目标透明度
    const targetOpacity = this.calcOpacity(cameraDistance);

    // 平滑过渡透明度（指数平滑，系数 0.08 约对应 ~12 帧的过渡时间）
    this.currentOpacity += (targetOpacity - this.currentOpacity) * 0.08;

    if (this.currentOpacity < 0.005) {
      this.group.visible = false;
      this.gridInfo = { cellSizeAU: 0, label: '', opacity: 0 };
      return;
    }

    this.group.visible = true;

    // 计算合适的网格间距
    const cellSize = this.calcCellSize(camera, cameraDistance);

    // 如果间距变化超过 10%，重建网格
    if (Math.abs(cellSize - this.currentCellSize) / (this.currentCellSize || 1) > 0.1) {
      this.rebuildGrid(cellSize, cameraDistance);
      this.currentCellSize = cellSize;
    }

    // 更新透明度
    if (this.gridLines) {
      const mat = this.gridLines.material as THREE.LineBasicMaterial;
      mat.opacity = this.currentOpacity * 0.5;
    }

    this.gridInfo = {
      cellSizeAU: cellSize,
      label: this.formatLabel(cellSize),
      opacity: this.currentOpacity,
    };
  }

  /**
   * 释放网格占用的 GPU 资源（几何体和材质）
   * 应在组件卸载或场景销毁时调用，防止内存泄漏
   */
  dispose(): void {
    this.clearGrid();
  }

  // ==================== 私有方法 ====================

  /**
   * 根据相机距离计算网格透明度
   *
   * 透明度分四段：
   *   [0, FADE_START)：完全不可见（太阳系内部，网格无意义）
   *   [FADE_START, FADE_FULL)：线性淡入（进入恒星层级）
   *   [FADE_FULL, FADE_OUT_START)：完全可见
   *   [FADE_OUT_START, FADE_OUT_END)：线性淡出（进入银河系层级）
   *   [FADE_OUT_END, ∞)：完全不可见（银河系尺度，网格无意义）
   *
   * @param cameraDistance - 相机到原点的距离（AU）
   * @returns 目标透明度，范围 [0, 1]
   */
  private calcOpacity(cameraDistance: number): number {
    if (cameraDistance < GRID_FADE_START) return 0;
    if (cameraDistance < GRID_FADE_FULL) {
      return (cameraDistance - GRID_FADE_START) / (GRID_FADE_FULL - GRID_FADE_START);
    }
    if (cameraDistance < GRID_FADE_OUT_START) return 1;
    if (cameraDistance < GRID_FADE_OUT_END) {
      return 1 - (cameraDistance - GRID_FADE_OUT_START) / (GRID_FADE_OUT_END - GRID_FADE_OUT_START);
    }
    return 0;
  }

  /**
   * 根据相机视野和距离计算合适的网格间距
   *
   * 数学原理（视口可见范围估算）：
   *   设相机 FOV（垂直视角）为 θ，宽高比为 a，相机到黄道面距离近似为 d（cameraDistance）
   *   则黄道面上可见的半高度：halfHeight = tan(θ/2) × d
   *   可见的半宽度：halfWidth = halfHeight × a
   *   可见总范围：visibleRange = 2 × max(halfWidth, halfHeight)
   *
   *   目标间距 = visibleRange / TARGET_LINES
   *   从 GRID_STEPS_AU 候选值中选取第一个 ≥ targetStep × 0.5 的值，
   *   确保视口内线条数量在 TARGET_LINES 附近（约 8~16 条）。
   *
   * @param camera - Three.js 透视相机（提供 fov 和 aspect）
   * @param cameraDistance - 相机到原点的距离（AU），用于近似投影距离
   * @returns 选定的网格间距（AU），来自 GRID_STEPS_AU 候选值
   */
  private calcCellSize(camera: THREE.PerspectiveCamera, cameraDistance: number): number {
    // 将 FOV 从角度转换为弧度
    const fovRad = (camera.fov * Math.PI) / 180;
    const aspect = camera.aspect;
    // 利用透视投影关系估算黄道面上的可见半高度：halfHeight = tan(fov/2) × distance
    const halfHeight = Math.tan(fovRad / 2) * cameraDistance;
    // 可见半宽度 = 半高度 × 宽高比
    const halfWidth = halfHeight * aspect;
    // 取宽高中较大者作为可见范围基准，乘以 2 得到全范围
    const visibleRange = Math.max(halfWidth, halfHeight) * 2;

    // 目标间距：使视口内约有 TARGET_LINES 条网格线
    const targetStep = visibleRange / TARGET_LINES;

    // 从候选值中找第一个不小于 targetStep × 0.5 的值
    // 乘以 0.5 是为了允许选取略小于目标的间距，避免线条过稀
    let best = GRID_STEPS_AU[0];
    for (const step of GRID_STEPS_AU) {
      if (step >= targetStep * 0.5) {
        best = step;
        break;
      }
      best = step;
    }
    return best;
  }

  /**
   * 重建网格几何体
   *
   * 网格对齐算法说明：
   *   以相机位置为中心，向外扩展 3 倍相机距离作为网格范围（halfExtent = cameraDistance × 3）。
   *   为确保网格线始终对齐到 cellSize 的整数倍坐标（避免网格随相机移动而漂移），
   *   使用 Math.floor 和 Math.ceil 将范围边界对齐到最近的网格线位置：
   *     minCoord = Math.floor(-halfExtent / cellSize) × cellSize  → 向负无穷方向对齐
   *     maxCoord = Math.ceil(halfExtent / cellSize) × cellSize    → 向正无穷方向对齐
   *   这样无论相机在何处，网格线始终位于固定的世界坐标位置（0, ±cellSize, ±2×cellSize, ...）。
   *
   * @param cellSize - 网格间距（AU）
   * @param cameraDistance - 相机到原点的距离（AU），用于确定网格覆盖范围
   */
  private rebuildGrid(cellSize: number, cameraDistance: number): void {
    this.clearGrid();

    // 网格范围：以原点为中心，半径为相机距离的 3 倍
    // 乘以 3 确保网格覆盖整个视口，即使相机偏离原点也不会出现网格边界
    const halfExtent = cameraDistance * 3;
    // Math.floor 向负无穷对齐，确保 minCoord 是 cellSize 的整数倍且 ≤ -halfExtent
    const minCoord = Math.floor(-halfExtent / cellSize) * cellSize;
    // Math.ceil 向正无穷对齐，确保 maxCoord 是 cellSize 的整数倍且 ≥ halfExtent
    const maxCoord = Math.ceil(halfExtent / cellSize) * cellSize;

    const positions: number[] = [];
    const colors: number[] = [];

    // 辅助函数：添加一条线段（Z=0，即黄道平面）
    const addLine = (x1: number, y1: number, x2: number, y2: number, isCenter: boolean) => {
      const c = isCenter ? GRID_CENTER_COLOR : GRID_COLOR;
      positions.push(x1, y1, 0, x2, y2, 0);
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };

    // 沿 X 方向的线（平行于 X 轴，即固定 Y 坐标的水平线）
    for (let y = minCoord; y <= maxCoord + cellSize * 0.01; y += cellSize) {
      // 对浮点数累加误差进行修正：将 y 四舍五入到最近的 cellSize 整数倍
      const snapped = Math.round(y / cellSize) * cellSize;
      // 判断是否为中心轴线（Y=0，即 X 轴）
      addLine(minCoord, snapped, maxCoord, snapped, Math.abs(snapped) < cellSize * 0.01);
    }

    // 沿 Y 方向的线（平行于 Y 轴，即固定 X 坐标的垂直线）
    for (let x = minCoord; x <= maxCoord + cellSize * 0.01; x += cellSize) {
      // 对浮点数累加误差进行修正：将 x 四舍五入到最近的 cellSize 整数倍
      const snapped = Math.round(x / cellSize) * cellSize;
      // 判断是否为中心轴线（X=0，即 Y 轴）
      addLine(snapped, minCoord, snapped, maxCoord, Math.abs(snapped) < cellSize * 0.01);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.gridLines = new THREE.LineSegments(geometry, material);
    // renderOrder = -100 确保网格线在其他场景对象之前渲染，避免深度冲突
    this.gridLines.renderOrder = -100;
    this.group.add(this.gridLines);
  }

  /**
   * 清除当前网格并释放 GPU 资源
   * 在重建网格前或销毁时调用
   */
  private clearGrid(): void {
    if (this.gridLines) {
      this.group.remove(this.gridLines);
      this.gridLines.geometry.dispose();
      (this.gridLines.material as THREE.Material).dispose();
      this.gridLines = null;
    }
  }

  /**
   * 将网格间距（AU）格式化为人类可读的标签字符串
   *
   * 单位换算逻辑：
   *   - au ≥ LIGHT_YEAR_TO_AU（约 63241 AU）：转换为光年显示
   *     - ly ≥ 1000：显示为"X 千光年"（整数）
   *     - 1 ≤ ly < 1000：显示为"X 光年"（整数或一位小数）
   *   - 1 ≤ au < LIGHT_YEAR_TO_AU：直接显示为"X AU"（整数或一位小数）
   *   - au < 1：转换为毫 AU（mAU）显示，1 mAU = 0.001 AU ≈ 149597 km
   *
   * @param au - 网格间距（AU）
   * @returns 格式化后的标签字符串，如 "1 光年"、"100 AU"、"500 mAU"
   */
  private formatLabel(au: number): string {
    if (au >= LIGHT_YEAR_TO_AU) {
      // 将 AU 转换为光年（1 光年 ≈ 63241 AU）
      const ly = au / LIGHT_YEAR_TO_AU;
      if (ly >= 1000) return `${(ly / 1000).toFixed(0)} 千光年`;
      // 整数光年直接显示，非整数保留一位小数
      if (ly >= 1) return `${ly % 1 === 0 ? ly.toFixed(0) : ly.toFixed(1)} 光年`;
    }
    if (au >= 1) {
      // 整数 AU 直接显示，非整数保留一位小数
      return `${au % 1 === 0 ? au.toFixed(0) : au.toFixed(1)} AU`;
    }
    // 小于 1 AU 时转换为毫 AU（mAU），1 mAU = 0.001 AU
    return `${(au * 1000).toFixed(0)} mAU`;
  }
}
