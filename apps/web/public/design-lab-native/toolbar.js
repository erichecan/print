/**
 * Toolbar - 工具栏与工具功能
 * [2025-11-19 10:40:00] 管理工具栏交互、工具切换、文件上传等
 */
(function() {
  'use strict';

  let currentTool = null;
  let fileInput = null;

  function getInputValue(id, fallback = '') {
    const el = document.getElementById(id);
    if (!el) return fallback;
    if (el.value !== undefined) {
      return el.value || fallback;
    }
    return fallback;
  }

  function getNumericValue(id, fallback = 0) {
    const value = parseFloat(getInputValue(id, fallback));
    return Number.isNaN(value) ? fallback : value;
  }

  function getCheckboxValue(id) {
    const el = document.getElementById(id);
    return el ? !!el.checked : false;
  }

  // [2025-11-19 12:00:00] 初始化工具栏（适配新面板结构）
  function init() {
    // [2025-11-19 12:00:00] 文件上传（upload 面板）
    fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const browseBtn = document.getElementById('btn-browse-computer');
    
    if (browseBtn && fileInput) {
      browseBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }
    
    if (uploadArea && fileInput) {
      // [2025-11-19 12:00:00] 拖拽上传（整个页面）
      document.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (uploadArea) uploadArea.classList.add('is-dragover');
      });

      document.addEventListener('dragleave', () => {
        if (uploadArea) uploadArea.classList.remove('is-dragover');
      });

      document.addEventListener('drop', (e) => {
        e.preventDefault();
        if (uploadArea) uploadArea.classList.remove('is-dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleFileUpload(files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          handleFileUpload(e.target.files[0]);
        }
      });
    }

    // [2025-11-19 12:00:00] 添加文本按钮（text 面板）
    const addTextBtn = document.getElementById('btn-add-text-to-design');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => {
        addTextFromPanel();
      });
    }

    const textSizeInput = document.getElementById('text-size');
    const textSizeValue = document.getElementById('text-size-value');
    if (textSizeInput && textSizeValue) {
      textSizeInput.addEventListener('input', () => {
        textSizeValue.textContent = textSizeInput.value;
      });
    }

    const textRotationInput = document.getElementById('text-rotation');
    const textRotationValue = document.getElementById('text-rotation-value');
    if (textRotationInput && textRotationValue) {
      textRotationInput.addEventListener('input', () => {
        textRotationValue.textContent = textRotationInput.value;
      });
    }

    // [2025-11-19 12:00:00] Art 面板交互
    const artItems = document.querySelectorAll('.panel__art-item');
    artItems.forEach(item => {
      item.addEventListener('click', () => {
        const artType = item.getAttribute('data-art');
        addArt(artType);
      });
    });

    const artFlipBtn = document.getElementById('art-control-flip');
    if (artFlipBtn) {
      artFlipBtn.addEventListener('click', () => flipArt());
    }

    const artDuplicateBtn = document.getElementById('art-control-duplicate');
    if (artDuplicateBtn) {
      artDuplicateBtn.addEventListener('click', () => duplicateArt());
    }

    const artRotateBtn = document.getElementById('art-control-rotate');
    if (artRotateBtn) {
      artRotateBtn.addEventListener('click', () => rotateArt());
    }

    // [2025-11-19 12:00:00] 颜色选择（product-colors 面板）
    initColorPanel();

    // [2025-11-19 12:00:00] Names 按钮
    const addNamesBtn = document.getElementById('btn-add-names-numbers');
    if (addNamesBtn) {
      addNamesBtn.addEventListener('click', () => {
        console.log('[Toolbar] Add Names and Numbers clicked');
      });
    }

    // [2025-11-19 10:40:00] 颜色模态框关闭
    const colorModal = document.getElementById('color-modal');
    if (colorModal) {
      const closeBtn = colorModal.querySelector('.dl-modal__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          hideColorModal();
        });
      }

      colorModal.addEventListener('click', (e) => {
        if (e.target === colorModal) {
          hideColorModal();
        }
      });
    }
  }

  // [2025-11-19 10:40:00] 选择工具
  function selectTool(tool) {
    currentTool = tool;
    
    // [2025-11-19 11:15:00] 隐藏启动面板，显示工具面板
    const guidePanel = document.getElementById('guide-panel');
    const toolsPanel = document.getElementById('tools-panel');
    if (guidePanel) guidePanel.style.display = 'none';
    if (toolsPanel) toolsPanel.style.display = 'flex';
    
    // [2025-11-19 10:40:00] 更新 Rail 按钮状态
    document.querySelectorAll('.dl-rail__btn[data-tool]').forEach(btn => {
      const isActive = btn.getAttribute('data-tool') === tool;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });

    // [2025-11-19 10:40:00] 切换到对应 Tab
    if (tool === 'upload') switchTab('upload');
    else if (tool === 'text') switchTab('text');
    else if (tool === 'art') switchTab('art');
    else if (tool === 'layers') switchTab('layers');
    else if (tool === 'edit') switchTab('edit');
  }
  
  // [2025-11-19 11:15:00] 处理启动面板操作
  function handleGuideAction(action) {
    if (action === 'upload') {
      selectTool('upload');
    } else if (action === 'text') {
      selectTool('text');
      setTimeout(() => {
        const textInput = document.getElementById('text-input');
        if (textInput) textInput.focus();
      }, 100);
    } else if (action === 'art') {
      selectTool('art');
    } else if (action === 'products') {
      // [2025-11-19 11:15:00] 显示产品选择（TODO）
      console.log('[Toolbar] Change products');
    }
  }

  // [2025-11-19 10:40:00] 切换 Tab
  function switchTab(tab) {
    // [2025-11-19 10:40:00] 更新 Tab 按钮
    document.querySelectorAll('.dl-tabs__btn').forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('is-active', isActive);
    });

    // [2025-11-19 10:40:00] 显示对应面板
    document.querySelectorAll('.dl-panel').forEach(panel => {
      const isActive = panel.id === `panel-${tab}`;
      panel.classList.toggle('is-active', isActive);
    });
  }

  // [2025-11-19 10:40:00] 处理文件上传
  function handleFileUpload(file) {
    const timestamp = new Date().toISOString();
    console.log('[Upload] ===== handleFileUpload CALLED =====', {
      timestamp,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    if (!file.type.startsWith('image/')) {
      console.error('[Upload] ❌ Invalid file type:', {
        fileType: file.type,
        timestamp
      });
      alert('Please upload an image file');
      return;
    }

    console.log('[Upload] 📋 Reading file with FileReader...', { timestamp });
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      console.log('[Upload] ✅ File read successfully:', {
        dataURLLength: imageUrl?.length || 0,
        dataURLPreview: imageUrl?.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      
      // [2025-01-28 00:25:00] 检查 DesignLabCanvas 是否可用
      if (!window.DesignLabCanvas) {
        console.error('[Upload] ❌ DesignLabCanvas is not available:', {
          timestamp: new Date().toISOString()
        });
        alert('画布未初始化，请刷新页面重试');
        return;
      }
      
      if (typeof window.DesignLabCanvas.addImage !== 'function') {
        console.error('[Upload] ❌ DesignLabCanvas.addImage is not a function:', {
          addImageType: typeof window.DesignLabCanvas.addImage,
          timestamp: new Date().toISOString()
        });
        alert('画布功能未加载，请刷新页面重试');
        return;
      }
      
      console.log('[Upload] 📋 Calling DesignLabCanvas.addImage...', {
        imageUrlLength: imageUrl?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      try {
        const result = window.DesignLabCanvas.addImage(imageUrl);
        console.log('[Upload] ✅ DesignLabCanvas.addImage called successfully:', {
          result: result !== null ? 'image object created' : 'null returned',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[Upload] ❌ Error calling DesignLabCanvas.addImage:', {
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        alert('添加图片失败：' + err.message);
      }
    };
    reader.onerror = (e) => {
      console.error('[Upload] ❌ FileReader error:', {
        error: e,
        timestamp: new Date().toISOString()
      });
      alert('读取文件失败，请重试');
    };
    reader.readAsDataURL(file);
  }

  // [2025-11-19 12:15:00] 从 Text 面板添加文本
  function addTextFromPanel(textOverride) {
    if (!window.DesignLabCanvas) return null;

    const inputValue = getInputValue('text-input', 'Your Text').trim();
    const text = (textOverride && textOverride.trim()) || inputValue || 'Your Text';

    const fontFamily = getInputValue('text-font', 'Arial');
    const fontSize = getNumericValue('text-size', 48);
    const color = getInputValue('text-color', '#000000');
    const isBold = getCheckboxValue('text-bold');
    const isItalic = getCheckboxValue('text-italic');
    const isUnderline = getCheckboxValue('text-underline');

    const textObj = window.DesignLabCanvas.addText(text, {
      fontSize,
      fontFamily,
      fill: color,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline
    });

    if (textObj) {
      const rotation = getNumericValue('text-rotation', 0);
      if (!Number.isNaN(rotation)) {
        textObj.rotate(rotation);
        const canvas = window.DesignLabCanvas.getCanvas ? window.DesignLabCanvas.getCanvas() : null;
        if (canvas) {
          canvas.requestRenderAll();
          canvas.setActiveObject(textObj);
        }
      }

      if (window.DesignLabPanel) {
        window.DesignLabPanel.openPanel('home');
      }
    }

    return textObj;
  }

  // [2025-11-19 10:40:00] 兼容旧逻辑的工具栏添加文本
  function addTextFromToolbar(defaultText = 'Your Text') {
    return addTextFromPanel(defaultText);
  }

  // [2025-11-19 12:00:00] 添加 Art（使用 addShape 或 SVG）
  function addArt(type) {
    if (window.DesignLabCanvas) {
      // [2025-11-19 12:00:00] 使用 addShape 添加基本形状
      if (type === 'circle' || type === 'square' || type === 'triangle') {
        const shapeType = type === 'square' ? 'rect' : type;
        window.DesignLabCanvas.addShape(shapeType);
      } else {
        // [2025-11-19 12:00:00] 对于 star 和 heart，使用 SVG
        let svgContent = '';
        switch (type) {
          case 'star':
            svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#3b82f6"/></svg>';
            break;
          case 'heart':
            svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,85 C50,85 10,50 10,30 C10,15 20,10 30,10 C40,10 50,20 50,20 C50,20 60,10 70,10 C80,10 90,15 90,30 C90,50 50,85 50,85 Z" fill="#ff1f3d"/></svg>';
            break;
        }
        if (svgContent) {
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          window.DesignLabCanvas.addImage(url);
        }
      }
      
      // [2025-11-19 12:00:00] 记录到历史栈
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
      
      // [2025-11-19 12:00:00] 返回 home 面板
      if (window.DesignLabPanel) {
        window.DesignLabPanel.openPanel('home');
      }
    }
  }

  // [2025-11-19 10:40:00] 添加形状
  function addShape(type) {
    window.DesignLabCanvas.addShape(type);
  }

  // [2025-11-19 12:20:00] 获取当前画布与选中对象
  function getActiveDrawable() {
    if (!window.DesignLabCanvas || !window.DesignLabCanvas.getCanvas) return {};
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return {};
    const obj = canvas.getActiveObject();
    if (!obj || obj.name === 'background') return { canvas };
    return { canvas, obj };
  }

  function notifyCanvasChanges(canvas) {
    if (canvas) {
      canvas.requestRenderAll();
      if (window.DesignLabLayers) window.DesignLabLayers.updateLayers();
      if (window.DesignLabHistory) window.DesignLabHistory.saveState();
    }
  }

  // [2025-11-19 12:20:00] 翻转对象
  function flipArt() {
    const { canvas, obj } = getActiveDrawable();
    if (!canvas || !obj) {
      console.warn('[Toolbar] flipArt requires an active object');
      return false;
    }
    const currentScaleX = obj.scaleX || 1;
    obj.set('scaleX', -currentScaleX);
    notifyCanvasChanges(canvas);
    return true;
  }

  // [2025-11-19 12:20:00] 复制对象
  function duplicateArt() {
    const { canvas, obj } = getActiveDrawable();
    if (!canvas || !obj) {
      console.warn('[Toolbar] duplicateArt requires an active object');
      return false;
    }
    obj.clone((cloned) => {
      cloned.set({
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20,
        name: `${obj.type}_${Date.now()}`
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      notifyCanvasChanges(canvas);
    });
    return true;
  }

  // [2025-11-19 12:20:00] 旋转对象
  function rotateArt(angle = 15) {
    const { canvas, obj } = getActiveDrawable();
    if (!canvas || !obj) {
      console.warn('[Toolbar] rotateArt requires an active object');
      return false;
    }
    const currentAngle = obj.angle || 0;
    obj.set('angle', currentAngle + angle);
    notifyCanvasChanges(canvas);
    return true;
  }

  // [2025-11-19 12:00:00] 初始化颜色面板（所有工具面板共用）
  function initColorPanel() {
    const colorsGrid = document.getElementById('product-colors-grid');
    if (!colorsGrid || !window.DesignLabStore) return;

    const store = window.DesignLabStore.getStore();
    const colors = store?.product?.colors || ['Red', 'Heather Dark Grey', 'Navy', 'Black', 'White'];

    colorsGrid.innerHTML = '';
    colors.forEach((color) => {
      const colorBtn = document.createElement('button');
      colorBtn.className = 'panel__color-item';
      colorBtn.type = 'button';
      colorBtn.dataset.color = color;
      colorBtn.setAttribute('aria-label', `Select color ${color}`);
      colorBtn.setAttribute('tabindex', '0');

      const colorMap = {
        Red: '#ff1f3d',
        'Heather Dark Grey': '#4a5568',
        Navy: '#1e3a8a',
        Black: '#000000',
        White: '#ffffff'
      };
      const colorValue = colorMap[color] || '#cccccc';

      colorBtn.innerHTML = `
        <div class="panel__color-swatch" style="background-color: ${colorValue};"></div>
        <span class="panel__color-name">${color}</span>
      `;

      const isActive = color === store.product.color;
      colorBtn.classList.toggle('is-active', isActive);
      colorBtn.setAttribute('aria-pressed', String(isActive));

      colorBtn.addEventListener('click', () => changeProductColor(color));
      colorsGrid.appendChild(colorBtn);
    });
  }

  // [2025-11-19 12:00:00] 切换产品颜色
  function changeProductColor(color) {
    if (!window.DesignLabStore) return;
    const store = window.DesignLabStore.getStore();
    if (!store?.product) return;
    if (store.product.color === color) return;

    store.product.color = color;
    if (typeof window.DesignLabStore.setColor === 'function') {
      window.DesignLabStore.setColor(color);
    }

    if (window.DesignLabCanvas?.loadBackgroundForCurrentSide) {
      window.DesignLabCanvas.loadBackgroundForCurrentSide();
    }

    if (window.DesignLabCanvas?.autoSave) {
      window.DesignLabCanvas.autoSave();
    }

    if (window.DesignLabToolbar?.updateProductInfo) {
      window.DesignLabToolbar.updateProductInfo();
    } else {
      updateProductInfo();
    }

    const currentColorDisplay = document.getElementById('current-color-display');
    if (currentColorDisplay) currentColorDisplay.textContent = color;

    document.querySelectorAll('.panel__color-item').forEach((btn) => {
      const btnColor = btn.getAttribute('data-color');
      const isActive = btnColor === color;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    console.log('productColor:', { color, side: 'all' });
  }

  // [2025-11-19 11:30:00] 显示颜色模态框
  function showColorModal() {
    const modal = document.getElementById('color-modal');
    if (!modal) return;

    const store = window.DesignLabStore.getStore();
    const colorsGrid = document.getElementById('colors-grid');
    
    if (colorsGrid) {
      colorsGrid.innerHTML = '';
      store.product.colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'dl-color-item';
        colorBtn.textContent = color;
        colorBtn.classList.toggle('is-active', color === store.product.color);
        colorBtn.addEventListener('click', () => {
          // [2025-11-19 11:30:00] 切换颜色（只切换当前 product 颜色或底图着色层）
          if (window.changeColor) {
            window.changeColor(color);
          } else {
            window.DesignLabStore.setColor(color);
            if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
              window.DesignLabCanvas.loadBackgroundForCurrentSide();
            }
          }
          hideColorModal();
          if (window.updateProductInfo) {
            window.updateProductInfo();
          } else {
            updateProductInfo();
          }
        });
        colorsGrid.appendChild(colorBtn);
      });
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    
    // [2025-11-19 11:30:00] 绑定关闭按钮
    const closeBtn = modal.querySelector('.dl-modal__close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
      };
    }
  }
  
  // [2025-11-19 11:15:00] 导出 showColorModal 供外部调用
  window.DesignLabToolbar = window.DesignLabToolbar || {};
  window.DesignLabToolbar.showColorModal = showColorModal;

  // [2025-11-19 10:40:00] 隐藏颜色模态框
  function hideColorModal() {
    const modal = document.getElementById('color-modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // [2025-11-19 10:40:00] 更新产品信息显示
  function updateProductInfo() {
    const store = window.DesignLabStore.getStore();
    const productName = document.getElementById('product-name');
    const productColor = document.getElementById('product-color');
    
    if (productName) productName.textContent = store.product.name;
    if (productColor) productColor.textContent = store.product.color;
  }

  // [2025-11-19 10:40:00] 初始化时更新产品信息
  updateProductInfo();

  // [2025-11-19 12:00:00] 导出全局 API
  window.DesignLabToolbar = {
    init,
    addTextFromPanel,
    addArt,
    changeProductColor,
    flipArt,
    duplicateArt,
    rotateArt,
    initColorPanel,
    updateProductInfo,
    addShape
  };
})();

