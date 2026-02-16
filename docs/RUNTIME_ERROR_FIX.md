# Runtime Error 修复

## 错误信息

```
Error Type: Runtime TypeError
Error Message: sceneManager.getLaniakeaSuperclusterRenderer is not a function
```

## 问题原因

`SceneManager` 类中缺少 `getLaniakeaSuperclusterRenderer()` 方法。

虽然有 `setLaniakeaSuperclusterRenderer()` 方法用于设置渲染器，但没有对应的 getter 方法来获取渲染器实例。

## 解决方案

在 `src/lib/3d/SceneManager.ts` 中添加缺失的 getter 方法：

```typescript
/**
 * 获取拉尼亚凯亚超星系团渲染器
 */
getLaniakeaSuperclusterRenderer(): any | null {
  return this.laniakeaSuperclusterRenderer;
}
```

## 修改文件

- ✅ `src/lib/3d/SceneManager.ts` - 添加 `getLaniakeaSuperclusterRenderer()` 方法

## 验证

刷新页面后，应该：

1. ✅ 不再出现 runtime error
2. ✅ 所有渲染内容正常显示
3. ✅ Laniakea 标签正常工作

## 相关方法

SceneManager 中的渲染器 getter/setter 方法：

```typescript
// Local Group
setLocalGroupRenderer(renderer: any): void
getLocalGroupRenderer(): any | null

// Nearby Groups
setNearbyGroupsRenderer(renderer: any): void
getNearbyGroupsRenderer(): any | null

// Virgo Supercluster
setVirgoSuperclusterRenderer(renderer: any): void
getVirgoSuperclusterRenderer(): any | null

// Laniakea Supercluster
setLaniakeaSuperclusterRenderer(renderer: any): void
getLaniakeaSuperclusterRenderer(): any | null  // ← 新添加

// Nearby Supercluster
setNearbySuperclusterRenderer(renderer: any): void
// 注意：没有 getter，因为已禁用

// Observable Universe
setObservableUniverseRenderer(renderer: any): void
// 注意：没有 getter
```

## 完成

现在所有功能应该正常工作了！
