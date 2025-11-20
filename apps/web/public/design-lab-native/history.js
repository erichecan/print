/**
 * History - 撤销重做系统
 * [2025-11-19 10:25:00] 管理画布历史状态，支持撤销/重做，每个面独立历史栈
 */
(function() {
  'use strict';

  const MAX_HISTORY = 50;
  const historyStacks = {
    front: [],
    back: [],
    sleeve: []
  };
  const futureStacks = {
    front: [],
    back: [],
    sleeve: []
  };
  let currentSide = 'front';
  let isSaving = false;

  // [2025-11-19 10:25:00] 保存当前状态
  function saveState() {
    if (isSaving) return;
    
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return;

    isSaving = true;
    
    // [2025-11-19 10:25:00] 获取当前画布状态（排除背景）
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const state = canvas.toDatalessJSON(objects);
    
    // [2025-11-19 10:25:00] 添加到历史栈
    historyStacks[currentSide].push(state);
    
    // [2025-11-19 10:25:00] 限制历史栈大小
    if (historyStacks[currentSide].length > MAX_HISTORY) {
      historyStacks[currentSide].shift();
    }
    
    // [2025-11-19 10:25:00] 清空未来栈
    futureStacks[currentSide] = [];
    
    isSaving = false;
  }

  // [2025-11-19 10:25:00] 撤销
  function undo() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return false;

    if (historyStacks[currentSide].length === 0) {
      return false;
    }

    // [2025-11-19 10:25:00] 保存当前状态到未来栈
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const currentState = canvas.toDatalessJSON(objects);
    futureStacks[currentSide].push(currentState);

    // [2025-11-19 10:25:00] 恢复上一个状态
    const previousState = historyStacks[currentSide].pop();
    if (previousState) {
      isSaving = true;
      canvas.loadFromJSON(previousState, () => {
        canvas.renderAll();
        // [2025-11-19 10:25:00] 确保背景在最底层
        const bg = canvas.getObjects().find(obj => obj.name === 'background');
        if (bg) {
          canvas.sendToBack(bg);
        }
        isSaving = false;
        
        // [2025-11-19 10:25:00] 更新图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
        }
      });
      return true;
    }
    
    return false;
  }

  // [2025-11-19 10:25:00] 重做
  function redo() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return false;

    if (futureStacks[currentSide].length === 0) {
      return false;
    }

    // [2025-11-19 10:25:00] 保存当前状态到历史栈
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const currentState = canvas.toDatalessJSON(objects);
    historyStacks[currentSide].push(currentState);

    // [2025-11-19 10:25:00] 恢复未来状态
    const nextState = futureStacks[currentSide].pop();
    if (nextState) {
      isSaving = true;
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
        // [2025-11-19 10:25:00] 确保背景在最底层
        const bg = canvas.getObjects().find(obj => obj.name === 'background');
        if (bg) {
          canvas.sendToBack(bg);
        }
        isSaving = false;
        
        // [2025-11-19 10:25:00] 更新图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
        }
      });
      return true;
    }
    
    return false;
  }

  // [2025-11-19 10:25:00] 切换画布面
  function switchSide(side) {
    currentSide = side;
    // [2025-11-19 10:25:00] 每个面维护独立的历史栈
  }

  // [2025-11-19 10:25:00] 检查是否可以撤销
  function canUndo() {
    return historyStacks[currentSide].length > 0;
  }

  // [2025-11-19 10:25:00] 检查是否可以重做
  function canRedo() {
    return futureStacks[currentSide].length > 0;
  }

  // [2025-11-19 10:25:00] 清空历史
  function clearHistory() {
    historyStacks[currentSide] = [];
    futureStacks[currentSide] = [];
  }

  // [2025-11-19 10:25:00] 导出全局 API
  window.DesignLabHistory = {
    saveState,
    undo,
    redo,
    switchSide,
    canUndo,
    canRedo,
    clearHistory
  };
})();

