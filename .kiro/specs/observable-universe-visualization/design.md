# 设计文档：可观测宇宙可视化

## 概述

本设计文档描述了将现有太阳系可视化项目从银河系层级扩展到可观测宇宙的技术实现方案。该扩展将增加以下宇宙尺度的可视化能力：

- **本星系群**（Local Group）：包含银河系、仙女座星系等约80个星系
- **近邻星系群**（Nearby Galaxy Groups）：本星系群周围的主要星系群
- **室女座超星系团**（Virgo Supercluster）：包含约100个星系群和星系团
- **拉尼亚凯亚超星系团**（Laniakea Supercluster）：更大尺度的宇宙结构
- **近邻超星系团**（Nearby Superclusters）：拉尼亚凯亚周围的超星系团
- **可观测宇宙大尺度结构**（Observable Universe）：星系纤维、空洞、长城等

### 设计目标

1. **架构一致性**：复用现有的 SceneManager、NearbyStars、GalaxyRenderer 架构模式
2. **性能优化**：保持 60 FPS（银河系尺度）和 30+ FPS（宇宙尺度）
3. **数据效率**：压缩后数据文件控制在 30KB 以内
4. **科学准确性**：使用真实天文数据（约 1,880 个数据点）
5. **平滑过渡**：在不同尺度之间实现流畅的视觉过渡
6. **可扩展性**：支持未来添加新的宇宙尺度

### 技术栈

- **渲染引擎**：Three.js（WebGL）
- **编程语言**：TypeScript
- **坐标系统**：超银道坐标系（Supergalactic Coordinates）
- **数据格式**：二进制 Float32Array（Gzip 压缩）
- **渲染技术**：粒子系统、LOD、实例化渲染、视锥剔除

## 架构设计

### 整体架构

系统采用分层渲染器架构，每个宇宙尺度对应一个独立的渲染器类，由 SceneManager 统一管理：


```
SceneManager
├── NearbyStars (现有)
├── GaiaStars (现有)
├── GalaxyRenderer (现有)
├── LocalGroupRenderer (新增)
├── NearbyGroupsRenderer (新增)
├── VirgoSuperclusterRenderer (新增)
├── LaniakeaSuperclusterRenderer (新增)
├── NearbySuperclusterRenderer (新增)
└── ObservableUniverseRenderer (新增)
```

### 架构原则

1. **插件化设计**：每个渲染器独立实现，通过统一接口与 SceneManager 交互
2. **渐进式加载**：按需加载数据，优先加载当前视图所需数据
3. **分层渲染**：使用 renderOrder 控制渲染顺序，确保正确的深度关系
4. **状态管理**：每个渲染器管理自己的可见性、透明度和 LOD 状态
5. **坐标系统一**：所有渲染器使用超银道坐标系，确保空间对齐

### 渲染器接口

所有新增渲染器遵循统一接口：

```typescript
interface UniverseScaleRenderer {
  // 获取渲染组（添加到场景）
  getGroup(): THREE.Group;
  
  // 更新渲染状态（每帧调用）
  update(cameraDistance: number, deltaTime: number): void;
  
  // 获取当前透明度
  getOpacity(): number;
  
  // 获取可见性状态
  getIsVisible(): boolean;
  
  // 清理资源
  dispose(): void;
  
  // 可选：设置亮度
  setBrightness?(brightness: number): void;
  
  // 可选：获取天体数据（用于交互）
  getObjectData?(): any[];
}
```

### SceneManager 扩展

SceneManager 需要扩展以支持新的渲染器：

```typescript
class SceneManager {
  // 现有渲染器
  private nearbyStars: NearbyStars | null;
  private gaiaStars: GaiaStars | null;
  private galaxyRenderer: GalaxyRenderer | null;
  
  // 新增渲染器
  private localGroupRenderer: LocalGroupRenderer | null;
  private nearbyGroupsRenderer: NearbyGroupsRenderer | null;
  private virgoSuperclusterRenderer: VirgoSuperclusterRenderer | null;
  private laniakeaSuperclusterRenderer: LaniakeaSuperclusterRenderer | null;
  private nearbySuperclusterRenderer: NearbySuperclusterRenderer | null;
  private observableUniverseRenderer: ObservableUniverseRenderer | null;
  
  // 初始化所有渲染器
  private initializeMultiScaleView(): void {
    this.initializeNearbyStars();
    this.initializeGaiaStars();
    this.initializeGalaxyRenderer();
    this.initializeLocalGroup();
    this.initializeNearbyGroups();
    this.initializeVirgoSupercluster();
    this.initializeLaniakeaSupercluster();
    this.initializeNearbySupercluster();
    this.initializeObservableUniverse();
  }
  
  // 更新所有渲染器
  updateMultiScaleView(cameraDistance: number, deltaTime: number): void {
    // 现有渲染器
    this.nearbyStars?.update(cameraDistance, deltaTime);
    this.gaiaStars?.update(cameraDistance, deltaTime);
    this.galaxyRenderer?.update(cameraDistance, deltaTime);
    
    // 新增渲染器
    this.localGroupRenderer?.update(cameraDistance, deltaTime);
    this.nearbyGroupsRenderer?.update(cameraDistance, deltaTime);
    this.virgoSuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.laniakeaSuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.nearbySuperclusterRenderer?.update(cameraDistance, deltaTime);
    this.observableUniverseRenderer?.update(cameraDistance, deltaTime);
    
    // 更新天空盒透明度
    this.updateSkyboxOpacity(cameraDistance, deltaTime);
  }
}
```

## 组件和接口

### 1. LocalGroupRenderer（本星系群渲染器）

**职责**：渲染本星系群中的主要星系（80个）

**数据结构**：
```typescript
interface LocalGroupGalaxy {
  name: string;           // 星系名称
  x: number;              // X 坐标（Mpc，超银道坐标系）
  y: number;              // Y 坐标
  z: number;              // Z 坐标
  type: GalaxyType;       // 星系类型
  brightness: number;     // 相对亮度（0-1）
  color: number;          // 颜色（十六进制）
  radius: number;         // 视觉半径（Mpc）
}

enum GalaxyType {
  Spiral = 0,      // 螺旋星系
  Elliptical = 1,  // 椭圆星系
  Irregular = 2,   // 不规则星系
  Dwarf = 3,       // 矮星系
}
```

**渲染策略**：
- 使用实例化网格渲染星系
- 根据类型使用不同的纹理/形状
- 支持点击交互显示详细信息
- 距离 < 150,000 光年时淡出
- 距离 200,000 - 500,000 光年时完全显示

**关键方法**：
```typescript
class LocalGroupRenderer {
  private createGalaxyMesh(galaxy: LocalGroupGalaxy): THREE.Mesh;
  private updateGalaxyVisibility(cameraDistance: number): void;
  private calculateOpacity(cameraDistance: number): number;
}
```

### 2. NearbyGroupsRenderer（近邻星系群渲染器）

**职责**：渲染本星系群周围的主要星系群（8个星系群，约150个星系）

**数据结构**：
```typescript
interface GalaxyGroup {
  name: string;           // 星系群名称
  centerX: number;        // 中心 X 坐标（Mpc）
  centerY: number;        // 中心 Y 坐标
  centerZ: number;        // 中心 Z 坐标
  radius: number;         // 半径（Mpc）
  memberCount: number;    // 成员数量
  richness: number;       // 丰度等级（0-255）
  galaxies: SimpleGalaxy[]; // 成员星系
}

interface SimpleGalaxy {
  x: number;              // X 坐标（Mpc）
  y: number;              // Y 坐标
  z: number;              // Z 坐标
  brightness: number;     // 相对亮度
}
```

**渲染策略**：
- 使用粒子系统渲染星系群
- 程序化生成额外星系以增强视觉效果
- 距离 800,000 - 1,000,000 光年时淡入
- 距离 1,000,000 - 3,000,000 光年时完全显示

### 3. VirgoSuperclusterRenderer（室女座超星系团渲染器）

**职责**：渲染室女座超星系团（30个星系团，约600个代表性星系）

**数据结构**：
```typescript
interface GalaxyCluster {
  name: string;           // 星系团名称
  centerX: number;        // 中心坐标（Mpc）
  centerY: number;
  centerZ: number;
  radius: number;         // 半径（Mpc）
  memberCount: number;    // 成员数量
  richness: number;       // 丰度等级
  galaxies: SimpleGalaxy[];
}
```

**渲染策略**：
- 使用高效粒子系统
- 基于密度场渲染
- 距离 4,000,000 - 5,000,000 光年时淡入
- 距离 5,000,000 - 15,000,000 光年时完全显示

### 4. LaniakeaSuperclusterRenderer（拉尼亚凯亚超星系团渲染器）

**职责**：渲染拉尼亚凯亚超星系团（15个超星系团，约200个代表性星系）

**数据结构**：
```typescript
interface Supercluster {
  name: string;
  centerX: number;        // 中心坐标（Mpc）
  centerY: number;
  centerZ: number;
  radius: number;
  memberCount: number;
  richness: number;
  velocityX?: number;     // 可选：引力流速度
  velocityY?: number;
  velocityZ?: number;
}
```

**渲染策略**：
- 使用 LOD 系统
- 可选显示引力流方向
- 距离 40,000,000 - 50,000,000 光年时淡入
- 距离 50,000,000 - 150,000,000 光年时完全显示

### 5. NearbySuperclusterRenderer（近邻超星系团渲染器）

**职责**：渲染拉尼亚凯亚周围的超星系团（20个超星系团，约200个代表性星系）

**渲染策略**：
- 基于密度场渲染
- 根据质量调整视觉大小
- 距离 120,000,000 - 150,000,000 光年时淡入
- 距离 150,000,000 - 400,000,000 光年时完全显示

### 6. ObservableUniverseRenderer（可观测宇宙渲染器）

**职责**：渲染可观测宇宙的大尺度结构

**数据结构**：
```typescript
interface CosmicStructure {
  type: 'wall' | 'void' | 'filament';
  name: string;
  centerX: number;        // 中心坐标（Gpc）
  centerY: number;
  centerZ: number;
  sizeX: number;          // 尺寸（Gpc）
  sizeY: number;
  sizeZ: number;
  redshift: number;       // 红移
}

interface FilamentParams {
  anchorPoints: Vector3[]; // 锚点位置
  thickness: number;       // 纤维厚度
  density: number;         // 密度参数
}
```

**渲染策略**：
- 程序化生成宇宙纤维网络
- 使用体积渲染技术
- 显示红移标记
- 显示可观测宇宙边界
- 距离 500,000,000 - 1,500,000,000 光年时显示

## 数据模型

### 数据文件结构

数据文件采用二进制格式，分层加载：

```
data/universe/
├── local-group.bin          (~8 KB)   - 本星系群详细数据
├── nearby-groups.bin        (~12 KB)  - 近邻星系群
├── virgo-supercluster.bin   (~20 KB)  - 室女座超星系团
├── laniakea.bin            (~15 KB)  - 拉尼亚凯亚
├── nearby-superclusters.bin (~15 KB)  - 近邻超星系团
├── cosmic-web-params.bin   (~5 KB)   - 宇宙网络参数
└── metadata.json           (~2 KB)   - 元数据
```

### 二进制数据格式

**本星系群数据**（16 字节/星系）：
```typescript
struct LocalGroupGalaxy {
  x: float32,           // 4 bytes - X 坐标（Mpc）
  y: float32,           // 4 bytes - Y 坐标
  z: float32,           // 4 bytes - Z 坐标
  brightness: uint8,    // 1 byte  - 相对亮度（0-255）
  type: uint8,          // 1 byte  - 星系类型
  nameIndex: uint8,     // 1 byte  - 名称索引
  color: uint8,         // 1 byte  - 颜色索引
  radius: uint16,       // 2 bytes - 视觉半径
  reserved: uint16,     // 2 bytes - 保留
}
```

**简化星系数据**（12 字节/星系）：
```typescript
struct SimpleGalaxy {
  x: float32,           // 4 bytes
  y: float32,           // 4 bytes
  z: float32,           // 4 bytes
}
```

**星系团元数据**（20 字节）：
```typescript
struct ClusterMetadata {
  centerX: float32,     // 4 bytes
  centerY: float32,     // 4 bytes
  centerZ: float32,     // 4 bytes
  radius: float32,      // 4 bytes
  memberCount: uint16,  // 2 bytes
  richness: uint8,      // 1 byte
  nameIndex: uint8,     // 1 byte
}
```

### 数据加载策略

```typescript
class UniverseDataLoader {
  private cache: Map<string, ArrayBuffer> = new Map();
  private loadingPromises: Map<string, Promise<ArrayBuffer>> = new Map();
  
  // 渐进式加载
  async loadDataForScale(scale: UniverseScale): Promise<ArrayBuffer> {
    const filename = this.getFilenameForScale(scale);
    
    // 检查缓存
    if (this.cache.has(filename)) {
      return this.cache.get(filename)!;
    }
    
    // 检查是否正在加载
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename)!;
    }
    
    // 开始加载
    const promise = this.fetchAndDecompress(filename);
    this.loadingPromises.set(filename, promise);
    
    const data = await promise;
    this.cache.set(filename, data);
    this.loadingPromises.delete(filename);
    
    return data;
  }
  
  // 预加载相邻尺度
  preloadAdjacentScales(currentScale: UniverseScale): void {
    const adjacent = this.getAdjacentScales(currentScale);
    adjacent.forEach(scale => {
      this.loadDataForScale(scale).catch(err => {
        console.warn(`Failed to preload ${scale}:`, err);
      });
    });
  }
  
  // 释放远距离尺度的缓存
  releaseDistantScales(currentScale: UniverseScale): void {
    const distant = this.getDistantScales(currentScale);
    distant.forEach(scale => {
      const filename = this.getFilenameForScale(scale);
      this.cache.delete(filename);
    });
  }
}
```

### 坐标系转换

所有数据统一使用超银道坐标系：

```typescript
class CoordinateConverter {
  // J2000.0 赤道坐标 → 超银道坐标
  static equatorialToSupergalactic(
    ra: number,    // 赤经（度）
    dec: number,   // 赤纬（度）
    distance: number // 距离（Mpc）
  ): Vector3 {
    // 1. 赤道 → 银道
    const galactic = this.equatorialToGalactic(ra, dec);
    
    // 2. 银道 → 超银道
    const supergalactic = this.galacticToSupergalactic(
      galactic.l,
      galactic.b,
      distance
    );
    
    return supergalactic;
  }
  
  // 银道坐标 → 超银道坐标
  static galacticToSupergalactic(
    l: number,     // 银经（度）
    b: number,     // 银纬（度）
    distance: number
  ): Vector3 {
    const l0 = 137.37; // 超银道坐标系原点银经
    const b0 = 0;      // 超银道坐标系原点银纬
    
    const lRad = l * Math.PI / 180;
    const bRad = b * Math.PI / 180;
    const l0Rad = l0 * Math.PI / 180;
    
    // 超银道经度
    const SGL = Math.atan2(
      Math.sin(lRad - l0Rad),
      Math.cos(lRad - l0Rad) * Math.sin(b0) - Math.tan(bRad) * Math.cos(b0)
    );
    
    // 超银道纬度
    const SGB = Math.asin(
      Math.sin(bRad) * Math.sin(b0) + 
      Math.cos(bRad) * Math.cos(b0) * Math.cos(lRad - l0Rad)
    );
    
    // 转换为笛卡尔坐标
    return new Vector3(
      distance * Math.cos(SGB) * Math.cos(SGL),
      distance * Math.sin(SGB),
      -distance * Math.cos(SGB) * Math.sin(SGL)
    );
  }
  
  // 红移 → 共动距离（使用 ΛCDM 模型）
  static redshiftToComovingDistance(z: number): number {
    const H0 = 70;      // km/s/Mpc
    const OmegaM = 0.3;
    const OmegaL = 0.7;
    const c = 299792.458; // km/s
    
    if (z < 0.1) {
      // 低红移近似
      return (c * z) / H0;
    }
    
    // 数值积分
    const steps = 100;
    const dz = z / steps;
    let sum = 0;
    
    for (let i = 0; i < steps; i++) {
      const zi = (i + 0.5) * dz;
      const E = Math.sqrt(OmegaM * Math.pow(1 + zi, 3) + OmegaL);
      sum += dz / E;
    }
    
    return (c / H0) * sum;
  }
}
```


### 配置系统

扩展现有的 galaxyConfig.ts：

```typescript
// src/lib/config/universeConfig.ts

export const MEGAPARSEC_TO_AU = PARSEC_TO_AU * 1e6;
export const GIGAPARSEC_TO_AU = PARSEC_TO_AU * 1e9;

// 视图切换阈值配置（扩展）
export const UNIVERSE_SCALE_CONFIG = {
  // 现有配置
  ...SCALE_VIEW_CONFIG,
  
  // 本星系群
  localGroupShowStart: 200000 * LIGHT_YEAR_TO_AU,      // 20万光年
  localGroupShowFull: 500000 * LIGHT_YEAR_TO_AU,       // 50万光年
  localGroupFadeStart: 150000 * LIGHT_YEAR_TO_AU,      // 15万光年（淡出银河系）
  
  // 近邻星系群
  nearbyGroupsShowStart: 1e6 * LIGHT_YEAR_TO_AU,       // 100万光年
  nearbyGroupsShowFull: 3e6 * LIGHT_YEAR_TO_AU,        // 300万光年
  nearbyGroupsFadeStart: 800000 * LIGHT_YEAR_TO_AU,    // 80万光年（淡出本星系群）
  
  // 室女座超星系团
  virgoShowStart: 5e6 * LIGHT_YEAR_TO_AU,              // 500万光年
  virgoShowFull: 15e6 * LIGHT_YEAR_TO_AU,              // 1500万光年
  virgoFadeStart: 4e6 * LIGHT_YEAR_TO_AU,              // 400万光年（淡出近邻星系群）
  
  // 拉尼亚凯亚超星系团
  laniakeaShowStart: 50e6 * LIGHT_YEAR_TO_AU,          // 5000万光年
  laniakeaShowFull: 150e6 * LIGHT_YEAR_TO_AU,          // 1.5亿光年
  laniakeaFadeStart: 40e6 * LIGHT_YEAR_TO_AU,          // 4000万光年（淡出室女座）
  
  // 近邻超星系团
  nearbySuperclusterShowStart: 150e6 * LIGHT_YEAR_TO_AU, // 1.5亿光年
  nearbySuperclusterShowFull: 400e6 * LIGHT_YEAR_TO_AU,  // 4亿光年
  nearbySuperclusterFadeStart: 120e6 * LIGHT_YEAR_TO_AU, // 1.2亿光年（淡出拉尼亚凯亚）
  
  // 可观测宇宙
  observableUniverseShowStart: 500e6 * LIGHT_YEAR_TO_AU, // 5亿光年
  observableUniverseShowFull: 1500e6 * LIGHT_YEAR_TO_AU, // 15亿光年
  observableUniverseFadeStart: 400e6 * LIGHT_YEAR_TO_AU, // 4亿光年（淡出近邻超星系团）
};

// 本星系群配置
export const LOCAL_GROUP_CONFIG = {
  enabled: true,
  galaxyCount: 80,
  baseGalaxySize: 0.01 * MEGAPARSEC_TO_AU,  // 基础星系大小
  brightnessScale: 2.0,
  useTextures: true,
  spiralTexture: '/textures/universe/spiral-galaxy.webp',
  ellipticalTexture: '/textures/universe/elliptical-galaxy.webp',
  irregularTexture: '/textures/universe/irregular-galaxy.webp',
  labelShowDistance: 100000 * LIGHT_YEAR_TO_AU,
};

// 近邻星系群配置
export const NEARBY_GROUPS_CONFIG = {
  enabled: true,
  groupCount: 8,
  galaxyCount: 150,
  useParticles: true,
  particleSize: 2.0,
  enhancementFactor: 3,  // 程序化生成倍数
};

// 室女座超星系团配置
export const VIRGO_SUPERCLUSTER_CONFIG = {
  enabled: true,
  clusterCount: 30,
  galaxyCount: 600,
  useParticles: true,
  particleSize: 1.5,
  densityFieldEnabled: true,
  enhancementFactor: 5,
};

// 拉尼亚凯亚超星系团配置
export const LANIAKEA_SUPERCLUSTER_CONFIG = {
  enabled: true,
  superclusterCount: 15,
  galaxyCount: 200,
  useParticles: true,
  particleSize: 1.0,
  showVelocityFlow: false,  // 可选显示引力流
  velocityArrowScale: 0.1,
  lodEnabled: true,
  lodLevels: 3,
};

// 近邻超星系团配置
export const NEARBY_SUPERCLUSTER_CONFIG = {
  enabled: true,
  superclusterCount: 20,
  galaxyCount: 200,
  useParticles: true,
  particleSize: 0.8,
  densityFieldEnabled: true,
};

// 可观测宇宙配置
export const OBSERVABLE_UNIVERSE_CONFIG = {
  enabled: true,
  anchorPointCount: 100,
  filamentEnabled: true,
  filamentThickness: 10 * MEGAPARSEC_TO_AU,
  filamentDensity: 0.5,
  voidEnabled: true,
  voidMinSize: 50 * MEGAPARSEC_TO_AU,
  wallEnabled: true,
  showRedshiftMarkers: true,
  redshiftLevels: [0.1, 0.5, 1.0, 2.0],
  showObservableBoundary: true,
  boundaryRadius: 46.5e9 * LIGHT_YEAR_TO_AU,  // 465亿光年
};
```

## 性能优化策略

### 1. LOD（细节层次）系统

```typescript
class LODManager {
  private lodLevels: LODLevel[] = [
    { distance: 0, particleRatio: 1.0, textureSize: 512 },
    { distance: 100e6 * LIGHT_YEAR_TO_AU, particleRatio: 0.5, textureSize: 256 },
    { distance: 500e6 * LIGHT_YEAR_TO_AU, particleRatio: 0.2, textureSize: 128 },
    { distance: 1000e6 * LIGHT_YEAR_TO_AU, particleRatio: 0.05, textureSize: 64 },
  ];
  
  getCurrentLOD(cameraDistance: number): LODLevel {
    for (let i = this.lodLevels.length - 1; i >= 0; i--) {
      if (cameraDistance >= this.lodLevels[i].distance) {
        return this.lodLevels[i];
      }
    }
    return this.lodLevels[0];
  }
  
  updateRendererLOD(renderer: UniverseScaleRenderer, lod: LODLevel): void {
    renderer.setParticleRatio(lod.particleRatio);
    renderer.setTextureSize(lod.textureSize);
  }
}
```

### 2. 粒子系统优化

```typescript
class OptimizedParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  
  constructor(positions: Float32Array, colors: Float32Array, sizes: Float32Array) {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 使用自定义着色器优化性能
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
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = true;  // 启用视锥剔除
  }
  
  // 动态调整粒子数量
  setParticleRatio(ratio: number): void {
    const totalCount = this.geometry.attributes.position.count;
    const visibleCount = Math.floor(totalCount * ratio);
    this.geometry.setDrawRange(0, visibleCount);
  }
  
  updateOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }
  
  updateBrightness(brightness: number): void {
    this.material.uniforms.uBrightness.value = brightness;
  }
}
```

### 3. 实例化渲染

对于本星系群的星系，使用实例化渲染减少绘制调用：

```typescript
class InstancedGalaxyRenderer {
  private instancedMesh: THREE.InstancedMesh;
  private dummy: THREE.Object3D = new THREE.Object3D();
  
  constructor(galaxies: LocalGroupGalaxy[], geometry: THREE.BufferGeometry, material: THREE.Material) {
    const count = galaxies.length;
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    
    // 设置每个实例的变换矩阵
    galaxies.forEach((galaxy, i) => {
      this.dummy.position.set(galaxy.x, galaxy.y, galaxy.z);
      this.dummy.scale.setScalar(galaxy.radius);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      
      // 设置颜色
      this.instancedMesh.setColorAt(i, new THREE.Color(galaxy.color));
    });
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
  
  getInstancedMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }
}
```

### 4. 视锥剔除优化

```typescript
class FrustumCullingOptimizer {
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  
  updateFrustum(camera: THREE.Camera): void {
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }
  
  isVisible(object: THREE.Object3D): boolean {
    // 更新包围球
    if (!object.geometry?.boundingSphere) {
      object.geometry?.computeBoundingSphere();
    }
    
    const sphere = object.geometry?.boundingSphere;
    if (!sphere) return true;
    
    // 转换到世界空间
    const worldSphere = sphere.clone();
    worldSphere.applyMatrix4(object.matrixWorld);
    
    return this.frustum.intersectsSphere(worldSphere);
  }
  
  cullObjects(objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects.filter(obj => this.isVisible(obj));
  }
}
```

### 5. 内存管理

```typescript
class MemoryManager {
  private maxMemoryMB: number = 2000;  // 最大 2GB
  private currentMemoryMB: number = 0;
  private rendererMemory: Map<string, number> = new Map();
  
  registerRenderer(name: string, memoryMB: number): void {
    this.rendererMemory.set(name, memoryMB);
    this.currentMemoryMB += memoryMB;
  }
  
  unregisterRenderer(name: string): void {
    const memory = this.rendererMemory.get(name) || 0;
    this.currentMemoryMB -= memory;
    this.rendererMemory.delete(name);
  }
  
  shouldReleaseMemory(): boolean {
    return this.currentMemoryMB > this.maxMemoryMB * 0.8;
  }
  
  releaseDistantRenderers(currentScale: UniverseScale): void {
    const distant = this.getDistantScales(currentScale);
    distant.forEach(scale => {
      const renderer = this.getRenderer(scale);
      if (renderer) {
        renderer.dispose();
        this.unregisterRenderer(scale);
      }
    });
  }
}
```

### 6. 程序化生成优化

```typescript
class ProceduralGenerator {
  // 使用 Web Worker 进行程序化生成，避免阻塞主线程
  private worker: Worker;
  
  constructor() {
    this.worker = new Worker('/workers/galaxy-generator.js');
  }
  
  async generateGalaxies(
    clusterMetadata: ClusterMetadata,
    realGalaxies: SimpleGalaxy[]
  ): Promise<SimpleGalaxy[]> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({
        type: 'generate',
        clusterMetadata,
        realGalaxies,
      });
      
      this.worker.onmessage = (e) => {
        if (e.data.type === 'result') {
          resolve(e.data.galaxies);
        }
      };
      
      this.worker.onerror = reject;
    });
  }
  
  // NFW 分布（Navarro-Frenk-White profile）
  static nfwDistribution(center: Vector3, radius: number, count: number): Vector3[] {
    const galaxies: Vector3[] = [];
    const rs = radius * 0.2;  // 特征半径
    
    for (let i = 0; i < count; i++) {
      // 使用拒绝采样生成 NFW 分布
      let r: number;
      do {
        r = Math.random() * radius;
      } while (Math.random() > this.nfwProbability(r, rs));
      
      // 随机方向
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      galaxies.push(new Vector3(
        center.x + r * Math.sin(phi) * Math.cos(theta),
        center.y + r * Math.sin(phi) * Math.sin(theta),
        center.z + r * Math.cos(phi)
      ));
    }
    
    return galaxies;
  }
  
  private static nfwProbability(r: number, rs: number): number {
    const x = r / rs;
    return 1 / (x * Math.pow(1 + x, 2));
  }
}
```

## 与现有系统的集成

### 1. 配置文件集成

创建新的配置文件 `src/lib/config/universeConfig.ts`，导出所有宇宙尺度配置：

```typescript
// src/lib/config/universeConfig.ts
export * from './galaxyConfig';
export {
  UNIVERSE_SCALE_CONFIG,
  LOCAL_GROUP_CONFIG,
  NEARBY_GROUPS_CONFIG,
  VIRGO_SUPERCLUSTER_CONFIG,
  LANIAKEA_SUPERCLUSTER_CONFIG,
  NEARBY_SUPERCLUSTER_CONFIG,
  OBSERVABLE_UNIVERSE_CONFIG,
  MEGAPARSEC_TO_AU,
  GIGAPARSEC_TO_AU,
} from './universeScaleConfig';
```

### 2. 类型定义集成

扩展 `src/lib/types/index.ts`：

```typescript
// src/lib/types/universeTypes.ts
export enum UniverseScale {
  SolarSystem = 'solar-system',
  NearbyStars = 'nearby-stars',
  Galaxy = 'galaxy',
  LocalGroup = 'local-group',
  NearbyGroups = 'nearby-groups',
  VirgoSupercluster = 'virgo-supercluster',
  LaniakeaSupercluster = 'laniakea-supercluster',
  NearbySupercluster = 'nearby-supercluster',
  ObservableUniverse = 'observable-universe',
}

export interface UniverseScaleRenderer {
  getGroup(): THREE.Group;
  update(cameraDistance: number, deltaTime: number): void;
  getOpacity(): number;
  getIsVisible(): boolean;
  dispose(): void;
  setBrightness?(brightness: number): void;
  getObjectData?(): any[];
}

// ... 其他类型定义
```

### 3. 数据加载集成

创建统一的数据加载器：

```typescript
// src/lib/data/UniverseDataLoader.ts
export class UniverseDataLoader {
  private static instance: UniverseDataLoader;
  
  static getInstance(): UniverseDataLoader {
    if (!this.instance) {
      this.instance = new UniverseDataLoader();
    }
    return this.instance;
  }
  
  async loadLocalGroupData(): Promise<LocalGroupGalaxy[]> {
    const buffer = await this.loadBinaryFile('/data/universe/local-group.bin');
    return this.parseLocalGroupData(buffer);
  }
  
  async loadNearbyGroupsData(): Promise<{ groups: GalaxyGroup[], galaxies: SimpleGalaxy[] }> {
    const buffer = await this.loadBinaryFile('/data/universe/nearby-groups.bin');
    return this.parseNearbyGroupsData(buffer);
  }
  
  // ... 其他加载方法
  
  private async loadBinaryFile(path: string): Promise<ArrayBuffer> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load ${path}: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }
}
```

### 4. UI 集成

扩展现有的 InfoModal 和 SettingsMenu：

```typescript
// src/components/UniverseScaleIndicator.tsx
export function UniverseScaleIndicator({ cameraDistance }: { cameraDistance: number }) {
  const scale = getUniverseScale(cameraDistance);
  const scaleNames = {
    [UniverseScale.SolarSystem]: '太阳系',
    [UniverseScale.NearbyStars]: '近邻恒星',
    [UniverseScale.Galaxy]: '银河系',
    [UniverseScale.LocalGroup]: '本星系群',
    [UniverseScale.NearbyGroups]: '近邻星系群',
    [UniverseScale.VirgoSupercluster]: '室女座超星系团',
    [UniverseScale.LaniakeaSupercluster]: '拉尼亚凯亚超星系团',
    [UniverseScale.NearbySupercluster]: '近邻超星系团',
    [UniverseScale.ObservableUniverse]: '可观测宇宙',
  };
  
  return (
    <div className="scale-indicator">
      <span>当前尺度：{scaleNames[scale]}</span>
      <span>距离：{formatDistance(cameraDistance)}</span>
    </div>
  );
}

function getUniverseScale(distance: number): UniverseScale {
  const config = UNIVERSE_SCALE_CONFIG;
  
  if (distance < config.nearbyStarsShowStart) return UniverseScale.SolarSystem;
  if (distance < config.galaxyShowStart) return UniverseScale.NearbyStars;
  if (distance < config.localGroupShowStart) return UniverseScale.Galaxy;
  if (distance < config.nearbyGroupsShowStart) return UniverseScale.LocalGroup;
  if (distance < config.virgoShowStart) return UniverseScale.NearbyGroups;
  if (distance < config.laniakeaShowStart) return UniverseScale.VirgoSupercluster;
  if (distance < config.nearbySuperclusterShowStart) return UniverseScale.LaniakeaSupercluster;
  if (distance < config.observableUniverseShowStart) return UniverseScale.NearbySupercluster;
  return UniverseScale.ObservableUniverse;
}
```

