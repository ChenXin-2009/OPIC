/**
 * LabelManager.ts - 标签管理系统
 * 
 * 功能：
 * - 统一管理所有天体标签的创建、更新和销毁
 * - 实现高效的标签重叠检测
 * - 优化标签渲染性能
 */

import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * 标签数据接口
 */
export interface LabelData {
  key: string;
  text: string;
  position: THREE.Vector3;
  element: HTMLDivElement;
  object: CSS2DObject;
  targetOpacity: number;
  currentOpacity: number;
  visible: boolean;
  isSelected: boolean;
  priority: number;
}

/**
 * 标签管理器
 */
export class LabelManager {
  private labels: Map<string, LabelData> = new Map();
  private camera: THREE.Camera | null = null;
  private container: HTMLElement | null = null;
  
  /**
   * 初始化标签管理器
   */
  init(camera: THREE.Camera, container: HTMLElement): void {
    this.camera = camera;
    this.container = container;
  }
  
  /**
   * 创建标签
   */
  createLabel(
    key: string,
    text: string,
    position: THREE.Vector3,
    isSelected: boolean = false,
    priority: number = 1
  ): CSS2DObject {
    const element = document.createElement('div');
    element.className = 'planet-label';
    element.textContent = text;
    element.style.color = '#ffffff';
    element.style.fontSize = '16px';
    element.style.fontWeight = 'var(--font-weight-label)';
    element.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
    element.style.userSelect = 'none';
    element.style.textShadow = '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)';
    element.style.whiteSpace = 'nowrap';
    element.style.opacity = '1';
    element.style.transition = 'opacity 0.1s';
    element.style.display = 'block';
    element.style.position = 'absolute';
    element.style.left = '25px';
    element.style.top = '-8px';
    element.style.transform = 'translate(0, 0)';
    
    const object = new CSS2DObject(element);
    object.position.copy(position);
    
    const labelData: LabelData = {
      key,
      text,
      position: position.clone(),
      element,
      object,
      targetOpacity: 1.0,
      currentOpacity: 1.0,
      visible: true,
      isSelected,
      priority,
    };
    
    this.labels.set(key, labelData);
    return object;
  }
  
  /**
   * 更新标签位置
   */
  updateLabelPosition(key: string, position: THREE.Vector3): void {
    const label = this.labels.get(key);
    if (label) {
      label.position.copy(position);
      label.object.position.copy(position);
    }
  }
  
  /**
   * 更新标签透明度
   */
  updateLabelOpacity(key: string, opacity: number): void {
    const label = this.labels.get(key);
    if (label) {
      label.targetOpacity = Math.max(0, Math.min(1, opacity));
    }
  }
  
  /**
   * 更新标签可见性
   */
  updateLabelVisible(key: string, visible: boolean): void {
    const label = this.labels.get(key);
    if (label) {
      label.visible = visible;
    }
  }
  
  /**
   * 更新所有标签
   */
  update(): void {
    if (!this.camera || !this.container) return;
    
    const camera = this.camera;
    const container = this.container;
    
    this.labels.forEach(label => {
      if (!label.visible) return;
      
      const screenPos = label.position.clone().project(camera);
      const x = (screenPos.x * 0.5 + 0.5) * container.clientWidth;
      const y = (screenPos.y * -0.5 + 0.5) * container.clientHeight;
      
      label.element.style.left = `${x + 25}px`;
      label.element.style.top = `${y - 8}px`;
      
      // 更新透明度
      const diff = label.targetOpacity - label.currentOpacity;
      if (Math.abs(diff) > 0.001) {
        label.currentOpacity += diff * 0.2;
        label.currentOpacity = Math.max(0, Math.min(1, label.currentOpacity));
      } else {
        label.currentOpacity = label.targetOpacity;
      }
      
      label.element.style.opacity = label.currentOpacity.toString();
      label.element.style.display = label.currentOpacity > 0.01 ? 'block' : 'none';
    });
  }
  
  /**
   * 销毁标签
   */
  destroyLabel(key: string): void {
    const label = this.labels.get(key);
    if (label) {
      if (label.object.parent) {
        label.object.parent.remove(label.object);
      }
      if (label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
      this.labels.delete(key);
    }
  }
  
  /**
   * 销毁所有标签
   */
  destroyAll(): void {
    this.labels.forEach(label => {
      if (label.object.parent) {
        label.object.parent.remove(label.object);
      }
      if (label.element.parentNode) {
        label.element.parentNode.removeChild(label.element);
      }
    });
    this.labels.clear();
  }
  
  /**
   * 获取标签数量
   */
  size(): number {
    return this.labels.size;
  }
}
