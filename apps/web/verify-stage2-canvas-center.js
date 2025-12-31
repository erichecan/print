/**
 * 阶段2验证脚本：检查底图是否在绿色边框区域（.dl-canvas）的中心
* 验证底图中心与 .dl-canvas section 中心是否重合
 * 
 * 使用方法：在浏览器控制台运行
 */

(function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 [阶段2验证] 检查底图是否在绿色边框区域中心');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 1. 获取绿色边框区域（.dl-canvas section）
  const canvasSection = document.querySelector('.dl-canvas');
  if (!canvasSection) {
    console.error('❌ 未找到 .dl-canvas section');
    return;
  }
  
  const sectionRect = canvasSection.getBoundingClientRect();
  console.log('\n📐 绿色边框区域（.dl-canvas）尺寸:');
  console.log(`   宽度: ${sectionRect.width.toFixed(2)}px`);
  console.log(`   高度: ${sectionRect.height.toFixed(2)}px`);
  console.log(`   位置: (${sectionRect.left.toFixed(2)}, ${sectionRect.top.toFixed(2)})`);
  
  // 绿色边框区域的中心（DOM 坐标系）
  const sectionCenterX = sectionRect.left + sectionRect.width / 2;
  const sectionCenterY = sectionRect.top + sectionRect.height / 2;
  console.log(`   中心点: (${sectionCenterX.toFixed(2)}, ${sectionCenterY.toFixed(2)})`);
  
  // 2. 获取 Fabric Canvas 元素
  const canvasElement = canvasSection.querySelector('canvas');
  if (!canvasElement) {
    console.error('❌ 未找到 Canvas 元素');
    return;
  }
  
  const canvasRect = canvasElement.getBoundingClientRect();
  console.log('\n📐 Fabric Canvas 元素尺寸:');
  console.log(`   DOM 宽度: ${canvasRect.width.toFixed(2)}px`);
  console.log(`   DOM 高度: ${canvasRect.height.toFixed(2)}px`);
  console.log(`   位置: (${canvasRect.left.toFixed(2)}, ${canvasRect.top.toFixed(2)})`);
  
  // 3. 获取 Fabric Canvas 对象
  let fabricCanvas = null;
  if (window.fabricCanvas) {
    fabricCanvas = window.fabricCanvas;
  } else if (canvasElement.fabricCanvas) {
    fabricCanvas = canvasElement.fabricCanvas;
  } else {
    const allCanvases = document.querySelectorAll('canvas');
    for (let i = 0; i < allCanvases.length; i++) {
      const canvas = allCanvases[i];
      if (canvas.fabricCanvas && canvas.fabricCanvas.getObjects) {
        fabricCanvas = canvas.fabricCanvas;
        break;
      }
    }
  }
  
  if (!fabricCanvas || !fabricCanvas.getObjects) {
    console.error('❌ 无法访问 Fabric Canvas 对象');
    return;
  }
  
  // 4. 获取底图对象
  const objects = fabricCanvas.getObjects();
  const productImage = objects.find(function(obj) {
    const layerType = obj.data && obj.data.layerType;
    const name = obj.name || '';
    const stableKey = obj.data && obj.data.stableKey;
    return layerType === 'product-image' || 
           name.indexOf('product-image') >= 0 ||
           (stableKey && stableKey.indexOf('product-image') >= 0);
  });
  
  if (!productImage) {
    console.error('❌ 未找到底图对象');
    console.log('   对象列表:', objects.map(function(o) {
      return { type: o.type, name: o.name || 'unnamed', layerType: (o.data && o.data.layerType) || 'unknown' };
    }));
    return;
  }
  
  // 5. Fabric Canvas 的逻辑尺寸
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 1200;
  
  // 底图在 Fabric 逻辑坐标系中的位置和尺寸
  const imageLogicalLeft = productImage.left || 0;
  const imageLogicalTop = productImage.top || 0;
  const imageWidth = productImage.width || 0;
  const imageHeight = productImage.height || 0;
  const scaleX = productImage.scaleX || 1;
  const scaleY = productImage.scaleY || 1;
  const scaledWidth = imageWidth * scaleX;
  const scaledHeight = imageHeight * scaleY;
  
  console.log('\n📐 底图在 Fabric 逻辑坐标系中:');
  console.log(`   位置: (${imageLogicalLeft.toFixed(2)}, ${imageLogicalTop.toFixed(2)})`);
  console.log(`   原始尺寸: ${imageWidth.toFixed(2)} × ${imageHeight.toFixed(2)}`);
  console.log(`   缩放比例: ${scaleX.toFixed(4)} × ${scaleY.toFixed(4)}`);
  console.log(`   缩放后尺寸: ${scaledWidth.toFixed(2)} × ${scaledHeight.toFixed(2)}`);
  
  // 6. 计算逻辑坐标到 DOM 坐标的转换
  const logicalToDOMScaleX = canvasRect.width / CANVAS_WIDTH;
  const logicalToDOMScaleY = canvasRect.height / CANVAS_HEIGHT;
  
  console.log('\n🔄 坐标转换:');
  console.log(`   逻辑→DOM 缩放: X=${logicalToDOMScaleX.toFixed(4)}, Y=${logicalToDOMScaleY.toFixed(4)}`);
  
  // 7. 底图在 DOM 坐标系中的位置和尺寸
  // 注意：由于 origin 是 center，left/top 就是中心点
  const imageCenterRelativeToCanvasX = imageLogicalLeft * logicalToDOMScaleX;
  const imageCenterRelativeToCanvasY = imageLogicalTop * logicalToDOMScaleY;
  
  const imageDOMCenterX = canvasRect.left + imageCenterRelativeToCanvasX;
  const imageDOMCenterY = canvasRect.top + imageCenterRelativeToCanvasY;
  
  const imageDOMWidth = scaledWidth * logicalToDOMScaleX;
  const imageDOMHeight = scaledHeight * logicalToDOMScaleY;
  
  console.log('\n📐 底图在 DOM 坐标系中:');
  console.log(`   中心点: (${imageDOMCenterX.toFixed(2)}, ${imageDOMCenterY.toFixed(2)})`);
  console.log(`   尺寸: ${imageDOMWidth.toFixed(2)} × ${imageDOMHeight.toFixed(2)}`);
  
  // 8. 比较中心点
  const centerDiffX = imageDOMCenterX - sectionCenterX;
  const centerDiffY = imageDOMCenterY - sectionCenterY;
  const centerDistance = Math.sqrt(centerDiffX * centerDiffX + centerDiffY * centerDiffY);
  
  console.log('\n🎯 中心点比较:');
  console.log(`   绿色边框区域中心: (${sectionCenterX.toFixed(2)}, ${sectionCenterY.toFixed(2)})`);
  console.log(`   底图中心: (${imageDOMCenterX.toFixed(2)}, ${imageDOMCenterY.toFixed(2)})`);
  console.log(`   差异: X=${centerDiffX.toFixed(2)}px, Y=${centerDiffY.toFixed(2)}px`);
  console.log(`   距离: ${centerDistance.toFixed(2)}px`);
  
  // 9. 验证结果
  const TOLERANCE = 2;
  const isCentered = centerDistance <= TOLERANCE;
  
  console.log('\n✅ 验证结果:');
  console.log(`   ${isCentered ? '✅ 通过' : '❌ 失败'}: 中心点${isCentered ? '重合' : '不重合'} (允许误差 ≤ ${TOLERANCE}px)`);
  
  if (!isCentered) {
    console.log('\n⚠️  问题分析:');
    console.log(`   底图中心与绿色边框区域中心相差 ${centerDistance.toFixed(2)}px`);
    console.log(`   需要调整底图位置以使其在绿色边框区域中心`);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  return {
    section: {
      width: sectionRect.width,
      height: sectionRect.height,
      center: { x: sectionCenterX, y: sectionCenterY },
    },
    image: {
      domCenter: { x: imageDOMCenterX, y: imageDOMCenterY },
      domSize: { width: imageDOMWidth, height: imageDOMHeight },
    },
    diff: {
      x: centerDiffX,
      y: centerDiffY,
      distance: centerDistance,
    },
    isCentered: isCentered,
  };
})();
