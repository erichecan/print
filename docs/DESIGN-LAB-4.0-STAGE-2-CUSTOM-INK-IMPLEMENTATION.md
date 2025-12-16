# Design Lab 4.0 阶段2：Custom Ink 方式实现

**更新时间**: 2025-12-20 01:25:00  
**状态**: ✅ 已实现

---

## 一、实现方案

### 1.1 Custom Ink 方式

**参考 Custom Ink 的实现**:
- 逻辑尺寸：4000 × 4800（高分辨率，用于 Fabric.js 坐标系）
- DOM 显示尺寸：自适应（基于 `.dl-canvas` section）
- 显示比例：5/6（4000/4800）

### 1.2 与之前的对比

**之前的实现**:
- 逻辑尺寸 = DOM 显示尺寸 = `.dl-canvas` section 的实际尺寸
- 每次都需要获取 DOM 尺寸并更新逻辑尺寸

**Custom Ink 方式**:
- 逻辑尺寸：固定的 4000 × 4800（高分辨率）
- DOM 显示尺寸：自适应 `.dl-canvas` section（通过 CSS）
- 图片位置：使用固定的逻辑中心点（2000, 2400）

---

## 二、代码修改

### 2.1 Canvas 逻辑尺寸

**文件**: `apps/web/src/app/design-lab/DesignLabClient.tsx`

```typescript
// [2025-12-20 01:25:00] 阶段2修复：改为 Custom Ink 方式 - 固定高分辨率逻辑尺寸
const CANVAS_WIDTH = 4000;
const CANVAS_HEIGHT = 4800;
```

### 2.2 Canvas 引擎初始化

**文件**: `apps/web/src/design/canvas/engine.ts`

```typescript
// 逻辑尺寸：4000 × 4800
const LOGICAL_WIDTH = 4000;
const LOGICAL_HEIGHT = 4800;

this.canvas = new fabricModule.Canvas(canvasElement, {
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  // ...
});
```

### 2.3 图片布局函数

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**关键修改**:
1. 使用固定的逻辑尺寸（4000 × 4800）中心点
2. 不再动态获取 DOM 尺寸
3. 不再修改 Canvas 的逻辑尺寸

```typescript
// 使用固定的逻辑尺寸
const logicalCanvasWidth = canvasWidth; // 4000
const logicalCanvasHeight = canvasHeight; // 4800
const logicalCenterX = logicalCanvasWidth / 2; // 2000
const logicalCenterY = logicalCanvasHeight / 2; // 2400

// 图片位置 = 逻辑中心
image.set({
  left: logicalCenterX, // 2000
  top: logicalCenterY,  // 2400
});
```

### 2.4 CSS 自适应

**文件**: `apps/web/src/app/design-lab/design-lab.css`

```css
/* Canvas 容器自适应 .dl-canvas section */
.dl-canvas__product .canvas-container {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 5 / 6; /* 保持宽高比（4000/4800） */
  object-fit: contain;
}

/* Canvas 元素填充容器 */
.dl-canvas__product .canvas-container .upper-canvas,
.dl-canvas__product .canvas-container .lower-canvas {
  width: 100% !important;
  height: 100% !important;
}
```

---

## 三、优势

### 3.1 稳定性

- ✅ 逻辑尺寸固定，不依赖 DOM 尺寸变化
- ✅ 图片位置固定，不随窗口大小变化
- ✅ 避免热重载时逻辑尺寸被重置

### 3.2 高分辨率

- ✅ 逻辑尺寸 4000 × 4800，支持高分辨率编辑
- ✅ DOM 显示尺寸自适应，适合不同屏幕
- ✅ 导出时可以使用高分辨率逻辑尺寸

### 3.3 兼容性

- ✅ 与 Custom Ink 的实现方式一致
- ✅ 易于理解和维护
- ✅ 支持缩放和滚动（如果需要）

---

## 四、验证

### 4.1 验证步骤

1. 加载页面，检查图片是否在中心
2. 调整窗口大小，检查 Canvas 是否自适应
3. 进行热重载，检查图片是否仍然存在且居中

### 4.2 预期结果

- ✅ 图片位置：逻辑坐标 (2000, 2400)
- ✅ 图片显示：在 Canvas 中心（视觉上居中）
- ✅ Canvas 尺寸：自适应 `.dl-canvas` section
- ✅ 热重载：图片不被删除，位置保持

---

**实现状态**: ✅ 已完成  
**下一步**: 测试验证
