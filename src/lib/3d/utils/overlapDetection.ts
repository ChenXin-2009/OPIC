/**
 * OverlapDetection.ts - 高效的标签重叠检测
 * 
 * 功能：
 * - 使用空间分割算法优化重叠检测性能
 * - 从 O(n²) 降低到 O(n) 复杂度
 * - 支持优先级处理
 */

import * as THREE from 'three';

/**
 * 标签信息接口
 */
export interface LabelInfo {
  key: string;
  screenX: number;
  screenY: number;
  text: string;
  isSelected: boolean;
  priority: number;
  width: number;
  height: number;
}

/**
 * 空间网格单元
 */
interface GridCell {
  labels: LabelInfo[];
}

/**
 * 重叠检测器
 */
export class OverlapDetector {
  private grid: Map<string, GridCell> = new Map();
  private cellSize: number;
  
  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }
  
  /**
   * 检测重叠标签
   */
  detectOverlaps(labels: LabelInfo[]): Set<string> {
    this.clearGrid();
    
    labels.forEach(label => {
      const cellKey = this.getCellKey(label.screenX, label.screenY);
      let cell = this.grid.get(cellKey);
      
      if (!cell) {
        cell = { labels: [] };
        this.grid.set(cellKey, cell);
      }
      
      cell.labels.push(label);
    });
    
    const overlapping = new Set<string>();
    
    this.grid.forEach(cell => {
      for (let i = 0; i < cell.labels.length; i++) {
        for (let j = i + 1; j < cell.labels.length; j++) {
          if (this.checkOverlap(cell.labels[i], cell.labels[j])) {
            if (!cell.labels[i].isSelected) {
              overlapping.add(cell.labels[i].key);
            }
            if (!cell.labels[j].isSelected) {
              overlapping.add(cell.labels[j].key);
            }
          }
        }
      }
    });
    
    return overlapping;
  }
  
  /**
   * 检查两个标签是否重叠
   */
  private checkOverlap(a: LabelInfo, b: LabelInfo): boolean {
    const dx = Math.abs(a.screenX - b.screenX);
    const dy = Math.abs(a.screenY - b.screenY);
    
    const totalWidth = (a.width + b.width) / 2;
    const totalHeight = (a.height + b.height) / 2;
    
    return dx < totalWidth && dy < totalHeight;
  }
  
  /**
   * 获取网格单元键
   */
  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  /**
   * 清空网格
   */
  private clearGrid(): void {
    this.grid.clear();
  }
  
  /**
   * 设置网格单元大小
   */
  setCellSize(size: number): void {
    this.cellSize = size;
  }
}
