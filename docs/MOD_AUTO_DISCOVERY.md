# MOD 自动发现机制

## 概述

系统现在支持自动发现和加载MOD，无需手动维护配置文件。只需将MOD放到指定文件夹，系统会自动识别并加载。

## 工作原理

### 1. 自动扫描
- 系统会扫描 `src/lib/mods/` 目录下的所有子文件夹
- 检查每个文件夹是否包含有效的MOD结构（`index.ts` 和 `manifest.ts`）
- 自动生成注册表文件 `auto-registry.ts`

### 2. 自动注册
- 在构建时（`npm run build`）自动运行扫描脚本
- 生成的注册表包含所有发现的MOD
- 应用启动时自动加载所有注册的MOD

### 3. 类型安全
- 使用 TypeScript 确保类型安全
- 构建时检测MOD错误
- IDE 提供完整的代码提示

## 使用方法

### 添加新MOD

**步骤 1：创建MOD文件夹**
```bash
mkdir src/lib/mods/my-new-mod
```

**步骤 2：创建必需文件**

创建 `src/lib/mods/my-new-mod/manifest.ts`：
```typescript
import type { ModManifest } from '@/lib/mod-manager/types';

export const myNewModManifest: ModManifest = {
  id: 'my-new-mod',
  name: 'My New Mod',
  nameZh: '我的新模组',
  version: '1.0.0',
  description: 'A new mod',
  descriptionZh: '一个新的模组',
  author: 'Your Name',
  icon: '',
  defaultEnabled: false,
  
  // 声明需要的权限
  permissions: {
    time: ['getCurrentTime'],
    camera: ['getPosition'],
  },
  
  // 贡献点
  contributes: {
    dockIcons: [
      {
        id: 'my-new-mod-icon',
        icon: '',
        label: 'My New Mod',
        labelZh: '我的新模组',
        command: 'my-new-mod.toggle',
      },
    ],
    commands: [
      {
        id: 'my-new-mod.toggle',
        title: 'Toggle My New Mod',
        titleZh: '切换我的新模组',
        handler: 'handleToggle',
      },
    ],
  },
};
```

创建 `src/lib/mods/my-new-mod/index.ts`：
```typescript
import type { ModLifecycleHooks, ModContext } from '@/lib/mod-manager/types';
import { myNewModManifest } from './manifest';

export const myNewModHooks: ModLifecycleHooks = {
  onLoad: async (context: ModContext) => {
    context.logger.info('MOD加载中...');
  },

  onEnable: async (context: ModContext) => {
    context.logger.info('MOD启用');
  },

  onDisable: async (context: ModContext) => {
    context.logger.info('MOD禁用');
  },

  onUnload: async (context: ModContext) => {
    context.logger.info('MOD卸载');
  },

  onError: (error: Error, context: ModContext) => {
    context.logger.error('MOD错误:', error);
  },
  
  // 命令处理器
  handleToggle: (context: ModContext) => {
    context.logger.info('切换显示');
    context.emit('mod:open-window', {
      modId: 'my-new-mod',
      windowId: 'my-new-mod-window',
      title: 'My New Mod',
      titleZh: '我的新模组',
    });
  },
};

// 导出MOD配置
export function getMyNewModMod() {
  return {
    manifest: myNewModManifest,
    hooks: myNewModHooks,
  };
}
```

**步骤 3：重新生成注册表**
```bash
npm run generate-mods
```

**步骤 4：重启应用**
```bash
npm run dev
```

就这么简单！系统会自动发现并加载你的新MOD。

### 删除MOD

**方法 1：完全删除**
1. 删除MOD文件夹
2. 运行 `npm run generate-mods`
3. 重启应用

**方法 2：临时禁用**
1. 在MOD管理器中禁用MOD
2. MOD文件保留，但不会运行

### 查看已注册的MOD

运行生成脚本会显示所有发现的MOD：
```bash
npm run generate-mods
```

输出示例：
```
 扫描MOD目录...
 发现MOD: satellite-tracking
 发现MOD: cesium-integration
 发现MOD: weather-disaster
 发现MOD: global-traffic
 发现MOD: space-launches
 发现MOD: my-new-mod

 发现 6 个MOD
```

## 技术细节

### MOD结构要求

一个有效的MOD必须包含：

```
my-mod/
├── index.ts          # 必需：MOD入口文件
├── manifest.ts       # 必需：MOD清单
└── ...               # 可选：其他文件
```

### 命名约定

- **文件夹名称**：使用 kebab-case（例如：`my-new-mod`）
- **导出函数**：使用 camelCase + Mod 后缀（例如：`getMyNewModMod()`）
- **MOD ID**：通常与文件夹名称相同

脚本会自动将文件夹名称转换为函数名：
- `satellite-tracking` → `getSatelliteTrackingMod`
- `my-new-mod` → `getMyNewModMod`

### 自动生成的文件

`src/lib/mods/auto-registry.ts` 是自动生成的，包含：
- 所有MOD的导入语句
- MOD注册表数组
- 辅助函数（获取MOD列表、数量等）

** 不要手动编辑此文件！** 它会在每次运行 `npm run generate-mods` 时重新生成。

### 构建流程

```
npm run build
    ↓
prebuild 钩子
    ↓
npm run generate-mods
    ↓
扫描 src/lib/mods/
    ↓
生成 auto-registry.ts
    ↓
继续构建
```

## 与VSCode插件系统的对比

| 特性 | VSCode | 当前实现 | 说明 |
|------|--------|----------|------|
| 自动发现 |  |  | 扫描文件夹自动发现 |
| 无需配置 |  |  | 不需要手动配置列表 |
| 运行时加载 |  |  | 需要重启应用 |
| 热更新 |  |  | 暂不支持 |
| 独立打包 |  |  | MOD与核心一起打包 |
| 市场安装 |  |  | 暂不支持 |

## 优势

1. **零配置**：不需要维护 JSON 配置文件
2. **类型安全**：TypeScript 提供完整的类型检查
3. **构建时验证**：编译时就能发现MOD错误
4. **IDE支持**：完整的代码提示和跳转
5. **简单直观**：放到文件夹就能用

## 限制

1. **需要重启**：添加/删除MOD后需要重启应用
2. **编译时依赖**：MOD会被打包到主应用中
3. **不支持远程加载**：暂不支持从URL加载MOD

## 未来改进

- [ ] 支持运行时热加载
- [ ] 支持从 `public/mods/` 加载独立MOD包
- [ ] 支持远程MOD市场
- [ ] 支持MOD版本管理
- [ ] 支持MOD依赖自动安装

## 常见问题

### Q: 为什么添加MOD后看不到？
A: 确保运行了 `npm run generate-mods` 并重启了应用。

### Q: 可以在运行时添加MOD吗？
A: 目前不支持，需要重启应用。未来版本会支持热加载。

### Q: MOD文件夹可以放在其他位置吗？
A: 目前只支持 `src/lib/mods/` 目录。未来会支持 `public/mods/`。

### Q: 如何调试MOD？
A: 使用 `context.logger` 输出日志，在浏览器控制台查看。

### Q: MOD之间可以通信吗？
A: 可以通过事件总线（`context.emit` 和 `context.on`）进行通信。

## 相关文档

- [MOD开发指南](./MOD_DEVELOPMENT_GUIDE.md)
- [MOD管理指南](./MOD_MANAGEMENT_GUIDE.md)
- [MOD包格式](./MOD_PACKAGE_FORMAT.md)
