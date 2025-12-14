# Design Lab 4.0 阶段2：实施计划

**创建时间**: 2025-12-20 00:15:00  
**阶段**: 阶段2 - Canvas 栏"商品底图"居中铺满（cover）  
**状态**: 📋 准备实施

---

## 一、阶段2目标

### 1.1 需求描述

在绿色边框标注的 Canvas 区域（仅 Canvas 栏，不是整个窗口）：
- ✅ 首屏自动加载商品图片（产品底图）
- ✅ 底图必须在 Canvas 区域居中
- ✅ 底图视觉策略为 cover：填满 Canvas 区域（允许裁切边缘）
- ⚠️ 暂时不考虑 Fabric 编辑对象、也不考虑上传/文字/素材

### 1.2 参照系确认

**Canvas 尺寸**（从代码中确认）:
- `CANVAS_WIDTH = 1000`
- `CANVAS_HEIGHT = 1200`
- 位置: `apps/web/src/app/design-lab/DesignLabClient.tsx:251-252`

**Canvas 容器**: 绿色边框的 `.dl-canvas` 区域（grid-column: 3）

---

## 二、现状分析

### 2.1 当前实现

**相关文件**:
1. `apps/web/src/design/canvas/layers/productImageLayer.ts`
   - `applyProductImageLayout()` 函数：当前使用 `calculateImageFit()` 计算布局
   - `loadProductImageLayer()` 函数：加载产品图片

2. `apps/web/src/design/utils/fit.ts`
   - `calculateImageFit()` 函数：计算图片 fit 结果

3. `apps/web/src/app/design-lab/DesignLabClient.tsx`
   - `loadBackgroundImage()` 函数：调用 `loadProductImageLayer()`
   - `CANVAS_WIDTH = 1000`, `CANVAS_HEIGHT = 1200`

### 2.2 需要确认的问题

1. **当前布局函数是否已使用 center origin？**
   - 需要检查 `applyProductImageLayout()` 中 originX/originY 的设置

2. **当前是否使用 cover 策略？**
   - 代码中看到 `fitMode: 'cover'`，需要确认 `calculateImageFit()` 是否正确实现 cover

3. **是否存在 `|| 0` 这种回退逻辑？**
   - 需要检查 left/top 是否有回退到 0 的逻辑

---

## 三、实施计划

### 任务1：检查当前实现 ✅

**目标**: 确认当前 `applyProductImageLayout()` 的实现是否符合阶段2要求

**检查项**:
- [ ] 检查 originX/originY 是否设置为 'center'
- [ ] 检查 left/top 是否使用 canvasWidth/2, canvasHeight/2
- [ ] 检查 scale 计算是否使用 cover 策略
- [ ] 检查是否有 `|| 0` 这种回退逻辑

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

---

### 任务2：创建 applyCoverCentered() 函数 🔨

**目标**: 实现"单一真理的幂等布局函数"

**函数签名**:
```typescript
function applyCoverCentered(params: {
  image: fabric.Image;
  canvasWidth: number;
  canvasHeight: number;
  fabricModule: typeof fabric;
}): void
```

**实现要求**:
1. ✅ `originX = 'center'`
2. ✅ `originY = 'center'`
3. ✅ `left = canvasWidth / 2`
4. ✅ `top = canvasHeight / 2`
5. ✅ `scale = cover`（按 Canvas 目标宽高计算）
6. ✅ 禁止任何分支沿用旧 left/top（不能出现 `|| 0` 这种）

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

---

### 任务3：替换 applyProductImageLayout() 调用 🔨

**目标**: 将所有 `applyProductImageLayout()` 调用替换为 `applyCoverCentered()`

**需要替换的位置**:
1. `loadProductImageLayer()` 中的现有图片重新布局
2. `loadProductImageLayer()` 中的新图片布局

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

---

### 任务4：创建测试用例 🧪

**目标**: 创建 Playwright 测试验证底图居中 cover

**测试内容**:
1. 验证底图对象的 center 接近画布中心（误差 ≤ 2px）
2. 验证缩放后宽或高至少达到 Canvas 的目标占比

**文件**: `apps/web/tests/e2e/design-lab-4.0-stage2-product-image.spec.ts`

---

### 任务5：DevTools 验证 📸

**目标**: 使用 Chrome DevTools 截图验证底图居中 cover

**验证内容**:
1. 截图显示底图在 Canvas 中心
2. 底图填满 Canvas 区域（cover）

---

## 四、代码修改规范

### 4.1 注释和时间戳

所有修改必须添加注释和时间戳：
```typescript
// [2025-12-20 00:15:00] 阶段2：实现 applyCoverCentered() 函数
```

### 4.2 函数实现示例

```typescript
/**
 * 应用 cover 居中布局（阶段2：单一真理的幂等布局函数）
 * [2025-12-20 00:15:00] 阶段2：实现底图居中 cover 布局
 * 
 * @param image - Fabric Image 对象
 * @param canvasWidth - Canvas 逻辑宽度（1000）
 * @param canvasHeight - Canvas 逻辑高度（1200）
 * @param fabricModule - Fabric 模块（用于类型）
 */
function applyCoverCentered(params: {
  image: fabric.Image;
  canvasWidth: number;
  canvasHeight: number;
  fabricModule: typeof fabric;
}): void {
  const { image, canvasWidth, canvasHeight } = params;
  
  // [2025-12-20 00:15:00] 阶段2：设置 origin 为 center
  image.set({
    originX: 'center',
    originY: 'center',
  });
  
  // [2025-12-20 00:15:00] 阶段2：计算 cover scale
  const imgWidth = image.width || 1;
  const imgHeight = image.height || 1;
  const scaleX = canvasWidth / imgWidth;
  const scaleY = canvasHeight / imgHeight;
  const scale = Math.max(scaleX, scaleY); // cover: 使用较大值
  
  // [2025-12-20 00:15:00] 阶段2：设置位置为中心，禁止回退
  image.set({
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    scaleX: scale,
    scaleY: scale,
  });
  
  image.setCoords();
}
```

---

## 五、验收标准

### 5.1 DevTools 验证

- [ ] 截图显示底图在 Canvas 中心
- [ ] 底图填满 Canvas 区域（cover，允许裁切边缘）

### 5.2 Playwright 验证

- [ ] 底图对象的中心接近画布中心（误差 ≤ 2px）
- [ ] 缩放后宽或高至少达到 Canvas 的目标占比（100%）

---

## 六、风险评估

### 6.1 低风险

- ✅ 只修改布局函数，不影响其他功能
- ✅ cover 策略是标准实现

### 6.2 需要注意

- ⚠️ 需要确认 `calculateImageFit()` 当前实现，避免重复逻辑
- ⚠️ 需要确保没有其他地方依赖旧的布局逻辑

---

**计划状态**: 📋 准备实施  
**下一步**: 检查当前实现，确认需要修改的部分
