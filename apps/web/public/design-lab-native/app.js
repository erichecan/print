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
        const urlParamsInit = new URLSearchParams(window.location.search);
        const variantIdInit = urlParamsInit.get('variantId');
        if (variantIdInit) {
          console.log('[App] variantId from URL:', variantIdInit);
          // [2025-01-27] 根据 variantId 加载产品数据并设置到 store
          // store.js 中的 hydrateProductFromVariantId() 会在初始化后自动调用
          // 这里只需要确保 variantId 已设置到 store
          if (window.DesignLabStore) {
            const store = window.DesignLabStore.getStore();
            if (store.product.variantId !== variantIdInit) {
              // variantId 会在 store.js 的 initFromURL() 中设置
              console.log('[App] VariantId will be loaded by store initialization');
            }
          }
        }
      
      // [2025-11-19 10:45:00] 初始化画布
      const canvasElement = document.getElementById('main-canvas');
      let canvasInitialized = false;
      if (canvasElement && window.DesignLabCanvas) {
        canvasInitialized = window.DesignLabCanvas.init(canvasElement);
      }

      // [2025-11-19 12:00:00] 初始化各个模块（面板管理器优先，确保面板切换可用）
      // [2025-01-27] 延迟初始化面板管理器，确保脚本已加载
      console.log('[App] Checking for DesignLabPanel...', { 
        exists: !!window.DesignLabPanel,
        type: typeof window.DesignLabPanel 
      });
      
      if (window.DesignLabPanel) {
        console.log('[App] Initializing DesignLabPanel...');
        try {
          window.DesignLabPanel.init();
          console.log('[App] DesignLabPanel initialized successfully');
        } catch (error) {
          console.error('[App] Error initializing DesignLabPanel:', error);
        }
      } else {
        console.warn('[App] DesignLabPanel not found, will retry...');
        // [2025-01-27] 如果面板管理器还没加载，延迟重试（增加重试次数和延迟时间）
        let retryCount = 0;
        const maxRetries = 5;
        const retryInterval = 200;
        
        const retryInit = setInterval(() => {
          retryCount++;
          console.log(`[App] Retry ${retryCount}/${maxRetries} for DesignLabPanel...`);
          
          if (window.DesignLabPanel) {
            console.log('[App] DesignLabPanel found, initializing...');
            try {
              window.DesignLabPanel.init();
              console.log('[App] DesignLabPanel initialized successfully (retry)');
            } catch (error) {
              console.error('[App] Error initializing DesignLabPanel (retry):', error);
            }
            clearInterval(retryInit);
          } else if (retryCount >= maxRetries) {
            console.error('[App] DesignLabPanel still not found after', maxRetries, 'retries!');
            console.error('[App] Available window objects:', Object.keys(window).filter(k => k.includes('Design')));
            clearInterval(retryInit);
          }
        }, retryInterval);
      }
      if (window.DesignLabZoom) window.DesignLabZoom.init();
      if (window.DesignLabLayers) window.DesignLabLayers.init();
      
      // [2025-01-27] 检查 DesignLabToolbar 是否已正确导出
      console.log('[App] Checking DesignLabToolbar before init:', {
        exists: !!window.DesignLabToolbar,
        type: typeof window.DesignLabToolbar,
        hasInit: !!(window.DesignLabToolbar && typeof window.DesignLabToolbar.init === 'function'),
        hasShowNamesNumbersModal: !!(window.DesignLabToolbar && typeof window.DesignLabToolbar.showNamesNumbersModal === 'function'),
        allMethods: window.DesignLabToolbar ? Object.keys(window.DesignLabToolbar) : []
      });
      
      if (window.DesignLabToolbar) {
        if (typeof window.DesignLabToolbar.init === 'function') {
          window.DesignLabToolbar.init();
        } else {
          console.error('[App] DesignLabToolbar.init is not a function!', {
            type: typeof window.DesignLabToolbar.init,
            availableMethods: Object.keys(window.DesignLabToolbar)
          });
        }
      } else {
        console.error('[App] DesignLabToolbar not found!');
      }
      
      // [2025-01-27] 隐藏颜色功能，2期开发
      // if (window.DesignLabToolbar && window.DesignLabToolbar.initColorPanel) {
      //   window.DesignLabToolbar.initColorPanel();
      // }

      // [2025-01-28 04:15:00] 初始化 CMS 素材库加载器
      if (window.DesignLabArtAssetsLoader) {
        window.DesignLabArtAssetsLoader.init();
      }

      if (canvasInitialized && window.__DesignLabNeedsBackgroundRefresh && window.DesignLabCanvas) {
        window.DesignLabCanvas.loadBackgroundForCurrentSide();
        window.__DesignLabNeedsBackgroundRefresh = false;
      }

      // [2025-11-19 11:30:00] 绑定画布面切换（从右侧竖向按钮）
      const sideButtons = document.querySelectorAll('.dl-side-button[data-side]');
      sideButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const side = btn.getAttribute('data-side');
          if (side === 'zoom') {
            // [2025-11-19 11:30:00] Zoom 按钮：进入视图缩放/平移模式
            if (window.DesignLabZoom) {
              window.DesignLabZoom.toggleZoomPanMode();
              // [2025-11-19 11:30:00] 更新按钮状态（Zoom 模式）
              btn.classList.toggle('is-active');
            }
          } else {
            // [2025-11-19 11:30:00] Front/Back/Sleeve：切换面
            switchSide(side);
            console.log('[App] side:', side);
            
            // [2025-11-19 11:30:00] 更新按钮状态
            sideButtons.forEach(b => {
              if (b.getAttribute('data-side') !== 'zoom') {
                b.classList.toggle('is-active', b === btn);
              }
            });
          }
        });
      });

      // [2025-01-27] Undo/Redo 功能暂时隐藏，二期开发
      // 按钮已在 HTML 中隐藏（display: none），这里保留代码以便二期启用
      /*
      // [2025-11-19 10:45:00] 绑定撤销/重做按钮（在 Rail 中）
      // [2025-01-28 04:55:00] 添加详细日志用于调试
      const undoBtn = document.getElementById('btn-undo');
      const redoBtn = document.getElementById('btn-redo');
      
      console.log('[App] ===== Binding Undo/Redo Buttons =====', {
        timestamp: new Date().toISOString(),
        undoBtnExists: !!undoBtn,
        redoBtnExists: !!redoBtn,
        hasDesignLabHistory: !!window.DesignLabHistory
      });

      if (undoBtn) {
        undoBtn.addEventListener('click', (e) => {
          const timestamp = new Date().toISOString();
          console.log('[App] ===== UNDO BUTTON CLICKED =====', {
            timestamp,
            hasDesignLabHistory: !!window.DesignLabHistory,
            hasUndoMethod: !!(window.DesignLabHistory && window.DesignLabHistory.undo)
          });

          if (window.DesignLabHistory && window.DesignLabHistory.undo) {
            const result = window.DesignLabHistory.undo();
            console.log('[App] ✅ undo() called, result:', {
              result,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('[App] ❌ DesignLabHistory.undo not available', {
              hasDesignLabHistory: !!window.DesignLabHistory,
              timestamp
            });
          }
        });
      } else {
        console.error('[App] ❌ Undo button not found in DOM', {
          timestamp: new Date().toISOString()
        });
      }

      if (redoBtn) {
        redoBtn.addEventListener('click', (e) => {
          const timestamp = new Date().toISOString();
          console.log('[App] ===== REDO BUTTON CLICKED =====', {
            timestamp,
            hasDesignLabHistory: !!window.DesignLabHistory,
            hasRedoMethod: !!(window.DesignLabHistory && window.DesignLabHistory.redo)
          });

          if (window.DesignLabHistory && window.DesignLabHistory.redo) {
            const result = window.DesignLabHistory.redo();
            console.log('[App] ✅ redo() called, result:', {
              result,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('[App] ❌ DesignLabHistory.redo not available', {
              hasDesignLabHistory: !!window.DesignLabHistory,
              timestamp
            });
          }
        });
      } else {
        console.error('[App] ❌ Redo button not found in DOM', {
          timestamp: new Date().toISOString()
        });
      }
      */

      // [2025-11-19 11:30:00] 绑定缩放控制（Fit to screen / 100% 快捷）
      const fitBtn = document.getElementById('btn-fit-screen');
      const btn100 = document.getElementById('btn-zoom-100');
      const zoomInBtn = document.getElementById('btn-zoom-in');
      const zoomOutBtn = document.getElementById('btn-zoom-out');

      if (fitBtn && window.DesignLabZoom) {
        fitBtn.addEventListener('click', () => {
          window.DesignLabZoom.fitToScreen();
        });
      }

      if (btn100 && window.DesignLabZoom) {
        btn100.addEventListener('click', () => {
          window.DesignLabZoom.zoomTo(100);
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

      // [2025-01-28 07:00:00] 绑定价格模态框关闭按钮
      const priceModal = document.getElementById('price-modal');
      if (priceModal) {
        const closeButtons = priceModal.querySelectorAll('.dl-modal__close');
        closeButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            priceModal.classList.remove('is-open');
            priceModal.setAttribute('aria-hidden', 'true');
          });
        });
      }
      
      // [2025-01-27] 隐藏 Add Products 功能，2期开发
      // const addProductsBtn = document.getElementById('btn-add-products');
      // if (addProductsBtn) {
      //   addProductsBtn.addEventListener('click', () => {
      //     console.log('[App] open-add-products');
      //     showProductModal();
      //   });
      // }
      
      // [2025-01-27] 隐藏 Change Product 功能，2期开发
      // const changeProductLink = document.getElementById('link-change-product');
      // if (changeProductLink) {
      //   changeProductLink.addEventListener('click', (e) => {
      //     e.preventDefault();
      //     console.log('[App] open-add-products');
      //     showProductModal();
      //   });
      // }
      
      // [2025-01-27] 隐藏 Change Color 功能，2期开发
      // const changeColorLink = document.getElementById('link-change-color');
      // if (changeColorLink) {
      //   changeColorLink.addEventListener('click', (e) => {
      //     e.preventDefault();
      //     if (window.DesignLabPanel) {
      //       window.DesignLabPanel.openPanel('product-colors');
      //     }
      //   });
      // }
      
      // [2025-11-19 11:30:00] 绑定 Text 控制条
      initTextControls();

      // [2025-11-19 10:55:00] 初始化导入功能
      initImportInput();

      // [2025-11-19 10:45:00] 绑定快捷键
      bindKeyboardShortcuts();

      // [2025-11-19 10:45:00] 加载初始状态
      const store = window.DesignLabStore.getStore();
      switchSide(store.currentSide);
      
        // [2025-01-27] 如果 URL 中有 variantId，调用 API 获取产品信息并更新显示
        const urlParamsFinal = new URLSearchParams(window.location.search);
        const variantIdFinal = urlParamsFinal.get('variantId');
        if (variantIdFinal && window.DesignLabStore) {
          const store = window.DesignLabStore.getStore();
          // [2025-01-27] 如果 store 中已有产品数据，直接更新显示
          if (store.product.variantId === variantIdFinal && store.product.name && !store.product.name.includes('Gildan Softstyle')) {
            // 产品数据已加载，更新显示
            if (typeof window.updateProductInfo === 'function') {
              window.updateProductInfo();
            }
          } else {
            // [2025-01-27] 产品数据可能还在加载中，等待 store.js 的 hydrateProductFromVariantId 完成
            console.log('[App] Product data loading for variantId:', variantIdFinal);
            // 监听 store 更新（通过轮询检查）
            let checkCount = 0;
            const checkInterval = setInterval(() => {
              checkCount++;
              const currentStore = window.DesignLabStore.getStore();
              if (currentStore.product.variantId === variantIdFinal && 
                  currentStore.product.name && 
                  !currentStore.product.name.includes('Gildan Softstyle')) {
                // 产品数据已加载
                if (typeof window.updateProductInfo === 'function') {
                  window.updateProductInfo();
                }
                clearInterval(checkInterval);
              } else if (checkCount > 50) {
                // 10秒后超时
                clearInterval(checkInterval);
                console.warn('[App] Timeout waiting for product data');
              }
            }, 200);
          }
        }
      
      // [2025-11-19 11:30:00] 初始化右侧竖向按钮状态
      const currentView = store.currentSide === 'sleeve' ? 'sleeve' : store.currentSide;
      const activeSideBtn = document.querySelector(`.dl-side-button[data-side="${currentView}"]`);
      if (activeSideBtn) {
        activeSideBtn.classList.add('is-active');
      }
      
      // [2025-01-27] 初始化设计名称并保存到 store
      const designNameEl = document.getElementById('design-name');
      if (designNameEl && window.DesignLabStore) {
        // [2025-01-27] 从 store 加载已保存的设计名称
        const savedName = window.DesignLabStore.getDesignName();
        designNameEl.textContent = savedName;
        designNameEl.setAttribute('contenteditable', 'true');
        designNameEl.addEventListener('blur', () => {
          // [2025-01-27] 保存设计名称到 store
          const newName = designNameEl.textContent.trim() || 'Untitled Design';
          if (window.DesignLabStore && window.DesignLabStore.setDesignName) {
            window.DesignLabStore.setDesignName(newName);
            console.log('[App] Design name saved to store:', newName);
          }
        });
        // [2025-01-27] 监听输入变化，实时更新 store（可选）
        designNameEl.addEventListener('input', () => {
          const newName = designNameEl.textContent.trim() || 'Untitled Design';
          if (window.DesignLabStore && window.DesignLabStore.setDesignName) {
            window.DesignLabStore.setDesignName(newName);
          }
        });
      }
      
      // [2025-11-19 11:30:00] 初始化产品信息显示
      updateProductInfo();

      // [2025-11-21 11:30:00] 确保加载背景图
      if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
        console.log('[App] Loading background image after initialization');
        setTimeout(() => {
          window.DesignLabCanvas.loadBackgroundForCurrentSide();
        }, 200);
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

  // [2025-11-19 11:30:00] 保存设计（导出 JSON + 当前面 2× PNG 预览）
  function saveDesign() {
    if (window.DesignLabCanvas) {
      window.DesignLabCanvas.saveCurrentSide();
    }
    
    const store = window.DesignLabStore.getStore();
    const currentSide = store.currentSide;
    
    // [2025-11-19 11:30:00] 导出 JSON（包含 store、三面 dataless JSON、版本与时间戳）
    const designData = {
      store: {
        product: store.product,
        colors: store.product.colors,
        currentSide: currentSide
      },
      sides: {
        front: store.sides.front.canvasJSON,
        back: store.sides.back.canvasJSON,
        sleeve: store.sides.sleeve.canvasJSON
      },
      version: store.version || '1.0.0',
      timestamp: new Date().toISOString()
    };
    
    const jsonStr = JSON.stringify(designData, null, 2);
    
    // [2025-11-19 11:30:00] 下载 JSON 文件
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    // [2025-11-19 11:30:00] 导出当前面 2× PNG 预览
    if (window.DesignLabCanvas) {
      const preview = window.DesignLabCanvas.exportCanvas('png', null, { multiplier: 2 });
      if (preview) {
        const previewBlob = dataURLToBlob(preview);
        const previewUrl = URL.createObjectURL(previewBlob);
        const previewA = document.createElement('a');
        previewA.href = previewUrl;
        previewA.download = `design-${currentSide}-${Date.now()}.png`;
        previewA.click();
        URL.revokeObjectURL(previewUrl);
      }
    }
    
    console.log('[App] export:', { format: 'json', side: currentSide, size: jsonStr.length });
  }
  
  // [2025-11-19 11:30:00] 将 dataURL 转换为 Blob
  function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  
  // [2025-11-19 11:30:00] 将 dataURL 转换为 Blob（Promise 版本，用于剪贴板）
  function dataURLToBlobAsync(dataURL) {
    return new Promise((resolve, reject) => {
      try {
        const blob = dataURLToBlob(dataURL);
        resolve(blob);
      } catch (e) {
        reject(e);
      }
    });
  }

  // [2025-11-19 11:30:00] 分享设计（导出 PNG）
  function shareDesign() {
    if (window.DesignLabCanvas) {
      const currentSide = window.DesignLabStore.getCurrentSide();
      const preview = window.DesignLabCanvas.exportCanvas('png', null, { multiplier: 2 });
      if (preview) {
        // [2025-11-19 11:30:00] 尝试复制到剪贴板
        if (navigator.clipboard && navigator.clipboard.write) {
          dataURLToBlobAsync(preview).then(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
              console.log('[App] export:', { format: 'png', side: currentSide, size: preview.length });
              alert('Design copied to clipboard!');
            }).catch(() => {
              // [2025-11-19 11:30:00] 如果复制失败，下载文件
              downloadPreview(preview, currentSide);
            });
          }).catch(() => {
            downloadPreview(preview, currentSide);
          });
        } else {
          // [2025-11-19 11:30:00] 不支持剪贴板，直接下载
          downloadPreview(preview, currentSide);
        }
      }
    }
  }
  
  // [2025-11-19 11:30:00] 下载预览图
  function downloadPreview(dataURL, side) {
    const blob = dataURLToBlob(dataURL);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `design-${side}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('[App] export:', { format: 'png', side: side, size: dataURL.length });
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
      // [2025-01-27] 组合操作不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
      // if (window.DesignLabHistory) {
      //   window.DesignLabHistory.saveState();
      // }
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
      // [2025-01-27] 组合操作不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
      // if (window.DesignLabHistory) {
      //   window.DesignLabHistory.saveState();
      // }
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
      // [2025-01-27] 解组操作不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
      // if (window.DesignLabHistory) {
      //   window.DesignLabHistory.saveState();
      // }
    }
  }

  // [2025-01-28 07:00:00] 保存设计到后端（如果未保存）
  let currentDesignId = null; // 存储当前设计 ID

  async function saveDesignToBackend() {
    const store = window.DesignLabStore.getStore();
    const canvas = window.DesignLabCanvas.getCanvas();
    
    if (!canvas || !store.product.variantId) {
      console.warn('[App] Cannot save design: missing canvas or variantId');
      return null;
    }

    // [2025-01-28 07:00:00] 如果已有设计 ID，更新现有设计
    if (currentDesignId) {
      try {
        // 保存当前面的数据
        if (window.DesignLabCanvas) {
          window.DesignLabCanvas.saveCurrentSide();
        }

        const allSidesData = {
          front: store.sides.front.canvasJSON,
          back: store.sides.back.canvasJSON,
          sleeve: store.sides.sleeve.canvasJSON
        };

        const canvasSnapshot = {
          size: { width: canvas.width, height: canvas.height },
          sides: allSidesData,
          currentSide: store.currentSide
        };

        const response = await fetch(`/api/designs/${currentDesignId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            canvas: canvasSnapshot,
            name: (window.DesignLabStore && window.DesignLabStore.getDesignName ? window.DesignLabStore.getDesignName() : null) || document.getElementById('design-name')?.textContent || 'Untitled Design'
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('[App] Design updated:', result.data.id);
          return result.data.id;
        } else {
          console.warn('[App] Failed to update design, creating new one');
          currentDesignId = null; // 重置，创建新设计
        }
      } catch (error) {
        console.error('[App] Error updating design:', error);
        currentDesignId = null; // 重置，创建新设计
      }
    }

    // [2025-01-28 07:00:00] 创建新设计
    if (!currentDesignId) {
      try {
        // 保存当前面的数据
        if (window.DesignLabCanvas) {
          window.DesignLabCanvas.saveCurrentSide();
        }

        const allSidesData = {
          front: store.sides.front.canvasJSON,
          back: store.sides.back.canvasJSON,
          sleeve: store.sides.sleeve.canvasJSON
        };

        const canvasSnapshot = {
          size: { width: canvas.width, height: canvas.height },
          sides: allSidesData,
          currentSide: store.currentSide
        };

        const response = await fetch('/api/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            productVariantId: store.product.variantId,
            name: (window.DesignLabStore && window.DesignLabStore.getDesignName ? window.DesignLabStore.getDesignName() : null) || document.getElementById('design-name')?.textContent || 'Untitled Design',
            canvas: canvasSnapshot
          })
        });

        if (response.ok) {
          const result = await response.json();
          currentDesignId = result.data.id;
          console.log('[App] Design created:', currentDesignId);
          return currentDesignId;
        } else {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to create design');
        }
      } catch (error) {
        console.error('[App] Error creating design:', error);
        alert('Failed to save design. Please try again.');
        return null;
      }
    }

    return currentDesignId;
  }

  // [2025-01-28 07:00:00] 获取价格（完整实现）
  async function getPrice() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) {
      alert('Canvas not available');
      return;
    }

    const store = window.DesignLabStore.getStore();
    const quantityInput = document.getElementById('quantity-input');
    const quantity = quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1;

    if (quantity < 1) {
      alert('Quantity must be at least 1');
      return;
    }

    // [2025-01-28 07:00:00] 收集设计数据
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const sidesUsed = ['front', 'back', 'sleeve'].filter(side => {
      const sideData = store.sides[side];
      return sideData && sideData.canvasJSON;
    });

    // [2025-01-28 07:00:00] 计算总图层数（所有面的图层）
    let totalLayerCount = 0;
    ['front', 'back', 'sleeve'].forEach(side => {
      const sideData = store.sides[side];
      if (sideData && sideData.canvasJSON) {
        try {
          const sideObjects = JSON.parse(sideData.canvasJSON);
          if (sideObjects.objects && Array.isArray(sideObjects.objects)) {
            totalLayerCount += sideObjects.objects.length;
          }
        } catch (e) {
          // 如果解析失败，使用当前面的图层数
          if (side === store.currentSide) {
            totalLayerCount += objects.length;
          }
        }
      }
    });

    // [2025-01-28 07:00:00] 显示加载状态
    const priceModal = document.getElementById('price-modal');
    const priceContent = document.getElementById('price-content');
    if (priceModal && priceContent) {
      priceContent.innerHTML = '<div class="dl-price-loading">Calculating price...</div>';
      priceModal.classList.add('is-open');
      priceModal.setAttribute('aria-hidden', 'false');
    }

    try {
      // [2025-01-28 07:00:00] 保存设计到后端（如果未保存）
      const designId = await saveDesignToBackend();
      if (!designId) {
        throw new Error('Failed to save design');
      }

      // [2025-01-28 07:00:00] 调用报价 API
      const response = await fetch(`/api/designs/${designId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quantity,
          sidesUsed,
          layerCount: totalLayerCount
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to get price');
      }

      const result = await response.json();
      const quote = result.data;

      // [2025-01-28 07:00:00] 显示价格信息
      if (priceContent) {
        const formatPrice = (amount) => {
          return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: quote.currency || 'CAD',
            minimumFractionDigits: 2
          }).format(amount);
        };

        let html = `
          <div class="dl-price-summary">
            <div class="dl-price-row">
              <span>Unit Price:</span>
              <strong>${formatPrice(quote.unitPrice)}</strong>
            </div>
        `;

        if (quote.discountedUnitPrice < quote.unitPrice) {
          html += `
            <div class="dl-price-row dl-price-row--discount">
              <span>Discounted Unit Price:</span>
              <strong>${formatPrice(quote.discountedUnitPrice)}</strong>
            </div>
            <div class="dl-price-row">
              <span>Quantity Discount:</span>
              <span>${(quote.breakdown.quantityDiscount || 0).toFixed(0)}%</span>
            </div>
          `;
        }

        html += `
            <div class="dl-price-row">
              <span>Quantity:</span>
              <span>${quote.quantity}</span>
            </div>
            <div class="dl-price-row dl-price-row--total">
              <span>Total:</span>
              <strong>${formatPrice(quote.total)}</strong>
            </div>
          </div>
          <div class="dl-price-breakdown">
            <h4>Price Breakdown</h4>
            <ul>
              <li>Base Price: ${formatPrice(quote.breakdown.basePrice)}</li>
              <li>Variant Adjustment: ${formatPrice(quote.breakdown.variantAdjustment)}</li>
              <li>Sides Used: ${quote.breakdown.sidesCount} (${formatPrice(quote.breakdown.sidesFee)} additional)</li>
              <li>Layers: ${quote.breakdown.layerCount} (${formatPrice(quote.breakdown.layersFee)} additional)</li>
            </ul>
          </div>
        `;

        priceContent.innerHTML = html;

        // [2025-01-27] 显示 Add to Cart 按钮并实现添加到购物车功能
        const addToCartBtn = document.getElementById('btn-add-to-cart');
        if (addToCartBtn) {
          addToCartBtn.style.display = 'inline-block';
          addToCartBtn.onclick = async () => {
            // [2025-01-27] 实现添加到购物车功能
            try {
              const store = window.DesignLabStore.getStore();
              const variantId = store.product.variantId;
              
              if (!variantId) {
                alert('Please select a product variant first.');
                return;
              }

              // [2025-01-27] 获取数量（从数量输入框）
              const quantityInput = document.getElementById('quantity-input');
              const quantity = quantityInput ? parseInt(quantityInput.value, 10) || 1 : 1;

              // [2025-01-27] 保存设计到后端（如果未保存）
              const designId = await saveDesignToBackend();
              
              // [2025-01-27] 调用购物车 API
              addToCartBtn.disabled = true;
              addToCartBtn.textContent = 'Adding...';
              
              const response = await fetch('/api/cart/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  variantId: variantId,
                  quantity: quantity,
                  ...(designId ? { designId: designId } : {})
                })
              });

              if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Failed to add to cart' }));
                throw new Error(error.error || 'Failed to add to cart');
              }

              // [2025-01-27] 成功添加到购物车
              alert('Item added to cart successfully!');
              
              // [2025-01-27] 可选：跳转到购物车页面
              // window.location.href = '/cart';
              
            } catch (error) {
              console.error('[App] Error adding to cart:', error);
              alert('Failed to add to cart: ' + (error.message || 'Unknown error'));
            } finally {
              if (addToCartBtn) {
                addToCartBtn.disabled = false;
                addToCartBtn.textContent = 'Add to Cart';
              }
            }
          };
        }
      }

      console.log('[App] Price quote received:', quote);
    } catch (error) {
      console.error('[App] Error getting price:', error);
      if (priceContent) {
        priceContent.innerHTML = `<div class="dl-price-error">Error: ${error.message}</div>`;
      } else {
        alert(`Failed to get price: ${error.message}`);
      }
    }
  }
  
  // [2025-01-27] 显示产品选择模态框并加载产品列表
  async function showProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    
    const productsGrid = document.getElementById('products-grid');
    if (productsGrid) {
      // [2025-01-27] 显示加载状态
      productsGrid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Loading products...</div>';
    }
    
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    
    // [2025-01-27] 加载产品列表
    try {
      const response = await fetch('/api/products?limit=24&page=1', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const result = await response.json();
      const products = result.data || [];

      if (productsGrid) {
        if (products.length === 0) {
          productsGrid.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">No products available</div>';
        } else {
          // [2025-01-27] 渲染产品网格
          productsGrid.innerHTML = products.map(product => {
            const primaryImage = product.images?.[0]?.url || product.primaryImage?.url || '/assets/hero/hero-card-tee.jpg';
            const productName = product.name || 'Unnamed Product';
            const productSlug = product.slug || '';
            
            return `
              <div class="dl-product-card" data-product-id="${product.id}" data-product-slug="${productSlug}" style="
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                <img src="${primaryImage}" alt="${productName}" style="width: 100%; height: 200px; object-fit: cover;" 
                     onerror="this.src='/assets/hero/hero-card-tee.jpg'">
                <div style="padding: 12px;">
                  <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">${productName}</h4>
                  <p style="margin: 0; font-size: 12px; color: #666;">${product.category?.name || 'Product'}</p>
                </div>
              </div>
            `;
          }).join('');

          // [2025-01-27] 绑定产品卡片点击事件
          productsGrid.querySelectorAll('.dl-product-card').forEach(card => {
            card.addEventListener('click', () => {
              const productId = card.getAttribute('data-product-id');
              const productSlug = card.getAttribute('data-product-slug');
              
              // [2025-01-27] 跳转到产品详情页，用户可以选择 variant 后进入 Design Lab
              if (productSlug) {
                window.location.href = `/products/${productSlug}`;
              } else {
                console.warn('[App] Product slug not available for product:', productId);
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('[App] Error loading products:', error);
      if (productsGrid) {
        productsGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ff1f3d;">
          <p>Failed to load products</p>
          <button onclick="window.showProductModal()" style="
            margin-top: 8px;
            padding: 8px 16px;
            background: #ff1f3d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Retry</button>
        </div>`;
      }
    }
    
    // [2025-11-19 11:30:00] 绑定关闭按钮
    const closeBtn = modal.querySelector('.dl-modal__close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
      };
    }
  }
  
  // [2025-11-19 11:30:00] 导出 showProductModal 供外部调用
  window.showProductModal = showProductModal;
  
  // [2025-11-19 11:30:00] 切换产品
  function changeProduct(productId, productName, baseImages) {
    const store = window.DesignLabStore.getStore();
    store.product.id = productId;
    store.product.name = productName;
    store.product.baseImages = baseImages;
    
    // [2025-11-19 11:30:00] 刷新三面底图
    if (window.DesignLabCanvas) {
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
    }
    
    // [2025-11-19 11:30:00] 更新产品信息显示
    updateProductInfo();
    
    console.log('[App] product:', { id: productId, name: productName, baseImages });
  }
  
  // [2025-11-19 11:30:00] 切换颜色（只切换当前 product 颜色或底图着色层，更新当前与其他面的底图）
  function changeColor(color) {
    const store = window.DesignLabStore.getStore();
    store.product.color = color;
    
    // [2025-01-27] 更新当前面和其他面的底图
    if (window.DesignLabCanvas) {
      const currentSide = store.currentSide;
      const allSides = ['front', 'back', 'sleeve'];
      
      // [2025-01-27] 先保存当前面的画布数据
      if (window.DesignLabCanvas.saveCurrentSide) {
        window.DesignLabCanvas.saveCurrentSide();
      }
      
      // [2025-01-27] 更新当前面的底图
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
      
      // [2025-01-27] 更新其他面的底图（保存当前面，切换面，更新，再切回）
      // 注意：这里使用同步方式逐个更新，避免异步导致的竞态条件
      allSides.forEach(side => {
        if (side !== currentSide) {
          // [2025-01-27] 保存当前面数据（如果还在当前面）
          const storeCheck = window.DesignLabStore.getStore();
          if (storeCheck.currentSide === currentSide && window.DesignLabCanvas.saveCurrentSide) {
            window.DesignLabCanvas.saveCurrentSide();
          }
          
          // [2025-01-27] 切换到目标面
          if (window.DesignLabStore && window.DesignLabStore.setActiveSide) {
            window.DesignLabStore.setActiveSide(side);
          }
          if (window.DesignLabCanvas && window.DesignLabCanvas.switchSide) {
            window.DesignLabCanvas.switchSide(side);
          }
          
          // [2025-01-27] 加载目标面的底图
          if (window.DesignLabCanvas.loadBackgroundForCurrentSide) {
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
          }
          
          // [2025-01-27] 保存目标面的数据
          if (window.DesignLabCanvas.saveCurrentSide) {
            window.DesignLabCanvas.saveCurrentSide();
          }
        }
      });
      
      // [2025-01-27] 切换回原来的面
      if (window.DesignLabStore && window.DesignLabStore.setActiveSide) {
        window.DesignLabStore.setActiveSide(currentSide);
      }
      if (window.DesignLabCanvas && window.DesignLabCanvas.switchSide) {
        window.DesignLabCanvas.switchSide(currentSide);
      }
      
      // [2025-01-27] 重新加载当前面的底图和数据
      if (window.DesignLabCanvas.loadBackgroundForCurrentSide) {
        window.DesignLabCanvas.loadBackgroundForCurrentSide();
      }
    }
    
    // [2025-11-19 11:30:00] 更新产品信息显示
    updateProductInfo();
    
    console.log('[App] product:', { color: color });
  }
  
  // [2025-11-19 11:30:00] 导出 changeColor 供外部调用
  window.changeColor = changeColor;
  
  // [2025-11-19 11:30:00] 更新产品信息显示（导出供外部调用）
  function updateProductInfo() {
    const store = window.DesignLabStore.getStore();
    const productNameEl = document.getElementById('product-name');
    // [2025-01-27] 颜色元素已隐藏，2期开发
    // const productColorEl = document.getElementById('product-color');
    const productThumbImg = document.getElementById('product-thumb-img');
    
    if (productNameEl) {
      productNameEl.textContent = store.product.name || 'Gildan Softstyle T-shirt';
    }
    // [2025-01-27] 颜色显示已隐藏，2期开发
    // if (productColorEl) {
    //   productColorEl.textContent = store.product.color || 'Heather Dark Grey';
    // }
    if (productThumbImg && store.product.baseImages) {
      const currentSide = store.currentSide;
      productThumbImg.src = store.product.baseImages[currentSide] || store.product.baseImages.front || 'https://picsum.photos/seed/product/60/60';
    }
  }
  
  // [2025-11-19 11:30:00] 导出 updateProductInfo 供外部调用
  window.updateProductInfo = updateProductInfo;
  
  // [2025-11-19 11:30:00] 初始化 Text 控制条
  function initTextControls() {
    const textControls = document.getElementById('text-controls');
    if (!textControls) return;
    
    // [2025-11-19 11:30:00] 监听画布选择变化
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (canvas) {
      canvas.on('selection:created', () => updateTextControls());
      canvas.on('selection:updated', () => updateTextControls());
      canvas.on('selection:cleared', () => {
        textControls.style.display = 'none';
      });
    }
    
    // [2025-11-19 11:30:00] 绑定 Text 控制条按钮
    const boldBtn = document.getElementById('text-control-bold');
    const italicBtn = document.getElementById('text-control-italic');
    const underlineBtn = document.getElementById('text-control-underline');
    const alignLeftBtn = document.getElementById('text-control-align-left');
    const alignCenterBtn = document.getElementById('text-control-align-center');
    const alignRightBtn = document.getElementById('text-control-align-right');
    const duplicateBtn = document.getElementById('text-control-duplicate');
    const sizeRange = document.getElementById('text-control-size');
    const sizeValue = document.getElementById('text-control-size-value');
    
    if (boldBtn) {
      boldBtn.addEventListener('click', () => toggleTextStyle('bold'));
    }
    if (italicBtn) {
      italicBtn.addEventListener('click', () => toggleTextStyle('italic'));
    }
    if (underlineBtn) {
      underlineBtn.addEventListener('click', () => toggleTextStyle('underline'));
    }
    if (alignLeftBtn) {
      alignLeftBtn.addEventListener('click', () => setTextAlign('left'));
    }
    if (alignCenterBtn) {
      alignCenterBtn.addEventListener('click', () => setTextAlign('center'));
    }
    if (alignRightBtn) {
      alignRightBtn.addEventListener('click', () => setTextAlign('right'));
    }
    if (duplicateBtn) {
      duplicateBtn.addEventListener('click', () => duplicateSelected());
    }
    if (sizeRange && sizeValue) {
      sizeRange.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        sizeValue.textContent = size;
        setTextSize(size);
      });
    }
  }
  
  // [2025-11-19 11:30:00] 更新 Text 控制条显示
  function updateTextControls() {
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    const textControls = document.getElementById('text-controls');
    
    if (activeObj && (activeObj.type === 'i-text' || activeObj.type === 'text')) {
      if (textControls) textControls.style.display = 'flex';
      
      // [2025-11-19 11:30:00] 更新控制条状态
      const boldBtn = document.getElementById('text-control-bold');
      const italicBtn = document.getElementById('text-control-italic');
      const underlineBtn = document.getElementById('text-control-underline');
      const sizeRange = document.getElementById('text-control-size');
      const sizeValue = document.getElementById('text-control-size-value');
      
      if (boldBtn) {
        boldBtn.setAttribute('aria-pressed', activeObj.fontWeight === 'bold' ? 'true' : 'false');
        boldBtn.classList.toggle('is-active', activeObj.fontWeight === 'bold');
      }
      if (italicBtn) {
        italicBtn.setAttribute('aria-pressed', activeObj.fontStyle === 'italic' ? 'true' : 'false');
        italicBtn.classList.toggle('is-active', activeObj.fontStyle === 'italic');
      }
      if (underlineBtn) {
        underlineBtn.setAttribute('aria-pressed', activeObj.underline ? 'true' : 'false');
        underlineBtn.classList.toggle('is-active', activeObj.underline);
      }
      if (sizeRange && sizeValue) {
        sizeRange.value = activeObj.fontSize || 48;
        sizeValue.textContent = Math.round(activeObj.fontSize || 48);
      }
    } else {
      if (textControls) textControls.style.display = 'none';
    }
  }
  
  // [2025-11-19 11:30:00] 切换文本样式
  function toggleTextStyle(style) {
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj.type !== 'i-text' && activeObj.type !== 'text')) return;
    
    if (style === 'bold') {
      activeObj.set('fontWeight', activeObj.fontWeight === 'bold' ? 'normal' : 'bold');
    } else if (style === 'italic') {
      activeObj.set('fontStyle', activeObj.fontStyle === 'italic' ? 'normal' : 'italic');
    } else if (style === 'underline') {
      activeObj.set('underline', !activeObj.underline);
    }
    
    canvas.renderAll();
    updateTextControls();
    
    // [2025-01-27] 文本属性修改不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
    // if (window.DesignLabHistory) {
    //   window.DesignLabHistory.saveState();
    // }
  }
  
  // [2025-11-19 11:30:00] 设置文本对齐
  function setTextAlign(align) {
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj.type !== 'i-text' && activeObj.type !== 'text')) return;
    
    activeObj.set('textAlign', align);
    canvas.renderAll();
    updateTextControls();
    
    // [2025-01-27] 文本属性修改不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
    // if (window.DesignLabHistory) {
    //   window.DesignLabHistory.saveState();
    // }
  }
  
  // [2025-11-19 11:30:00] 设置文本大小
  function setTextSize(size) {
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    if (!activeObj || (activeObj.type !== 'i-text' && activeObj.type !== 'text')) return;
    
    activeObj.set('fontSize', size);
    canvas.renderAll();
    updateTextControls();
    
    if (window.DesignLabHistory) {
      window.DesignLabHistory.saveState();
    }
  }
  
  // [2025-11-19 11:30:00] 复制选中对象
  function duplicateSelected() {
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) return;
    
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    
    activeObj.clone((cloned) => {
      cloned.set({
        left: cloned.left + 10,
        top: cloned.top + 10
      });
      cloned.set('name', cloned.name + ' Copy');
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      
      if (window.DesignLabLayers) {
        window.DesignLabLayers.updateLayers();
      }
      // [2025-01-27] 复制操作不记录历史 - undo 只记录图层操作（上传图片、add text、add art）
      // 复制本质上是添加新对象，但应该由 addText/addImage 来记录
      // if (window.DesignLabHistory) {
      //   window.DesignLabHistory.saveState();
      // }
    });
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

      // [2025-01-27] Undo/Redo 功能暂时隐藏，二期开发
      /*
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
      */

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

