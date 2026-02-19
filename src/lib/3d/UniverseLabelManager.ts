/**
 * UniverseLabelManager - 宇宙天体标签管理器
 * 
 * 功能：
 * - 为宇宙尺度天体（星系、星系团等）创建和管理2D标签
 * - 实现智能重叠检测和自动隐藏
 * - 支持标签优先级系统
 * - 根据相机距离动态显示/隐藏标签
 * - 支持标签聚类显示
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * 标签数据接口
 */
export interface LabelData {
  /** 天体名称（英文） */
  name: string;
  /** 天体中文名称（可选） */
  nameZh?: string;
  /** 3D位置（AU单位） */
  position: THREE.Vector3;
  /** 优先级（0-10，数值越大越重要） */
  priority: number;
  /** 标签类型（用于样式区分） */
  type: 'galaxy' | 'group' | 'cluster' | 'supercluster';
  /** 额外信息（可选） */
  metadata?: {
    distance?: string;  // 距离信息
    size?: string;      // 大小信息
    members?: number;   // 成员数量
  };
}

/**
 * 标签配置接口
 */
export interface LabelConfig {
  /** 字体大小 */
  fontSize: string;
  /** 字体粗细 */
  fontWeight: string;
  /** 字体族 */
  fontFamily: string;
  /** 文字颜色 */
  color: string;
  /** 文字阴影 */
  textShadow: string;
  /** 标签偏移（像素） */
  offsetX: number;
  offsetY: number;
  /** 最小显示距离（AU） */
  minShowDistance: number;
  /** 最大显示距离（AU） */
  maxShowDistance: number;
  /** 淡入淡出速度 */
  fadeSpeed: number;
}

/**
 * 屏幕空间标签信息
 */
interface ScreenLabelInfo {
  label: CSS2DObject;
  data: LabelData;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  visible: boolean;
}

/**
 * 默认标签配置
 */
const DEFAULT_LABEL_CONFIG: Record<string, Partial<LabelConfig>> = {
  galaxy: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#88ccff',
    offsetX: 15,
    offsetY: -5,
    minShowDistance: 1000,
    maxShowDistance: 150000000, // 1.5倍原值（原100000000）
  },
  group: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffaa88',
    offsetX: 20,
    offsetY: -8,
    minShowDistance: 50000,
    maxShowDistance: 450000000, // 1.5倍原值（原300000000）
  },
  cluster: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#ffcc66',
    offsetX: 25,
    offsetY: -10,
    minShowDistance: 100000,
    maxShowDistance: 750000000, // 1.5倍原值（原500000000）
  },
  supercluster: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ff88cc',
    offsetX: 30,
    offsetY: -12,
    minShowDistance: 500000,
    maxShowDistance: 1500000000, // 1.5倍原值（原1000000000）
  },
};

/**
 * 宇宙标签管理器类
 */
export class UniverseLabelManager {
  private labels: Map<string, CSS2DObject> = new Map();
  private labelData: Map<string, LabelData> = new Map();
  private parentGroup: THREE.Group;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private baseConfig: LabelConfig;

  constructor(
    parentGroup: THREE.Group,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
    config?: Partial<LabelConfig>
  ) {
    this.parentGroup = parentGroup;
    this.camera = camera;
    this.canvas = canvas;
    
    // 合并默认配置
    this.baseConfig = {
      fontSize: '14px',
      fontWeight: '500',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#ffffff',
      textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)',
      offsetX: 15,
      offsetY: -5,
      minShowDistance: 1000,
      maxShowDistance: 1000000000,
      fadeSpeed: 0.15,
      ...config,
    };
  }

  /**
   * 创建标签
   */
  createLabel(data: LabelData, parentObject?: THREE.Object3D): CSS2DObject {
    // 如果标签已存在，先移除
    if (this.labels.has(data.name)) {
      this.removeLabel(data.name);
    }

    // 获取类型特定配置
    const typeConfig = DEFAULT_LABEL_CONFIG[data.type] || {};
    const config = { ...this.baseConfig, ...typeConfig };

    // 创建标签容器
    const labelDiv = document.createElement('div');
    labelDiv.className = `universe-label universe-label-${data.type}`;
    
    // 如果有中文名称，创建中文标题（显示在上方）
    if (data.nameZh && data.nameZh !== data.name) {
      const zhTitleSpan = document.createElement('span');
      zhTitleSpan.className = 'universe-label-title-zh';
      zhTitleSpan.textContent = data.nameZh;
      labelDiv.appendChild(zhTitleSpan);
    }
    
    // 创建英文标题
    const titleSpan = document.createElement('span');
    titleSpan.className = 'universe-label-title';
    titleSpan.textContent = data.name;
    labelDiv.appendChild(titleSpan);

    // 如果有元数据，创建信息行
    if (data.metadata) {
      const infoDiv = document.createElement('div');
      infoDiv.className = 'universe-label-info';
      
      const infoParts: string[] = [];
      if (data.metadata.distance) infoParts.push(data.metadata.distance);
      if (data.metadata.size) infoParts.push(data.metadata.size);
      if (data.metadata.members) infoParts.push(`${data.metadata.members} members`);
      
      infoDiv.textContent = infoParts.join(' · ');
      labelDiv.appendChild(infoDiv);
    }

    // 应用样式
    this.applyLabelStyle(labelDiv, config);

    // 创建CSS2DObject
    const label = new CSS2DObject(labelDiv);
    label.position.copy(data.position);

    // 添加到父对象或场景
    if (parentObject) {
      parentObject.add(label);
    } else {
      this.parentGroup.add(label);
    }

    // 保存引用
    this.labels.set(data.name, label);
    this.labelData.set(data.name, data);

    return label;
  }

  /**
   * 批量创建标签
   */
  createLabels(dataArray: LabelData[], parentObject?: THREE.Object3D): void {
    dataArray.forEach(data => this.createLabel(data, parentObject));
  }

  /**
   * 移除标签
   */
  removeLabel(name: string): void {
    const label = this.labels.get(name);
    if (label) {
      label.removeFromParent();
      this.labels.delete(name);
      this.labelData.delete(name);
    }
  }

  /**
   * 清除所有标签
   */
  clearAll(): void {
    this.labels.forEach(label => label.removeFromParent());
    this.labels.clear();
    this.labelData.clear();
  }

  /**
   * 更新标签显示状态（包含重叠检测）
   * @param cameraDistance 相机到太阳系中心的距离（用于判断是否在显示范围内）
   */
  update(cameraDistance: number): void {
    if (this.labels.size === 0) return;

    // 检查相机距离是否在显示范围内（基于相机到太阳系中心的距离）
    const inGlobalRange = cameraDistance >= this.baseConfig.minShowDistance && 
                          cameraDistance <= this.baseConfig.maxShowDistance;

    if (!inGlobalRange) {
      // 如果相机不在显示范围内，隐藏所有标签
      this.labels.forEach(label => this.setLabelVisibility(label, false));
      return;
    }

    // 收集屏幕空间信息
    const screenLabels: ScreenLabelInfo[] = [];
    
    this.labels.forEach((label, name) => {
      const data = this.labelData.get(name);
      if (!data) return;

      // 获取标签的世界坐标
      const labelWorldPos = new THREE.Vector3();
      label.getWorldPosition(labelWorldPos);

      // 视锥体剔除
      if (!this.isInViewFrustum(labelWorldPos)) {
        this.setLabelVisibility(label, false);
        return;
      }

      // 计算屏幕位置
      const screenPos = this.worldToScreen(labelWorldPos);
      const labelDiv = label.element as HTMLDivElement;
      const rect = labelDiv.getBoundingClientRect();

      screenLabels.push({
        label,
        data,
        screenX: screenPos.x,
        screenY: screenPos.y,
        width: rect.width || 100,  // 默认宽度
        height: rect.height || 30, // 默认高度
        visible: true,
      });
    });

    // 按优先级排序（高优先级在前）
    screenLabels.sort((a, b) => b.data.priority - a.data.priority);

    // 重叠检测
    this.detectOverlaps(screenLabels);

    // 应用可见性
    screenLabels.forEach(info => {
      this.setLabelVisibility(info.label, info.visible);
    });
  }

  /**
   * 重叠检测算法
   */
  private detectOverlaps(screenLabels: ScreenLabelInfo[]): void {
    const padding = 5; // 标签之间的最小间距

    for (let i = 0; i < screenLabels.length; i++) {
      const labelA = screenLabels[i];
      if (!labelA.visible) continue;

      for (let j = i + 1; j < screenLabels.length; j++) {
        const labelB = screenLabels[j];
        if (!labelB.visible) continue;

        // 检测矩形重叠
        const overlapX = Math.abs(labelA.screenX - labelB.screenX) < 
                        (labelA.width + labelB.width) / 2 + padding;
        const overlapY = Math.abs(labelA.screenY - labelB.screenY) < 
                        (labelA.height + labelB.height) / 2 + padding;

        if (overlapX && overlapY) {
          // 隐藏优先级较低的标签
          labelB.visible = false;
        }
      }
    }
  }

  /**
   * 设置标签可见性（带平滑过渡）
   */
  private setLabelVisibility(label: CSS2DObject, visible: boolean): void {
    const labelDiv = label.element as HTMLDivElement;
    const targetOpacity = visible ? '1' : '0';
    
    if (labelDiv.style.opacity !== targetOpacity) {
      labelDiv.style.opacity = targetOpacity;
      labelDiv.style.pointerEvents = visible ? 'auto' : 'none';
    }
  }

  /**
   * 世界坐标转屏幕坐标
   */
  private worldToScreen(worldPos: THREE.Vector3): { x: number; y: number } {
    const vector = worldPos.clone().project(this.camera);
    
    return {
      x: (vector.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * this.canvas.clientHeight,
    };
  }

  /**
   * 检查点是否在视锥体内
   */
  private isInViewFrustum(worldPos: THREE.Vector3): boolean {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    
    projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);
    
    return frustum.containsPoint(worldPos);
  }

  /**
   * 应用标签样式
   */
  private applyLabelStyle(element: HTMLDivElement, config: LabelConfig): void {
    // 容器样式
    element.style.position = 'absolute';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    element.style.whiteSpace = 'nowrap';
    element.style.opacity = '1'; // 初始可见，由 update 方法控制
    element.style.transition = `opacity ${config.fadeSpeed}s ease-out`;
    element.style.display = 'flex';
    element.style.flexDirection = 'column';
    element.style.alignItems = 'flex-start';
    element.style.left = `${config.offsetX}px`;
    element.style.top = `${config.offsetY}px`;
    element.style.transform = 'translate(0, 0)';

    // 标题样式（英文）
    const titleSpan = element.querySelector('.universe-label-title') as HTMLSpanElement;
    if (titleSpan) {
      titleSpan.style.fontSize = config.fontSize;
      titleSpan.style.fontWeight = config.fontWeight;
      titleSpan.style.fontFamily = "'Novecento Wide', " + config.fontFamily;
      titleSpan.style.color = config.color;
      titleSpan.style.textShadow = config.textShadow;
      titleSpan.style.lineHeight = '1.2';
      titleSpan.style.textTransform = 'uppercase'; // 全部转为大写
      titleSpan.style.fontVariant = 'small-caps'; // 小写字母显示为小型大写字母
      titleSpan.style.letterSpacing = '0.05em'; // 增加字母间距
    }

    // 中文标题样式（显示在英文上方）
    const zhTitleSpan = element.querySelector('.universe-label-title-zh') as HTMLSpanElement;
    if (zhTitleSpan) {
      // 中文标题使用稍小的字号
      const zhFontSize = parseInt(config.fontSize) * 0.9;
      zhTitleSpan.style.fontSize = `${zhFontSize}px`;
      zhTitleSpan.style.fontWeight = config.fontWeight;
      zhTitleSpan.style.fontFamily = "'Noto Sans SC', 'Microsoft YaHei', " + config.fontFamily;
      zhTitleSpan.style.color = config.color;
      zhTitleSpan.style.textShadow = config.textShadow;
      zhTitleSpan.style.lineHeight = '1.2';
      zhTitleSpan.style.letterSpacing = '0.05em';
      zhTitleSpan.style.marginBottom = '2px'; // 与英文标题的间距
    }

    // 信息行样式
    const infoDiv = element.querySelector('.universe-label-info') as HTMLDivElement;
    if (infoDiv) {
      infoDiv.style.fontSize = '11px';
      infoDiv.style.fontWeight = '400';
      infoDiv.style.fontFamily = "'Novecento Wide', " + config.fontFamily;
      infoDiv.style.color = 'rgba(255, 255, 255, 0.7)';
      infoDiv.style.textShadow = config.textShadow;
      infoDiv.style.marginTop = '2px';
      infoDiv.style.lineHeight = '1.2';
      infoDiv.style.textTransform = 'uppercase';
      infoDiv.style.letterSpacing = '0.05em';
    }
  }

  /**
   * 获取标签数量
   */
  getLabelCount(): number {
    return this.labels.size;
  }

  /**
   * 获取所有标签数据
   */
  getAllLabelData(): LabelData[] {
    return Array.from(this.labelData.values());
  }

  /**
   * 更新标签位置
   */
  updateLabelPosition(name: string, position: THREE.Vector3): void {
    const label = this.labels.get(name);
    if (label) {
      label.position.copy(position);
    }
  }

  /**
   * 更新标签数据
   */
  updateLabelData(name: string, data: Partial<LabelData>): void {
    const existingData = this.labelData.get(name);
    if (existingData) {
      Object.assign(existingData, data);
      
      // 如果名称改变，需要重新创建标签
      if (data.name && data.name !== name) {
        this.removeLabel(name);
        this.createLabel({ ...existingData, ...data } as LabelData);
      }
    }
  }
}
