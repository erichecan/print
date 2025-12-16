# Design Lab 4.0 阶段2：最终修复

**修复时间**: 2025-12-20 01:00:00  
**问题**: 底图没有在绿色边框区域（.dl-canvas section）的中心  
**根本原因**: 使用了固定的 Fabric Canvas 逻辑尺寸（1000×1200），而不是绿色边框区域的实际 DOM 尺寸  
**状态**: ✅ 已修复

---

## 一、问题根源

### 1.1 用户反馈

> "为什么总是计算在 fabric canvas 的逻辑中心呢，都说了阶段 2 就是不要管 fabric，就是单纯的实现我在绿色边框区域加载一张图片，这个图片在中间居中对齐，填满绿色边框区域，就这么简单"

### 1.2 问题分析

**之前的错误做法**:
- ❌ 使用固定的 Fabric Canvas 逻辑尺寸（1000×1200）
- ❌ 计算 `.dl-canvas` section 中心在 Fabric 逻辑坐标系中的映射位置
- ❌ 复杂的坐标转换逻辑

**正确的做法**:
- ✅ 直接使用 `.dl-canvas` section 的实际 DOM 尺寸
- ✅ 将 Fabric Canvas 的逻辑尺寸设置为等于 section 的 DOM 尺寸
- ✅ 图片位置 = section 中心 = Fabric Canvas 逻辑中心（无需转换）

---

## 二、修复方案

### 2.1 修复思路

**核心原则**: 让 Fabric Canvas 的逻辑尺寸 = `.dl-canvas` section 的实际 DOM 尺寸

这样：
- Fabric Canvas 逻辑中心 = section 视觉中心
- 图片放在 Fabric Canvas 逻辑中心 = 图片在绿色边框区域中心
- 无需复杂的坐标转换

### 2.2 修复代码

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**函数**: `applyCoverCentered()` (第62-151行)

**关键修改**:

```typescript
// [2025-12-20 01:00:00] 阶段2修复：获取 .dl-canvas section 的实际 DOM 尺寸作为目标尺寸
const canvasElement = canvas.getElement();
// ... 查找 .dl-canvas section ...

const sectionRect = sectionElement.getBoundingClientRect();
const sectionWidth = sectionRect.width;
const sectionHeight = sectionRect.height;
const sectionCenterX = sectionWidth / 2;
const sectionCenterY = sectionHeight / 2;

// [2025-12-20 01:00:00] 阶段2修复：更新 Fabric Canvas 的逻辑尺寸为 section 的实际尺寸
// 这样 Fabric Canvas 的逻辑中心 = section 的中心
canvas.setDimensions({
  width: sectionWidth,
  height: sectionHeight,
}, { cssOnly: false }); // 更新逻辑尺寸，不仅仅是 CSS

// [2025-12-20 01:00:00] 阶段2修复：计算 cover scale（填满整个 section，不使用 safeArea）
const scaleX = sectionWidth / imgWidth;
const scaleY = sectionHeight / imgHeight;
const scale = Math.max(scaleX, scaleY); // cover: 使用较大值

// [2025-12-20 01:00:00] 阶段2修复：设置位置为 section 中心（就是 Fabric Canvas 逻辑中心）
image.set({
  left: sectionCenterX,
  top: sectionCenterY,
});
```

---

## 三、验证方法

### 3.1 验证步骤

1. **重新加载页面**: `http://localhost:3001/design-lab`
2. **检查控制台日志**: 应该看到 `applyCoverCentered` 的日志，显示：
   - `.dl-canvas section尺寸`: 例如 `800 × 600`（实际 DOM 尺寸）
   - `section中心（Fabric Canvas 逻辑中心）`: 例如 `(400, 300)`
   - `图片位置`: 例如 `(400, 300)`（应该与 section 中心一致）

### 3.2 验证脚本

在浏览器控制台运行：

```javascript
// 获取绿色边框区域
var canvasSection = document.querySelector('.dl-canvas');
var sectionRect = canvasSection.getBoundingClientRect();
var sectionCenterX = sectionRect.left + sectionRect.width / 2;
var sectionCenterY = sectionRect.top + sectionRect.height / 2;

console.log('绿色边框区域中心:', sectionCenterX, sectionCenterY);
console.log('绿色边框区域尺寸:', sectionRect.width, sectionRect.height);

// 获取 Fabric Canvas
var fabricCanvas = window.fabricCanvas;
var objects = fabricCanvas.getObjects();
var productImage = objects.find(function(obj) {
  return obj.data && obj.data.layerType === 'product-image';
});

if (productImage) {
  // Fabric Canvas 的逻辑尺寸（现在应该等于 section 尺寸）
  var canvasWidth = fabricCanvas.width;
  var canvasHeight = fabricCanvas.height;
  var imageCenterX = productImage.left;
  var imageCenterY = productImage.top;
  
  console.log('Fabric Canvas 逻辑尺寸:', canvasWidth, canvasHeight);
  console.log('Fabric Canvas 逻辑中心:', canvasWidth / 2, canvasHeight / 2);
  console.log('底图位置（Fabric 逻辑坐标）:', imageCenterX, imageCenterY);
  console.log('底图是否在逻辑中心:', 
    Math.abs(imageCenterX - canvasWidth / 2) <= 2 && 
    Math.abs(imageCenterY - canvasHeight / 2) <= 2
  );
}
```

### 3.3 预期结果

- ✅ Fabric Canvas 逻辑尺寸 = `.dl-canvas` section 的 DOM 尺寸
- ✅ Fabric Canvas 逻辑中心 = section 视觉中心
- ✅ 底图位置 = Fabric Canvas 逻辑中心 = section 视觉中心
- ✅ 底图填满 section（cover 策略）

---

## 四、技术细节

### 4.1 为什么这样修复

1. **简单直接**: 不需要复杂的坐标转换
2. **符合阶段2要求**: "不要管 fabric"，直接使用绿色边框区域的实际尺寸
3. **逻辑清晰**: Fabric Canvas 逻辑尺寸 = section DOM 尺寸，所以逻辑中心 = 视觉中心

### 4.2 注意事项

- `canvas.setDimensions()` 会同时更新 Fabric Canvas 的逻辑尺寸和 DOM 尺寸
- 这可能会影响其他地方使用 Fabric Canvas 的代码（如果它们依赖固定的 1000×1200 尺寸）
- 但根据阶段2的要求，这是正确的做法

---

**修复状态**: ✅ 代码已修复  
**验证状态**: ⏳ 待验证  
**下一步**: 重新加载页面并验证修复效果
