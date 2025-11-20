/**
 * App - 主应用入口
 * [2025-11-19 10:45:00] 初始化所有模块、绑定事件、实现快捷键和对外 API
 */
(function() {
  'use strict';

  // [2025-11-19 10:45:00] 等待 Fabric.js 加载
  function waitForFabric(callback, maxAttempts = 50) {
    if (window.fabric) {
      callback();
    } else if (maxAttempts > 0) {
      setTimeout(() => waitForFabric(callback, maxAttempts - 1), 100);
    } else {
      console.error('[App] Fabric.js failed to load');
    }
  }

  // [2025-11-19 10:45:00] 初始化应用
  function init() {
    waitForFabric(() => {
      // [2025-11-19 11:00:00] 从 URL 参数获取 variantId
      const urlParams = new URLSearchParams(window.location.search);
      const variantId = urlParams.get('variantId');
      if (variantId) {
        console.log('[App] variantId from URL:', variantId);
        // [2025-11-19 11:00:00] 可以在这里加载对应的产品信息
        // TODO: 根据 variantId 加载产品数据并设置到 store
      }
      
      // [2025-11-19 10:45:00] 初始化画布
      const canvasElement = document.getElementById('main-canvas');
      if (canvasElement && window.DesignLabCanvas) {
        window.DesignLabCanvas.init(canvasElement);
      }

      // [2025-11-19 10:45:00] 初始化各个模块
      if (window.DesignLabZoom) window.DesignLabZoom.init();
      if (window.DesignLabLayers) window.DesignLabLayers.init();
      if (window.DesignLabToolbar) window.DesignLabToolbar.init();

      // [2025-11-19 10:45:00] 绑定画布面切换（从右侧竖向按钮）
      const sideButtons = document.querySelectorAll('.dl-side-button[data-side]');
      sideButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const side = btn.getAttribute('data-side');
          if (side === 'zoom') {
            // [2025-11-19 11:15:00] Zoom 功能
            if (window.DesignLabZoom) {
              window.DesignLabZoom.fitToScreen();
            }
          } else {
            switchSide(side);
            console.log('[App] side:', side);
          }
          
          // [2025-11-19 10:45:00] 更新按钮状态
          sideButtons.forEach(b => b.classList.toggle('is-active', b === btn));
        });
      });

      // [2025-11-19 10:45:00] 绑定撤销/重做按钮（在 Rail 中）
      const undoBtn = document.getElementById('btn-undo');
      const redoBtn = document.getElementById('btn-redo');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          if (window.DesignLabHistory) {
            window.DesignLabHistory.undo();
          }
        });
      }
      if (redoBtn) {
        redoBtn.addEventListener('click', () => {
          if (window.DesignLabHistory) {
            window.DesignLabHistory.redo();
          }
        });
      }

      // [2025-11-19 10:45:00] 绑定缩放控制
      const zoomBtn = document.getElementById('btn-zoom');
      const fitBtn = document.getElementById('btn-fit');
      const btn100 = document.getElementById('btn-100');
      const zoomInBtn = document.getElementById('btn-zoom-in');
      const zoomOutBtn = document.getElementById('btn-zoom-out');

      if (zoomBtn && window.DesignLabZoom) {
        zoomBtn.addEventListener('click', () => {
          window.DesignLabZoom.togglePanMode();
        });
      }

      if (fitBtn && window.DesignLabZoom) {
        fitBtn.addEventListener('click', () => {
          window.DesignLabZoom.fitToScreen();
        });
      }

      if (btn100 && window.DesignLabZoom) {
        btn100.addEventListener('click', () => {
          window.DesignLabZoom.resetZoom();
        });
      }

      if (zoomInBtn && window.DesignLabZoom) {
        zoomInBtn.addEventListener('click', () => {
          window.DesignLabZoom.zoomIn();
        });
      }

      if (zoomOutBtn && window.DesignLabZoom) {
        zoomOutBtn.addEventListener('click', () => {
          window.DesignLabZoom.zoomOut();
        });
      }

      // [2025-11-19 10:45:00] 绑定网格切换
      const gridBtn = document.getElementById('btn-toggle-grid');
      if (gridBtn) {
        gridBtn.addEventListener('click', () => {
          toggleGrid();
        });
      }

      // [2025-11-19 11:05:00] 绑定视图切换按钮
      const viewButtons = document.querySelectorAll('.dl-view-btn[data-view]');
      viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.getAttribute('data-view');
          switchSide(view === 'zoom' ? 'front' : view); // Zoom 暂时使用 front
          
          // [2025-11-19 11:05:00] 更新按钮状态
          viewButtons.forEach(b => b.classList.toggle('is-active', b === btn));
        });
      });

      // [2025-11-19 10:45:00] 绑定保存/分享按钮（在底部操作条）
      const saveBtn = document.getElementById('btn-save');
      const shareBtn = document.getElementById('btn-share');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          saveDesign();
        });
      }

      if (shareBtn) {
        shareBtn.addEventListener('click', () => {
          shareDesign();
        });
      }

      // [2025-11-19 10:45:00] 绑定价格按钮（在底部操作条）
      const priceBtn = document.getElementById('btn-get-price');
      if (priceBtn) {
        priceBtn.addEventListener('click', () => {
          getPrice();
        });
      }
      
      // [2025-11-19 11:15:00] 绑定 Change Color 链接
      const changeColorLink = document.getElementById('link-change-color');
      if (changeColorLink) {
        changeColorLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (window.DesignLabToolbar) {
            window.DesignLabToolbar.showColorModal();
          }
        });
      }

      // [2025-11-19 10:55:00] 初始化导入功能
      initImportInput();

      // [2025-11-19 10:45:00] 绑定快捷键
      bindKeyboardShortcuts();

      // [2025-11-19 10:45:00] 加载初始状态
      const store = window.DesignLabStore.getStore();
      switchSide(store.currentSide);
      
      // [2025-11-19 11:00:00] 如果 URL 中有 variantId，更新产品信息显示
      const urlParams = new URLSearchParams(window.location.search);
      const variantId = urlParams.get('variantId');
      if (variantId && window.DesignLabToolbar) {
        // TODO: 可以在这里调用 API 获取产品信息并更新显示
        console.log('[App] Loaded with variantId:', variantId);
      }
      
      // [2025-11-19 11:15:00] 初始化右侧竖向按钮状态
      const currentView = store.currentSide === 'sleeve' ? 'sleeve' : store.currentSide;
      const activeSideBtn = document.querySelector(`.dl-side-button[data-side="${currentView}"]`);
      if (activeSideBtn) {
        activeSideBtn.classList.add('is-active');
      }
      
      // [2025-11-19 11:15:00] 初始化设计名称
      const designNameEl = document.getElementById('design-name');
      if (designNameEl) {
        designNameEl.textContent = 'Untitled Design';
        designNameEl.setAttribute('contenteditable', 'true');
        designNameEl.addEventListener('blur', () => {
          // [2025-11-19 11:15:00] 保存设计名称（TODO: 保存到 store）
          console.log('[App] Design name changed:', designNameEl.textContent);
        });
      }

      console.log('[App] Design Lab initialized');
    });
  }

  // [2025-11-19 10:45:00] 切换画布面（带日志）
  function switchSide(side) {
    if (window.DesignLabCanvas) {
      window.DesignLabCanvas.switchSide(side);
      console.log('[App] side:', side);
    }
  }

  // [2025-11-19 10:45:00] 切换网格显示
  function toggleGrid() {
    const gridOverlay = document.getElementById('grid-overlay');
    if (gridOverlay) {
      gridOverlay.classList.toggle('is-visible');
    }
  }

  // [2025-11-19 10:45:00] 保存设计
  function saveDesign() {
    if (window.DesignLabCanvas) {
      window.DesignLabCanvas.saveCurrentSide();
    }
    
    const designData = window.DesignLabStore.exportDesign();
    const jsonStr = JSON.stringify(designData, null, 2);
    
    // [2025-11-19 10:45:00] 下载 JSON 文件
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    const currentSide = window.DesignLabStore.getCurrentSide();
    console.log('[App] export:', { format: 'json', side: currentSide, size: jsonStr.length });
  }

  // [2025-11-19 10:45:00] 分享设计
  function shareDesign() {
    // [2025-11-19 10:45:00] 生成预览图
    if (window.DesignLabCanvas) {
      const currentSide = window.DesignLabStore.getCurrentSide();
      const preview = window.DesignLabCanvas.exportCanvas('png', null, { multiplier: 2 });
      if (preview) {
        // [2025-11-19 10:45:00] 复制到剪贴板或显示分享链接
        console.log('[App] export:', { format: 'png', side: currentSide, size: preview.length });
        alert('Share functionality - preview generated');
      }
    }
  }

  // [2025-11-19 10:45:00] 显示导出菜单
  function showExportMenu() {
    const format = prompt('Export format (png/jpg/svg/json):', 'png');
    if (format && ['png', 'jpg', 'svg', 'json'].includes(format.toLowerCase())) {
      exportDesign(format.toLowerCase());
    }
  }

  // [2025-11-19 10:45:00] 导出设计
  function exportDesign(format, side = null) {
    if (format === 'json') {
      saveDesign();
      return;
    }

    if (window.DesignLabCanvas) {
      const dataURL = window.DesignLabCanvas.exportCanvas(format, side, {
        multiplier: 2,
        quality: format === 'jpg' ? 0.9 : 1
      });

      if (dataURL) {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = `design-${Date.now()}.${format}`;
        a.click();
      }
    }
  }

  // [2025-11-19 10:55:00] 复制选中对象
  let clipboard = null;
  function copySelected() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.name !== 'background') {
      clipboard = activeObj.toObject();
      console.log('[App] Copied object');
    }
  }

  // [2025-11-19 10:55:00] 粘贴对象
  function pasteObjects() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas || !clipboard) return;

    window.fabric.util.enlivenObjects([clipboard], (objects) => {
      objects.forEach(obj => {
        obj.set({
          left: obj.left + 10,
          top: obj.top + 10,
          name: `${obj.type}_${Date.now()}`
        });
        canvas.add(obj);
      });
      canvas.renderAll();
      
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    });
  }

  // [2025-11-19 10:55:00] 组合选中对象
  function groupSelected() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 1) {
      const group = new window.fabric.Group(activeObjects, {
        name: `group_${Date.now()}`
      });
      canvas.remove(...activeObjects);
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.renderAll();
      
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:55:00] 解组选中对象
  function ungroupSelected() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const activeObj = canvas.getActiveObject();
    if (activeObj && activeObj.type === 'group') {
      const objects = activeObj.getObjects();
      activeObj.destroy();
      objects.forEach(obj => {
        obj.setCoords();
        canvas.add(obj);
      });
      canvas.renderAll();
      
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:45:00] 获取价格
  function getPrice() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const store = window.DesignLabStore.getStore();
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const sidesUsed = ['front', 'back', 'sleeve'].filter(side => {
      const sideData = store.sides[side];
      return sideData && sideData.canvasJSON;
    });

    const priceData = {
      productId: store.product.id,
      productName: store.product.name,
      color: store.product.color,
      sidesUsed: sidesUsed,
      layerCount: objects.length
    };

    console.log('[App]', priceData);
    alert(`Price calculation:\n${JSON.stringify(priceData, null, 2)}`);
  }

  // [2025-11-19 10:45:00] 绑定键盘快捷键
  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const canvas = window.DesignLabCanvas.getCanvas();
      if (!canvas) return;

      // [2025-11-19 10:45:00] 删除：Delete/Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.target.isContentEditable) {
        e.preventDefault();
        window.DesignLabCanvas.removeSelected();
      }

      // [2025-11-19 10:45:00] 撤销/重做：Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (window.DesignLabHistory) {
          window.DesignLabHistory.undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (window.DesignLabHistory) {
          window.DesignLabHistory.redo();
        }
      }

      // [2025-11-19 10:45:00] 复制/粘贴：Ctrl/Cmd+C, Ctrl/Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && canvas.getActiveObject()) {
        e.preventDefault();
        copySelected();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteObjects();
      }

      // [2025-11-19 10:45:00] 置顶/置底：Ctrl/Cmd+], Ctrl/Cmd+[
      if ((e.ctrlKey || e.metaKey) && e.key === ']' && !e.shiftKey) {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.bringToFront(obj);
          canvas.renderAll();
          if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '[' && !e.shiftKey) {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.sendToBack(obj);
          const bg = canvas.getObjects().find(o => o.name === 'background');
          if (bg) canvas.sendToBack(bg);
          canvas.renderAll();
          if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
        }
      }

      // [2025-11-19 10:45:00] 上移/下移：Ctrl/Cmd+Shift+], Ctrl/Cmd+Shift+[
      if ((e.ctrlKey || e.metaKey) && e.key === ']' && e.shiftKey) {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.bringForward(obj);
          canvas.renderAll();
          if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '[' && e.shiftKey) {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.sendBackwards(obj);
          canvas.renderAll();
          if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
        }
      }

      // [2025-11-19 10:45:00] 组合/解组：Ctrl/Cmd+G, Ctrl/Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        groupSelected();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey) {
        e.preventDefault();
        ungroupSelected();
      }

      // [2025-11-19 10:45:00] 居中：Ctrl/Cmd+E
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        const obj = canvas.getActiveObject();
        if (obj) {
          obj.set({
            left: canvas.width / 2,
            top: canvas.height / 2
          });
          canvas.renderAll();
        }
      }

      // [2025-11-19 10:45:00] 方向键微移
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const obj = canvas.getActiveObject();
        if (obj && obj.name !== 'background') {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let deltaX = 0;
          let deltaY = 0;

          if (e.key === 'ArrowUp') deltaY = -step;
          else if (e.key === 'ArrowDown') deltaY = step;
          else if (e.key === 'ArrowLeft') deltaX = -step;
          else if (e.key === 'ArrowRight') deltaX = step;

          obj.set({
            left: obj.left + deltaX,
            top: obj.top + deltaY
          });
          canvas.renderAll();
        }
      }
    });
  }
  
  // [2025-11-19 11:15:00] 切换画布面（带日志）
  function switchSide(side) {
    if (window.DesignLabCanvas) {
      window.DesignLabCanvas.switchSide(side);
      console.log('[App] side:', side);
    }
  }

  // [2025-11-19 10:55:00] 添加导入文件输入（隐藏）
  function initImportInput() {
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json';
    importInput.style.display = 'none';
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target.result);
            window.DesignLab.importDesign(json);
          } catch (err) {
            alert('Failed to import design: ' + err.message);
          }
        };
        reader.readAsText(file);
      }
    });
    document.body.appendChild(importInput);
    
    // [2025-11-19 10:55:00] 在开发者菜单中添加导入按钮（可选）
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        importInput.click();
      });
    }
  }

  // [2025-11-19 10:45:00] 对外 API
  window.DesignLab = {
    addLayer: (type, payload) => {
      if (type === 'text') {
        window.DesignLabCanvas.addText(payload.text || 'Your Text', payload);
      } else if (type === 'image') {
        window.DesignLabCanvas.addImage(payload.url, payload);
      } else if (type === 'shape') {
        window.DesignLabCanvas.addShape(payload.shape, payload);
      } else if (type === 'svg') {
        window.DesignLabCanvas.addImage(payload.url, payload);
      }
    },
    removeLayer: (id) => {
      const canvas = window.DesignLabCanvas.getCanvas();
      if (canvas) {
        const obj = canvas.getObjects().find(o => o.name === id);
        if (obj) {
          canvas.remove(obj);
          canvas.renderAll();
          if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
        }
      }
    },
    selectLayer: (id) => {
      window.DesignLabCanvas.selectObject(id);
    },
    reorderLayer: (id, direction) => {
      if (window.DesignLabLayers) {
        window.DesignLabLayers.moveLayer(id, direction);
      }
    },
    setColor: (color) => {
      window.DesignLabStore.setColor(color);
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
    },
    exportDesign: (options = {}) => {
      const format = options.format || 'json';
      const side = options.side || null;
      exportDesign(format, side);
    },
    importDesign: (json) => {
      if (typeof json === 'string') {
        json = JSON.parse(json);
      }
      window.DesignLabStore.importDesign(json);
      const store = window.DesignLabStore.getStore();
      
      // [2025-11-19 10:55:00] 切换到导入的当前面
      switchSide(store.currentSide);
      
      // [2025-11-19 10:55:00] 加载当前面的数据
      if (window.DesignLabCanvas) {
        window.DesignLabCanvas.loadSide(store.currentSide);
      }
      
      // [2025-11-19 10:55:00] 更新图层面板
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
    },
    undo: () => {
      if (window.DesignLabHistory) window.DesignLabHistory.undo();
    },
    redo: () => {
      if (window.DesignLabHistory) window.DesignLabHistory.redo();
    },
    zoomTo: (percent) => {
      if (window.DesignLabZoom) window.DesignLabZoom.zoomTo(percent);
    },
    fitToScreen: () => {
      if (window.DesignLabZoom) window.DesignLabZoom.fitToScreen();
    },
    setActiveSide: (side) => {
      switchSide(side);
    }
  };

  // [2025-11-19 10:45:00] DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

