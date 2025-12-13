# Design Lab 底图居中铺满验证指南

**创建时间**: 2025-12-19 22:15:00

## 一、自动日志验证

### 控制台日志输出

每次底图加载完成后，会在浏览器Console中自动输出详细的验证报告：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 [ProductImageLayer] 底图布局验证报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 视图信息:
   视图类型: front
   画布逻辑尺寸: 1000.00 × 1200.00

📍 位置信息:
   画布逻辑中心: (500.00, 600.00)
   底图位置: (500.00, 600.00)
   位置误差: left=0.00px, top=0.00px
   原点设置: originX='center', originY='center'
   ✅ 居中验证: ✓ 通过（误差≤2px）

📐 尺寸信息:
   原始尺寸: 1000.00 × 1200.00
   缩放比例: 0.9000
   缩放后尺寸: 900.00 × 1080.00
   目标安全区: 900.00 × 1080.00
   尺寸占比: 宽度=100.0%, 高度=100.0%
   SafeArea配置: 宽度=90%, 高度=90%
   ✅ 铺满验证: ✓ 通过（至少一边≥100%）

🎨 其他属性:
   可选中: ✓ 否（正确）
   可交互: ✓ 否（正确）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 最终验证: ✅ 全部通过
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 验证标准

- ✅ **居中验证通过**：位置误差 ≤ 2px
- ✅ **铺满验证通过**：至少一边尺寸占比 ≥ 100%
- ✅ **原点正确**：originX='center', originY='center'
- ✅ **不可选中**：selectable=false, evented=false

## 二、画布视觉标记验证

### 启用方法

**方法1：开发环境（自动启用）**
- 开发环境下会自动显示坐标标记

**方法2：生产环境（手动启用）**
1. 打开Design Lab页面
2. 打开浏览器Console（F12）
3. 执行以下代码：
```javascript
window.__DEBUG_PRODUCT_IMAGE__ = true;
location.reload();
```

### 标记说明

画布上会显示以下标记：

1. **红色圆圈 + "中心"文本**
   - 位置：画布逻辑中心 (500, 600)
   - 显示坐标：(500, 600)

2. **蓝色圆圈 + "底图"文本**
   - 位置：底图实际位置
   - 显示坐标：底图的left/top值
   - 显示误差：与中心的差值

3. **绿色文本（左上角）**
   - 显示：缩放后尺寸（例如：900×1080）
   - 显示：尺寸占比（例如：100%×100%）

### 视觉验证步骤

1. **打开Design Lab页面**
   ```
   https://print-main-frontend-234065158862.us-central1.run.app/design-lab
   ```

2. **启用标记**（如果是生产环境）
   ```javascript
   window.__DEBUG_PRODUCT_IMAGE__ = true;
   location.reload();
   ```

3. **检查标记**
   - 红色标记应该与蓝色标记重叠（或非常接近，误差≤2px）
   - 如果红色和蓝色标记距离很远，说明底图未居中
   - 绿色文本显示的占比应该接近或超过100%

4. **切换视图验证**
   - 切换到Back视图，检查标记是否仍正确
   - 切换到Sleeve视图，检查标记是否仍正确
   - 每个视图的标记应该都显示底图在中心

## 三、手动验证代码

### 快速验证脚本

在浏览器Console中执行以下代码，获取详细的验证信息：

```javascript
(function() {
  const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }
  
  const objects = canvas.getObjects();
  const productImage = objects.find(obj => obj.name?.startsWith('product-image-'));
  
  if (!productImage) {
    console.error('Product image not found');
    return;
  }
  
  const vpt = canvas.viewportTransform;
  let logicalCanvasWidth = canvas.width || 1000;
  let logicalCanvasHeight = canvas.height || 1200;
  
  if (vpt && (vpt[0] !== 1 || vpt[3] !== 1)) {
    logicalCanvasWidth = (canvas.width || 1000) / vpt[0];
    logicalCanvasHeight = (canvas.height || 1200) / vpt[3];
  }
  
  const centerX = logicalCanvasWidth / 2;
  const centerY = logicalCanvasHeight / 2;
  const leftDiff = Math.abs((productImage.left || 0) - centerX);
  const topDiff = Math.abs((productImage.top || 0) - centerY);
  const isCentered = leftDiff <= 2 && topDiff <= 2;
  
  const scaleX = productImage.scaleX || 1;
  const scaleY = productImage.scaleY || 1;
  const actualWidth = (productImage.width || 0) * scaleX;
  const actualHeight = (productImage.height || 0) * scaleY;
  const targetWidth = logicalCanvasWidth * 0.9;
  const targetHeight = logicalCanvasHeight * 0.9;
  const widthRatio = actualWidth / targetWidth;
  const heightRatio = actualHeight / targetHeight;
  const isFull = widthRatio >= 1.0 || heightRatio >= 1.0;
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 手动验证报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('画布逻辑尺寸:', logicalCanvasWidth.toFixed(2), '×', logicalCanvasHeight.toFixed(2));
  console.log('画布逻辑中心:', `(${centerX.toFixed(2)}, ${centerY.toFixed(2)})`);
  console.log('底图位置:', `(${(productImage.left || 0).toFixed(2)}, ${(productImage.top || 0).toFixed(2)})`);
  console.log('位置误差:', `left=${leftDiff.toFixed(2)}px, top=${topDiff.toFixed(2)}px`);
  console.log('原点设置:', `originX='${productImage.originX}', originY='${productImage.originY}'`);
  console.log('居中验证:', isCentered ? '✅ 通过' : '❌ 失败');
  console.log('');
  console.log('缩放后尺寸:', `${actualWidth.toFixed(2)} × ${actualHeight.toFixed(2)}`);
  console.log('目标安全区:', `${targetWidth.toFixed(2)} × ${targetHeight.toFixed(2)}`);
  console.log('尺寸占比:', `宽度=${(widthRatio * 100).toFixed(1)}%, 高度=${(heightRatio * 100).toFixed(1)}%`);
  console.log('铺满验证:', isFull ? '✅ 通过' : '❌ 失败');
  console.log('');
  console.log('最终状态:', isCentered && isFull ? '✅ 全部通过' : '❌ 存在问题');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return {
    isCentered,
    isFull,
    leftDiff,
    topDiff,
    widthRatio,
    heightRatio,
  };
})();
```

## 四、验证检查清单

### 首次加载验证

- [ ] 打开Design Lab页面，等待底图加载
- [ ] 查看Console日志，确认"✅ 全部通过"
- [ ] 启用画布标记，确认红色和蓝色标记重叠
- [ ] 确认绿色文本显示的占比接近或超过100%

### 视图切换验证

- [ ] 切换到Back视图，检查标记是否仍正确
- [ ] 切换到Sleeve视图，检查标记是否仍正确（sleeve使用95%宽度）
- [ ] 切换回Front视图，检查标记是否仍正确

### Zoom退出验证

- [ ] 进入Zoom视图
- [ ] 退出Zoom视图
- [ ] 查看Console日志，确认"Zoom退出后布局恢复验证"显示"✅ 通过"
- [ ] 检查画布标记，确认底图仍居中

### 预期结果

所有验证都应该显示：
- ✅ 居中验证：✓ 通过（误差≤2px）
- ✅ 铺满验证：✓ 通过（至少一边≥100%）
- ✅ 原点正确：originX='center', originY='center'
- ✅ 不可选中：selectable=false, evented=false

## 五、问题排查

### 如果标记显示底图不在中心

1. 检查Console日志，查看具体误差值
2. 如果误差>2px，说明布局函数未正确应用
3. 检查是否有viewportTransform影响（zoom状态下）

### 如果尺寸占比不足100%

1. 检查safeArea配置是否正确（应该是0.9）
2. 检查cover模式是否正确应用
3. 对于sleeve视图，检查是否使用了0.95的宽度配置

### 如果标记不显示

1. 确认已启用`window.__DEBUG_PRODUCT_IMAGE__ = true`
2. 刷新页面
3. 检查Console是否有错误信息
