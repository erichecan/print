/**
 * Toolbar - 工具栏与工具功能
 * [2025-11-19 10:40:00] 管理工具栏交互、工具切换、文件上传等
 */
(function() {
  'use strict';

  let currentTool = null;
  let fileInput = null;

  // [2025-11-19 10:40:00] 初始化工具栏
  function init() {
    // [2025-11-19 11:15:00] Rail 工具按钮（排除 Undo/Redo）
    const railButtons = document.querySelectorAll('.dl-rail__btn[data-tool]');
    railButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        selectTool(tool);
      });
    });
    
    // [2025-11-19 11:15:00] 启动面板按钮
    const guideActions = document.querySelectorAll('.dl-guide-action');
    guideActions.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleGuideAction(action);
      });
    });

    // [2025-11-19 10:40:00] Tabs 切换
    const tabButtons = document.querySelectorAll('.dl-tabs__btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
        
        // [2025-11-19 11:05:00] 如果切换到 Layers Tab，更新图层列表
        if (tab === 'layers' && window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
        }
      });
    });

    // [2025-11-19 10:40:00] 文件上传
    fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    
    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => {
        fileInput.click();
      });

      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('is-dragover');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('is-dragover');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('is-dragover');
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

    // [2025-11-19 10:40:00] 添加文本按钮
    const addTextBtn = document.getElementById('btn-add-text');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => {
        addTextFromToolbar();
      });
    }

    // [2025-11-19 10:40:00] Art 按钮
    const artItems = document.querySelectorAll('.dl-art-item');
    artItems.forEach(item => {
      item.addEventListener('click', () => {
        const artType = item.getAttribute('data-art');
        addArt(artType);
      });
    });

    // [2025-11-19 10:40:00] 颜色选择
    const colorBtn = document.getElementById('tool-colors');
    if (colorBtn) {
      colorBtn.addEventListener('click', () => {
        showColorModal();
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
      // [2025-11-19 11:15:00] 直接添加文本
      addTextFromToolbar();
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
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target.result;
      window.DesignLabCanvas.addImage(imageUrl);
    };
    reader.readAsDataURL(file);
  }

  // [2025-11-19 10:40:00] 从工具栏添加文本
  function addTextFromToolbar() {
    const text = 'Your Text';
    const fontSize = parseInt(document.getElementById('text-size').value) || 48;
    const fontFamily = document.getElementById('text-font').value || 'Arial';
    const color = document.getElementById('text-color').value || '#000000';
    const bold = document.getElementById('text-bold').checked;
    const italic = document.getElementById('text-italic').checked;
    const underline = document.getElementById('text-underline').checked;

    window.DesignLabCanvas.addText(text, {
      fontSize,
      fontFamily,
      fill: color,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
      underline
    });
  }

  // [2025-11-19 10:40:00] 添加 Art
  function addArt(type) {
    // [2025-11-19 10:40:00] 简单的 SVG 示例
    let svgContent = '';
    
    switch (type) {
      case 'star':
        svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35" fill="#3b82f6"/></svg>';
        break;
      case 'heart':
        svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50,85 C50,85 10,50 10,30 C10,15 20,10 30,10 C40,10 50,20 50,20 C50,20 60,10 70,10 C80,10 90,15 90,30 C90,50 50,85 50,85 Z" fill="#ff1f3d"/></svg>';
        break;
      case 'circle':
        svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg>';
        break;
    }

    if (svgContent) {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      window.DesignLabCanvas.addImage(url);
    }
  }

  // [2025-11-19 10:40:00] 添加形状
  function addShape(type) {
    window.DesignLabCanvas.addShape(type);
  }

  // [2025-11-19 10:40:00] 显示颜色模态框
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
          window.DesignLabStore.setColor(color);
          if (window.DesignLabCanvas && window.DesignLabCanvas.loadBackgroundForCurrentSide) {
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
          }
          hideColorModal();
          updateProductInfo();
        });
        colorsGrid.appendChild(colorBtn);
      });
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
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

  // [2025-11-19 10:40:00] 导出全局 API
  window.DesignLabToolbar = {
    init,
    selectTool,
    switchTab,
    updateProductInfo,
    showColorModal
  };
})();

