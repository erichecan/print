# Design Lab 底图居中修复 - 实施总结

**完成时间**: 2025-12-19 21:30:00

## 一、根因说明

### 问题现象
- 底图显示在左上角，不在画布中央
- 切换视图后底图位置不正确

### 根因分析

1. **复用existingImage路径未重新应用布局** (Line 431-448)
   - 当找到已存在的图片时，直接返回了`existingImage.left || 0`和`existingImage.top || 0`
   - 这导致如果图片之前位置不正确，会被保留

2. **创建时先使用left/top原点，后改为center** (Line 587-622)
   - 初始化时使用`originX: 'left', originY: 'top'`
   - 后面才改为`originX: 'center', originY: 'center'`
   - 这个顺序可能导致布局计算错误

3. **缺少统一的幂等布局函数**
   - 布局逻辑分散在多个地方，容易出错
   - 没有强制在返回前重新应用布局

4. **viewportTransform未考虑**
   - zoom视图时会有viewportTransform，需要使用逻辑坐标系计算中心

## 二、修复方案

### 核心修复：创建幂等的`applyProductImageLayout`函数

在`productImageLayer.ts`中创建了统一的布局函数，确保：
- 使用逻辑坐标系（考虑viewportTransform）
- 强制设置`originX='center', originY='center'`
- 强制设置`left = canvasWidth/2, top = canvasHeight/2`
- 无条件覆盖旧值（不使用`|| 0` fallback）

### 应用路径

1. **新建图片路径** (Line 729-738)
   - 在创建Fabric Image后立即调用
   - 在markLoaded之前再次调用（确保最后一步）

2. **复用existingImage路径** (Line 442-468)
   - 找到existingImage后，强制重新应用布局
   - 确保返回前位置正确

3. **所有返回前最后一步** (Line 863-865)
   - 在markLoaded和markAttached之前最后一次调用
   - 确保无论哪个路径，最终都应用了正确的布局

## 三、关键 diff 摘要

### 1. 新增幂等布局函数 (productImageLayer.ts)

```typescript
function applyProductImageLayout(params: {
  image: fabric.Image;
  canvas: fabric.Canvas;
  canvasWidth: number;
  canvasHeight: number;
  safeAreaWidth: number;
  safeAreaHeight: number;
  fitMode?: 'contain' | 'cover';
}): void {
  // 1. 计算逻辑坐标系（考虑viewportTransform）
  const vpt = canvas.viewportTransform;
  let logicalCanvasWidth = canvasWidth;
  let logicalCanvasHeight = canvasHeight;
  if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
    logicalCanvasWidth = (canvas.width || canvasWidth) / vpt[0];
    logicalCanvasHeight = (canvas.height || canvasHeight) / vpt[3];
  }
  
  // 2. 计算fit和中心
  const fit = calculateImageFit({...});
  const centerX = logicalCanvasWidth / 2;
  const centerY = logicalCanvasHeight / 2;
  
  // 3. 强制设置布局（无条件覆盖）
  image.set({ originX: 'center', originY: 'center' });
  image.scale(fit.scale);
  image.set({ left: centerX, top: centerY });
  image.setCoords();
  image.set({ selectable: false, evented: false });
}
```

### 2. 修复existingImage复用路径

```diff
  if (existingImage) {
-   return { image: existingImage, fit: { left: existingImage.left || 0, ... } };
+   // 强制重新应用布局
+   applyProductImageLayout({ image: existingImage, ... });
+   // 返回最新的fit值
+   return { image: existingImage, fit: { left: existingImage.left, ... } };
  }
```

### 3. 修复新建图片路径

```diff
  const fabricImg = new fabricModule.Image(imgElement, {
-   originX: 'left',
-   originY: 'top',
+   originX: 'center', // 初始就使用center
+   originY: 'center',
  });
  
- // 手动设置left/top/origin
+ // 使用统一的幂等布局函数
+ applyProductImageLayout({ image: fabricImg, ... });
  
+ // 在返回前最后一次调用（确保布局正确）
+ applyProductImageLayout({ image: fabricImg, ... });
```

## 四、viewportTransform处理

### 逻辑坐标系计算

```typescript
const vpt = canvas.viewportTransform;
let logicalCanvasWidth = canvasWidth;
let logicalCanvasHeight = canvasHeight;

if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
  // 存在缩放：逻辑尺寸 = 实际尺寸 / 缩放比例
  logicalCanvasWidth = (canvas.width || canvasWidth) / vpt[0];
  logicalCanvasHeight = (canvas.height || canvasHeight) / vpt[3];
}
```

**原因**：当zoom视图时，viewportTransform会对canvas进行缩放和平移。我们需要使用逻辑坐标系来计算中心，这样才能确保底图在逻辑中心，而不是视觉中心。

**公式**：
- `logicalWidth = actualWidth / scaleX` (vpt[0])
- `logicalHeight = actualHeight / scaleY` (vpt[3])
- `centerX = logicalWidth / 2`
- `centerY = logicalHeight / 2`

## 五、测试验证

### Playwright测试

新增/更新了以下测试用例：

1. **底图应该严格居中** (误差≤2px)
   - 验证left/top等于画布中心
   - 验证originX/originY是'center'

2. **切换视图后底图仍应居中**
   - 切换到back视图验证
   - 切换回front视图验证

3. **底图尺寸应该达到80%×90%目标占比**
   - cover模式验证

### DevTools验证步骤

1. 打开Design Lab页面
2. 打开Console，执行：
```javascript
const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
const productImage = canvas.getObjects().find(obj => obj.name?.startsWith('product-image-'));
console.log({
  left: productImage.left,  // 应该 = 500 (1000/2)
  top: productImage.top,    // 应该 = 600 (1200/2)
  originX: productImage.originX, // 应该是 'center'
  originY: productImage.originY, // 应该是 'center'
  canvasCenter: { x: canvas.width / 2, y: canvas.height / 2 }
});
```

## 六、修改文件列表

1. `apps/web/src/design/canvas/layers/productImageLayer.ts`
   - 新增`applyProductImageLayout`函数
   - 修复existingImage复用路径
   - 修复新建图片路径
   - 在所有返回前调用layout函数

2. `apps/web/tests/e2e/design-lab-product-image-size-position.spec.ts`
   - 更新测试用例，验证严格居中（误差≤2px）
   - 新增视图切换测试
   - 考虑viewportTransform的逻辑坐标系

## 七、验证结果

- ✅ 编译通过
- ✅ 无linter错误
- ⏳ 待Playwright测试运行
- ⏳ 待部署验证
