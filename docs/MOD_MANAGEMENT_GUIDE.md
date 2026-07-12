# MOD 管理指南

## 概述

本指南说明如何在 OPIC 系统中添加、删除和管理 MOD。

<div align="center">
  <img src="images/mod-manager-interface.gif" alt="MOD管理器界面" width="300">
  <p><em>MOD 管理器提供直观的界面来管理所有模组</em></p>
</div>

## 添加新 MOD

### 方法一：创建本地 MOD（推荐用于开发）

#### 步骤 1: 创建 MOD 文件夹

在 `src/lib/mods/` 下创建你的 MOD 文件夹：

```bash
mkdir src/lib/mods/my-awesome-mod
```

#### 步骤 2: 创建 MOD 文件

**manifest.ts**:
```typescript
import type { ModManifest } from '@/lib/mod-manager/types';

export const myAwesomeModManifest: ModManifest = {
  id: 'my-awesome-mod',
  name: 'My Awesome MOD',
  version: '1.0.0',
  apiVersion: '1.0.0',
  description: 'An awesome MOD that does cool things',
  author: 'Your Name',
  defaultEnabled: true,
  
  permissions: [
    'time:read',
    'render:write'
  ],
  
  contributes: {
    dockIcons: [{
      id: 'my-icon',
      icon: '🚀',
      label: 'My MOD',
      command: 'my-awesome-mod.open'
    }],
    commands: [{
      id: 'open',
      title: 'Open My MOD',
      handler: 'handleOpen'
    }]
  }
};
```

**index.ts**:
```typescript
import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { myAwesomeModManifest } from './manifest';

export const myAwesomeModHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('[My Awesome MOD] 加载中...');
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('[My Awesome MOD] 已启用');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('[My Awesome MOD] 已禁用');
  },
  
  // 命令处理器
  handleOpen: (context: ModContext) => {
    context.logger.info('[My Awesome MOD] 打开窗口');
  }
};

export function getMyAwesomeMod() {
  return {
    manifest: myAwesomeModManifest,
    hooks: myAwesomeModHooks,
  };
}
```

#### 步骤 3: 重新生成自动注册表

```bash
npm run generate-mods
```

此脚本会扫描 `src/lib/mods/` 下所有子目录，自动生成 `auto-registry.ts`。

#### 步骤 4: 重启应用

```bash
npm run dev
```

查看控制台输出，应该看到：

```
[ModDiscovery] 已加载 MOD: my-awesome-mod
[MODs] 核心MOD注册完成: 6个成功
[My Awesome MOD] 加载中...
[My Awesome MOD] 已启用
```

✅ 完成！你的 MOD 现在已经运行了。

## 删除 MOD

### 方法一：完全删除（推荐）

#### 步骤 1: 删除 MOD 文件夹

```bash
rm -rf src/lib/mods/my-awesome-mod
```

#### 步骤 2: 重新生成自动注册表

```bash
npm run generate-mods
```

#### 步骤 3: 重启应用

```bash
npm run dev
```

### 方法二：只删除文件夹（系统构建时会报错）

如果只删除文件夹但忘记重新生成注册表，TypeScript 构建会报错（因为 `auto-registry.ts` 仍然引用了不存在的模块）：

```
Error: Cannot find module './my-awesome-mod'
```

**解决方法：** 运行 `npm run generate-mods` 重新生成注册表。

## 临时禁用 MOD

### 方法一：修改 manifest 中的 defaultEnabled

将 `defaultEnabled` 设为 `false`，重启后 MOD 默认不会启用，但用户可通过 MOD 管理界面手动启用。

### 方法二：使用 MOD 管理界面

在应用中打开 MOD 管理面板，点击禁用按钮。

## 更新 MOD

### 步骤 1: 修改 MOD 代码

编辑 `src/lib/mods/my-awesome-mod/` 下的文件。

### 步骤 2: 更新版本号

在 `manifest.ts` 中更新版本：

```typescript
export const myAwesomeModManifest: ModManifest = {
  id: 'my-awesome-mod',
  name: 'My Awesome MOD',
  version: '1.1.0',  // 从 1.0.0 更新到 1.1.0
  // ...
};
```

### 步骤 3: 重启应用

```bash
npm run dev
```

## 故障排查

### 问题 1: MOD 没有加载

**症状：**
```
[ModDiscovery] 跳过无法加载的MOD: my-mod
```

**可能原因：**
1. MOD 文件夹不存在
2. MOD 导出函数名不符合命名约定
3. MOD 代码有语法错误
4. 缺少必需的导出函数

**解决方法：**
1. 检查文件夹路径是否正确
2. 运行 `npm run generate-mods` 检查生成是否有错误
3. 检查 TypeScript 编译错误
4. 确保导出了 `get*Mod` 函数（命名格式：`getYourModNameMod`）

### 问题 2: MOD 加载但不工作

**症状：**
```
[ModDiscovery] 已加载 MOD: my-mod
[MOD Manager] 已注册MOD: my-mod
// 但功能不工作
```

**可能原因：**
1. 权限不足
2. 生命周期钩子有错误
3. 扩展点配置错误

**解决方法：**
1. 检查 `permissions` 声明
2. 查看控制台错误信息
3. 检查 `contributes` 配置

### 问题 3: 删除 MOD 后仍然显示

**症状：**
删除 MOD 后，Dock 图标或窗口仍然存在。

**原因：**
浏览器缓存或状态未清除。

**解决方法：**
1. 硬刷新浏览器 (Ctrl+Shift+R 或 Cmd+Shift+R)
2. 清除浏览器缓存
3. 重启开发服务器

### 问题 4: 多个 MOD 冲突

**症状：**
```
[ContributionRegistry] 扩展点ID冲突: my-icon
```

**原因：**
两个 MOD 使用了相同的扩展点 ID。

**解决方法：**
修改其中一个 MOD 的扩展点 ID，确保唯一性：

```typescript
contributes: {
  dockIcons: [{
    id: 'my-mod-icon',  // 使用 MOD 前缀确保唯一
    // ...
  }]
}
```

## 最佳实践

### 1. 命名规范

- **MOD ID**: 使用 kebab-case，如 `my-awesome-mod`
- **文件夹名**: 与 MOD ID 一致
- **导出函数**: 使用 `get*Mod` 格式，如 `getMyAwesomeMod`

### 2. 版本管理

遵循语义化版本规范：
- **Major (1.0.0 → 2.0.0)**: 不兼容的 API 变更
- **Minor (1.0.0 → 1.1.0)**: 向后兼容的功能新增
- **Patch (1.0.0 → 1.0.1)**: 向后兼容的问题修复

### 3. 权限声明

只声明必需的权限：

```typescript
// ❌ 不好 - 请求过多权限
permissions: ['*:*']

// ✅ 好 - 只请求需要的权限
permissions: ['time:read', 'render:write']
```

### 4. 错误处理

在生命周期钩子中添加错误处理：

```typescript
onEnable: async (context: ModContext) => {
  try {
    // 你的代码
  } catch (error) {
    context.logger.error('启用失败:', error);
  }
}
```

### 5. 资源清理

在 `onDisable` 中清理资源：

```typescript
onDisable: async (context: ModContext) => {
  // 清理定时器
  // 移除事件监听器
  // 清理渲染对象
}
```

## 自动注册表参考

### auto-registry.ts 结构

自动生成的 `src/lib/mods/auto-registry.ts` 包含所有已发现的 MOD：

```typescript
// 自动导入所有MOD
import { getCesiumIntegrationMod } from './cesium-integration';
import { getSpaceFlightMod } from './space-flight';
// ... 所有 MOD 的导入

export const MOD_REGISTRY = [
  getCesiumIntegrationMod,
  getSpaceFlightMod,
  // ... 所有 MOD 的注册
] as const;
```

### 重新生成命令

```bash
npm run generate-mods    # 手动重新生成
npm run build            # 构建时自动生成（prebuild 钩子）
```

## 相关文档

- [MOD 开发指南](./MOD_DEVELOPMENT_GUIDE.md) - 详细的开发教程
- [MOD 动态加载指南](./MOD_DYNAMIC_LOADING.md) - 动态加载机制说明
- [迁移指南](./MIGRATION_GUIDE.md) - 从旧版本迁移
- [包格式规范](./MOD_PACKAGE_FORMAT.md) - MOD 包格式详解

## 总结

现在你已经了解了如何：

✅ 添加新 MOD - 创建文件夹 → 编写代码 → `npm run generate-mods` → 重启
✅ 删除 MOD - 删除文件夹 → `npm run generate-mods` → 重启
✅ 临时禁用 MOD - 通过 MOD 管理界面或修改 manifest.ts 中的 `defaultEnabled`
✅ 更新 MOD - 修改代码 → 更新版本号 → 重启
✅ 故障排查 - 查看控制台日志，检查配置和代码

系统现在具有容错能力，即使配置中的某些 MOD 不存在，其他 MOD 也能正常工作！
