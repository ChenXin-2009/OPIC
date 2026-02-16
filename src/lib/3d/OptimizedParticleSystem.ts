/**
 * OptimizedParticleSystem.ts - 优化的粒子系统
 * 
 * 使用自定义着色器和 BufferGeometry 高效渲染大量星系
 */

import * as THREE from 'three';

/**
 * 优化的粒子系统
 * 用于高效渲染大量星系点
 */
export class OptimizedParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private totalCount: number;

  /**
   * 创建优化的粒子系统
   * 
   * @param positions - 位置数组（Float32Array，每3个值为一个点的 x,y,z）
   * @param colors - 颜色数组（Float32Array，每3个值为一个点的 r,g,b）
   * @param sizes - 大小数组（Float32Array，每个值为一个点的大小）
   */
  constructor(positions: Float32Array, colors: Float32Array, sizes: Float32Array) {
    this.totalCount = positions.length / 3;

    // 创建 BufferGeometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // 创建自定义着色器材质
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 1.0 },
        uBrightness: { value: 1.0 },
        uPointScale: { value: 1.0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPointScale;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // 距离衰减
          float dist = -mvPosition.z;
          gl_PointSize = size * uPointScale * (1000.0 / dist);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uOpacity;
        uniform float uBrightness;
        
        void main() {
          // 圆形点
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // 光晕效果
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          vec3 finalColor = vColor * uBrightness;
          
          gl_FragColor = vec4(finalColor, alpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: true,  // 启用深度写入以正确处理遮挡
      depthTest: true,   // 启用深度测试
      blending: THREE.AdditiveBlending,
    });

    // 创建 Points 对象
    this.points = new THREE.Points(this.geometry, this.material);
    
    // 启用视锥剔除
    this.points.frustumCulled = true;
  }

  /**
   * 设置粒子显示比率（用于 LOD）
   * 
   * @param ratio - 显示比率（0.0 - 1.0）
   */
  setParticleRatio(ratio: number): void {
    const visibleCount = Math.floor(this.totalCount * Math.max(0, Math.min(1, ratio)));
    this.geometry.setDrawRange(0, visibleCount);
  }

  /**
   * 更新透明度
   * 
   * @param opacity - 透明度（0.0 - 1.0）
   */
  updateOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = Math.max(0, Math.min(1, opacity));
    this.material.needsUpdate = true;
  }

  /**
   * 更新亮度
   * 
   * @param brightness - 亮度（0.0 - 2.0）
   */
  updateBrightness(brightness: number): void {
    this.material.uniforms.uBrightness.value = Math.max(0, brightness);
    this.material.needsUpdate = true;
  }

  /**
   * 更新点缩放
   * 
   * @param scale - 缩放因子
   */
  updatePointScale(scale: number): void {
    this.material.uniforms.uPointScale.value = Math.max(0, scale);
    this.material.needsUpdate = true;
  }

  /**
   * 获取 Points 对象（用于添加到场景）
   * 
   * @returns THREE.Points 对象
   */
  getPoints(): THREE.Points {
    return this.points;
  }

  /**
   * 获取粒子总数
   * 
   * @returns 粒子总数
   */
  getTotalCount(): number {
    return this.totalCount;
  }

  /**
   * 获取当前可见粒子数
   * 
   * @returns 可见粒子数
   */
  getVisibleCount(): number {
    const drawRange = this.geometry.drawRange;
    return drawRange.count === Infinity ? this.totalCount : drawRange.count;
  }

  /**
   * 设置渲染顺序
   * 
   * @param order - 渲染顺序
   */
  setRenderOrder(order: number): void {
    this.points.renderOrder = order;
  }

  /**
   * 设置可见性
   * 
   * @param visible - 是否可见
   */
  setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  /**
   * 更新位置（如果需要动态更新）
   * 
   * @param positions - 新的位置数组
   */
  updatePositions(positions: Float32Array): void {
    const positionAttribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttribute.set(positions);
    positionAttribute.needsUpdate = true;
  }

  /**
   * 更新颜色（如果需要动态更新）
   * 
   * @param colors - 新的颜色数组
   */
  updateColors(colors: Float32Array): void {
    const colorAttribute = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttribute.set(colors);
    colorAttribute.needsUpdate = true;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
