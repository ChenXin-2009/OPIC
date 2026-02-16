# Observable Universe Visualization - Integration Guide

## 快速开始

本指南展示如何将可观测宇宙可视化功能集成到应用中。

## 1. 准备数据文件

首先，需要处理真实天文数据并生成二进制文件：

```bash
# 安装 Python 依赖
pip install astropy numpy

# 运行数据准备脚本
python scripts/prepare-universe-data.py \
  --raw-data public/data/universe/raw-data \
  --output public/data/universe
```

这将生成以下文件：
- `public/data/universe/local-group.bin` - 本星系群数据
- `public/data/universe/nearby-groups.bin` - 近邻星系群数据
- `public/data/universe/virgo-supercluster.bin` - 室女座超星系团数据
- `public/data/universe/laniakea.bin` - 拉尼亚凯亚超星系团数据
- `public/data/universe/metadata.json` - 元数据

## 2. 在 SceneManager 中初始化渲染器

在 `SolarSystemCanvas3D.tsx` 或其他使用 SceneManager 的组件中：

```typescript
import { UniverseDataLoader } from '@/lib/data/UniverseDataLoader';
import { LocalGroupRenderer } from '@/lib/3d/LocalGroupRenderer';
import { NearbyGroupsRenderer } from '@/lib/3d/NearbyGroupsRenderer';
import { VirgoSuperclusterRenderer } from '@/lib/3d/VirgoSuperclusterRenderer';
import { LaniakeaSuperclusterRenderer } from '@/lib/3d/LaniakeaSuperclusterRenderer';

// 在组件初始化后
useEffect(() => {
  const initializeUniverseRenderers = async () => {
    const loader = UniverseDataLoader.getInstance();
    
    try {
      // 1. 初始化本星系群渲染器
      const localGroupData = await loader.loadDataForScale(UniverseScale.LocalGroup);
      const localGroupGalaxies = loader.parseLocalGroupData(localGroupData);
      
      const localGroupRenderer = new LocalGroupRenderer();
      await localGroupRenderer.loadData(localGroupGalaxies);
      sceneManager.setLocalGroupRenderer(localGroupRenderer);
      
      // 2. 初始化近邻星系群渲染器
      const nearbyGroupsData = await loader.loadDataForScale(UniverseScale.NearbyGroups);
      const { groups, galaxies } = loader.parseNearbyGroupsData(nearbyGroupsData);
      
      const nearbyGroupsRenderer = new NearbyGroupsRenderer();
      await nearbyGroupsRenderer.loadData(groups, galaxies);
      sceneManager.setNearbyGroupsRenderer(nearbyGroupsRenderer);
      
      // 3. 初始化室女座超星系团渲染器
      const virgoData = await loader.loadDataForScale(UniverseScale.VirgoSupercluster);
      const virgoResult = loader.parseVirgoSuperclusterData(virgoData);
      
      const virgoRenderer = new VirgoSuperclusterRenderer();
      await virgoRenderer.loadData(virgoResult.clusters, virgoResult.galaxies);
      sceneManager.setVirgoSuperclusterRenderer(virgoRenderer);
      
      // 4. 初始化拉尼亚凯亚超星系团渲染器
      const laniakeaData = await loader.loadDataForScale(UniverseScale.LaniakeaSupercluster);
      const laniakeaResult = loader.parseLaniakeaData(laniakeaData);
      
      const laniakeaRenderer = new LaniakeaSuperclusterRenderer();
      await laniakeaRenderer.loadData(laniakeaResult.superclusters, laniakeaResult.galaxies);
      sceneManager.setLaniakeaSuperclusterRenderer(laniakeaRenderer);
      
      console.log('Universe renderers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize universe renderers:', error);
    }
  };
  
  initializeUniverseRenderers();
}, [sceneManager]);
```

## 3. 添加尺度指示器 UI

在主页面组件中添加 `UniverseScaleIndicator`：

```typescript
import { UniverseScaleIndicator } from '@/components/UniverseScaleIndicator';

export default function Page() {
  const [cameraDistance, setCameraDistance] = useState(0);
  
  return (
    <div className="relative w-full h-screen">
      {/* 3D Canvas */}
      <SolarSystemCanvas3D onCameraDistanceChange={setCameraDistance} />
      
      {/* 尺度指示器 */}
      <UniverseScaleIndicator cameraDistance={cameraDistance} />
      
      {/* 其他 UI 组件 */}
    </div>
  );
}
```

## 4. 传递相机距离

在 `SolarSystemCanvas3D.tsx` 中，确保传递相机距离：

```typescript
interface SolarSystemCanvas3DProps {
  onCameraDistanceChange?: (distance: number) => void;
}

export function SolarSystemCanvas3D({ onCameraDistanceChange }: SolarSystemCanvas3DProps) {
  // 在动画循环中
  const animate = () => {
    // ... 其他代码
    
    const cameraDistance = cameraController.getDistanceToSun();
    onCameraDistanceChange?.(cameraDistance);
    
    // 更新多尺度视图
    sceneManager.updateMultiScaleView(cameraDistance, deltaTime);
    
    // ... 其他代码
  };
}
```

## 5. 可选：添加设置菜单

扩展 `SettingsMenu.tsx` 以控制宇宙尺度渲染器：

```typescript
import { useState } from 'react';

export function SettingsMenu() {
  const [universeSettings, setUniverseSettings] = useState({
    localGroup: true,
    nearbyGroups: true,
    virgo: true,
    laniakea: true,
    nearbySupercluster: true,
    observableUniverse: true,
  });
  
  return (
    <div className="settings-menu">
      <h3>宇宙尺度渲染</h3>
      
      <label>
        <input
          type="checkbox"
          checked={universeSettings.localGroup}
          onChange={(e) => {
            setUniverseSettings({ ...universeSettings, localGroup: e.target.checked });
            // 通知 SceneManager 更新渲染器可见性
          }}
        />
        本星系群
      </label>
      
      {/* 其他渲染器的开关 */}
    </div>
  );
}
```

## 6. 性能优化建议

### 延迟加载

不要一次性加载所有渲染器，而是根据相机距离动态加载：

```typescript
const initializeRendererForScale = async (scale: UniverseScale) => {
  const loader = UniverseDataLoader.getInstance();
  
  switch (scale) {
    case UniverseScale.LocalGroup:
      if (!sceneManager.getLocalGroupRenderer()) {
        const data = await loader.loadDataForScale(scale);
        const galaxies = loader.parseLocalGroupData(data);
        const renderer = new LocalGroupRenderer();
        await renderer.loadData(galaxies);
        sceneManager.setLocalGroupRenderer(renderer);
      }
      break;
    // 其他尺度...
  }
};

// 在相机距离变化时调用
useEffect(() => {
  const currentScale = getScaleFromDistance(cameraDistance);
  initializeRendererForScale(currentScale);
}, [cameraDistance]);
```

### 预加载相邻尺度

```typescript
useEffect(() => {
  const loader = UniverseDataLoader.getInstance();
  const currentScale = getScaleFromDistance(cameraDistance);
  
  // 预加载相邻尺度的数据
  loader.preloadAdjacentScales(currentScale);
}, [cameraDistance]);
```

### 内存管理

```typescript
import { MemoryManager } from '@/lib/3d/MemoryManager';

const memoryManager = new MemoryManager(2000); // 2GB 限制

// 注册渲染器
memoryManager.registerRenderer('LocalGroup', 5); // 5MB
memoryManager.registerRenderer('NearbyGroups', 10); // 10MB

// 检查内存使用
if (memoryManager.shouldReleaseMemory()) {
  const currentScale = getScaleFromDistance(cameraDistance);
  memoryManager.releaseDistantRenderers(currentScale);
}
```

## 7. 调试和监控

### 启用调试信息

```typescript
// 在开发环境中显示 LOD 信息
if (process.env.NODE_ENV === 'development') {
  const lodManager = new LODManager();
  console.log(lodManager.getLODInfo(cameraDistance));
}
```

### 监控内存使用

```typescript
const memoryManager = new MemoryManager();
console.log(memoryManager.getMemoryReport());
```

### 性能监控

```typescript
// 使用 React DevTools Profiler
import { Profiler } from 'react';

<Profiler id="UniverseVisualization" onRender={onRenderCallback}>
  <SolarSystemCanvas3D />
</Profiler>
```

## 8. 故障排除

### 数据文件加载失败

```typescript
try {
  const data = await loader.loadDataForScale(scale);
} catch (error) {
  console.error('Failed to load data:', error);
  // 显示错误提示给用户
  // 或使用占位符数据
}
```

### 渲染性能问题

1. 检查 LOD 设置是否正确
2. 减少粒子数量（调整 particleRatio）
3. 禁用不必要的渲染器
4. 使用 Chrome DevTools Performance 分析

### 内存泄漏

确保在组件卸载时调用 dispose：

```typescript
useEffect(() => {
  return () => {
    sceneManager.dispose();
  };
}, []);
```

## 9. 示例：完整集成

```typescript
// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { SolarSystemCanvas3D } from '@/components/canvas/3d/SolarSystemCanvas3D';
import { UniverseScaleIndicator } from '@/components/UniverseScaleIndicator';
import { UniverseDataLoader } from '@/lib/data/UniverseDataLoader';
import { LocalGroupRenderer } from '@/lib/3d/LocalGroupRenderer';
import { UniverseScale } from '@/lib/types/universeTypes';

export default function Home() {
  const [cameraDistance, setCameraDistance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const handleSceneManagerReady = async (sceneManager: any) => {
    try {
      setIsLoading(true);
      
      const loader = UniverseDataLoader.getInstance();
      
      // 加载本星系群
      const localGroupData = await loader.loadDataForScale(UniverseScale.LocalGroup);
      const galaxies = loader.parseLocalGroupData(localGroupData);
      
      const renderer = new LocalGroupRenderer();
      await renderer.loadData(galaxies);
      sceneManager.setLocalGroupRenderer(renderer);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize universe:', err);
      setError('加载宇宙数据失败');
      setIsLoading(false);
    }
  };
  
  return (
    <main className="relative w-full h-screen bg-black">
      <SolarSystemCanvas3D
        onCameraDistanceChange={setCameraDistance}
        onSceneManagerReady={handleSceneManagerReady}
      />
      
      <UniverseScaleIndicator cameraDistance={cameraDistance} />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white">加载宇宙数据中...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded">
          {error}
        </div>
      )}
    </main>
  );
}
```

## 10. 下一步

- 添加星系纹理以增强视觉效果
- 实现点击交互查看星系详情
- 添加搜索功能定位特定星系
- 实现书签功能保存有趣的位置
- 添加导览模式自动游览宇宙

## 参考资料

- [技术文档](./UNIVERSE_VISUALIZATION.md)
- [API 文档](./API.md)
- [性能优化指南](./PERFORMANCE.md)
