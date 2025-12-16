# Design Lab 4.0 阶段2：图片填充模式说明

**更新时间**: 2025-12-20 01:15:00

---

## 一、图片填充模式

### 1.1 contain 模式（当前使用）

**特点**:
- ✅ 完整显示图片，不裁剪任何部分
- ✅ 保持图片原始宽高比
- ⚠️ 可能留白（当图片宽高比与绿色区域不一致时）

**适用场景**: 需要完整显示图片，不希望任何部分被裁剪

### 1.2 cover 模式

**特点**:
- ✅ 填满整个绿色区域，无留白
- ✅ 保持图片原始宽高比
- ⚠️ 可能裁剪图片边缘部分（当图片宽高比与绿色区域不一致时）

**适用场景**: 需要填满整个区域，可以接受裁剪边缘部分

---

## 二、用户需求分析

**用户需求**: "不想图片被裁剪，我想填充整个绿色区域"

**矛盾点**:
- "不想图片被裁剪" = contain 模式
- "填充整个绿色区域" = cover 模式

这两个需求在图片宽高比与绿色区域不一致时是矛盾的。

**解决方案**:
- 当前使用 **contain 模式**，确保图片完整显示，不裁剪
- 如果图片宽高比与绿色区域一致，contain 模式也会填满整个区域（无留白）
- 如果图片宽高比与绿色区域不一致，会出现留白，这是为了保证图片不被裁剪

---

## 三、虚线边框区域（安全区域）

### 3.1 当前状态

**虚线边框**: 橙色虚线边框，表示"安全打印区域"

**当前设置**:
- `SAFE_AREA_MARGIN = 0` (0% 边距)
- 安全区域 = 整个 Fabric Canvas 区域
- 由于 Fabric Canvas 的逻辑尺寸 = `.dl-canvas` section 的实际尺寸
- 所以安全区域 = 整个绿色边框区域

### 3.2 代码位置

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

**函数**: `drawSafeArea()` (约第3612行)

```typescript
const drawSafeArea = () => {
  const SAFE_AREA_MARGIN = 0; // 0%边距，安全区域等于整个 Canvas
  // 绘制橙色虚线边框
  ctx.strokeRect(safeLeft, safeTop, safeRight - safeLeft, safeBottom - safeTop);
};
```

---

## 四、如何切换填充模式

如果需要切换到 cover 模式（填满整个区域，可能裁剪边缘），修改以下调用：

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**位置**: 3 处 `applyCoverCentered()` 调用

```typescript
applyCoverCentered({
  image: fabricImg,
  canvas,
  canvasWidth,
  canvasHeight,
  fabricModule,
  fitMode: 'cover', // 改为 'cover' 以填满整个区域（可能裁剪边缘）
});
```

---

## 五、建议

1. **如果图片宽高比与绿色区域一致**: contain 和 cover 效果相同，都会填满整个区域
2. **如果图片宽高比与绿色区域不一致**:
   - 使用 contain: 完整显示，有留白
   - 使用 cover: 填满区域，裁剪边缘

**当前选择**: contain 模式（保证图片完整性）
