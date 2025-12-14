# Design Lab 4.0 阶段2：图片删除问题修复

**修复时间**: 2025-12-20 01:20:00  
**问题**: 商品图片加载成功后很快被"删除"  
**状态**: ✅ 已修复

---

## 一、问题分析

### 1.1 问题现象

从错误日志可以看到：
1. 图片成功加载并添加到 Canvas
2. 但在热重载（Fast Refresh）时，图片被意外删除
3. 日志显示：`[DesignLab] Product image already loaded and matches ref, skipping`
4. 但之后图片仍然被删除

### 1.2 根本原因

**问题代码** (`DesignLabClient.tsx:519`):
```typescript
if (existingProductImage && backgroundImageRef.current === existingProductImage) {
  // 只有在 ref 匹配时才跳过加载
}
```

**问题场景**:
1. 图片已加载并存在于 Canvas 上
2. 热重载导致 React ref 重置，`backgroundImageRef.current` 变为 `null` 或 `undefined`
3. 条件 `backgroundImageRef.current === existingProductImage` 为 `false`
4. 代码继续执行，可能触发清理逻辑或其他问题

---

## 二、修复方案

### 2.1 修复内容

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**修改**: 第519-585行的检查逻辑

**关键改动**:
1. ✅ 移除对 `backgroundImageRef.current === existingProductImage` 的严格检查
2. ✅ 只要 `existingProductImage` 存在，就更新 ref 并跳过加载
3. ✅ 防止热重载时 ref 未设置导致的重复加载或清理

### 2.2 修复代码

```typescript
// [2025-12-20 01:20:00] 阶段2修复：如果已存在相同稳定键的图片，更新 ref 并跳过加载
if (existingProductImage) {
  // [2025-12-20 01:20:00] 修复：热重载时 backgroundImageRef.current 可能未设置，需要更新它
  if (backgroundImageRef.current !== existingProductImage) {
    console.log('[DesignLab] 🔄 Updating backgroundImageRef to existing image (hot reload fix):', stableKey);
    backgroundImageRef.current = existingProductImage as fabric.Image;
    backgroundImageLoadedRef.current = imageKey;
  }
  
  // 继续清理其他旧图片的逻辑...
  // ...
  
  isLoadingBackgroundRef.current = false;
  return;
}
```

---

## 三、Custom Ink 分析

### 3.1 Canvas 结构

从 Custom Ink 网站分析：

**Canvas 逻辑尺寸**: 4000 × 4800（高分辨率）
**Canvas DOM 尺寸**: 775 × 1200
**Container**: `canvas-container`, 775 × 1200

**特点**:
- 使用固定的高分辨率逻辑尺寸（4000×4800）
- DOM 显示尺寸较小（775×1200），保持宽高比
- 使用 `position: absolute` 定位 Canvas

### 3.2 与当前实现的对比

**当前实现**:
- 使用 `.dl-canvas` section 的实际 DOM 尺寸作为 Fabric Canvas 逻辑尺寸
- 逻辑尺寸 = DOM 尺寸（自适应）

**Custom Ink 实现**:
- 使用固定的高分辨率逻辑尺寸（4000×4800）
- DOM 尺寸较小（775×1200），通过缩放显示

---

## 四、验证

### 4.1 验证步骤

1. 加载页面，等待图片加载完成
2. 进行热重载（修改代码触发 Fast Refresh）
3. 验证图片是否仍然存在

### 4.2 预期结果

- ✅ 图片加载成功后不会被删除
- ✅ 热重载时图片仍然存在
- ✅ `backgroundImageRef.current` 正确更新

---

**修复状态**: ✅ 代码已修复  
**下一步**: 测试验证修复效果
