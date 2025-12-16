# Design Lab 4.0 阶段2：修复总结

**修复时间**: 2025-12-20 00:55:00  
**问题**: 底图没有在绿色边框区域（.dl-canvas section）的中心  
**状态**: ✅ 已修复

---

## 一、问题分析

### 1.1 问题描述

用户指出底图没有在绿色边框区域的中心。经过检查发现：

**问题原因**:
- `applyCoverCentered()` 函数直接使用 Fabric Canvas 逻辑中心 (500, 600)
- 没有考虑绿色边框区域（`.dl-canvas` DOM 元素）的实际尺寸和中心位置
- 绿色边框区域可能因为窗口大小、布局等因素，其中心点与 Fabric Canvas 逻辑中心不一致

### 1.2 需要验证的数据

1. **绿色边框区域尺寸**: `.dl-canvas` section 的实际 DOM 尺寸
2. **绿色边框区域中心**: `.dl-canvas` section 在 DOM 中的中心点坐标
3. **底图尺寸**: 底图在 DOM 中的实际尺寸
4. **底图中心**: 底图在 DOM 中的中心点坐标
5. **中心点是否重合**: 比较两个中心点是否重合（误差 ≤ 2px）

---

## 二、修复方案

### 2.1 修复内容

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**修改**: `applyCoverCentered()` 函数

**关键改动**:
1. ✅ 添加 `canvas` 参数（用于访问 DOM 元素）
2. ✅ 添加计算 `.dl-canvas` section 中心在 Fabric 逻辑坐标系中位置的逻辑
3. ✅ 使用计算出的 section 中心位置，而非 Fabric Canvas 逻辑中心

### 2.2 修复代码

```typescript
// [2025-12-20 00:50:00] 阶段2修复：计算 .dl-canvas section 的中心在 Fabric 逻辑坐标系中的位置
let targetCenterX = canvasWidth / 2; // 默认使用 Fabric.js 逻辑中心
let targetCenterY = canvasHeight / 2;

const canvasElement = canvas.getElement();
if (canvasElement && typeof window !== 'undefined') {
  // 向上查找 .dl-canvas section 元素
  let parent: HTMLElement | null = canvasElement.parentElement;
  while (parent && !parent.classList.contains('dl-canvas')) {
    parent = parent.parentElement;
  }
  
  if (parent && parent.classList.contains('dl-canvas')) {
    const dlCanvasRect = parent.getBoundingClientRect();
    
    // 获取 canvas-container 的位置
    const containerElement = canvasElement.closest('.canvas-container');
    if (containerElement) {
      const containerRect = containerElement.getBoundingClientRect();
      
      // 计算 container 相对于 .dl-canvas 的偏移
      const containerOffsetX = containerRect.left - dlCanvasRect.left;
      const containerOffsetY = containerRect.top - dlCanvasRect.top;
      
      // .dl-canvas section 的视觉中心（相对于 section 本身）
      const sectionCenterXInSection = dlCanvasRect.width / 2;
      const sectionCenterYInSection = dlCanvasRect.height / 2;
      
      // section 中心在 container 坐标系中的位置
      const sectionCenterXInContainer = sectionCenterXInSection - containerOffsetX;
      const sectionCenterYInContainer = sectionCenterYInSection - containerOffsetY;
      
      // 将 container 坐标系转换为 Fabric.js 逻辑坐标系
      const scaleX = canvasWidth / containerRect.width;
      const scaleY = canvasHeight / containerRect.height;
      
      // 计算 section 视觉中心在 Fabric.js 逻辑坐标系中的位置
      targetCenterX = sectionCenterXInContainer * scaleX;
      targetCenterY = sectionCenterYInContainer * scaleY;
    }
  }
}

// 使用计算出的 section 中心位置
image.set({
  left: targetCenterX,
  top: targetCenterY,
});
```

### 2.3 更新调用

**已更新所有调用处** (3处):
1. ✅ `loadProductImageLayer()` - 现有图片重新布局
2. ✅ `loadProductImageLayer()` - 新图片首次布局
3. ✅ `loadProductImageLayer()` - 最终布局保证

所有调用处都添加了 `canvas` 参数。

---

## 三、验证方法

### 3.1 验证脚本

创建了验证脚本：`apps/web/verify-stage2-canvas-center.js`

**使用方法**: 在浏览器控制台运行此脚本，或直接在控制台执行：

```javascript
// 获取绿色边框区域尺寸和中心
const canvasSection = document.querySelector('.dl-canvas');
const sectionRect = canvasSection.getBoundingClientRect();
const sectionCenterX = sectionRect.left + sectionRect.width / 2;
const sectionCenterY = sectionRect.top + sectionRect.height / 2;

// 获取底图在 DOM 中的中心
// ... (参考验证脚本)
```

### 3.2 验证数据

需要验证以下数据：
- 绿色边框区域宽度、高度
- 绿色边框区域中心点
- 底图在 DOM 中的宽度、高度
- 底图在 DOM 中的中心点
- 两个中心点是否重合

---

## 四、下一步

### 4.1 待验证

1. **重新加载页面**测试修复效果
2. **使用验证脚本**检查底图是否在绿色边框区域中心
3. **截图保存**作为证据

### 4.2 验证标准

- ✅ 绿色边框区域中心 = 底图中心（误差 ≤ 2px）
- ✅ 底图填满 Canvas（cover 策略）

---

**修复状态**: ✅ 代码已修复，等待验证  
**下一步**: 重新加载页面并验证修复效果
