/**
 * Canvas Manager - Fabric.js 画布管理与三面切换
 * [2025-11-19 10:20:00] 封装 Fabric Canvas，管理三面画布、对象操作、背景层
 */
(function() {
  'use strict';

  let canvas = null;
  let backgroundImage = null;
  // [2025-01-27 22:20:00] 将画布尺寸从 900x700 调整为 1000x1200
  const CANVAS_WIDTH = 1000;
  const CANVAS_HEIGHT = 1200;
  const devicePixelRatio = window.devicePixelRatio || 1;

  // [2025-11-19 10:20:00] 初始化画布
  function initCanvas(canvasElementParam) {
    if (!window.fabric) {
      console.error('[CanvasManager] Fabric.js not loaded');
      return false;
    }

    canvas = new window.fabric.Canvas(canvasElementParam, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: 'transparent', // [2025-11-21 11:30:00] 改为透明，不遮挡产品图片
      preserveObjectStacking: true,
      selection: true,
      stateful: true
    });

    // [2025-11-19 10:20:00] 高 DPI 适配
    const scale = devicePixelRatio;
    
    // [2025-11-21 12:40:00] 设置画布实际尺寸（像素尺寸）和 CSS 尺寸
    // 实际尺寸 = 逻辑尺寸 * devicePixelRatio（用于高 DPI 渲染）
    // CSS 尺寸 = 逻辑尺寸（用于布局）
    canvas.setWidth(CANVAS_WIDTH * scale);
    canvas.setHeight(CANVAS_HEIGHT * scale);
    
    // [2025-11-21 12:40:00] 设置 CSS 尺寸为逻辑尺寸
    const canvasElement = canvas.getElement();
    if (canvasElement) {
      canvasElement.style.width = CANVAS_WIDTH + 'px';
      canvasElement.style.height = CANVAS_HEIGHT + 'px';
    }
    
    // [2025-11-21 12:50:00] 重要：不要设置 zoom，因为这会改变坐标系统
    // 高 DPI 适配应该通过 setWidth/setHeight 和 CSS 来实现，而不是 zoom
    // canvas.setZoom(scale); // 注释掉，避免坐标系统混乱
    
    // [2025-11-21 12:50:00] viewportTransform 应该初始化为单位矩阵，然后通过 CSS 处理高 DPI
    // 或者，如果需要 zoom，应该设置为 1，然后通过其他方式处理高 DPI
    canvas.setZoom(1); // [2025-11-21 12:50:00] 设置为 1，使用逻辑坐标系统
    
    // [2025-11-21 12:50:00] viewportTransform 初始化为单位矩阵 [1, 0, 0, 1, 0, 0]
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // [2025-11-21 12:50:00] 验证尺寸设置
    const actualWidth = canvas.width;
    const actualHeight = canvas.height;
    const expectedWidth = CANVAS_WIDTH;
    const expectedHeight = CANVAS_HEIGHT;
    
    console.log('[CanvasManager] ===== CANVAS INITIALIZATION =====');
    console.log('[CanvasManager] Logical size:', 'width=' + CANVAS_WIDTH + ', height=' + CANVAS_HEIGHT);
    console.log('[CanvasManager] Device pixel ratio:', devicePixelRatio);
    console.log('[CanvasManager] Expected canvas size:', 'width=' + expectedWidth + ', height=' + expectedHeight);
    console.log('[CanvasManager] Actual canvas size:', 'width=' + actualWidth + ', height=' + actualHeight);
    console.log('[CanvasManager] Size match:', (actualWidth === expectedWidth && actualHeight === expectedHeight) ? 'YES ✓' : 'NO ✗');
    console.log('[CanvasManager] CSS size:', 'width=' + (canvasElement?.style.width || 'N/A') + ', height=' + (canvasElement?.style.height || 'N/A'));
    console.log('[CanvasManager] Canvas zoom:', canvas.getZoom(), '(should be 1)');
    console.log('[CanvasManager] ViewportTransform:', canvas.viewportTransform, '(should be [1,0,0,1,0,0])');
    console.log('[CanvasManager] ===================================');
    
    // [2025-11-21 12:50:00] 如果尺寸不匹配，强制设置
    if (actualWidth !== expectedWidth || actualHeight !== expectedHeight) {
      console.warn('[CanvasManager] Canvas size mismatch! Forcing correct size...');
      canvas.setWidth(expectedWidth);
      canvas.setHeight(expectedHeight);
      if (canvasElement) {
        canvasElement.style.width = CANVAS_WIDTH + 'px';
        canvasElement.style.height = CANVAS_HEIGHT + 'px';
      }
      console.log('[CanvasManager] After force set:', 'width=' + canvas.width + ', height=' + canvas.height);
    }

    // [2025-11-19 10:20:00] 设置对象默认属性
    window.fabric.Object.prototype.set({
      borderColor: '#3b82f6',
      cornerColor: '#3b82f6',
      cornerSize: 10,
      transparentCorners: false,
      borderScaleFactor: 2,
      cornerStyle: 'circle',
      rotatingPointOffset: 40
    });

    // [2025-11-19 10:55:00] 支持多选（Ctrl/Cmd+Click）
    canvas.on('selection:created', (e) => {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 1) {
        // [2025-11-19 10:55:00] 多选时显示组合控制点
        canvas.renderAll();
      }
    });

    // [2025-11-19 10:55:00] Shift+拖拽等比缩放，Alt+拖拽从中心缩放
    canvas.on('object:scaling', (e) => {
      const obj = e.target;
      if (e.e && e.e.shiftKey) {
        // [2025-11-19 10:55:00] 等比缩放
        const scaleX = obj.scaleX;
        const scaleY = obj.scaleY;
        const scale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        obj.set({
          scaleX: scaleX < 0 ? -scale : scale,
          scaleY: scaleY < 0 ? -scale : scale
        });
      }
    });

    // [2025-11-19 10:20:00] 对象选择事件
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    
    // [2025-11-19 10:20:00] 对象变更事件
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:rotating', handleObjectRotating);

    // [2025-11-19 10:55:00] 对齐吸附与参考线
    canvas.on('object:moving', handleObjectMovingWithSnap);
    canvas.on('object:moved', handleObjectMoved);

    // [2025-11-19 10:20:00] 加载当前面的背景图
    loadBackgroundForCurrentSide();
    
    // [2025-11-19 10:55:00] 加载当前面的数据
    loadSide(window.DesignLabStore.getCurrentSide());

    // [2025-01-28 05:05:00] 保存初始状态到历史栈（空画布状态）
    setTimeout(() => {
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }, 500);

    console.log('[CanvasManager] Canvas initialized');
    return true;
  }

  // [2025-11-21 11:20:00] 加载当前面的背景图（导出为全局函数）
  function loadBackgroundForCurrentSide() {
    if (!canvas) {
      console.warn('[CanvasManager] Cannot load background - canvas not initialized');
      return;
    }
    const store = window.DesignLabStore.getStore();
    const side = store.currentSide;
    const imageUrl = store.product.baseImages[side];

    if (!imageUrl) {
      console.warn('[CanvasManager] No image URL for side:', side);
      return;
    }

    // [2025-11-19 10:20:00] 移除旧背景
    if (backgroundImage) {
      canvas.remove(backgroundImage);
      backgroundImage = null;
    }
    
    // [2025-11-21 11:40:00] 先使用原生 Image 对象加载图片
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // [2025-11-21 11:40:00] 设置超时
    let timeoutId = setTimeout(() => {
      console.error('[CanvasManager] Image load timeout after 15 seconds');
      img.onload = null;
      img.onerror = null;
    }, 15000);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      // [2025-11-21 12:00:00] 将原生 Image 转换为 Fabric Image
      const fabricImg = new window.fabric.Image(img, {
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'background',
        originX: 'left',
        originY: 'top'
      });
      
      // [2025-11-21 12:00:00] 产品图片占据画布中间约 65% 宽、75% 高的区域
      const targetWidth = CANVAS_WIDTH * 0.65;
      const targetHeight = CANVAS_HEIGHT * 0.75;
      
      // [2025-11-21 12:00:00] 计算缩放比例，保持宽高比
      const scaleX = targetWidth / fabricImg.width;
      const scaleY = targetHeight / fabricImg.height;
      const scale = Math.min(scaleX, scaleY);
      fabricImg.scale(scale);
      
      // [2025-11-21 12:30:00] 居中图片
      const scaledWidth = fabricImg.width * scale;
      const scaledHeight = fabricImg.height * scale;
      const left = CANVAS_WIDTH / 2 - scaledWidth / 2;
      const top = CANVAS_HEIGHT / 2 - scaledHeight / 2;
      
      fabricImg.set({ left, top });
      fabricImg.setCoords();
      
      // [2025-11-19 10:20:00] 移除旧背景
      if (backgroundImage) {
        canvas.remove(backgroundImage);
        backgroundImage = null;
      }
      
      // [2025-11-21 11:50:00] 先添加到画布
      canvas.add(fabricImg);
      
      // [2025-11-21 11:50:00] 移动到最底层（兼容不同版本的 Fabric.js）
      try {
        if (typeof canvas.sendToBack === 'function') {
          canvas.sendToBack(fabricImg);
        } else if (typeof canvas.sendObjectToBack === 'function') {
          canvas.sendObjectToBack(fabricImg);
        } else if (typeof canvas.moveTo === 'function') {
          canvas.moveTo(fabricImg, 0);
        } else {
          // [2025-11-21 11:50:00] 如果都没有，手动移动到最底层
          const objects = canvas.getObjects();
          const index = objects.indexOf(fabricImg);
          if (index > 0) {
            objects.splice(index, 1);
            objects.unshift(fabricImg);
            canvas.renderAll();
          }
        }
      } catch (e) {
        console.warn('[CanvasManager] Failed to send image to back:', e);
        // 即使失败也继续，因为图片已经添加了
      }
      
      backgroundImage = fabricImg;
      canvas.renderAll();
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('[CanvasManager] Failed to load background image:', error);
      console.error('[CanvasManager] Image URL:', imageUrl);
      console.error('[CanvasManager] This might be a CORS issue or invalid URL');
      
      // [2025-11-21 11:40:00] 尝试不使用 CORS 重新加载
      console.log('[CanvasManager] Retrying without CORS...');
      const imgRetry = new Image();
      imgRetry.onload = () => {
        const fabricImg = new window.fabric.Image(imgRetry, {
          selectable: false,
          evented: false,
          excludeFromExport: true,
          name: 'background',
          originX: 'left',
          originY: 'top'
        });
        
        // [2025-11-21 12:00:00] 使用相同的缩放逻辑
        const targetWidth = CANVAS_WIDTH * 0.65;
        const targetHeight = CANVAS_HEIGHT * 0.75;
        const scaleX = targetWidth / fabricImg.width;
        const scaleY = targetHeight / fabricImg.height;
        const scale = Math.min(scaleX, scaleY);
        fabricImg.scale(scale);
        
        // [2025-11-21 12:00:00] 居中图片（使用 left/top origin）
        const scaledWidth = fabricImg.width * scale;
        const scaledHeight = fabricImg.height * scale;
        const left = (CANVAS_WIDTH - scaledWidth) / 2;
        const top = (CANVAS_HEIGHT - scaledHeight) / 2;
        
        fabricImg.set({
          left: left,
          top: top
        });
        
        if (backgroundImage) {
          canvas.remove(backgroundImage);
        }
        canvas.add(fabricImg);
        
        // [2025-11-21 11:50:00] 兼容不同版本的 Fabric.js
        try {
          if (typeof canvas.sendToBack === 'function') {
            canvas.sendToBack(fabricImg);
          } else if (typeof canvas.sendObjectToBack === 'function') {
            canvas.sendObjectToBack(fabricImg);
          } else if (typeof canvas.moveTo === 'function') {
            canvas.moveTo(fabricImg, 0);
          }
        } catch (e) {
          console.warn('[CanvasManager] Failed to send image to back (retry):', e);
        }
        
        backgroundImage = fabricImg;
        canvas.renderAll();
        console.log('[CanvasManager] Image loaded successfully without CORS');
      };
      imgRetry.onerror = () => {
        console.error('[CanvasManager] Retry also failed. Image URL may be invalid or blocked.');
      };
      imgRetry.src = imageUrl;
    };
    
    // [2025-11-21 11:40:00] 开始加载图片
    img.src = imageUrl;
  }

  // [2025-11-19 11:30:00] 切换画布面（保存当前面 canvas.toDatalessJSON() + 缩略图 toDataURL({multiplier:0.2})）
  function switchSide(side) {
    if (!canvas) return false;

    const store = window.DesignLabStore;
    const currentSide = store.getCurrentSide();

    // [2025-11-19 11:30:00] 保存当前面的数据
    if (currentSide !== side) {
      // [2025-11-19 11:30:00] 保存当前面数据（在切换前）：canvas.toDatalessJSON() + 缩略图
      const currentObjects = canvas.getObjects().filter(obj => obj.name !== 'background');
      const currentData = canvas.toDatalessJSON(currentObjects);
      const currentThumb = canvas.toDataURL({ multiplier: 0.2, format: 'png' });
      store.setCurrentSideData(currentData, currentThumb);
      
      // [2025-11-19 11:30:00] 切换面
      if (store.setActiveSide(side)) {
        // [2025-11-19 11:30:00] 清空画布
        canvas.clear();
        backgroundImage = null;
        
        // [2025-11-19 11:30:00] 加载新面的背景（产品底图，selectable=false, evented=false, excludeFromExport=true）
        loadBackgroundForCurrentSide();
        
        // [2025-11-19 11:30:00] 加载新面的数据（若空，仅展示对应颜色的产品底图）
        loadSide(side);
        
        // [2025-11-19 11:30:00] 通知历史管理器切换面
        if (window.DesignLabHistory) {
          window.DesignLabHistory.switchSide(side);
          
          // [2025-01-28 05:05:00] 切换面后保存新面的初始状态
          setTimeout(() => {
            if (window.DesignLabHistory) {
              window.DesignLabHistory.saveState();
            }
          }, 300);
        }
        
        // [2025-11-19 11:30:00] 通知图层面板更新
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
        }
        
        // [2025-11-19 11:30:00] 隐藏参考线
        hideGuideLines();
        
        return true;
      }
    }
    return false;
  }

  // [2025-11-19 10:20:00] 保存当前面的数据
  function saveCurrentSide() {
    if (!canvas) return;
    
    const store = window.DesignLabStore;
    const side = store.getCurrentSide();
    
    // [2025-11-19 10:20:00] 获取画布 JSON（排除背景）
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const canvasJSON = canvas.toDatalessJSON(objects);
    
    // [2025-11-19 10:20:00] 生成缩略图
    const thumbDataURL = canvas.toDataURL({
      format: 'png',
      multiplier: 0.2,
      quality: 0.8
    });
    
    store.setCurrentSideData(canvasJSON, thumbDataURL);
  }

  // [2025-11-19 10:55:00] 自动保存（节流）
  let autoSaveTimer = null;
  function autoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveCurrentSide();
    }, 1200);
  }

  // [2025-11-19 10:20:00] 加载指定面的数据
  // [2025-01-28 05:30:00] 如果 sideData.canvasJSON 为 null，确保画布是空的
  function loadSide(side) {
    if (!canvas) return;
    
    const store = window.DesignLabStore;
    const sideData = store.getStore().sides[side];
    
    if (sideData && sideData.canvasJSON) {
      // [2025-11-19 10:55:00] 临时保存背景
      const bg = backgroundImage;
      
      canvas.loadFromJSON(sideData.canvasJSON, () => {
        // [2025-11-19 10:55:00] 恢复背景
        if (bg) {
          canvas.add(bg);
          // [2025-11-21 11:50:00] 兼容不同版本的 Fabric.js
          try {
            if (typeof canvas.sendToBack === 'function') {
              canvas.sendToBack(bg);
            } else if (typeof canvas.sendObjectToBack === 'function') {
              canvas.sendObjectToBack(bg);
            } else if (typeof canvas.moveTo === 'function') {
              canvas.moveTo(bg, 0);
            }
          } catch (e) {
            console.warn('[CanvasManager] Failed to send background to back:', e);
          }
          backgroundImage = bg;
        }
        canvas.renderAll();
        console.log('[CanvasManager] Loaded side:', side);
        
        // [2025-11-19 10:55:00] 更新图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
        }
      });
    } else {
      // [2025-01-28 05:30:00] 如果没有数据，清空画布（排除背景）
      const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
      objects.forEach(obj => canvas.remove(obj));
      canvas.renderAll();
      
      // [2025-11-19 10:55:00] 更新图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
    }
  }

  // [2025-11-19 10:20:00] 添加文本对象
  function addText(text = 'Your Text', options = {}) {
    if (!canvas) return null;

    const textObj = new window.fabric.IText(text, {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      fontSize: options.fontSize || 48,
      fontFamily: options.fontFamily || 'Arial',
      fill: options.fill || '#000000',
      fontWeight: options.fontWeight || 'normal',
      fontStyle: options.fontStyle || 'normal',
      underline: options.underline || false,
      name: `text_${Date.now()}`,
      originX: 'center',
      originY: 'center'
    });

      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
      
      // [2025-11-19 11:30:00] 通知图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      
      // [2025-11-19 12:00:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
      
      const currentSide = window.DesignLabStore.getCurrentSide();
      console.log('[CanvasManager] add:', { id: textObj.name, type: 'text', side: currentSide });
      return textObj;
  }

  // [2025-11-19 12:00:00] 添加图片对象（文件 > 4000px 等比压至最长边 2000px；添加到当前面 canvas，位置居中）
  function addImage(imageUrl, options = {}) {
    const timestamp = new Date().toISOString();
    console.log('[CanvasManager] ===== addImage CALLED =====', {
      timestamp,
      imageUrlLength: imageUrl?.length || 0,
      imageUrlPreview: imageUrl?.substring(0, 50) + '...',
      canvasExists: !!canvas,
      options
    });
    
    if (!canvas) {
      console.error('[CanvasManager] ❌ Canvas is not initialized', { timestamp });
      return null;
    }

    const fromUrlOptions = {};
    if (/^https?:/i.test(imageUrl)) {
      fromUrlOptions.crossOrigin = 'anonymous';
    }

    console.log('[CanvasManager] 📋 Loading image...', {
      timestamp: new Date().toISOString(),
      hasCrossOrigin: !!fromUrlOptions.crossOrigin,
      imageUrlType: imageUrl.startsWith('data:') ? 'data URL' : imageUrl.startsWith('http') ? 'HTTP URL' : 'other'
    });

    // [2025-01-28 00:35:00] 使用原生 Image 对象加载，然后转换为 Fabric Image
    // 这样可以更好地控制加载过程和错误处理
    const imgElement = new Image();
    
    // [2025-01-28 00:35:00] 设置 crossOrigin（如果需要）
    if (fromUrlOptions.crossOrigin) {
      imgElement.crossOrigin = fromUrlOptions.crossOrigin;
    }

    imgElement.onload = () => {
      const callbackTimestamp = new Date().toISOString();
      console.log('[CanvasManager] ✅ Native image loaded:', {
        width: imgElement.width,
        height: imgElement.height,
        timestamp: callbackTimestamp
      });

      try {
        // [2025-01-28 00:35:00] 将原生 Image 转换为 Fabric Image
        const fabricImage = new window.fabric.Image(imgElement);
        
        console.log('[CanvasManager] ✅ Fabric image created:', {
          width: fabricImage.width,
          height: fabricImage.height,
          timestamp: new Date().toISOString()
        });

        // [2025-01-28 04:30:00] 智能缩放：确保图片适合画布大小，与画布比例相当
        // [2025-01-28 04:35:00] 缩放比例改为 30%
        // 画布尺寸：1000x1200，比例约 5:6
        // 目标：图片缩放到画布的 30%，既能看清又不会太大
        
        const originalWidth = fabricImage.width;
        const originalHeight = fabricImage.height;
        
        console.log('[CanvasManager] ===== IMAGE SCALING CALCULATION START =====', {
          originalWidth,
          originalHeight,
          canvasWidth: CANVAS_WIDTH,
          canvasHeight: CANVAS_HEIGHT,
          timestamp: new Date().toISOString()
        });
        
        // [2025-01-28 04:35:00] 计算画布的可用区域（30% 的画布大小，留边距）
        const SCALE_RATIO = 0.3; // 30%
        const targetMaxWidth = CANVAS_WIDTH * SCALE_RATIO;  // 300px
        const targetMaxHeight = CANVAS_HEIGHT * SCALE_RATIO; // 360px
        
        // [2025-01-28 04:30:00] 计算缩放比例，确保图片既能完整显示，又不会超出目标区域
        const scaleX = targetMaxWidth / originalWidth;
        const scaleY = targetMaxHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY, 1); // 不超过原始大小，只缩小不放大

        // [2025-01-28 04:30:00] 应用缩放
        fabricImage.scale(scale);

        // [2025-11-19 12:00:00] 位置居中
        const left = options.left !== undefined ? options.left : CANVAS_WIDTH / 2;
        const top = options.top !== undefined ? options.top : CANVAS_HEIGHT / 2;

        fabricImage.set({
          left: left,
          top: top,
          originX: 'center',
          originY: 'center',
          name: `image_${Date.now()}`
        });

        console.log('[CanvasManager] 📋 Image properties after setting:', {
          left: fabricImage.left,
          top: fabricImage.top,
          width: fabricImage.width,
          height: fabricImage.height,
          scaleX: fabricImage.scaleX,
          scaleY: fabricImage.scaleY,
          originX: fabricImage.originX,
          originY: fabricImage.originY,
          timestamp: new Date().toISOString()
        });

        console.log('[CanvasManager] 📋 Adding image to canvas...', {
          timestamp: new Date().toISOString()
        });
        
        canvas.add(fabricImage);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
        
        // [2025-01-28 04:35:00] 验证图片是否在画布内
        const imageBounds = fabricImage.getBoundingRect();
        const isWithinCanvas = 
          imageBounds.left >= 0 && 
          imageBounds.top >= 0 && 
          imageBounds.left + imageBounds.width <= CANVAS_WIDTH &&
          imageBounds.top + imageBounds.height <= CANVAS_HEIGHT;
        
        console.log('[CanvasManager] ✅ Image added to canvas successfully:', {
          imageName: fabricImage.name,
          canvasObjectsCount: canvas.getObjects().length,
          imageBounds: {
            left: imageBounds.left.toFixed(2),
            top: imageBounds.top.toFixed(2),
            width: imageBounds.width.toFixed(2),
            height: imageBounds.height.toFixed(2)
          },
          isWithinCanvas: isWithinCanvas ? 'YES ✅' : 'NO ⚠️ (may extend beyond canvas)',
          canvasSize: `${CANVAS_WIDTH}x${CANVAS_HEIGHT}`,
          timestamp: new Date().toISOString()
        });
        
        // [2025-11-19 12:00:00] 通知图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
          console.log('[CanvasManager] ✅ Layers panel updated', {
            timestamp: new Date().toISOString()
          });
        } else {
          console.warn('[CanvasManager] ⚠️ DesignLabLayers not available', {
            timestamp: new Date().toISOString()
          });
        }
        
        // [2025-11-19 12:00:00] 记录历史
        if (window.DesignLabHistory) {
          window.DesignLabHistory.saveState();
        }
        
        const currentSide = window.DesignLabStore ? window.DesignLabStore.getCurrentSide() : 'front';
        console.log('[CanvasManager] ===== addImage SUCCESS =====', {
          id: fabricImage.name,
          type: 'image',
          side: currentSide,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[CanvasManager] ❌ Error creating Fabric image:', {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
        alert('创建图片对象失败：' + error.message);
      }
    };

    imgElement.onerror = (error) => {
      console.error('[CanvasManager] ❌ Error loading image:', {
        error: error,
        imageUrl: imageUrl.substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      alert('加载图片失败，请检查图片格式或重试');
    };

    // [2025-01-28 00:35:00] 开始加载图片
    imgElement.src = imageUrl;
    
    return null; // [2025-01-28 00:25:00] 异步函数，返回 null
  }

  // [2025-11-19 10:20:00] 添加形状对象
  function addShape(type, options = {}) {
    if (!canvas) return null;

    let shape = null;
    const left = options.left || CANVAS_WIDTH / 2;
    const top = options.top || CANVAS_HEIGHT / 2;

    switch (type) {
      case 'rect':
        shape = new window.fabric.Rect({
          left, top,
          width: 100,
          height: 100,
          fill: options.fill || '#3b82f6',
          name: `rect_${Date.now()}`
        });
        break;
      case 'circle':
        shape = new window.fabric.Circle({
          left, top,
          radius: 50,
          fill: options.fill || '#3b82f6',
          name: `circle_${Date.now()}`
        });
        break;
      case 'triangle':
        shape = new window.fabric.Triangle({
          left, top,
          width: 100,
          height: 100,
          fill: options.fill || '#3b82f6',
          name: `triangle_${Date.now()}`
        });
        break;
      case 'line':
        shape = new window.fabric.Line([left - 50, top, left + 50, top], {
          stroke: options.stroke || '#3b82f6',
          strokeWidth: 2,
          name: `line_${Date.now()}`
        });
        break;
      default:
        return null;
    }

    if (shape) {
      shape.set({ originX: 'center', originY: 'center' });
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      
      // [2025-11-19 10:20:00] 通知图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      
      // [2025-11-19 10:20:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
      
      const currentSide = window.DesignLabStore.getCurrentSide();
      console.log('[CanvasManager] add:', { id: shape.name, type: 'shape', side: currentSide });
    }
    
    return shape;
  }

  // [2025-11-19 10:20:00] 删除选中对象
  function removeSelected() {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.name !== 'background') {
          const currentSide = window.DesignLabStore.getCurrentSide();
          console.log('[CanvasManager] remove:', { id: obj.name, side: currentSide });
          canvas.remove(obj);
        }
      });
      canvas.discardActiveObject();
      canvas.renderAll();
      
      // [2025-11-19 10:20:00] 通知图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      
      // [2025-11-19 10:20:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:20:00] 选择对象
  function selectObject(objectId) {
    if (!canvas) return;
    
    const obj = canvas.getObjects().find(o => o.name === objectId);
    if (obj && obj.name !== 'background') {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }

  // [2025-11-19 10:20:00] 对象选择事件处理
  function handleSelection(e) {
    if (window.DesignLabLayers) {
      const activeObj = e.selected ? e.selected[0] : e.target;
      if (activeObj && activeObj.name !== 'background') {
        window.DesignLabLayers.selectLayer(activeObj.name);
      }
    }
  }

  // [2025-11-19 10:20:00] 选择清除事件处理
  function handleSelectionCleared() {
    if (window.DesignLabLayers) {
      window.DesignLabLayers.clearSelection();
    }
  }

  // [2025-11-19 10:20:00] 对象添加事件处理
  function handleObjectAdded(e) {
    if (window.DesignLabLayers) {
      window.DesignLabLayers.updateLayers();
    }
  }

  // [2025-11-19 10:20:00] 对象删除事件处理
  function handleObjectRemoved(e) {
    if (window.DesignLabLayers) {
      window.DesignLabLayers.updateLayers();
    }
  }

    // [2025-11-19 10:20:00] 对象修改事件处理（节流）
  let modifyTimer = null;
  function handleObjectModified() {
    if (modifyTimer) clearTimeout(modifyTimer);
    modifyTimer = setTimeout(() => {
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
      // [2025-11-19 10:55:00] 自动保存
      autoSave();
    }, 300);
  }

  // [2025-11-19 10:20:00] 对象移动事件处理（节流）
  let moveTimer = null;
  function handleObjectMoving() {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      canvas.renderAll();
    }, 16); // ~60fps
  }

  // [2025-11-19 10:20:00] 对象缩放事件处理（节流）
  let scaleTimer = null;
  function handleObjectScaling() {
    if (scaleTimer) clearTimeout(scaleTimer);
    scaleTimer = setTimeout(() => {
      canvas.renderAll();
    }, 16);
  }

  // [2025-11-19 10:20:00] 对象旋转事件处理（节流）
  let rotateTimer = null;
  function handleObjectRotating() {
    if (rotateTimer) clearTimeout(rotateTimer);
    rotateTimer = setTimeout(() => {
      canvas.renderAll();
    }, 16);
  }

  // [2025-11-19 10:55:00] 对齐吸附与参考线
  const SNAP_THRESHOLD = 8;
  let guideLines = [];

  function handleObjectMovingWithSnap(e) {
    const obj = e.target;
    if (!obj || obj.name === 'background') return;

    const snapPoints = getSnapPoints(obj);
    const snapped = snapToPoints(obj, snapPoints);
    
    if (snapped.snapped) {
      obj.set({
        left: snapped.left,
        top: snapped.top
      });
      showGuideLines(snapped.guides);
    } else {
      hideGuideLines();
    }
  }

  function handleObjectMoved() {
    hideGuideLines();
  }

  // [2025-11-19 10:55:00] 获取吸附点
  function getSnapPoints(obj) {
    const points = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // [2025-11-19 10:55:00] 画布中心线
    points.push({ x: centerX, y: 0, type: 'vertical' });
    points.push({ x: 0, y: centerY, type: 'horizontal' });

    // [2025-11-19 10:55:00] 其他对象的边和中心
    canvas.getObjects().forEach(otherObj => {
      if (otherObj === obj || otherObj.name === 'background') return;
      
      const bounds = otherObj.getBoundingRect();
      points.push({ x: bounds.left, y: bounds.top + bounds.height / 2, type: 'vertical' });
      points.push({ x: bounds.left + bounds.width, y: bounds.top + bounds.height / 2, type: 'vertical' });
      points.push({ x: bounds.left + bounds.width / 2, y: bounds.top, type: 'horizontal' });
      points.push({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height, type: 'horizontal' });
      points.push({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, type: 'both' });
    });

    return points;
  }

  // [2025-11-19 10:55:00] 吸附到点
  function snapToPoints(obj, snapPoints) {
    const bounds = obj.getBoundingRect();
    const objCenterX = bounds.left + bounds.width / 2;
    const objCenterY = bounds.top + bounds.height / 2;
    const guides = [];

    let snappedX = obj.left;
    let snappedY = obj.top;
    let hasSnapped = false;

    snapPoints.forEach(point => {
      const distX = Math.abs(objCenterX - point.x);
      const distY = Math.abs(objCenterY - point.y);

      if (point.type === 'vertical' || point.type === 'both') {
        if (distX < SNAP_THRESHOLD) {
          snappedX = point.x - bounds.width / 2;
          hasSnapped = true;
          guides.push({ type: 'vertical', x: point.x });
        }
      }

      if (point.type === 'horizontal' || point.type === 'both') {
        if (distY < SNAP_THRESHOLD) {
          snappedY = point.y - bounds.height / 2;
          hasSnapped = true;
          guides.push({ type: 'horizontal', y: point.y });
        }
      }
    });

    return {
      snapped: hasSnapped,
      left: snappedX,
      top: snappedY,
      guides
    };
  }

  // [2025-11-19 10:55:00] 显示参考线
  function showGuideLines(guides) {
    hideGuideLines();
    
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    
    const canvasRect = canvas.getElement().getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    
    guides.forEach(guide => {
      const line = document.createElement('div');
      line.className = 'dl-guide-line';
      
      if (guide.type === 'vertical') {
        // [2025-11-19 10:55:00] 垂直参考线：相对于画布位置
        const canvasX = guide.x * canvas.getZoom() + canvas.viewportTransform[4];
        line.style.left = (canvasX - wrapperRect.left + wrapper.scrollLeft) + 'px';
        line.style.top = '0';
        line.style.width = '1px';
        line.style.height = wrapper.clientHeight + 'px';
      } else {
        // [2025-11-19 10:55:00] 水平参考线：相对于画布位置
        const canvasY = guide.y * canvas.getZoom() + canvas.viewportTransform[5];
        line.style.left = '0';
        line.style.top = (canvasY - wrapperRect.top + wrapper.scrollTop) + 'px';
        line.style.width = wrapper.clientWidth + 'px';
        line.style.height = '1px';
      }
      
      line.style.position = 'absolute';
      line.style.background = '#3b82f6';
      line.style.pointerEvents = 'none';
      line.style.zIndex = '1000';
      
      wrapper.appendChild(line);
      guideLines.push(line);
    });
  }

  // [2025-11-19 10:55:00] 隐藏参考线
  function hideGuideLines() {
    guideLines.forEach(line => line.remove());
    guideLines = [];
  }

  // [2025-11-19 10:20:00] 导出画布为图片
  function exportCanvas(format = 'png', side = null, options = {}) {
    if (!canvas) return null;

    const targetSide = side || window.DesignLabStore.getCurrentSide();
    
    // [2025-11-19 10:20:00] 如果导出其他面，需要临时切换
    let switched = false;
    if (side && side !== window.DesignLabStore.getCurrentSide()) {
      saveCurrentSide();
      switchSide(side);
      switched = true;
    }

    let dataURL = null;

    if (format === 'svg') {
      // [2025-11-19 10:55:00] SVG 导出
      const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
      const svg = canvas.toSVG({ objects: objects });
      dataURL = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    } else {
      // [2025-11-19 10:20:00] PNG/JPG 导出
      dataURL = canvas.toDataURL({
        format: format,
        multiplier: options.multiplier || 2,
        quality: options.quality || 1,
        enableRetinaScaling: true
      });
    }

    // [2025-11-19 10:20:00] 恢复原面
    if (switched) {
      switchSide(window.DesignLabStore.getCurrentSide());
    }

    console.log('[CanvasManager] export:', { format, size: dataURL.length, side: targetSide });
    return dataURL;
  }

  // [2025-11-19 10:20:00] 获取画布实例
  function getCanvas() {
    return canvas;
  }

  // [2025-11-19 10:20:00] 导出全局 API
  // [2025-01-28 05:35:00] 添加获取和设置背景图的方法，供 history.js 使用
  window.DesignLabCanvas = {
    init: initCanvas,
    getCanvas,
    switchSide,
    saveCurrentSide,
    loadSide,
    addText,
    addImage,
    addShape,
    removeSelected,
    selectObject,
    exportCanvas,
    loadBackgroundForCurrentSide,
    autoSave,
    getBackgroundImage: () => backgroundImage,
    setBackgroundImage: (bg) => { backgroundImage = bg; }
  };
})();

