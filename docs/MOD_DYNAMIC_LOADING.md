# MOD 动态加载指南

## 概述

OPIC MOD 系统支持两种动态加载方式：

1. **基于配置文件的本地加载** (已实现) - 适合开发和内置 MOD
2. **基于 URL 的远程加载** (框架已就绪) - 适合第三方 MOD 分发

## 方式一: 本地配置加载 (推荐用于开发)

### 添加新 MOD 的步骤

#### 1. 创建 MOD 文件夹

在 `src/lib/mods/` 下创建你的 MOD 文件夹:

```
src/lib/mods/
└── my-new-mod/
    ├── index.ts       # MOD 入口
    └── manifest.ts    # MOD 清单
```

#### 2. 编写 MOD 代码

**manifest.ts**:
```typescript
import type { ModManifest } from '@/lib/mod-manager/types';

export const manifest: ModManifest = {
  id: 'my-new-mod',
  name: 'My New MOD',
  version: '1.0.0',
  apiVersion: '1.0.0',  // 声明需要的 API 版本
  description: 'My awesome MOD',
  author: 'Your Name',
  defaultEnabled: true,
  
  // 声明权限
  permissions: [
    'time:read',
    'render:write'
  ],
  
  // 声明扩展点
  contributes: {
    dockIcons: [{
      id: 'my-icon',
      icon: '🚀',
      label: 'My MOD',
      command: 'my-new-mod.open'
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
import type { ModContext } from '@/lib/mod-manager/types';
import { manifest } from './manifest';

export function getMyNewMod() {
  return {
    manifest,
    hooks: {
      onEnable(context: ModContext) {
        console.log('My MOD enabled!');
      },
      
      onDisable(context: ModContext) {
        console.log('My MOD disabled!');
      },
      
      // 命令处理器
      handleOpen(context: ModContext) {
        console.log('Opening my MOD...');
      }
    }
  };
}
```

#### 3. 添加到配置文件

编辑 `src/lib/mods/mods.config.json`:

```json
{
  "mods": [
    "satellite-tracking",
    "cesium-integration",
    "weather-disaster",
    "global-traffic",
    "space-launches",
    "my-new-mod"  // 添加这一行
  ],
  "autoLoad": true
}
```

#### 4. 重启应用

```bash
npm run dev
```

就这么简单!你的 MOD 会自动加载。

## 方式二: URL 远程加载 (框架已就绪)

### MOD 包格式

MOD 包使用 ZIP 格式,包含以下文件:

```
my-mod.zip
├── package.json      # 包元数据
├── manifest.json     # MOD 清单
├── index.js          # 入口代码 (编译后)
└── assets/           # 资源文件夹 (可选)
    ├── icon.png
    └── ...
```

### package.json 示例

```json
{
  "id": "my-new-mod",
  "name": "My New MOD",
  "version": "1.0.0",
  "apiVersion": "1.0.0",
  "description": "My awesome MOD",
  "author": "Your Name",
  "license": "MIT",
  "homepage": "https://example.com/my-mod",
  "dependencies": {
    "other-mod": "^1.0.0"
  },
  "signature": "...",  // 数字签名 (可选)
  "hash": "..."        // SHA-256 哈希值 (可选)
}
```

### 使用 API 加载

```typescript
import { getModDiscovery } from '@/lib/mod-manager/discovery';

const discovery = getModDiscovery();

// 加载远程 MOD
await discovery.loadModFromUrl('https://example.com/mods/my-mod.zip', {
  verifySignature: true,      // 验证数字签名
  checkVersion: true,          // 检查版本兼容性
  checkDependencies: true,     // 检查依赖
  maxPackageSize: 10485760,   // 最大 10MB
  timeout: 30000               // 30秒超时
});

// 监听下载进度
discovery.onDownloadProgress('https://example.com/mods/my-mod.zip', (progress) => {
  console.log(`下载进度: ${progress.percentage}%`);
});
```

### 版本兼容性

系统使用语义化版本规则检查兼容性:

- **Major 版本必须匹配**: MOD 需要 v2.x.x,系统是 v1.x.x → ❌ 不兼容
- **Minor 版本向后兼容**: MOD 需要 v1.2.x,系统是 v1.3.x → ✅ 兼容
- **Patch 版本向后兼容**: MOD 需要 v1.2.3,系统是 v1.2.5 → ✅ 兼容

### 依赖管理

MOD 可以声明对其他 MOD 的依赖:

```json
{
  "dependencies": {
    "cesium-integration": "^1.0.0",  // 需要 1.x.x 版本
    "satellite-tracking": "~1.2.0"   // 需要 1.2.x 版本
  }
}
```

支持的版本范围格式:
- `^1.0.0` - 兼容 1.x.x (>=1.0.0 <2.0.0)
- `~1.2.0` - 兼容 1.2.x (>=1.2.0 <1.3.0)
- `>=1.0.0` - 大于等于 1.0.0
- `1.0.0` - 精确匹配 1.0.0
- `*` - 任意版本

### 安全性

URL 加载包含以下安全措施:

1. **包大小限制** - 默认最大 10MB
2. **数字签名验证** - 可选的完整性检查
3. **哈希验证** - 防止文件损坏
4. **版本检查** - 防止不兼容的 MOD
5. **依赖检查** - 确保所需依赖已安装
6. **沙箱隔离** - MOD 代码在隔离环境中执行

### 当前状态

✅ **已实现**:
- 类型定义和接口
- 包验证器 (PackageValidator)
- 版本兼容性检查器 (VersionChecker)
- 下载和进度报告
- 依赖检查逻辑

⏳ **待实现** (需要额外的库):
- ZIP 解压 (需要 JSZip)
- 数字签名验证 (需要 Web Crypto API 集成)
- 沙箱代码执行 (需要 iframe 或 Web Worker)
- 哈希计算 (需要 Web Crypto API)

## 优势对比

| 特性 | 本地配置加载 | URL 远程加载 |
|------|------------|------------|
| 开发便利性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 分发便利性 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 安全性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 版本管理 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 依赖管理 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 适用场景 | 内置 MOD、开发测试 | 第三方 MOD、生产分发 |

## 注意事项

### 本地加载
1. MOD 文件夹名必须与配置中的路径一致
2. MOD 必须导出 `get*Mod` 格式的函数
3. 导出的对象必须包含 `manifest` 和 `hooks`
4. 修改配置后需要重启应用

### URL 加载
1. 包必须是有效的 ZIP 格式
2. 必须包含 `package.json` 和 `manifest.json`
3. 建议启用签名验证以确保安全
4. 注意网络超时和包大小限制
5. 确保依赖的 MOD 已经加载

## 下一步

- 查看完整的 MOD 开发指南: [MOD_DEVELOPMENT_GUIDE.md](./MOD_DEVELOPMENT_GUIDE.md)
- 查看迁移指南: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- 查看 API 参考文档: [API_REFERENCE.md](./API_REFERENCE.md) (待创建)
