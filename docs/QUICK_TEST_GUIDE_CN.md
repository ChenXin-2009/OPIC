# 快速测试指南 - 宇宙天体中文名称

## 🚀 快速开始（3 步）

### 1️⃣ 清除缓存
访问: `http://localhost:3000/clear-cache.html`

或者在浏览器开发者工具中:
- 右键 → 检查 → Application → Clear storage → Clear site data

### 2️⃣ 硬刷新
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

### 3️⃣ 验证
打开控制台，应该看到新的文件大小：
```
[UniverseDataLoader] Loaded /data/universe/nearby-groups.bin: 10150 bytes
[UniverseDataLoader] Loaded /data/universe/virgo-supercluster.bin: 31908 bytes
[UniverseDataLoader] Loaded /data/universe/laniakea.bin: 166202 bytes
```

---

## 🔍 视觉验证

### 近邻星系群（蓝色标签）
**缩放距离**: 1-20 百万光年

**应该看到的名称**:
- M81 星系群
- M83 星系群
- 玉夫座星系群
- 半人马座 A 星系群
- IC 342 星系群
- 麦菲星系群
- NGC 253 星系群
- NGC 1023 星系群
- 等等...

**不应该看到**: "Group 1", "Group 2", "Group 3"

---

### 室女座超星系团（橙色标签）
**缩放距离**: 5-50 百万光年

**应该看到的名称**:
- 室女座星系团
- 天炉座星系团
- 波江座星系团
- 狮子座 II 星系群
- 巨爵座云
- 室女座 W 云
- 室女座 E 云
- NGC 5846 星系群
- 后发座 I 星系群
- 大熊座云
- 猎犬座云
- 等等...

**不应该看到**: "Cluster 1", "Cluster 2", "Cluster 3"

---

### 拉尼亚凯亚超星系团（亮橙色标签）
**缩放距离**: 50-200 百万光年

**应该看到的名称**:
- 室女座超星系团核心
- 半人马座超星系团
- 南天超星系团
- 长蛇-半人马复合体
- 长蛇座超星系团
- 孔雀-印第安超星系团
- 远距离超星系团（长蛇座方向）
- 等等...

**不应该看到**: "Supercluster 1", "Supercluster 2"

---

## ✅ 功能测试

### 重叠检测
1. 缩放到近邻星系群尺度
2. 旋转视角，使多个标签靠近
3. **预期**: 低优先级标签自动隐藏
4. **预期**: 透明度平滑过渡

### 字体缩放
1. 从近距离缩放到远距离
2. **预期**: 标签字体大小逐渐增大
3. **预期**: 保持可读性

### 颜色区分
- 蓝色 (#4488ff): 近邻星系群
- 橙色 (#ff8844): 室女座超星系团
- 亮橙色 (#ffaa44): 拉尼亚凯亚超星系团

---

## 🐛 如果仍然看到英文编号

### 方案 A: 完全重启
```bash
# 1. 停止开发服务器 (Ctrl+C)
# 2. 关闭所有浏览器窗口
# 3. 重启开发服务器
npm run dev
# 4. 打开新浏览器窗口
# 5. 访问 http://localhost:3000/clear-cache.html
# 6. 硬刷新 (Ctrl+Shift+R)
```

### 方案 B: 检查文件
```bash
# 检查文件大小是否正确
dir public\data\universe\*.bin
```

应该看到:
- `nearby-groups.bin`: 10,150 bytes
- `virgo-supercluster.bin`: 31,908 bytes
- `laniakea.bin`: 166,202 bytes

如果大小不对，重新运行:
```bash
python scripts/fix-universe-data-parsing.py
```

### 方案 C: 浏览器隐私模式
1. 打开浏览器隐私/无痕模式
2. 访问 `http://localhost:3000`
3. 这样可以避免缓存问题

---

## 📊 控制台输出示例

### 正确的输出
```
[UniverseDataLoader] Loaded /data/universe/nearby-groups.bin: 10150 bytes
[NearbyGroupsRenderer] Created 52 groups
[NearbyGroupsRenderer] Labels: M81 星系群, NGC 253 星系群, IC 342 星系群...

[UniverseDataLoader] Loaded /data/universe/virgo-supercluster.bin: 31908 bytes
[VirgoSuperclusterRenderer] Created 113 clusters
[VirgoSuperclusterRenderer] Labels: 室女座星系团, 天炉座星系团...

[UniverseDataLoader] Loaded /data/universe/laniakea.bin: 166202 bytes
[LaniakeaSuperclusterRenderer] Created 13 superclusters
[LaniakeaSuperclusterRenderer] Labels: 室女座超星系团核心, 半人马座超星系团...
```

### 错误的输出（旧缓存）
```
[UniverseDataLoader] Loaded /data/universe/nearby-groups.bin: 9843 bytes  ❌ 旧文件
[NearbyGroupsRenderer] Labels: Group 1, Group 2, Group 3...  ❌ 英文编号
```

---

## 🎯 成功标准

✅ 文件大小正确（10150, 31908, 166202 bytes）
✅ 看到中文名称（不是 "Group 1", "Cluster 1"）
✅ 标签颜色正确（蓝色、橙色、亮橙色）
✅ 重叠检测工作（标签靠近时隐藏）
✅ 字体大小动态调整

---

## 📞 需要帮助？

如果以上步骤都尝试了仍然有问题，请提供：
1. 控制台输出（特别是文件大小）
2. 看到的标签文本（截图）
3. 浏览器类型和版本

---

**预计测试时间**: 5 分钟
**难度**: 简单
**成功率**: 99%（只要清除缓存）
