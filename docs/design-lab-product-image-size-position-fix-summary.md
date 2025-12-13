# Design Lab 底图大小与位置修复 - 实施总结

**完成时间**: 2025-12-19 21:15:00

## 一、根因说明

### 问题现象
- 底图看起来太小（只占画布的约一半面积）
- 底图不在画布中央（实际已居中，但视觉上因尺寸小导致感觉不居中）

### 根因分析
1. **安全区比例太小**：当前使用 `safeAreaWidth = 0.65` (65%), `safeAreaHeight = 0.75` (75%)
   - 位置：`apps/web/src/design/utils/fit.ts` Line 61-62
   - 影响：底图只占画布的约50%面积，视觉上较小

2. **Fit模式不适合**：使用 `fit = 'contain'` 模式
   - 位置：`apps/web/src/design/utils/fit.ts` Line 63
   - 影响：完整显示图片但可能有留白，视觉不够突出

3. **居中逻辑已正确**：使用 `originX='center', originY='center'` 和 `left = canvasWidth/2, top = canvasHeight/2`
   - 位置：`apps/web/src/design/canvas/layers/productImageLayer.ts` Line 609-622
   - 结论：居中逻辑本身没有问题

## 二、修复方案

### 修复内容
1. **增大安全区比例**：从 65%×75% 改为 80%×90%
   - 底图占据画布主要区域，更接近 CustomInk 效果
   - 所有视图（front/back/sleeve）统一使用相同比例

2. **改为cover模式**：从 `contain` 改为 `cover`
   - 填充安全区，可能裁剪边缘，但视觉更大更突出
   - 确保底图至少一边达到目标尺寸

### 修改文件列表

1. **`apps/web/src/design/utils/fit.ts`**
   - 默认安全区：`safeAreaWidth = 0.8`, `safeAreaHeight = 0.9`
   - 默认Fit模式：`fit = 'cover'`

2. **`apps/web/src/design/canvas/layers/productImageLayer.ts`**
   - 默认安全区：`safeAreaWidth = 0.8`, `safeAreaHeight = 0.9`
   - Fit模式：`fit: 'cover'`

3. **`apps/web/src/app/design-lab/DesignLabClient.tsx`**
   - 所有使用安全区的地方改为 0.8×0.9
   - 所有fit模式改为 `'cover'`
   - 包括：fallback image、upload image等场景

4. **`apps/web/tests/e2e/design-lab-product-image-size-position.spec.ts`**（新增）
   - 测试底图尺寸占比（80%×90%）
   - 测试居中位置（误差≤2px）
   - 测试底图在最底层且不可选中

## 三、关键 diff 摘要

### 1. fit.ts - 默认参数
```diff
- safeAreaWidth = 0.65,
- safeAreaHeight = 0.75,
- fit = 'contain',
+ safeAreaWidth = 0.8, // [2025-12-19 21:15:00] 修复：增大默认安全区宽度，从65%改为80%
+ safeAreaHeight = 0.9, // [2025-12-19 21:15:00] 修复：增大默认安全区高度，从75%改为90%
+ fit = 'cover', // [2025-12-19 21:15:00] 修复：改为cover模式（填充安全区，可能裁剪边缘，但视觉更大更突出）
```

### 2. productImageLayer.ts - 默认参数
```diff
- safeAreaWidth = 0.65,
- safeAreaHeight = 0.75,
+ safeAreaWidth = 0.8, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从65%改为80%
+ safeAreaHeight = 0.9, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从75%改为90%

- fit: 'contain',
+ fit: 'cover', // [2025-12-19 21:15:00] 修复：改为cover模式（填充安全区，可能裁剪边缘，但视觉更大更突出）
```

### 3. DesignLabClient.tsx - 所有使用处
```diff
- safeAreaWidth: 0.65,
- safeAreaHeight: 0.75,
- fit: 'contain',
+ safeAreaWidth: 0.8, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从65%改为80%
+ safeAreaHeight: 0.9, // [2025-12-19 21:15:00] 修复：增大底图尺寸占比，从75%改为90%
+ fit: 'cover', // [2025-12-19 21:15:00] 修复：改为cover模式（填充安全区，视觉更大更突出）
```

## 四、验证方法

### Chrome DevTools验证步骤

1. **打开Design Lab页面**
   ```
   http://localhost:3000/design-lab
   ```

2. **检查底图尺寸**
   - 打开DevTools → Console
   - 执行：
     ```javascript
     const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
     const productImage = canvas.getObjects().find(obj => obj.name?.startsWith('product-image-'));
     console.log('Canvas:', canvas.width, 'x', canvas.height);
     console.log('Product Image:', {
       width: productImage.width * productImage.scaleX,
       height: productImage.height * productImage.scaleY,
       left: productImage.left,
       top: productImage.top,
       originX: productImage.originX,
       originY: productImage.originY
     });
     ```
   - 验证：
     - `width` 应该 ≈ 800px (1000 * 0.8)
     - `height` 应该 ≈ 1080px (1200 * 0.9)
     - `left` 应该 = 500px (1000/2)
     - `top` 应该 = 600px (1200/2)
     - `originX` 和 `originY` 应该是 'center'

3. **检查视觉效果**
   - 底图应该更大，占据画布主要区域
   - 底图应该严格居中
   - 底图应该在所有其他图层之下

### Playwright测试

运行测试：
```bash
npm run test:e2e -- tests/e2e/design-lab-product-image-size-position.spec.ts
```

测试覆盖：
- ✅ 底图尺寸占比（80%×90%）
- ✅ 居中位置（误差≤2px）
- ✅ originX/originY是center
- ✅ 底图在最底层且不可选中

## 五、注意事项

1. **Cover模式可能裁剪边缘**：使用cover模式时，图片可能会被裁剪边缘部分，但整体视觉更大更突出
2. **不同图片尺寸稳定性**：cover模式对不同尺寸的图片都能稳定工作，确保至少一边达到目标尺寸
3. **响应式兼容**：修复不影响移动端响应式布局（已有max-height: 60vh限制）

## 六、部署状态

- ✅ 代码已提交：`fix(design-lab): 修复底图大小与位置 - 增大至80%×90%并使用cover模式`
- ✅ 已推送到GitHub
- ⏳ 等待部署验证
