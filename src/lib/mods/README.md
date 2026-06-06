# MOD 目录

这个目录包含所有的MOD模组。系统会自动发现并加载这里的所有MOD。

## 🚀 快速开始

### 添加新MOD

1. **创建MOD文件夹**
   ```bash
   mkdir src/lib/mods/my-mod
   ```

2. **创建必需文件**
   - `manifest.ts` - MOD清单（元数据、权限、贡献点）
   - `index.ts` - MOD入口（生命周期钩子、导出函数）

3. **重新生成注册表**
   ```bash
   npm run generate-mods
   ```

4. **重启应用**
   ```bash
   npm run dev
   ```

### 删除MOD

1. 删除MOD文件夹
2. 运行 `npm run generate-mods`
3. 重启应用

## 📁 MOD结构

```
my-mod/
├── index.ts          # 必需：MOD入口
├── manifest.ts       # 必需：MOD清单
└── ...               # 可选：其他文件
```

### 最小示例

**manifest.ts**
```typescript
import type { ModManifest } from '@/lib/mod-manager/types';

export const myModManifest: ModManifest = {
  id: 'my-mod',
  name: 'My Mod',
  nameZh: '我的模组',
  version: '1.0.0',
  description: 'My awesome mod',
  author: 'Your Name',
  icon: '🎯',
  defaultEnabled: false,
};
```

**index.ts**
```typescript
import type { ModLifecycleHooks } from '@/lib/mod-manager/types';
import { myModManifest } from './manifest';

export const myModHooks: ModLifecycleHooks = {
  onEnable: async (context) => {
    context.logger.info('MOD启用');
  },
};

export function getMyModMod() {
  return {
    manifest: myModManifest,
    hooks: myModHooks,
  };
}
```

## 🔧 自动发现机制

系统使用自动扫描脚本发现MOD：

1. **扫描** - 脚本扫描此目录下的所有子文件夹
2. **验证** - 检查是否包含 `index.ts` 和 `manifest.ts`
3. **生成** - 自动生成 `auto-registry.ts` 注册表
4. **加载** - 应用启动时自动加载所有MOD

### 命令

- `npm run generate-mods` - 手动重新生成注册表
- `npm run build` - 构建时自动生成注册表（prebuild钩子）

## 📝 命名约定

- **文件夹名**：kebab-case（例如：`my-new-mod`）
- **导出函数**：camelCase + Mod（例如：`getMyNewModMod()`）
- **MOD ID**：通常与文件夹名相同

脚本会自动转换：
- `satellite-tracking` → `getSatelliteTrackingMod()`
- `my-new-mod` → `getMyNewModMod()`

## ⚠️ 重要提示

1. **不要编辑 `auto-registry.ts`** - 这是自动生成的文件
2. **添加MOD后运行生成脚本** - 否则不会被识别
3. **需要重启应用** - 目前不支持热加载
4. **遵循命名约定** - 确保导出函数名正确

## 📚 更多文档

- [MOD自动发现详细文档](../../../docs/MOD_AUTO_DISCOVERY.md)
- [MOD开发指南](../../../docs/MOD_DEVELOPMENT_GUIDE.md)
- [MOD管理指南](../../../docs/MOD_MANAGEMENT_GUIDE.md)

## 🎯 当前已注册的MOD

运行 `npm run generate-mods` 查看所有已发现的MOD。
