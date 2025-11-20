/**
 * Zoom & Pan - 缩放与平移控制
 * [2025-11-19 10:30:00] 实现画布视图缩放、平移、适配屏幕等功能
 */
(function() {
  'use strict';

  let isZoomMode = false;
  let isPanMode = false;
  let currentZoom = 1;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.1;

  // [2025-11-19 10:30:00] 初始化缩放控制
  function init() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

      // [2025-11-19 11:30:00] 鼠标滚轮缩放（以指针为中心，10%-400%）
    canvas.on('mouse:wheel', (opt) => {
      if (isZoomMode || opt.e.ctrlKey || opt.e.metaKey) {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        zoom = Math.max(0.1, Math.min(4.0, zoom)); // 10%-400%
        
        // [2025-11-19 11:30:00] 以指针为中心缩放
        const pointer = canvas.getPointer(opt.e);
        canvas.zoomToPoint(pointer, zoom);
        currentZoom = zoom;
        updateZoomDisplay();
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

    // [2025-11-19 11:30:00] 平移模式（Hand 工具：拖拽空白处平移）
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
        // [2025-11-19 11:30:00] 使用 viewportTransform 平移（不影响对象几何）
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

    // [2025-11-19 12:00:00] Esc 退出 Hand 模式
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

  // [2025-11-19 11:30:00] 设置缩放值（视图缩放仅改变 viewportTransform，不影响对象几何及导出）
  function zoomTo(percent) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const zoom = Math.max(0.1, Math.min(4.0, percent / 100)); // 10%-400%
    const center = canvas.getCenter();
    canvas.zoomToPoint(center, zoom);
    currentZoom = zoom;
    updateZoomDisplay();
  }

  // [2025-11-19 10:30:00] 放大
  function zoomIn() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    let zoom = canvas.getZoom();
    zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    const center = canvas.getCenter();
    canvas.zoomToPoint(center, zoom);
    currentZoom = zoom;
    updateZoomDisplay();
  }

  // [2025-11-19 10:30:00] 缩小
  function zoomOut() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    let zoom = canvas.getZoom();
    zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    const center = canvas.getCenter();
    canvas.zoomToPoint(center, zoom);
    currentZoom = zoom;
    updateZoomDisplay();
  }

  // [2025-11-19 10:30:00] 适配屏幕
  function fitToScreen() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;

    const wrapperWidth = wrapper.clientWidth;
    const wrapperHeight = wrapper.clientHeight;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const scaleX = wrapperWidth / canvasWidth;
    const scaleY = wrapperHeight / canvasHeight;
    const zoom = Math.min(scaleX, scaleY) * 0.9; // 留 10% 边距

    const center = canvas.getCenter();
    canvas.zoomToPoint(center, zoom);
    currentZoom = zoom;
    updateZoomDisplay();
  }

  // [2025-11-19 10:30:00] 重置到 100%
  function resetZoom() {
    zoomTo(100);
  }

  // [2025-11-19 11:30:00] 设置平移模式（Hand 工具）
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
  
  // [2025-11-19 11:30:00] 设置缩放模式
  function setZoomMode(enabled) {
    isZoomMode = enabled;
  }
  
  // [2025-11-19 11:30:00] 切换缩放/平移模式（Zoom 按钮）
  function toggleZoomPanMode() {
    if (isPanMode) {
      setPanMode(false);
      setZoomMode(false);
    } else {
      setPanMode(true);
      setZoomMode(true);
    }
  }
  
  // [2025-11-19 11:30:00] 切换平移模式（兼容旧 API）
  function togglePanMode() {
    toggleZoomPanMode();
  }

  // [2025-11-19 10:30:00] 更新缩放显示
  function updateZoomDisplay() {
    const display = document.getElementById('zoom-value');
    if (display) {
      display.textContent = Math.round(currentZoom * 100) + '%';
    }
  }

  // [2025-11-19 10:30:00] 获取当前缩放值
  function getZoom() {
    return currentZoom;
  }

  // [2025-11-19 11:30:00] 导出全局 API
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

