# Design Lab 底图居中修复 - 验证指南

**创建时间**: 2025-12-19 21:30:00

## 一、Chrome DevTools验证步骤

### 1. 打开Design Lab页面
```
http://localhost:3000/design-lab
或
https://print-main-frontend-234065158862.us-central1.run.app/design-lab
```

### 2. 验证底图居中（Console验证）

打开浏览器Console（F12），执行以下代码：

```javascript
// 等待页面加载完成（可能需要几秒）
setTimeout(() => {
  const canvas = window.fabricCanvas || window.DesignLabCanvas?.getCanvas();
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }
  
  const objects = canvas.getObjects();
  const productImage = objects.find(obj => 
    obj.name?.startsWith('product-image-') || obj.data?.layerType === 'product-image'
  );
  
  if (!productImage) {
    console.error('Product image not found');
    return;
  }
  
  // 获取画布逻辑尺寸（考虑viewportTransform）
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
  
  console.log('=== 底图居中验证 ===');
  console.log('画布逻辑尺寸:', logicalCanvasWidth, 'x', logicalCanvasHeight);
  console.log('画布逻辑中心:', centerX, ',', centerY);
  console.log('底图位置:', productImage.left, ',', productImage.top);
  console.log('原点:', productImage.originX, ',', productImage.originY);
  console.log('位置误差:', leftDiff, ',', topDiff);
  console.log('');
  console.log('验证结果:');
  console.log('  居中:', leftDiff <= 2 && topDiff <= 2 ? '✅' : '❌');
  console.log('  原点正确:', productImage.originX === 'center' && productImage.originY === 'center' ? '✅' : '❌');
}, 5000);
```

### 3. 验证切换视图后仍居中

在Console中执行：

```javascript
// 切换到back视图
const backBtn = document.querySelector('button[aria-label*="Back" i], .dl-sidebar__btn:has-text("Back")');
if (backBtn) {
  backBtn.click();
  
  // 等待2秒后检查
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
    
    console.log('Back视图 - 居中验证:', leftDiff <= 2 && topDiff <= 2 ? '✅' : '❌');
  }, 2000);
}
```

## 二、Playwright测试运行

运行测试：
```bash
npm run test:e2e -- tests/e2e/design-lab-product-image-size-position.spec.ts --project=chromium
```

### 测试用例

1. ✅ **底图应该严格居中（left/top等于画布中心，误差≤2px）**
   - 验证left/top等于画布逻辑中心
   - 验证originX/originY是'center'

2. ✅ **切换视图后底图仍应居中**
   - 切换到back视图验证
   - 切换回front视图验证

3. ✅ **底图尺寸应该达到80%×90%目标占比**
   - cover模式验证

4. ✅ **底图应该在最底层，不影响其他图层**
   - 验证selectable=false, evented=false
   - 验证在objects数组第一个位置

## 三、预期结果

### Console输出示例

```
=== 底图居中验证 ===
画布逻辑尺寸: 1000 x 1200
画布逻辑中心: 500 , 600
底图位置: 500 , 600
原点: center , center
位置误差: 0 , 0

验证结果:
  居中: ✅
  原点正确: ✅
```

### 视觉验证

- ✅ 底图在画布中央（不是左上角）
- ✅ 底图更大（占据画布主要区域）
- ✅ 切换视图后底图仍然居中
- ✅ 底图在所有其他图层之下

## 四、回归测试场景

1. **首次加载**：打开Design Lab页面，底图居中
2. **切换视图**：front → back → front，底图始终居中
3. **恢复snapshot**：刷新页面，底图居中
4. **zoom视图**（如果支持）：进入/退出zoom，底图居中

## 五、已知问题

无
