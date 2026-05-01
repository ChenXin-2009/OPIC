# MOD 包格式规范

## 概述

OPIC MOD 包使用 ZIP 格式打包，包含元数据、清单、代码和资源文件。本文档详细说明 MOD 包的结构和打包流程。

## 包结构

```
my-awesome-mod.zip
├── package.json          # 包元数据 (必需)
├── manifest.json         # MOD 清单 (必需)
├── index.js              # 入口代码 (必需)
├── README.md             # 说明文档 (推荐)
├── LICENSE               # 许可证 (推荐)
└── assets/               # 资源文件夹 (可选)
    ├── icon.png
    ├── textures/
    └── models/
```

## 文件说明

### 1. package.json (包元数据)

包的基本信息和依赖声明。

```json
{
  "id": "my-awesome-mod",
  "name": "My Awesome MOD",
  "version": "1.2.3",
  "apiVersion": "1.0.0",
  "description": "A fantastic MOD that does amazing things",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "homepage": "https://github.com/yourusername/my-awesome-mod",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/my-awesome-mod.git"
  },
  "keywords": ["space", "visualization", "astronomy"],
  "dependencies": {
    "cesium-integration": "^1.0.0",
    "satellite-tracking": "~1.2.0"
  },
  "size": 1048576,
  "hash": "sha256:a1b2c3d4e5f6...",
  "signature": "base64:signature...",
  "createdAt": "2026-04-30T10:00:00Z"
}
```

#### 字段说明

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | MOD 唯一标识符，建议使用 kebab-case |
| `name` | string | ✅ | MOD 显示名称 |
| `version` | string | ✅ | MOD 版本号，遵循语义化版本 |
| `apiVersion` | string | ✅ | 需要的 API 版本 |
| `description` | string | 推荐 | MOD 描述 |
| `author` | string | 推荐 | 作者信息 |
| `license` | string | 推荐 | 许可证类型 |
| `homepage` | string | 可选 | 项目主页 |
| `repository` | object | 可选 | 代码仓库信息 |
| `keywords` | string[] | 可选 | 关键词，用于搜索 |
| `dependencies` | object | 可选 | 依赖的其他 MOD |
| `size` | number | 自动 | 包大小（字节） |
| `hash` | string | 自动 | SHA-256 哈希值 |
| `signature` | string | 可选 | 数字签名 |
| `createdAt` | string | 自动 | 创建时间 (ISO 8601) |

### 2. manifest.json (MOD 清单)

MOD 的功能声明和配置。

```json
{
  "id": "my-awesome-mod",
  "name": "My Awesome MOD",
  "version": "1.2.3",
  "description": "A fantastic MOD",
  "author": "Your Name",
  "defaultEnabled": false,
  
  "permissions": [
    "time:read",
    "time:write",
    "camera:read",
    "render:write",
    "satellite:read"
  ],
  
  "optionalPermissions": [
    "network:fetch"
  ],
  
  "contributes": {
    "dockIcons": [
      {
        "id": "my-icon",
        "icon": "🚀",
        "label": "My MOD",
        "command": "my-awesome-mod.open",
        "badge": 0
      }
    ],
    "windows": [
      {
        "id": "main-window",
        "title": "My MOD Window",
        "width": 600,
        "height": 400,
        "resizable": true,
        "component": "MainWindow"
      }
    ],
    "commands": [
      {
        "id": "open",
        "title": "Open My MOD",
        "handler": "handleOpen"
      }
    ]
  },
  
  "configSchema": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean",
        "title": "启用功能",
        "default": true
      },
      "updateInterval": {
        "type": "number",
        "title": "更新间隔 (秒)",
        "default": 60,
        "minimum": 10,
        "maximum": 3600
      }
    }
  },
  
  "services": [
    {
      "id": "data-service",
      "title": "Data Service",
      "visibility": "public",
      "permissions": ["data:read"]
    }
  ],
  
  "resourceQuota": {
    "maxRenderObjects": 1000,
    "maxEventListeners": 50,
    "maxTimers": 20,
    "maxApiCallsPerSecond": 100
  }
}
```

### 3. index.js (入口代码)

MOD 的主要逻辑代码（编译后的 JavaScript）。

```javascript
// 注意: 这是编译后的代码，开发时使用 TypeScript
(function(exports) {
  'use strict';
  
  // MOD 生命周期钩子
  const hooks = {
    onLoad: async function(context) {
      context.logger.info('MOD 加载中...');
      // 初始化逻辑
    },
    
    onEnable: async function(context) {
      context.logger.info('MOD 启用');
      // 启用逻辑
    },
    
    onDisable: async function(context) {
      context.logger.info('MOD 禁用');
      // 清理逻辑
    },
    
    onUnload: async function(context) {
      context.logger.info('MOD 卸载');
      // 卸载逻辑
    },
    
    // 命令处理器
    handleOpen: function(context) {
      context.logger.info('打开 MOD 窗口');
      // 命令逻辑
    }
  };
  
  // 导出 MOD
  exports.manifest = /* manifest.json 的内容 */;
  exports.hooks = hooks;
  
})(typeof exports !== 'undefined' ? exports : this);
```

## 版本规范

### 语义化版本 (Semantic Versioning)

MOD 版本号遵循 `major.minor.patch[-prerelease][+build]` 格式：

- **major**: 不兼容的 API 变更
- **minor**: 向后兼容的功能新增
- **patch**: 向后兼容的问题修复
- **prerelease**: 预发布版本标识 (可选)
- **build**: 构建元数据 (可选)

示例:
- `1.0.0` - 正式版本
- `1.2.3` - 第 1 个大版本，第 2 个功能版本，第 3 个修复版本
- `2.0.0-beta.1` - 第 2 个大版本的第 1 个 beta 版本
- `1.0.0+20260430` - 带构建日期的版本

### 依赖版本范围

支持的版本范围格式:

| 格式 | 说明 | 示例 | 匹配版本 |
|------|------|------|----------|
| `^x.y.z` | 兼容 x.* | `^1.2.3` | >=1.2.3 <2.0.0 |
| `~x.y.z` | 兼容 x.y.* | `~1.2.3` | >=1.2.3 <1.3.0 |
| `>=x.y.z` | 大于等于 | `>=1.2.3` | >=1.2.3 |
| `<=x.y.z` | 小于等于 | `<=1.2.3` | <=1.2.3 |
| `>x.y.z` | 大于 | `>1.2.3` | >1.2.3 |
| `<x.y.z` | 小于 | `<1.2.3` | <1.2.3 |
| `x.y.z` | 精确匹配 | `1.2.3` | 1.2.3 |
| `*` | 任意版本 | `*` | 任意 |

## 打包流程

### 1. 准备源代码

```bash
my-awesome-mod/
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   └── components/
├── assets/
├── package.json
├── tsconfig.json
└── README.md
```

### 2. 编译 TypeScript

```bash
# 编译为 ES5 以确保兼容性
tsc --target ES5 --module commonjs --outDir dist
```

### 3. 生成 manifest.json

```bash
# 从 TypeScript 导出 manifest
node scripts/generate-manifest.js
```

### 4. 计算哈希值

```bash
# 使用 Node.js 计算 SHA-256
node scripts/calculate-hash.js
```

### 5. 签名 (可选)

```bash
# 使用私钥签名
node scripts/sign-package.js --key private-key.pem
```

### 6. 打包为 ZIP

```bash
# 创建 ZIP 包
zip -r my-awesome-mod.zip \
  package.json \
  manifest.json \
  index.js \
  README.md \
  LICENSE \
  assets/
```

### 7. 验证包

```bash
# 验证包的完整性
node scripts/verify-package.js my-awesome-mod.zip
```

## 打包脚本示例

### package.json (开发环境)

```json
{
  "name": "my-awesome-mod",
  "version": "1.2.3",
  "scripts": {
    "build": "tsc",
    "generate-manifest": "node scripts/generate-manifest.js",
    "calculate-hash": "node scripts/calculate-hash.js",
    "sign": "node scripts/sign-package.js",
    "pack": "npm run build && npm run generate-manifest && npm run calculate-hash && npm run create-zip",
    "create-zip": "node scripts/create-zip.js",
    "verify": "node scripts/verify-package.js"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jszip": "^3.10.0"
  }
}
```

### scripts/create-zip.js

```javascript
const fs = require('fs');
const JSZip = require('jszip');

async function createZip() {
  const zip = new JSZip();
  
  // 添加文件
  zip.file('package.json', fs.readFileSync('package.json'));
  zip.file('manifest.json', fs.readFileSync('dist/manifest.json'));
  zip.file('index.js', fs.readFileSync('dist/index.js'));
  zip.file('README.md', fs.readFileSync('README.md'));
  zip.file('LICENSE', fs.readFileSync('LICENSE'));
  
  // 添加资源文件夹
  const assets = fs.readdirSync('assets');
  for (const file of assets) {
    const content = fs.readFileSync(`assets/${file}`);
    zip.file(`assets/${file}`, content);
  }
  
  // 生成 ZIP
  const content = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync('my-awesome-mod.zip', content);
  
  console.log('✓ 包创建成功: my-awesome-mod.zip');
}

createZip().catch(console.error);
```

## 最佳实践

### 1. 包大小优化

- ✅ 压缩和混淆代码
- ✅ 移除未使用的依赖
- ✅ 使用 WebP 格式的图片
- ✅ 懒加载大型资源
- ❌ 不要包含 node_modules
- ❌ 不要包含源代码和测试文件

### 2. 安全性

- ✅ 始终签名发布的包
- ✅ 使用 HTTPS 分发包
- ✅ 定期更新依赖
- ✅ 遵循最小权限原则
- ❌ 不要在代码中硬编码密钥

### 3. 兼容性

- ✅ 明确声明 API 版本
- ✅ 测试多个系统版本
- ✅ 提供迁移指南
- ✅ 保持向后兼容性
- ❌ 不要使用实验性 API

### 4. 文档

- ✅ 提供详细的 README
- ✅ 包含使用示例
- ✅ 说明权限用途
- ✅ 提供更新日志
- ❌ 不要假设用户了解技术细节

## 分发渠道

### 1. GitHub Releases

```bash
# 创建 release
gh release create v1.2.3 my-awesome-mod.zip \
  --title "My Awesome MOD v1.2.3" \
  --notes "Release notes..."
```

### 2. CDN

```bash
# 上传到 CDN
aws s3 cp my-awesome-mod.zip \
  s3://my-bucket/mods/my-awesome-mod/1.2.3/
```

### 3. NPM (可选)

```bash
# 发布到 NPM
npm publish
```

## 故障排查

### 常见问题

1. **包验证失败**
   - 检查 package.json 和 manifest.json 的 id、version 是否一致
   - 确保所有必需文件都包含在包中

2. **版本不兼容**
   - 检查 apiVersion 是否与系统版本匹配
   - 查看系统的 API 版本: `getVersionChecker().getSystemVersion()`

3. **依赖缺失**
   - 确保依赖的 MOD 已安装
   - 检查依赖版本范围是否正确

4. **签名验证失败**
   - 确保使用正确的私钥签名
   - 检查包是否在传输过程中被修改

## 相关文档

- [MOD 开发指南](./MOD_DEVELOPMENT_GUIDE.md)
- [MOD 动态加载指南](./MOD_DYNAMIC_LOADING.md)
- [迁移指南](./MIGRATION_GUIDE.md)
