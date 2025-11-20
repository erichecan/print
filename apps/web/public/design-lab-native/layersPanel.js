/**
 * Layers Panel - 图层面板与双向同步
 * [2025-11-19 10:35:00] 管理图层列表、显示/隐藏、锁定、排序、重命名等功能
 */
(function() {
  'use strict';

  let layersList = null;

  // [2025-11-19 10:35:00] 初始化图层面板
  function init() {
    // [2025-11-19 11:05:00] Layers 现在在 Tools 面板中，不是独立的右侧面板
    layersList = document.getElementById('layers-list');
    if (!layersList) {
      console.warn('[LayersPanel] layers-list element not found');
      return;
    }

    updateLayers();
  }

  // [2025-11-19 10:35:00] 更新图层列表
  function updateLayers() {
    if (!layersList) return;

    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    // [2025-11-19 10:35:00] 获取所有对象（排除背景）
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    
    // [2025-11-19 10:35:00] 按 z-index 排序（从后往前）
    objects.sort((a, b) => {
      const indexA = canvas.getObjects().indexOf(a);
      const indexB = canvas.getObjects().indexOf(b);
      return indexB - indexA; // 反向排序，最上层显示在列表顶部
    });

    // [2025-11-19 10:35:00] 清空列表
    layersList.innerHTML = '';

    // [2025-11-19 10:35:00] 生成图层项
    objects.forEach((obj, index) => {
      const layerItem = createLayerItem(obj, index);
      layersList.appendChild(layerItem);
    });

    // [2025-11-19 10:35:00] 如果没有对象，显示提示
    if (objects.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'dl-layers__empty';
      emptyMsg.textContent = 'No layers yet';
      layersList.appendChild(emptyMsg);
    }
  }

  // [2025-11-19 10:35:00] 创建图层项
  function createLayerItem(obj, index) {
    // [2025-11-19 10:55:00] 处理组对象
    if (obj.type === 'group') {
      return createGroupLayerItem(obj, index);
    }
    const item = document.createElement('div');
    item.className = 'dl-layer-item';
    item.setAttribute('data-layer-id', obj.name);
    item.setAttribute('draggable', 'true');
    item.setAttribute('role', 'listitem');
    
    // [2025-11-19 10:35:00] 选中状态
    if (obj === window.DesignLabCanvas.getCanvas().getActiveObject()) {
      item.classList.add('is-selected');
    }

    // [2025-11-19 11:30:00] 缩略图（生成真实缩略图或显示类型图标）
    const thumb = document.createElement('div');
    thumb.className = 'dl-layer-item__thumb';
    
    // [2025-11-19 11:30:00] 尝试生成真实缩略图
    try {
      const canvas = window.DesignLabCanvas.getCanvas();
      if (canvas && obj.type === 'image' && obj._element) {
        // [2025-11-19 11:30:00] 图片对象：使用实际图片
        const img = document.createElement('img');
        img.src = obj._element.src || obj.getSrc();
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        thumb.appendChild(img);
      } else {
        // [2025-11-19 11:30:00] 其他对象：显示类型图标
        const icon = document.createElement('span');
        icon.className = 'dl-layer-icon';
        if (obj.type === 'i-text' || obj.type === 'text') {
          icon.textContent = 'T';
        } else if (obj.type === 'image') {
          icon.textContent = '🖼️';
        } else if (obj.type === 'rect') {
          icon.textContent = '▢';
        } else if (obj.type === 'circle') {
          icon.textContent = '○';
        } else if (obj.type === 'triangle') {
          icon.textContent = '△';
        } else {
          icon.textContent = '▢';
        }
        thumb.appendChild(icon);
      }
    } catch (e) {
      const icon = document.createElement('span');
      icon.className = 'dl-layer-icon';
      icon.textContent = '?';
      thumb.appendChild(icon);
    }
    
    // [2025-11-19 10:35:00] 名称（可编辑）
    const name = document.createElement('div');
    name.className = 'dl-layer-item__name';
    name.textContent = obj.name || `Layer ${index + 1}`;
    name.setAttribute('contenteditable', 'true');
    name.setAttribute('role', 'textbox');
    
    // [2025-11-19 10:35:00] 重命名处理
    name.addEventListener('blur', () => {
      obj.set('name', name.textContent);
      window.DesignLabCanvas.getCanvas().renderAll();
    });
    
    name.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        name.blur();
      }
    });

    // [2025-11-19 10:35:00] 控件
    const controls = document.createElement('div');
    controls.className = 'dl-layer-item__controls';
    
    // [2025-11-19 11:30:00] 可见性按钮
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'dl-layer-control';
    visibilityBtn.setAttribute('aria-label', obj.visible ? 'Hide layer' : 'Show layer');
    visibilityBtn.setAttribute('aria-pressed', obj.visible ? 'true' : 'false');
    visibilityBtn.innerHTML = obj.visible ? '👁️' : '👁️‍🗨️';
    if (!obj.visible) visibilityBtn.classList.add('is-active');
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      toggleVisibility(obj.name);
    };
    
    // [2025-11-19 11:30:00] 锁定按钮
    const lockBtn = document.createElement('button');
    lockBtn.className = 'dl-layer-control';
    const isLocked = obj.lockMovementX;
    lockBtn.setAttribute('aria-label', isLocked ? 'Unlock layer' : 'Lock layer');
    lockBtn.setAttribute('aria-pressed', isLocked ? 'true' : 'false');
    lockBtn.innerHTML = isLocked ? '🔒' : '🔓';
    if (isLocked) lockBtn.classList.add('is-active');
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      toggleLock(obj.name);
    };
    
    // [2025-11-19 10:35:00] 上移按钮
    const upBtn = document.createElement('button');
    upBtn.className = 'dl-layer-control';
    upBtn.setAttribute('aria-label', 'Move up');
    upBtn.innerHTML = '↑';
    upBtn.onclick = (e) => {
      e.stopPropagation();
      moveLayer(obj.name, 'up');
    };
    
    // [2025-11-19 10:35:00] 下移按钮
    const downBtn = document.createElement('button');
    downBtn.className = 'dl-layer-control';
    downBtn.setAttribute('aria-label', 'Move down');
    downBtn.innerHTML = '↓';
    downBtn.onclick = (e) => {
      e.stopPropagation();
      moveLayer(obj.name, 'down');
    };
    
    // [2025-11-19 10:35:00] 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'dl-layer-control';
    deleteBtn.setAttribute('aria-label', 'Delete layer');
    deleteBtn.innerHTML = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      removeLayer(obj.name);
    };

    controls.appendChild(visibilityBtn);
    controls.appendChild(lockBtn);
    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(deleteBtn);

    // [2025-11-19 10:35:00] 点击选择
    item.onclick = (e) => {
      if (e.target.closest('.dl-layer-control')) return;
      selectLayer(obj.name);
    };

    // [2025-11-19 10:35:00] 拖拽排序
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', obj.name);
      item.classList.add('is-dragging');
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(layersList, e.clientY);
      const dragging = document.querySelector('.is-dragging');
      if (afterElement == null) {
        layersList.appendChild(dragging);
      } else {
        layersList.insertBefore(dragging, afterElement);
      }
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      const layerId = e.dataTransfer.getData('text/plain');
      const targetId = item.getAttribute('data-layer-id');
      if (layerId !== targetId) {
        reorderLayer(layerId, targetId);
      }
    });

    item.appendChild(thumb);
    item.appendChild(name);
    item.appendChild(controls);

    return item;
  }

  // [2025-11-19 10:35:00] 选择图层
  function selectLayer(layerId) {
    window.DesignLabCanvas.selectObject(layerId);
    updateLayers(); // 更新选中状态
  }

  // [2025-11-19 10:35:00] 清除选择
  function clearSelection() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (canvas) {
      canvas.discardActiveObject();
      canvas.renderAll();
    }
    updateLayers();
  }

  // [2025-11-19 11:30:00] 切换可见性（双向同步）
  function toggleVisibility(layerId) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.name === layerId);
    if (obj) {
      const newVisible = !obj.visible;
      obj.set('visible', newVisible);
      canvas.renderAll();
      updateLayers();
      
      // [2025-11-19 11:30:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 11:30:00] 切换锁定（双向同步）
  function toggleLock(layerId) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.name === layerId);
    if (obj) {
      const locked = !obj.lockMovementX;
      obj.set({
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked
      });
      canvas.renderAll();
      updateLayers();
      
      // [2025-11-19 11:30:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:35:00] 移动图层
  function moveLayer(layerId, direction) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.name === layerId);
    if (!obj) return;

    if (direction === 'up') {
      canvas.bringForward(obj);
    } else if (direction === 'down') {
      canvas.sendBackwards(obj);
    } else if (direction === 'front') {
      canvas.bringToFront(obj);
    } else if (direction === 'back') {
      canvas.sendToBack(obj);
    }

    // [2025-11-19 10:35:00] 确保背景在最底层
    const bg = canvas.getObjects().find(o => o.name === 'background');
    if (bg) {
      canvas.sendToBack(bg);
    }

    canvas.renderAll();
    updateLayers();
    
    // [2025-11-19 10:35:00] 记录历史
    if (window.DesignLabHistory) {
      window.DesignLabHistory.saveState();
    }
  }

  // [2025-11-19 11:30:00] 删除图层（带日志）
  function removeLayer(layerId) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.name === layerId);
    if (obj) {
      const currentSide = window.DesignLabStore ? window.DesignLabStore.getCurrentSide() : 'front';
      console.log('[LayersPanel] remove:', { id: layerId, side: currentSide });
      
      canvas.remove(obj);
      canvas.renderAll();
      updateLayers();
      
      // [2025-11-19 11:30:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:35:00] 重新排序图层
  function reorderLayer(layerId, targetId) {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.name === layerId);
    const target = canvas.getObjects().find(o => o.name === targetId);
    
    if (obj && target) {
      const objIndex = canvas.getObjects().indexOf(obj);
      const targetIndex = canvas.getObjects().indexOf(target);
      
      if (objIndex < targetIndex) {
        canvas.moveTo(obj, targetIndex);
      } else {
        canvas.moveTo(obj, targetIndex);
      }
      
      // [2025-11-19 10:35:00] 确保背景在最底层
      const bg = canvas.getObjects().find(o => o.name === 'background');
      if (bg) {
        canvas.sendToBack(bg);
      }
      
      canvas.renderAll();
      updateLayers();
      
      // [2025-11-19 10:35:00] 记录历史
      if (window.DesignLabHistory) {
        window.DesignLabHistory.saveState();
      }
    }
  }

  // [2025-11-19 10:55:00] 创建组图层项（平铺显示，二期可改为树结构）
  function createGroupLayerItem(groupObj, index) {
    const item = createLayerItem(groupObj, index);
    item.classList.add('is-group');
    // [2025-11-19 10:55:00] 二期：添加展开/折叠功能
    return item;
  }

  // [2025-11-19 10:35:00] 获取拖拽后的元素
  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.dl-layer-item:not(.is-dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // [2025-11-19 10:35:00] 导出全局 API
  window.DesignLabLayers = {
    init,
    updateLayers,
    selectLayer,
    clearSelection,
    toggleVisibility,
    toggleLock,
    moveLayer,
    removeLayer,
    reorderLayer
  };
})();

