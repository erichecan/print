# Design Lab 4.0 阶段2：修复验证指南

**修复时间**: 2025-12-20 00:55:00  
**问题**: 底图没有在绿色边框区域（.dl-canvas section）的中心  
**状态**: ✅ 代码已修复

---

## 一、修复说明

### 1.1 问题

之前的 `applyCoverCentered()` 函数直接使用 Fabric Canvas 逻辑中心 (500, 600)，没有考虑绿色边框区域（`.dl-canvas` DOM 元素）的实际中心位置。

### 1.2 修复

已修复 `applyCoverCentered()` 函数，添加了计算 `.dl-canvas` section 中心在 Fabric 逻辑坐标系中位置的逻辑，确保底图位于绿色边框区域的中心。

---

## 二、验证步骤

### 2.1 打开页面

1. 访问 `http://localhost:3001/design-lab`
2. 等待页面加载完成
3. 等待 Canvas 初始化完成（约 3-5 秒）

### 2.2 在浏览器控制台运行验证脚本

打开浏览器控制台（F12），复制并运行以下脚本：

```javascript
// 获取绿色边框区域（.dl-canvas section）
var canvasSection = document.querySelector('.dl-canvas');
if (!canvasSection) {
  console.error('未找到 .dl-canvas section');
} else {
  var sectionRect = canvasSection.getBoundingClientRect();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [阶段2修复验证] 检查底图是否在绿色边框区域中心');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📐 绿色边框区域（.dl-canvas）尺寸:');
  console.log('   宽度: ' + sectionRect.width.toFixed(2) + 'px');
  console.log('   高度: ' + sectionRect.height.toFixed(2) + 'px');
  console.log('   位置: (' + sectionRect.left.toFixed(2) + ', ' + sectionRect.top.toFixed(2) + ')');
  
  var sectionCenterX = sectionRect.left + sectionRect.width / 2;
  var sectionCenterY = sectionRect.top + sectionRect.height / 2;
  console.log('   中心点: (' + sectionCenterX.toFixed(2) + ', ' + sectionCenterY.toFixed(2) + ')');
  
  // 获取 Canvas 元素
  var canvasElement = canvasSection.querySelector('canvas');
  if (!canvasElement) {
    console.error('未找到 Canvas 元素');
  } else {
    var canvasRect = canvasElement.getBoundingClientRect();
    console.log('\n📐 Fabric Canvas 元素尺寸:');
    console.log('   DOM 宽度: ' + canvasRect.width.toFixed(2) + 'px');
    console.log('   DOM 高度: ' + canvasRect.height.toFixed(2) + 'px');
    console.log('   位置: (' + canvasRect.left.toFixed(2) + ', ' + canvasRect.top.toFixed(2) + ')');
    
    // 获取 Fabric Canvas 对象
    var fabricCanvas = window.fabricCanvas || canvasElement.fabricCanvas;
    if (!fabricCanvas || !fabricCanvas.getObjects) {
      console.error('无法访问 Fabric Canvas 对象');
    } else {
      var objects = fabricCanvas.getObjects();
      var productImage = null;
      for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var layerType = obj.data && obj.data.layerType;
        var name = obj.name || '';
        if (layerType === 'product-image' || name.indexOf('product-image') >= 0) {
          productImage = obj;
          break;
        }
      }
      
      if (!productImage) {
        console.error('未找到底图对象');
      } else {
        var CANVAS_WIDTH = 1000;
        var CANVAS_HEIGHT = 1200;
        var imageLogicalLeft = productImage.left || 0;
        var imageLogicalTop = productImage.top || 0;
        var logicalToDOMScaleX = canvasRect.width / CANVAS_WIDTH;
        var logicalToDOMScaleY = canvasRect.height / CANVAS_HEIGHT;
        var imageCenterRelativeToCanvasX = imageLogicalLeft * logicalToDOMScaleX;
        var imageCenterRelativeToCanvasY = imageLogicalTop * logicalToDOMScaleY;
        var imageDOMCenterX = canvasRect.left + imageCenterRelativeToCanvasX;
        var imageDOMCenterY = canvasRect.top + imageCenterRelativeToCanvasY;
        
        var imageWidth = productImage.width || 0;
        var imageHeight = productImage.height || 0;
        var scaleX = productImage.scaleX || 1;
        var scaleY = productImage.scaleY || 1;
        var scaledWidth = imageWidth * scaleX;
        var scaledHeight = imageHeight * scaleY;
        var imageDOMWidth = scaledWidth * logicalToDOMScaleX;
        var imageDOMHeight = scaledHeight * logicalToDOMScaleY;
        
        console.log('\n📐 底图在 DOM 坐标系中:');
        console.log('   中心点: (' + imageDOMCenterX.toFixed(2) + ', ' + imageDOMCenterY.toFixed(2) + ')');
        console.log('   尺寸: ' + imageDOMWidth.toFixed(2) + ' × ' + imageDOMHeight.toFixed(2));
        
        var centerDiffX = imageDOMCenterX - sectionCenterX;
        var centerDiffY = imageDOMCenterY - sectionCenterY;
        var centerDistance = Math.sqrt(centerDiffX * centerDiffX + centerDiffY * centerDiffY);
        var isCentered = centerDistance <= 2;
        
        console.log('\n🎯 中心点比较:');
        console.log('   绿色边框区域中心: (' + sectionCenterX.toFixed(2) + ', ' + sectionCenterY.toFixed(2) + ')');
        console.log('   底图中心: (' + imageDOMCenterX.toFixed(2) + ', ' + imageDOMCenterY.toFixed(2) + ')');
        console.log('   差异: X=' + centerDiffX.toFixed(2) + 'px, Y=' + centerDiffY.toFixed(2) + 'px');
        console.log('   距离: ' + centerDistance.toFixed(2) + 'px');
        console.log('\n✅ 验证结果:');
        console.log('   ' + (isCentered ? '✅ 通过' : '❌ 失败') + ': 中心点' + (isCentered ? '重合' : '不重合') + ' (允许误差 ≤ 2px)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
    }
  }
}
```

### 2.3 预期结果

验证脚本会输出：
- 绿色边框区域的尺寸和中心点
- 底图在 DOM 中的中心点和尺寸
- 两个中心点的差异和距离
- 验证结果（通过/失败）

**预期**: 中心点距离应该 ≤ 2px

---

## 三、代码修改详情

### 3.1 修改的函数

**文件**: `apps/web/src/design/canvas/layers/productImageLayer.ts`

**函数**: `applyCoverCentered()` (第62-175行)

**关键修改**:
1. ✅ 添加 `canvas` 参数
2. ✅ 添加计算 `.dl-canvas` section 中心的逻辑
3. ✅ 使用计算出的 section 中心位置

### 3.2 更新调用

**已更新 3 处调用**，都添加了 `canvas` 参数。

---

**修复状态**: ✅ 代码已修复  
**验证方法**: 使用浏览器控制台运行验证脚本  
**下一步**: 重新加载页面并验证修复效果
