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
    // [2025-01-28 04:20:00] 支持基本形状（data-art）和 CMS 素材（data-art-url）
    const artItems = document.querySelectorAll('.panel__art-item');
    artItems.forEach(item => {
      item.addEventListener('click', () => {
        // [2025-01-28 04:20:00] 优先检查是否有 URL（CMS 素材）
        const artUrl = item.getAttribute('data-art-url');
        if (artUrl) {
          addArt(artUrl);
        } else {
          // [2025-11-19 12:00:00] 基本形状（star, heart, circle, triangle, square）
          const artType = item.getAttribute('data-art');
          if (artType) {
            addArt(artType);
          }
        }
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

    // [2025-01-27] 隐藏颜色功能，2期开发
    // initColorPanel();

    // [2025-01-27] Names and Numbers 功能实现
    // 绑定复选框，控制选项显示/隐藏
    const namesEnabled = document.getElementById('names-enabled');
    const numbersEnabled = document.getElementById('numbers-enabled');
    const namesOptions = document.getElementById('names-options');
    const numbersOptions = document.getElementById('numbers-options');
    
    if (namesEnabled && namesOptions) {
      namesEnabled.addEventListener('change', (e) => {
        namesOptions.style.display = e.target.checked ? 'block' : 'none';
      });
      // 初始化显示状态
      namesOptions.style.display = namesEnabled.checked ? 'block' : 'none';
    }
    
    if (numbersEnabled && numbersOptions) {
      numbersEnabled.addEventListener('change', (e) => {
        numbersOptions.style.display = e.target.checked ? 'block' : 'none';
      });
      // 初始化显示状态
      numbersOptions.style.display = numbersEnabled.checked ? 'block' : 'none';
    }
    
    // [2025-01-27] Step 2: Enter Names/Numbers 按钮 - 打开模态框
    const enterNamesNumbersBtn = document.getElementById('btn-enter-names-numbers');
    if (enterNamesNumbersBtn) {
      enterNamesNumbersBtn.addEventListener('click', () => {
        showNamesNumbersModal();
      });
    }
    
    // [2025-01-27] 初始化 Names and Numbers 模态框
    initNamesNumbersModal();

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
  // [2025-01-28 04:20:00] 支持从 CMS 加载的素材 URL
  function addArt(type) {
    if (window.DesignLabCanvas) {
      // [2025-01-28 04:20:00] 如果 type 是 URL（从 CMS 加载的素材），直接使用 addImage
      if (typeof type === 'string' && (type.startsWith('http://') || type.startsWith('https://') || type.startsWith('data:'))) {
        console.log('[Toolbar] Adding art from URL:', type);
        window.DesignLabCanvas.addImage(type);
        
        // [2025-11-19 12:00:00] 记录到历史栈
        if (window.DesignLabHistory) {
          window.DesignLabHistory.saveState();
        }
        
        // [2025-11-19 12:00:00] 返回 home 面板
        if (window.DesignLabPanel) {
          window.DesignLabPanel.openPanel('home');
        }
        return;
      }

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
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
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
  // [2025-01-28 04:40:00] 修复为 8x8 网格，64 种颜色，匹配截图设计
  // [2025-01-27] 隐藏颜色功能，2期开发
  function initColorPanel() {
    // 颜色面板已隐藏，直接返回
    return;
    // const colorsGrid = document.getElementById('product-colors-grid');
    // if (!colorsGrid || !window.DesignLabStore) return;

    const store = window.DesignLabStore.getStore();
    
    // [2025-01-28 04:40:00] 64 种颜色（8x8 网格），包含各种常用颜色
    const colorPalette = [
      '#ffffff', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040',
      '#000000', '#1c1c1e', '#2c2c2e', '#3a3a3c', '#48484a', '#636366', '#8e8e93', '#aeaeb2',
      '#ff1f3d', '#ff3b30', '#ff453a', '#ff6961', '#ff9500', '#ffa500', '#ffb340', '#ffcc00',
      '#34c759', '#30d158', '#32d74b', '#64de64', '#00c896', '#00d4aa', '#5ac8fa', '#0a84ff',
      '#007aff', '#0051d5', '#0040dd', '#5856d6', '#af52de', '#bf5af2', '#ff2d55', '#ff375f',
      '#ff6b9d', '#ff8fab', '#ffb3ba', '#ffc0cb', '#ff69b4', '#ff1493', '#c71585', '#db7093',
      '#8b4513', '#a0522d', '#cd853f', '#deb887', '#f4a460', '#daa520', '#b8860b', '#d4af37',
      '#808080', '#708090', '#778899', '#b0c4de', '#d3d3d3', '#dcdcdc', '#f0f0f0', '#fafafa'
    ];

    colorsGrid.innerHTML = '';
    colorPalette.forEach((colorValue, index) => {
      const colorBtn = document.createElement('button');
      colorBtn.className = 'panel__color-item';
      colorBtn.type = 'button';
      colorBtn.dataset.color = colorValue;
      colorBtn.setAttribute('aria-label', `Select color ${colorValue}`);
      colorBtn.setAttribute('tabindex', '0');

      // [2025-01-28 04:40:00] 只显示颜色方块，不显示文字
      colorBtn.innerHTML = `<div class="panel__color-swatch" style="background-color: ${colorValue};"></div>`;

      // [2025-01-28 04:40:00] 检查是否是当前选中的颜色（从 store 获取）
      const currentColor = store?.product?.color || 'Red';
      const colorMap = {
        Red: '#ff1f3d',
        'Heather Dark Grey': '#4a5568',
        Navy: '#1e3a8a',
        Black: '#000000',
        White: '#ffffff'
      };
      const currentColorValue = colorMap[currentColor] || '#ff1f3d';
      const isActive = colorValue.toLowerCase() === currentColorValue.toLowerCase();
      
      colorBtn.classList.toggle('is-active', isActive);
      colorBtn.setAttribute('aria-pressed', String(isActive));

      colorBtn.addEventListener('click', () => {
        // [2025-01-28 04:40:00] 根据颜色值找到对应的颜色名称，或使用十六进制值
        const colorName = Object.keys(colorMap).find(key => colorMap[key].toLowerCase() === colorValue.toLowerCase()) || colorValue;
        changeProductColor(colorName);
      });
      
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

    // [2025-01-27] 颜色显示元素已隐藏，2期开发
    // const currentColorDisplay = document.getElementById('current-color-display');
    // if (currentColorDisplay) currentColorDisplay.textContent = color;

    // [2025-01-28 04:40:00] 更新颜色指示点
    // const currentColorDot = document.getElementById('current-color-dot');
    // if (currentColorDot) {
    //   const colorMap = {
    //     Red: '#ff1f3d',
    //     'Heather Dark Grey': '#4a5568',
    //     Navy: '#1e3a8a',
    //     Black: '#000000',
    //     White: '#ffffff'
    //   };
    //   const colorValue = colorMap[color] || '#ff1f3d';
    //   currentColorDot.style.backgroundColor = colorValue;
    // }

    // [2025-01-28 04:50:00] 更新尺码显示（颜色面板已隐藏，此功能也暂时禁用）
    // updateSizesDisplay();

    // [2025-01-27] 颜色面板已隐藏，2期开发
    // [2025-01-28 04:40:00] 更新颜色网格中的选中状态
    // const colorMap = {
    //   Red: '#ff1f3d',
    //   'Heather Dark Grey': '#4a5568',
    //   Navy: '#1e3a8a',
    //   Black: '#000000',
    //   White: '#ffffff'
    // };
    // const currentColorValue = colorMap[color] || '#ff1f3d';
    
    // document.querySelectorAll('.panel__color-item').forEach((btn) => {
    //   const btnColor = btn.getAttribute('data-color');
    //   const isActive = btnColor && btnColor.toLowerCase() === currentColorValue.toLowerCase();
    //   btn.classList.toggle('is-active', isActive);
    //   btn.setAttribute('aria-pressed', String(isActive));
    // });

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
  // [2025-01-27] 不要覆盖已有的 DesignLabToolbar 对象，只添加方法
  if (!window.DesignLabToolbar) {
    window.DesignLabToolbar = {};
  }
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
    // [2025-01-27] 颜色元素已隐藏，2期开发
    // const productColor = document.getElementById('product-color');
    
    if (productName) productName.textContent = store.product.name;
    // [2025-01-27] 颜色显示已隐藏，2期开发
    // if (productColor) productColor.textContent = store.product.color;
  }

  // [2025-01-28 04:50:00] 更新尺码显示（方形按钮，蓝色边框）
  function updateSizesDisplay() {
    const sizesGrid = document.getElementById('product-sizes-grid');
    if (!sizesGrid) return;

    // [2025-01-28 04:50:00] 所有可用尺码
    const allSizes = ['YS', 'YM', 'YL', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
    
    sizesGrid.innerHTML = '';
    allSizes.forEach((size) => {
      const sizeBtn = document.createElement('button');
      sizeBtn.className = 'panel__size-btn';
      sizeBtn.type = 'button';
      sizeBtn.textContent = size;
      sizeBtn.setAttribute('aria-label', `Size ${size}`);
      sizeBtn.setAttribute('tabindex', '0');
      
      // [2025-01-28 04:50:00] 点击尺码按钮（可以扩展为实际功能）
      sizeBtn.addEventListener('click', () => {
        // 移除其他按钮的选中状态
        document.querySelectorAll('.panel__size-btn').forEach(btn => {
          btn.classList.remove('is-selected');
        });
        // 添加选中状态
        sizeBtn.classList.add('is-selected');
        console.log('[Toolbar] Size selected:', size);
      });
      
      sizesGrid.appendChild(sizeBtn);
    });
  }

  // [2025-11-19 10:40:00] 初始化时更新产品信息
  updateProductInfo();
  
  // [2025-01-28 04:50:00] 初始化时更新尺码显示（颜色面板已隐藏，此功能也暂时禁用）
  // updateSizesDisplay();

  // [2025-01-27] 显示 Names and Numbers 输入模态框
  function showNamesNumbersModal() {
    console.log('[Toolbar] showNamesNumbersModal called');
    const modal = document.getElementById('names-numbers-modal');
    if (!modal) {
      console.error('[Toolbar] Names/Numbers modal not found');
      return;
    }
    
    console.log('[Toolbar] Modal found, initializing...');
    
    // [2025-01-27] 初始化表单（如果还没有初始化）
    if (!modal.dataset.initialized) {
      console.log('[Toolbar] Initializing form for first time...');
      initNamesNumbersForm();
      modal.dataset.initialized = 'true';
    }
    
    // [2025-01-27] 显示模态框
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    console.log('[Toolbar] Modal opened');
    
    // [2025-01-27] 更新总计（确保显示最新数据）
    updateNamesNumbersTotals();
    
    // [2025-01-27] 聚焦到第一个输入框
    const firstInput = modal.querySelector('.names-numbers-input--name');
    if (firstInput) {
      setTimeout(() => {
        firstInput.focus();
        console.log('[Toolbar] Focused on first input');
      }, 100);
    }
  }
  
  // [2025-01-27] 隐藏 Names and Numbers 模态框
  function hideNamesNumbersModal() {
    const modal = document.getElementById('names-numbers-modal');
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }
  
  // [2025-01-27] 初始化 Names and Numbers 模态框
  function initNamesNumbersModal() {
    const modal = document.getElementById('names-numbers-modal');
    if (!modal) return;
    
    // [2025-01-27] 关闭按钮
    const closeBtn = modal.querySelector('#names-numbers-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        hideNamesNumbersModal();
      });
    }
    
    // [2025-01-27] 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideNamesNumbersModal();
      }
    });
    
    // [2025-01-27] Done 按钮
    const doneBtn = document.getElementById('btn-names-numbers-done');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        handleNamesNumbersDone();
      });
    }
    
    // [2025-01-27] 返回设置链接
    const backToSettingsLink = document.getElementById('link-back-to-settings');
    if (backToSettingsLink) {
      backToSettingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideNamesNumbersModal();
        // [2025-01-27] 打开 names 面板
        if (window.DesignLabPanel) {
          window.DesignLabPanel.openPanel('names');
        }
      });
    }
  }
  
  // [2025-01-27] 初始化表单（创建初始5行）
  function initNamesNumbersForm() {
    const rowsContainer = document.getElementById('names-numbers-rows');
    if (!rowsContainer) return;
    
    // [2025-01-27] 清空容器
    rowsContainer.innerHTML = '';
    
    // [2025-01-27] 创建初始5行
    for (let i = 0; i < 5; i++) {
      addNamesNumbersRow();
    }
    
    // [2025-01-27] 绑定 Add More 按钮
    const addMoreBtn = document.getElementById('btn-add-more-rows');
    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', () => {
        addNamesNumbersRow();
      });
    }
    
    // [2025-01-27] 更新总计
    updateNamesNumbersTotals();
  }
  
  // [2025-01-27] 添加一行输入
  function addNamesNumbersRow() {
    const rowsContainer = document.getElementById('names-numbers-rows');
    if (!rowsContainer) return;
    
    const row = document.createElement('div');
    row.className = 'names-numbers-table__row';
    row.innerHTML = `
      <div class="names-numbers-table__col names-numbers-table__col--name">
        <input type="text" class="names-numbers-input names-numbers-input--name" placeholder="ENTER NAME" data-row-index="${rowsContainer.children.length}">
      </div>
      <div class="names-numbers-table__col names-numbers-table__col--number">
        <input type="text" class="names-numbers-input names-numbers-input--number" value="00" data-row-index="${rowsContainer.children.length}">
      </div>
      <div class="names-numbers-table__col names-numbers-table__col--size">
        <select class="names-numbers-input names-numbers-input--size" data-row-index="${rowsContainer.children.length}">
          <option value="">Size</option>
          <option value="YS">YS</option>
          <option value="YM">YM</option>
          <option value="YL">YL</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="2XL">2XL</option>
          <option value="3XL">3XL</option>
          <option value="4XL">4XL</option>
          <option value="5XL">5XL</option>
        </select>
      </div>
    `;
    
    rowsContainer.appendChild(row);
    
    // [2025-01-27] 绑定输入事件，更新总计
    const inputs = row.querySelectorAll('input, select');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        updateNamesNumbersTotals();
      });
      input.addEventListener('change', () => {
        updateNamesNumbersTotals();
      });
    });
  }
  
  // [2025-01-27] 更新总计和尺寸摘要
  function updateNamesNumbersTotals() {
    const rows = document.querySelectorAll('.names-numbers-table__row');
    let totalNames = 0;
    let totalNumbers = 0;
    let totalItems = 0;
    const sizesMap = new Map(); // 使用 Map 来统计每个尺寸的数量
    
    rows.forEach(row => {
      const nameInput = row.querySelector('.names-numbers-input--name');
      const numberInput = row.querySelector('.names-numbers-input--number');
      const sizeSelect = row.querySelector('.names-numbers-input--size');
      
      const name = nameInput?.value.trim() || '';
      const number = numberInput?.value.trim() || '';
      const size = sizeSelect?.value || '';
      
      if (name || (number && number !== '00') || size) {
        totalItems++;
        if (name) totalNames++;
        if (number && number !== '00') totalNumbers++;
        if (size) {
          // [2025-01-27] 统计每个尺寸的数量
          sizesMap.set(size, (sizesMap.get(size) || 0) + 1);
        }
      }
    });
    
    // [2025-01-27] 更新总计显示
    const totalNamesEl = document.getElementById('total-names');
    const totalNumbersEl = document.getElementById('total-numbers');
    const totalItemsEl = document.getElementById('total-items');
    
    if (totalNamesEl) totalNamesEl.textContent = totalNames;
    if (totalNumbersEl) totalNumbersEl.textContent = totalNumbers;
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    
    // [2025-01-27] 更新尺寸列表 - 格式: (数量/数量) 尺寸
    const sizesListEl = document.getElementById('names-numbers-sizes-list');
    if (sizesListEl) {
      if (sizesMap.size > 0) {
        const sizesArray = Array.from(sizesMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0])) // 按尺寸名称排序
          .map(([size, count]) => `(${count}/${count}) ${size}`);
        sizesListEl.innerHTML = sizesArray.join(', ');
      } else {
        sizesListEl.innerHTML = '<span style="color: #9ca3af;">No sizes selected</span>';
      }
    }
  }
  
  // [2025-01-27] 处理 Done 按钮点击
  function handleNamesNumbersDone() {
    if (!window.DesignLabCanvas) {
      console.error('[Toolbar] Canvas not available');
      return;
    }
    
    // [2025-01-27] 获取 Names 设置
    const namesEnabled = document.getElementById('names-enabled')?.checked;
    const namesSide = document.getElementById('names-side')?.value || 'back';
    const namesHeight = parseFloat(document.getElementById('names-height')?.value || '2');
    const namesColor = document.getElementById('names-color')?.value || '#ffff00';
    
    // [2025-01-27] 获取 Numbers 设置
    const numbersEnabled = document.getElementById('numbers-enabled')?.checked;
    const numbersSide = document.getElementById('numbers-side')?.value || 'back';
    const numbersHeight = parseFloat(document.getElementById('numbers-height')?.value || '8');
    const numbersColor = document.getElementById('numbers-color')?.value || '#00ffff';
    
    // [2025-01-27] 收集所有行的数据
    const rows = document.querySelectorAll('.names-numbers-table__row');
    const items = [];
    
    rows.forEach(row => {
      const nameInput = row.querySelector('.names-numbers-input--name');
      const numberInput = row.querySelector('.names-numbers-input--number');
      const sizeSelect = row.querySelector('.names-numbers-input--size');
      
      const name = nameInput?.value.trim() || '';
      const number = numberInput?.value.trim() || '';
      const size = sizeSelect?.value || '';
      
      if (name || (number && number !== '00') || size) {
        items.push({ name, number, size });
      }
    });
    
    if (items.length === 0) {
      alert('Please enter at least one item with name, number, or size.');
      return;
    }
    
    // [2025-01-27] 保存当前面
    const store = window.DesignLabStore.getStore();
    const currentSide = store.currentSide;
    
    // [2025-01-27] 为每个项目添加名字和数字
    items.forEach(item => {
      if (item.name && namesEnabled) {
        addNamesNumbersToSide(item.name, namesSide, namesHeight, namesColor, 'name');
      }
      if (item.number && item.number !== '00' && numbersEnabled) {
        addNamesNumbersToSide(item.number, numbersSide, numbersHeight, numbersColor, 'number');
      }
    });
    
    // [2025-01-27] 切换回原来的面
    if (currentSide !== store.currentSide) {
      if (window.DesignLabStore && window.DesignLabStore.setActiveSide) {
        window.DesignLabStore.setActiveSide(currentSide);
      }
      if (window.DesignLabCanvas && window.DesignLabCanvas.switchSide) {
        window.DesignLabCanvas.switchSide(currentSide);
      }
    }
    
    // [2025-01-27] 关闭模态框
    hideNamesNumbersModal();
    
    console.log('[Toolbar] Names and Numbers added:', items.length, 'items');
  }
  
  // [2025-01-27] 添加名字或数字到指定面
  function addNamesNumbersToSide(text, side, heightInches, color, type) {
    const store = window.DesignLabStore.getStore();
    const currentSide = store.currentSide;
    
    // [2025-01-27] 如果目标面不是当前面，需要切换
    if (side !== currentSide) {
      // 保存当前面
      if (window.DesignLabCanvas && window.DesignLabCanvas.saveCurrentSide) {
        window.DesignLabCanvas.saveCurrentSide();
      }
      
      // 切换到目标面
      if (window.DesignLabStore && window.DesignLabStore.setActiveSide) {
        window.DesignLabStore.setActiveSide(side);
      }
      if (window.DesignLabCanvas && window.DesignLabCanvas.switchSide) {
        window.DesignLabCanvas.switchSide(side);
      }
    }
    
    // [2025-01-27] 计算字体大小（英寸转像素，假设 100 DPI）
    const fontSize = heightInches * 100;
    
    // [2025-01-27] 使用 DesignLabCanvas 的 addText 方法添加文本
    const textObj = window.DesignLabCanvas.addText(text, {
      fontSize: fontSize,
      fontFamily: 'Arial',
      fill: color,
      fontWeight: 'bold',
      name: type === 'name' ? 'name' : 'number'
    });
    
    if (textObj) {
      // [2025-01-27] 保存状态到历史
      if (window.DesignLabHistory && window.DesignLabHistory.saveState) {
        setTimeout(() => {
          window.DesignLabHistory.saveState();
        }, 100);
      }
      
      console.log('[Toolbar] Added', type, 'to', side, ':', text);
    } else {
      console.error('[Toolbar] Failed to add', type, 'to', side);
    }
  }

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
    updateSizesDisplay,
    addShape,
    handleEnterNamesNumbers,
  };
})();

