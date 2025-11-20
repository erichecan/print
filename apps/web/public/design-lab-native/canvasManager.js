/**
 * Canvas Manager - Fabric.js 画布管理与三面切换
 * [2025-11-19 10:20:00] 封装 Fabric Canvas，管理三面画布、对象操作、背景层
 */
(function() {
  'use strict';

  let canvas = null;
  let backgroundImage = null;
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 700;
  const devicePixelRatio = window.devicePixelRatio || 1;

  // [2025-11-19 10:20:00] 初始化画布
  function initCanvas(canvasElement) {
    if (!window.fabric) {
      console.error('[CanvasManager] Fabric.js not loaded');
      return false;
    }

    canvas = new window.fabric.Canvas(canvasElement, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f5f5f5',
      preserveObjectStacking: true,
      selection: true,
      stateful: true
    });

    // [2025-11-19 10:20:00] 高 DPI 适配
    const scale = devicePixelRatio;
    canvas.setDimensions({
      width: CANVAS_WIDTH * scale,
      height: CANVAS_HEIGHT * scale
    }, { cssOnly: true });
    canvas.setZoom(scale);

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

    console.log('[CanvasManager] Canvas initialized');
    return true;
  }

  // [2025-11-19 10:20:00] 加载当前面的背景图（导出为全局函数）
  function loadBackgroundForCurrentSide() {
    const store = window.DesignLabStore.getStore();
    const side = store.currentSide;
    const imageUrl = store.product.baseImages[side];

    // [2025-11-19 10:20:00] 移除旧背景
    if (backgroundImage) {
      canvas.remove(backgroundImage);
      backgroundImage = null;
    }

    // [2025-11-19 10:20:00] 加载新背景
    window.fabric.Image.fromURL(imageUrl, (img) => {
      img.set({
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'background'
      });
      img.scaleToWidth(CANVAS_WIDTH);
      img.scaleToHeight(CANVAS_HEIGHT);
      canvas.add(img);
      canvas.sendToBack(img);
      backgroundImage = img;
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
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
          canvas.sendToBack(bg);
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
      // [2025-11-19 10:55:00] 如果没有数据，只显示背景
      canvas.renderAll();
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
    if (!canvas) return null;

    const fromUrlOptions = {};
    if (/^https?:/i.test(imageUrl)) {
      fromUrlOptions.crossOrigin = 'anonymous';
    }

    window.fabric.Image.fromURL(imageUrl, (img) => {
      // [2025-11-19 12:00:00] 大图压缩：> 4000px 等比压至最长边 2000px
      if (img.width > 4000 || img.height > 4000) {
        const maxSize = 2000;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        img.scale(scale);
      }

      // [2025-11-19 12:00:00] 位置居中
      const left = options.left !== undefined ? options.left : CANVAS_WIDTH / 2;
      const top = options.top !== undefined ? options.top : CANVAS_HEIGHT / 2;

      img.set({
        left: left,
        top: top,
        originX: 'center',
        originY: 'center',
        name: `image_${Date.now()}`
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      
      // [2025-11-19 12:00:00] 通知图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      
      // [2025-11-19 12:00:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
      
      const currentSide = window.DesignLabStore.getCurrentSide();
      console.log('[CanvasManager] add:', { id: img.name, type: 'image', side: currentSide });
    }, fromUrlOptions);
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
    autoSave
  };
})();

