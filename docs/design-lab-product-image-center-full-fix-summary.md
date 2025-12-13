# Design Lab 底图居中铺满修复 - 实施总结

**完成时间**: 2025-12-19 22:00:00

## 一、根因说明

### 问题现象
- 底图尺寸不够大（只有80%宽度，90%高度）
- sleeve视图没有特殊配置（sleeve更窄，需要更高的宽度占比）
- zoom退出后底图可能不在中心（viewportTransform重置但布局未重新应用）

### 根因分析

1. **safeArea配置不够大**
   - 当前使用 `safeAreaWidth = 0.8` (80%), `safeAreaHeight = 0.9` (90%)
   - 用户要求至少覆盖90%×90%

2. **sleeve视图未单独配置**
   - sleeve视图区域更窄，需要更高的宽度占比才能铺满

3. **zoom退出后布局未恢复**
   - zoom退出时重置了viewportTransform为单位矩阵 `[1,0,0,1,0,0]`
   - 但product-image的布局未重新应用，导致可能不在中心

## 二、修复方案

### 核心修复

1. **统一safeArea配置为90%×90%**
   - 所有视图（front/back）使用 `safeAreaWidth = 0.9`, `safeAreaHeight = 0.9`
   - 确保底图至少覆盖画布的90%×90%（cover模式）

2. **sleeve视图特殊配置**
   - 在`applyProductImageLayout`中检测view类型
   - 如果view === 'sleeve'，使用 `safeAreaWidth = 0.95`（因为sleeve更窄）

3. **zoom退出后重新应用布局**
   - 在zoom退出时（viewportTransform重置后），重新调用`loadProductImageLayer`
   - 会复用existingImage并重新应用布局（通过`applyProductImageLayout`）

4. **保存view信息到productImage.data**
   - 创建fabricImg时保存`view`和`imageOptions`到`data`中
   - 便于后续查询view类型进行特殊配置

## 三、关键 diff 摘要

### 1. productImageLayer.ts - 默认safeArea改为0.9

```diff
- safeAreaWidth = 0.8, // 80%
- safeAreaHeight = 0.9, // 90%
+ safeAreaWidth = 0.9, // [2025-12-19 22:00:00] 修复：增大底图尺寸占比至90%（CustomInk风格：铺满画布主要区域）
+ safeAreaHeight = 0.9, // [2025-12-19 22:00:00] 修复：增大底图尺寸占比至90%（CustomInk风格：铺满画布主要区域）
```

### 2. productImageLayer.ts - sleeve视图特殊配置

```diff
+ // [2025-12-19 22:00:00] 根据视图类型调整safeArea配置（sleeve视图更窄，需要单独配置）
+ let effectiveSafeAreaWidth = safeAreaWidth;
+ let effectiveSafeAreaHeight = safeAreaHeight;
+ 
+ // 从image的data中获取view信息（在创建时已保存）
+ const view = (image as any).data?.view;
+ if (view === 'sleeve') {
+   // sleeve视图更窄，使用更高的safeAreaWidth（接近填满宽度）
+   effectiveSafeAreaWidth = 0.95; // [2025-12-19 22:00:00] sleeve视图使用95%宽度
+   effectiveSafeAreaHeight = safeAreaHeight; // 保持高度不变
+ }
```

### 3. productImageLayer.ts - 保存view信息

```diff
  const fabricImg = new fabricModule.Image(imgElement, {
    ...
    data: {
      stableKey,
      layerType: 'product-image',
      zIndex: 0,
+     view: imageOptions.view, // [2025-12-19 22:00:00] 保存view信息，用于sleeve视图的特殊配置
+     imageOptions, // [2025-12-19 22:00:00] 保存完整imageOptions，便于后续查询view
    },
  });
```

### 4. DesignLabClient.tsx - zoom退出后重新应用布局

```diff
  } else if (currentView !== 'zoom' && fabricCanvasRef.current) {
    // [2025-12-19 22:00:00] 重置viewport（zoom退出后）
    const canvas = fabricCanvasRef.current;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
+   // [2025-12-19 22:00:00] 重新应用product-image布局（确保zoom退出后底图居中）
+   (async () => {
+     const productImage = canvas.getObjects().find(...);
+     if (productImage) {
+       const { loadProductImageLayer } = await import('@/design/canvas/layers/productImageLayer');
+       const view = (productImage as any).data?.view || 'front';
+       const colorName = (productImage as any).data?.imageOptions?.colorName || ...;
+       await loadProductImageLayer({...}); // 会复用existingImage并重新应用布局
+     }
+   })();
  }
```

### 5. fit.ts - 默认safeArea改为0.9

```diff
- safeAreaWidth = 0.8, // 80%
- safeAreaHeight = 0.9, // 90%
+ safeAreaWidth = 0.9, // [2025-12-19 22:00:00] 修复：增大默认安全区至90%（CustomInk风格：铺满画布主要区域）
+ safeAreaHeight = 0.9, // [2025-12-19 22:00:00] 修复：增大默认安全区至90%（CustomInk风格：铺满画布主要区域）
```

## 四、修改文件列表

1. `apps/web/src/design/canvas/layers/productImageLayer.ts`
   - 默认safeArea改为0.9
   - sleeve视图特殊配置（safeAreaWidth=0.95）
   - 保存view信息到data中

2. `apps/web/src/app/design-lab/DesignLabClient.tsx`
   - 所有safeArea配置改为0.9
   - zoom退出后重新应用product-image布局

3. `apps/web/src/design/utils/fit.ts`
   - 默认safeArea改为0.9

4. `apps/web/tests/e2e/design-lab-product-image-size-position.spec.ts`
   - 测试目标占比更新为90%×90%

## 五、验证结果

### 编译和测试

- ✅ 编译通过
- ✅ 无linter错误
- ✅ 测试用例已更新

### 预期效果

- ✅ 底图至少覆盖画布的90%×90%（cover模式）
- ✅ sleeve视图使用95%宽度（因为sleeve更窄）
- ✅ 底图严格居中（left≈500, top≈600，误差≤2px）
- ✅ originX/originY='center'
- ✅ zoom退出后底图仍居中

## 六、部署状态

- ✅ 已提交并推送到GitHub
- ⏳ 待部署到GCP Cloud Run
- ⏳ 待线上验证

## 七、验证步骤

### Chrome DevTools验证

访问：https://print-main-frontend-234065158862.us-central1.run.app/design-lab

在Console中执行：
```javascript
setTimeout(() => {
  const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
  const productImage = canvas.getObjects().find(obj => obj.name?.startsWith('product-image-'));
  const vpt = canvas.viewportTransform;
  let logicalCanvasWidth = (canvas.width || 1000) / (vpt?.[0] || 1);
  let logicalCanvasHeight = (canvas.height || 1200) / (vpt?.[3] || 1);
  const centerX = logicalCanvasWidth / 2;
  const centerY = logicalCanvasHeight / 2;
  const leftDiff = Math.abs((productImage.left || 0) - centerX);
  const topDiff = Math.abs((productImage.top || 0) - centerY);
  
  const scaleX = productImage.scaleX || 1;
  const scaleY = productImage.scaleY || 1;
  const actualWidth = (productImage.width || 0) * scaleX;
  const actualHeight = (productImage.height || 0) * scaleY;
  const targetWidth = logicalCanvasWidth * 0.9;
  const targetHeight = logicalCanvasHeight * 0.9;
  
  console.log('验证结果:', {
    center: { x: centerX, y: centerY },
    position: { left: productImage.left, top: productImage.top },
    error: { left: leftDiff, top: topDiff },
    origin: { x: productImage.originX, y: productImage.originY },
    size: { width: actualWidth, height: actualHeight },
    target: { width: targetWidth, height: targetHeight },
    ratio: { width: actualWidth/targetWidth, height: actualHeight/targetHeight },
    isCentered: leftDiff <= 2 && topDiff <= 2 && productImage.originX === 'center',
    isFull: (actualWidth/targetWidth >= 1.0 || actualHeight/targetHeight >= 1.0)
  });
}, 5000);
```

预期结果：
- `isCentered: true`
- `error.left ≤ 2`
- `error.top ≤ 2`
- `origin.x === 'center'`
- `origin.y === 'center'`
- `isFull: true`（至少一边达到90%目标）
