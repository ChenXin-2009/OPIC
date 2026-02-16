# Laniakea 超星系团缓存问题修复

## 问题描述

用户报告在更新 Laniakea 数据文件后，浏览器仍然显示旧的放射状模式（3个放射状圆），而不是新的13个超星系团结构。

## 根本原因

浏览器缓存了旧的 `laniakea.bin` 数据文件（476字节的占位符数据），即使服务器上的文件已经更新为新的166KB真实数据文件。

## 已实施的解决方案

### 1. 时间戳缓存清除（最激进）

修改 `src/lib/data/UniverseDataLoader.ts`：

```typescript
private getFilenameForScale(scale: UniverseScale): string {
  const basePath = '/data/universe/';
  // 使用时间戳强制重新加载
  const timestamp = Date.now();
  
  switch (scale) {
    case UniverseScale.LaniakeaSupercluster:
      return `${basePath}laniakea.bin?t=${timestamp}`;
    // ...
  }
}
```

每次加载都使用新的时间戳，完全绕过浏览器缓存。

### 2. HTTP Headers 禁用缓存

在 `loadBinaryFile` 方法中添加：

```typescript
const response = await fetch(path, {
  cache: 'no-store',
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

### 3. 详细的控制台日志

添加日志以验证加载的数据：

```typescript
console.log(`[UniverseDataLoader] Loaded ${path}: ${arrayBuffer.byteLength} bytes`);
console.log(`[UniverseDataLoader] Parsing Laniakea data, buffer size: ${buffer.byteLength} bytes`);
console.log(`[UniverseDataLoader] Supercluster count: ${superclusterCount}`);
console.log(`[UniverseDataLoader] Parsed ${superclusters.length} superclusters, ${allGalaxies.length} total galaxies`);
```

## 用户操作指南

如果仍然看到旧的放射状模式，请按以下步骤操作：

### 方法1：硬刷新（推荐）

- **Windows/Linux**: `Ctrl + Shift + R` 或 `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`

### 方法2：清除浏览器缓存

1. 打开浏览器开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 方法3：清除特定域名缓存

Chrome:
1. 打开 `chrome://settings/clearBrowserData`
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部时间"
4. 点击"清除数据"

Firefox:
1. 打开 `about:preferences#privacy`
2. 找到"Cookie 和网站数据"
3. 点击"清除数据"
4. 勾选"缓存的 Web 内容"

### 方法4：使用隐私/无痕模式

在隐私浏览模式下打开网站，这会绕过所有缓存。

## 验证数据已正确加载

打开浏览器控制台（F12），查找以下日志：

```
[UniverseDataLoader] Loaded /data/universe/laniakea.bin?t=...: 169984 bytes
[UniverseDataLoader] Parsing Laniakea data, buffer size: 169984 bytes
[UniverseDataLoader] Name table size: 13
[UniverseDataLoader] Supercluster count: 13
[UniverseDataLoader] Supercluster 0: Supercluster 1, center=(...), members=...
[UniverseDataLoader] Parsed 13 superclusters, 14096 total galaxies
[Laniakea] Loading data: 13 superclusters, 14096 galaxies
```

如果看到：
- **文件大小约 170KB**（不是476字节）
- **13个超星系团**（不是3个）
- **14,096个星系**

则说明数据已正确加载。

## 预期的可视化效果

正确加载后，您应该看到：

1. **13个橙色团块**：分布在空间中的独立超星系团
2. **不再有放射状圆**：旧的程序化生成模式已完全移除
3. **真实的天文数据**：基于 Cosmicflows-3 观测数据
4. **望远镜视角**：数据仅覆盖天空的约5%（GLON: 0-23°, GLAT: 0-59°），这是科学准确的

## 数据文件信息

- **文件**: `public/data/universe/laniakea.bin`
- **大小**: 169,984 字节（166 KB）
- **超星系团数量**: 13
- **星系总数**: 14,096
- **数据来源**: Cosmicflows-3 (Tully et al. 2016)
- **空间范围**: 
  - X: [-100, 250] Mpc
  - Y: [-50, 150] Mpc
  - Z: [-50, 100] Mpc

## 技术细节

### 聚类算法

使用80 Mpc网格密度聚类：

1. 将空间划分为80 Mpc × 80 Mpc × 80 Mpc的网格
2. 识别包含≥100个星系的高密度单元
3. 每个高密度单元作为独立的超星系团
4. **不合并相邻单元**，避免创建人工的放射状结构

### 连接线逻辑

两层连接系统：

1. **星系团内连接**（橙色 #ff8844）：
   - 连接每个超星系团内的星系
   - 每个星系连接到最近的2-3个邻居
   - 连接长度 ≤ 30% 星系团半径

2. **星系团间连接**（亮橙色 #ffaa44）：
   - 连接超星系团中心
   - 每个超星系团连接到最近的2个邻居
   - 连接距离 < 100 Mpc

### 深度测试

启用深度写入和测试，避免"平面背景"效果：

```typescript
material: new THREE.LineBasicMaterial({
  depthWrite: true,
  depthTest: true,
})
```

## 相关文件

- `src/lib/data/UniverseDataLoader.ts` - 数据加载和解析
- `src/lib/3d/LaniakeaSuperclusterRenderer.ts` - 渲染逻辑
- `scripts/fix-universe-data-parsing.py` - 数据生成脚本
- `public/data/universe/laniakea.bin` - 二进制数据文件
- `docs/LANIAKEA_DATA_LIMITATIONS.md` - 数据限制说明

## 故障排除

### 问题：仍然看到3个放射状圆

**解决方案**：
1. 硬刷新页面（Ctrl+Shift+R）
2. 检查控制台日志确认文件大小
3. 如果文件大小仍是476字节，清除浏览器缓存
4. 尝试隐私浏览模式

### 问题：看到13个团块和3个放射状圆

**原因**：浏览器同时加载了新旧数据

**解决方案**：
1. 完全关闭浏览器
2. 重新打开并硬刷新
3. 检查是否有多个标签页打开同一网站

### 问题：控制台显示"Failed to load laniakea.bin"

**解决方案**：
1. 确认文件存在：`public/data/universe/laniakea.bin`
2. 检查文件权限
3. 重新运行数据生成脚本：
   ```bash
   python scripts/fix-universe-data-parsing.py
   ```

## 未来改进

1. **服务器端缓存控制**：在 Next.js 配置中添加静态文件缓存策略
2. **版本化文件名**：使用 `laniakea.v2.bin` 而不是查询参数
3. **数据完整性检查**：在加载时验证文件哈希
4. **渐进式加载**：先显示超星系团中心，再加载成员星系
5. **数据更新通知**：当检测到新数据时提示用户刷新

## 更新日志

- **2024-02-16**: 实施时间戳缓存清除和HTTP headers
- **2024-02-16**: 添加详细的控制台日志
- **2024-02-16**: 修复数据生成脚本，确保写入成员星系坐标
- **2024-02-16**: 禁用程序化生成，仅使用真实数据
