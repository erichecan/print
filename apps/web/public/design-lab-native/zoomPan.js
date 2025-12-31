/**
 * Zoom & Pan - 缩放与平移控制
* 实现画布视图缩放、平移、适配屏幕等功能
 */
(function() {
  'use strict';

  let isZoomMode = false;
  let isPanMode = false;
  let currentZoom = 1;
let devicePixelRatio = 1; // 保存 devicePixelRatio 用于计算
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.1;

// 初始化缩放控制
  function init() {
// 延迟初始化，确保 DesignLabCanvas 已经初始化
    if (!window.DesignLabCanvas) {
      console.warn('[ZoomPan] DesignLabCanvas not available yet, retrying...');
      setTimeout(init, 100);
      return;
    }
    
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) {
      console.warn('[ZoomPan] Canvas not available yet, retrying...');
      setTimeout(init, 100);
      return;
    }
    
// 获取 devicePixelRatio（现在不再需要，因为 zoom 始终为 1）
    devicePixelRatio = window.devicePixelRatio || 1;
    
// 初始化 currentZoom 为 1（100%），因为现在 zoom 就是用户缩放
    const actualZoom = canvas.getZoom();
currentZoom = actualZoom; // 直接使用，不再除以 devicePixelRatio
    updateZoomDisplay();

// 鼠标滚轮缩放（以指针为中心，10%-400%）
    canvas.on('mouse:wheel', (opt) => {
      if (isZoomMode || opt.e.ctrlKey || opt.e.metaKey) {
        const delta = opt.e.deltaY;
// 基于用户缩放值计算
        let userZoom = currentZoom;
        userZoom *= 0.999 ** delta;
        userZoom = Math.max(0.1, Math.min(4.0, userZoom)); // 10%-400%
        
// 以指针为中心缩放
        const pointer = canvas.getPointer(opt.e);
        canvas.zoomToPoint(pointer, userZoom);
        currentZoom = userZoom;
        updateZoomDisplay();
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

// 平移模式（Hand 工具：拖拽空白处平移）
    canvas.on('mouse:down', (opt) => {
      if (isPanMode && opt.target === null) {
        canvas.isDragging = true;
        canvas.selection = false;
        canvas.lastPosX = opt.e.clientX;
        canvas.lastPosY = opt.e.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (canvas.isDragging && isPanMode) {
// 使用 viewportTransform 平移（不影响对象几何）
        const vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - canvas.lastPosX;
        vpt[5] += opt.e.clientY - canvas.lastPosY;
        canvas.requestRenderAll();
        canvas.lastPosX = opt.e.clientX;
        canvas.lastPosY = opt.e.clientY;
      }
    });

    canvas.on('mouse:up', () => {
      canvas.isDragging = false;
      canvas.selection = true;
    });

// Esc 退出 Hand 模式
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isPanMode || isZoomMode) {
          setPanMode(false);
          setZoomMode(false);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });
  }

// 设置缩放值（视图缩放仅改变 viewportTransform，不影响对象几何及导出）
  function zoomTo(percent) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

// 直接使用用户缩放值，不需要乘以 devicePixelRatio
    const userZoom = Math.max(0.1, Math.min(4.0, percent / 100)); // 10%-400%
    
// 使用逻辑中心点
// 将画布尺寸从 900x700 调整为 1000x1200
    const CANVAS_WIDTH = 1000;
    const CANVAS_HEIGHT = 1200;
    const center = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2
    };
    
    canvas.zoomToPoint(center, userZoom);
canvas.renderAll(); // 确保重新渲染
    currentZoom = userZoom;
    updateZoomDisplay();
  }

// 放大
  function zoomIn() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

// 直接使用用户缩放值
    let userZoom = currentZoom;
    userZoom = Math.min(MAX_ZOOM, userZoom + ZOOM_STEP);
    
// 使用逻辑中心点
// 将画布尺寸从 900x700 调整为 1000x1200
    const CANVAS_WIDTH = 1000;
    const CANVAS_HEIGHT = 1200;
    const center = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2
    };
    
    canvas.zoomToPoint(center, userZoom);
canvas.renderAll(); // 确保重新渲染
    currentZoom = userZoom;
    updateZoomDisplay();
  }

// 缩小
  function zoomOut() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

// 直接使用用户缩放值
    let userZoom = currentZoom;
    userZoom = Math.max(MIN_ZOOM, userZoom - ZOOM_STEP);
    
// 使用逻辑中心点
// 将画布尺寸从 900x700 调整为 1000x1200
    const CANVAS_WIDTH = 1000;
    const CANVAS_HEIGHT = 1200;
    const center = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2
    };
    
    canvas.zoomToPoint(center, userZoom);
canvas.renderAll(); // 确保重新渲染
    currentZoom = userZoom;
    updateZoomDisplay();
  }

// 适配屏幕
  function fitToScreen() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

// 使用逻辑尺寸计算，而不是实际像素尺寸
    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const CANVAS_WIDTH = 900; // 逻辑宽度
    const CANVAS_HEIGHT = 700; // 逻辑高度

    const scaleX = wrapperWidth / CANVAS_WIDTH;
    const scaleY = wrapperHeight / CANVAS_HEIGHT;
    const userZoom = Math.min(scaleX, scaleY) * 0.9; // 留 10% 边距

// 使用逻辑中心点
    const center = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2
    };
    
    canvas.zoomToPoint(center, userZoom);
canvas.renderAll(); // 确保重新渲染
    currentZoom = userZoom;
    updateZoomDisplay();
  }

// 重置到 100%
  function resetZoom() {
    zoomTo(100);
  }

// 设置平移模式（Hand 工具）
  function setPanMode(enabled) {
    isPanMode = enabled;
    const canvas = window.DesignLabCanvas.getCanvas();
    if (canvas) {
      canvas.defaultCursor = enabled ? 'grab' : 'default';
      canvas.hoverCursor = enabled ? 'grab' : 'move';
      canvas.moveCursor = enabled ? 'grabbing' : 'move';
      canvas.selection = !enabled;
    }
  }
  
// 设置缩放模式
  function setZoomMode(enabled) {
    isZoomMode = enabled;
  }
  
// 切换缩放/平移模式（Zoom 按钮）
  function toggleZoomPanMode() {
    if (isPanMode) {
      setPanMode(false);
      setZoomMode(false);
    } else {
      setPanMode(true);
      setZoomMode(true);
    }
  }
  
// 切换平移模式（兼容旧 API）
  function togglePanMode() {
    toggleZoomPanMode();
  }

// 更新缩放显示
  function updateZoomDisplay() {
    const display = document.getElementById('zoom-value');
    if (display) {
      display.textContent = Math.round(currentZoom * 100) + '%';
    }
  }

// 获取当前缩放值
  function getZoom() {
    return currentZoom;
  }

// 导出全局 API
  window.DesignLabZoom = {
    init,
    zoomTo,
    zoomIn,
    zoomOut,
    fitToScreen,
    resetZoom,
    setPanMode,
    setZoomMode,
    toggleZoomPanMode,
    togglePanMode,
    getZoom: () => currentZoom,
    getCurrentZoom: () => currentZoom,
    updateZoomDisplay
  };
})();

